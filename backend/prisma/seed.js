import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting Brightloop SMS database seeding...');

  // 1. Seed Roles & Users
  const adminPasswordHash = await bcrypt.hash('Admin#1234', 10);
  const staffPasswordHash = await bcrypt.hash('Staff#1234', 10);
  const customerPasswordHash = await bcrypt.hash('Customer#1234', 10);

  // Admin Account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@brightloop.com' },
    update: {},
    create: {
      email: 'admin@brightloop.com',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log(`[Seed] Admin user created/verified: ${admin.email}`);

  // Staff Account 1
  const staff1 = await prisma.user.upsert({
    where: { email: 'sarah.ops@brightloop.com' },
    update: {},
    create: {
      email: 'sarah.ops@brightloop.com',
      passwordHash: staffPasswordHash,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: 'STAFF',
      isActive: true
    }
  });

  // Staff Account 2
  const staff2 = await prisma.user.upsert({
    where: { email: 'michael.support@brightloop.com' },
    update: {},
    create: {
      email: 'michael.support@brightloop.com',
      passwordHash: staffPasswordHash,
      firstName: 'Michael',
      lastName: 'Chang',
      role: 'STAFF',
      isActive: true
    }
  });
  console.log(`[Seed] Staff users created/verified: ${staff1.email}, ${staff2.email}`);

  // 2. Seed 5 Customers (with linked login accounts)
  const customerData = [
    {
      email: 'acme.corp@example.com',
      firstName: 'Alice',
      lastName: 'Morgan',
      name: 'Alice Morgan (Acme Corp)',
      company: 'Acme Corporation',
      phone: '+1-555-0101',
      taxNumber: 'US-TAX-88491',
      addressLine1: '100 Innovation Way',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'USA'
    },
    {
      email: 'techflow.inc@example.com',
      firstName: 'David',
      lastName: 'Ross',
      name: 'David Ross (TechFlow)',
      company: 'TechFlow Systems Inc',
      phone: '+1-555-0102',
      taxNumber: 'US-TAX-33921',
      addressLine1: '450 Silicon Blvd',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'USA'
    },
    {
      email: 'solardrive.io@example.com',
      firstName: 'Elena',
      lastName: 'Rostova',
      name: 'Elena Rostova (SolarDrive)',
      company: 'SolarDrive Technologies',
      phone: '+1-555-0103',
      taxNumber: 'US-TAX-55201',
      addressLine1: '12 Green Energy Park',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'USA'
    },
    {
      email: 'nexus.global@example.com',
      firstName: 'Marcus',
      lastName: 'Vance',
      name: 'Marcus Vance (Nexus Global)',
      company: 'Nexus Global Logistics',
      phone: '+1-555-0104',
      taxNumber: 'US-TAX-77114',
      addressLine1: '88 Harbour Street',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'USA'
    },
    {
      email: 'vertex.labs@example.com',
      firstName: 'Sophia',
      lastName: 'Chen',
      name: 'Sophia Chen (Vertex Labs)',
      company: 'Vertex Research Labs',
      phone: '+1-555-0105',
      taxNumber: 'US-TAX-99234',
      addressLine1: '200 Research Way',
      city: 'Boston',
      state: 'MA',
      postalCode: '02108',
      country: 'USA'
    }
  ];

  for (const c of customerData) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        passwordHash: customerPasswordHash,
        firstName: c.firstName,
        lastName: c.lastName,
        role: 'CUSTOMER',
        isActive: true
      }
    });

    await prisma.customer.upsert({
      where: { email: c.email },
      update: {},
      create: {
        userId: user.id,
        name: c.name,
        email: c.email,
        company: c.company,
        phone: c.phone,
        taxNumber: c.taxNumber,
        addressLine1: c.addressLine1,
        city: c.city,
        state: c.state,
        postalCode: c.postalCode,
        country: c.country,
        status: 'ACTIVE'
      }
    });
  }
  console.log('[Seed] 5 Sample Customers & linked logins created/verified');

  // 3. Seed Products and Variants (including Odoo brand variant with +560)
  const product1 = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Enterprise ERP Cloud Suite',
      type: 'SERVICE',
      salesPrice: 1200.00,
      costPrice: 400.00,
      notes: 'Unified ERP solution for inventory, accounts, and order processing'
    }
  });

  // Variants for Product 1:
  await prisma.productVariant.upsert({
    where: { id: '00000000-0001-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0001-0000-0000-000000000001',
      productId: product1.id,
      name: 'Standard Edition',
      sku: 'ERP-STD',
      additionalPrice: 0.00
    }
  });

  // ODOO BRAND VARIANT (Adds 560 as requested in prompt & PDF)
  await prisma.productVariant.upsert({
    where: { id: '00000000-0001-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0001-0000-0000-000000000002',
      productId: product1.id,
      name: 'Odoo Brand Connector & Sync',
      sku: 'ERP-ODOO-560',
      additionalPrice: 560.00 // Configurable variant pricing: +560
    }
  });

  const product2 = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Brightloop CRM Pro',
      type: 'SERVICE',
      salesPrice: 450.00,
      costPrice: 120.00,
      notes: 'Customer relationship and sales pipeline intelligence'
    }
  });

  await prisma.productVariant.upsert({
    where: { id: '00000000-0001-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0001-0000-0000-000000000003',
      productId: product2.id,
      name: 'Core Team (10 Users)',
      sku: 'CRM-10',
      additionalPrice: 0.00
    }
  });

  const product3 = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Dedicated Cloud Hardware Appliance',
      type: 'GOODS',
      salesPrice: 2400.00,
      costPrice: 1600.00,
      notes: 'On-premise edge caching server and gateway'
    }
  });

  await prisma.productVariant.upsert({
    where: { id: '00000000-0001-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0001-0000-0000-000000000004',
      productId: product3.id,
      name: '64GB RAM Edge Node',
      sku: 'SRV-64G',
      additionalPrice: 0.00
    }
  });

  const product4 = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Automated Disaster Recovery Backup',
      type: 'SERVICE',
      salesPrice: 99.00,
      costPrice: 25.00,
      notes: 'Continuous encrypted cloud replication'
    }
  });

  const product5 = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      name: '24/7 Dedicated Support SLA',
      type: 'SERVICE',
      salesPrice: 300.00,
      costPrice: 90.00,
      notes: '15-minute guaranteed response time with designated lead architect'
    }
  });

  console.log('[Seed] 5 Products and Product Variants created/verified');

  // 4. Seed 4 Plans (Daily, Weekly, Monthly, Yearly)
  await prisma.plan.upsert({
    where: { code: 'PLAN_DAILY_DEV' },
    update: {},
    create: {
      name: 'Developer On-Demand Daily',
      code: 'PLAN_DAILY_DEV',
      description: 'Daily billing plan for testing and sprint environments',
      billingFrequency: 'DAILY',
      price: 29.00,
      minQuantity: 1,
      autoClose: false,
      earlyCloseAllowed: true,
      pauseAllowed: true,
      renewalAllowed: true
    }
  });

  await prisma.plan.upsert({
    where: { code: 'PLAN_WEEKLY_SPRINT' },
    update: {},
    create: {
      name: 'Sprint Team Weekly Access',
      code: 'PLAN_WEEKLY_SPRINT',
      description: 'Weekly subscription for fast-paced project teams',
      billingFrequency: 'WEEKLY',
      price: 149.00,
      minQuantity: 1,
      autoClose: false,
      earlyCloseAllowed: true,
      pauseAllowed: true,
      renewalAllowed: true
    }
  });

  await prisma.plan.upsert({
    where: { code: 'PLAN_MONTHLY_BIZ' },
    update: {},
    create: {
      name: 'Business Growth Monthly Plan',
      code: 'PLAN_MONTHLY_BIZ',
      description: 'Monthly recurring plan with full SaaS capabilities',
      billingFrequency: 'MONTHLY',
      price: 499.00,
      minQuantity: 1,
      autoClose: false,
      earlyCloseAllowed: true,
      pauseAllowed: true,
      renewalAllowed: true
    }
  });

  await prisma.plan.upsert({
    where: { code: 'PLAN_YEARLY_ENT' },
    update: {},
    create: {
      name: 'Enterprise Annual Contract',
      code: 'PLAN_YEARLY_ENT',
      description: 'Annual enterprise subscription with discounted pricing',
      billingFrequency: 'YEARLY',
      price: 4990.00,
      minQuantity: 1,
      autoClose: false,
      earlyCloseAllowed: true,
      pauseAllowed: true,
      renewalAllowed: true
    }
  });

  console.log('[Seed] 4 Plans (Daily, Weekly, Monthly, Yearly) created/verified');

  // 5. Seed Taxes
  await prisma.tax.upsert({
    where: { code: 'VAT_20' },
    update: {},
    create: {
      name: 'Standard Value Added Tax 20%',
      code: 'VAT_20',
      rate: 0.2000,
      type: 'PERCENTAGE',
      isDefault: true,
      description: 'Default 20% VAT rate'
    }
  });

  await prisma.tax.upsert({
    where: { code: 'GST_10' },
    update: {},
    create: {
      name: 'Goods & Services Tax 10%',
      code: 'GST_10',
      rate: 0.1000,
      type: 'PERCENTAGE',
      isDefault: false,
      description: '10% regional GST rate'
    }
  });
  console.log('[Seed] Sample Taxes created/verified');

  // 6. Seed Discounts
  await prisma.discount.upsert({
    where: { code: 'LAUNCH20' },
    update: {},
    create: {
      code: 'LAUNCH20',
      description: '20% Off Launch Promotion',
      type: 'PERCENTAGE',
      value: 20.00,
      maxUses: 100
    }
  });

  await prisma.discount.upsert({
    where: { code: 'FLAT50OFF' },
    update: {},
    create: {
      code: 'FLAT50OFF',
      description: '$50 Off First Subscription Invoice',
      type: 'FIXED_AMOUNT',
      value: 50.00,
      maxUses: 50
    }
  });
  console.log('[Seed] Sample Discounts created/verified');

  console.log('[Seed] ✅ Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
