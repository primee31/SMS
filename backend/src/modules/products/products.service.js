import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';

export async function listProducts(query) {
  const { page, limit, search, type, isActive, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(type && { type }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        variants: {
          where: { deletedAt: null }
        }
      }
    })
  ]);

  // Enrich variants with calculated final effective prices
  const enrichedProducts = products.map((prod) => ({
    ...prod,
    variants: prod.variants.map((v) => ({
      ...v,
      effectivePrice: Number(prod.salesPrice) + Number(v.additionalPrice)
    }))
  }));

  return {
    items: enrichedProducts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function createProduct(data, currentUserId, ipAddress = null, userAgent = null) {
  const { variants, ...productData } = data;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: productData
    });

    if (variants && variants.length > 0) {
      await tx.productVariant.createMany({
        data: variants.map((v) => ({
          ...v,
          productId: created.id
        }))
      });
    }

    return await tx.product.findUnique({
      where: { id: created.id },
      include: { variants: true }
    });
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'Product',
    entityId: product.id,
    newValues: { name: product.name, salesPrice: product.salesPrice },
    ipAddress,
    userAgent
  });

  return {
    ...product,
    variants: product.variants.map((v) => ({
      ...v,
      effectivePrice: Number(product.salesPrice) + Number(v.additionalPrice)
    }))
  };
}

export async function getProductById(id) {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      variants: {
        where: { deletedAt: null }
      }
    }
  });

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return {
    ...product,
    variants: product.variants.map((v) => ({
      ...v,
      effectivePrice: Number(product.salesPrice) + Number(v.additionalPrice)
    }))
  };
}

export async function updateProduct(id, data, currentUserId, ipAddress = null, userAgent = null) {
  const existing = await getProductById(id);

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: {
      variants: {
        where: { deletedAt: null }
      }
    }
  });

  await logAudit({
    userId: currentUserId,
    action: 'UPDATE',
    entity: 'Product',
    entityId: id,
    oldValues: { name: existing.name, salesPrice: existing.salesPrice },
    newValues: data,
    ipAddress,
    userAgent
  });

  return {
    ...updated,
    variants: updated.variants.map((v) => ({
      ...v,
      effectivePrice: Number(updated.salesPrice) + Number(v.additionalPrice)
    }))
  };
}

export async function deleteProduct(id, currentUserId, ipAddress = null, userAgent = null) {
  await getProductById(id);

  await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    }),
    prisma.productVariant.updateMany({
      where: { productId: id },
      data: { deletedAt: new Date(), isActive: false }
    })
  ]);

  await logAudit({
    userId: currentUserId,
    action: 'SOFT_DELETE',
    entity: 'Product',
    entityId: id,
    ipAddress,
    userAgent
  });

  return { success: true, message: 'Product and variants deleted successfully' };
}

// -----------------------------------------------------------------------------
// VARIANT OPERATIONS
// -----------------------------------------------------------------------------

export async function createVariant(productId, data, currentUserId, ipAddress = null, userAgent = null) {
  const product = await getProductById(productId);

  const variant = await prisma.productVariant.create({
    data: {
      ...data,
      productId
    }
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'ProductVariant',
    entityId: variant.id,
    newValues: { productId, name: variant.name, additionalPrice: variant.additionalPrice },
    ipAddress,
    userAgent
  });

  return {
    ...variant,
    effectivePrice: Number(product.salesPrice) + Number(variant.additionalPrice)
  };
}

export async function updateVariant(productId, variantId, data, currentUserId, ipAddress = null, userAgent = null) {
  const product = await getProductById(productId);

  const existingVariant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId, deletedAt: null }
  });

  if (!existingVariant) {
    const error = new Error('Product variant not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data
  });

  await logAudit({
    userId: currentUserId,
    action: 'UPDATE',
    entity: 'ProductVariant',
    entityId: variantId,
    oldValues: { name: existingVariant.name, additionalPrice: existingVariant.additionalPrice },
    newValues: data,
    ipAddress,
    userAgent
  });

  return {
    ...updated,
    effectivePrice: Number(product.salesPrice) + Number(updated.additionalPrice)
  };
}

export async function deleteVariant(productId, variantId, currentUserId, ipAddress = null, userAgent = null) {
  await getProductById(productId);

  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId, deletedAt: null }
  });

  if (!existing) {
    const error = new Error('Product variant not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { deletedAt: new Date(), isActive: false }
  });

  await logAudit({
    userId: currentUserId,
    action: 'SOFT_DELETE',
    entity: 'ProductVariant',
    entityId: variantId,
    ipAddress,
    userAgent
  });

  return { success: true, message: 'Variant deleted successfully' };
}
