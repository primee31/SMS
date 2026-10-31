import * as productsService from './products.service.js';

export async function list(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await productsService.listProducts(query);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const product = await productsService.createProduct(req.body, req.user.id, ipAddress, userAgent);
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const product = await productsService.getProductById(req.params.id);
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const updated = await productsService.updateProduct(req.params.id, req.body, req.user.id, ipAddress, userAgent);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await productsService.deleteProduct(req.params.id, req.user.id, ipAddress, userAgent);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// -----------------------------------------------------------------------------
// VARIANT CONTROLLERS
// -----------------------------------------------------------------------------

export async function createVariant(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const variant = await productsService.createVariant(req.params.id, req.body, req.user.id, ipAddress, userAgent);
    res.status(201).json({
      success: true,
      data: variant
    });
  } catch (error) {
    next(error);
  }
}

export async function updateVariant(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const updated = await productsService.updateVariant(
      req.params.id,
      req.params.variantId,
      req.body,
      req.user.id,
      ipAddress,
      userAgent
    );
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

export async function removeVariant(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await productsService.deleteVariant(
      req.params.id,
      req.params.variantId,
      req.user.id,
      ipAddress,
      userAgent
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
