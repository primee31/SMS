<<<<<<< HEAD
# Brightloop Subscription Management System (SMS)

**Brightloop SMS** is an enterprise-grade subscription management and recurring billing platform built entirely in **JavaScript (ES Modules)**. It enables businesses to manage products and configurable variants, define billing plans, generate quotations, automate recurring billing and invoicing, record payments, and provide role-isolated portals for administrators, staff, and customers.

---

## 1. System Architecture & Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, React Router 7, Axios, React Hook Form, Zod
- **Backend**: Node 22+, Express 5, PostgreSQL, Prisma ORM, JWT, bcryptjs, Zod
- **Testing**: Vitest, Supertest
- **Standards**: 100% JavaScript ES Modules (`.js`, `.jsx`), Zero TypeScript, Zero external SaaS APIs

---

## 2. Phase 2 Implemented Features

### Database Schema (21 Prisma Models)
Complete schema with relations, enums, financial Decimals, indexes, and constraints:
1. `User` - Authentication and role identity (ADMIN, STAFF, CUSTOMER)
2. `Customer` - Client profile with user ownership relation
3. `Product` - Goods and services catalog with sales and cost prices
4. `ProductVariant` - Variants with configurable additional pricing (+560 Odoo connector example)
5. `Plan` - Daily, weekly, monthly, and yearly recurring billing definitions
6. `PlanProduct` - Many-to-many join linking plans to bundled catalog items
7. `QuotationTemplate` - Reusable quotation terms and validity defaults
8. `Quotation` - Sales quotes with line items, discounts, and taxes
9. `QuotationLine` - Line items with variant additional pricing
10. `Subscription` - Recurring subscription contracts with auto-renewal policies
11. `SubscriptionLine` - Individual subscribed items and pricing
12. `Tax` - Configurable taxes (VAT 20%, GST 10%)
13. `Discount` - Percentage and fixed-amount coupons
14. `DiscountUsage` - Redemption tracking per customer and subscription
15. `Invoice` - Invoices with composite unique constraint `[subscriptionId, billingPeriodStart, billingPeriodEnd]` preventing duplicate billing
16. `InvoiceLine` - Immutable historical price and tax rate snapshots
17. `Payment` - Multi-method payment records (Credit card, bank transfer, manual, cash)
18. `Notification` - In-app alerts and notifications
19. `AuditLog` - Comprehensive security audit trail
20. `PasswordResetToken` - SHA-256 hashed one-time tokens with expiration
21. `RefreshToken` - SHA-256 hashed refresh tokens with automatic rotation

### Authentication & Security
- **Self-Registration**: Customer signup enforcing password complexity (>8 chars, uppercase, lowercase, special char) and role isolation (`CUSTOMER`).
- **JWT & Refresh Rotation**: Short-lived access tokens with rotating refresh tokens stored hashed in PostgreSQL and delivered via HTTP-only cookies.
- **Password Reset**: Cryptographically secure one-time tokens with expiry and reuse prevention (local development workflow with dev token).
- **Role-Based Access Control (RBAC)**: Distinct permissions for `ADMIN`, `STAFF`, and `CUSTOMER`.
- **Resource Ownership**: Customer data isolation ensuring customers can only access their own records.

### Complete CRUD Modules & Workflows
1. **Users**: Admin-only staff creation, pagination, role filtering, soft delete.
2. **Customers**: Profile management, search, status filtering, audit logging.
3. **Products & Variants**: Catalog management, configurable variant additional pricing (+560 Odoo connector), effective price calculations.
4. **Plans**: Daily, weekly, monthly, yearly cadence, min quantity, availability dates, auto-close, pause, and renewal policies.
5. **Quotations**: Quote creation with variant pricing, line discounts, taxes, and status transitions (`DRAFT` -> `SENT` -> `CONFIRMED`).
6. **Subscriptions**: Conversion from confirmed quotes or direct creation, auto-renew, lifecycle controls (pause, resume, cancel).
7. **Invoicing**: Snapshotting immutable prices and tax rates, idempotent billing guaranteed by `[subscriptionId, billingPeriodStart, billingPeriodEnd]`.
8. **Payments & Settlement**: Multi-method offline payment recording (bank transfer, check, manual, credit card), automated invoice balance recalculation (`POSTED` -> `PARTIALLY_PAID` -> `PAID`).

---

## 3. Demo Credentials (Development Only)

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Admin** | `admin@brightloop.com` | `Admin#1234` | Full access, create Staff, catalog, plans, audit logs |
| **Staff 1** | `sarah.ops@brightloop.com` | `Staff#1234` | Manage customers, quotes, subscriptions, payments |
| **Staff 2** | `michael.support@brightloop.com` | `Staff#1234` | Customer operations and support |
| **Customer** | `acme.corp@example.com` | `Customer#1234` | Customer portal, own subscriptions & invoices |

---

## 4. Quick Start & Commands

### Prerequisites
- Node.js 22+ & npm 10+
- PostgreSQL database instance (local PostgreSQL or cloud Neon/Supabase)

### 1. Installation
```bash
# From workspace root
npm install
```

### 2. Environment Configuration
Create `backend/.env` with your PostgreSQL database credentials:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<database>?schema=public"
JWT_SECRET="brightloop_super_secure_jwt_access_secret_2026_key!"
JWT_REFRESH_SECRET="brightloop_super_secure_jwt_refresh_secret_2026_key!"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
REDIS_URL="redis://localhost:6379"
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL="http://localhost:4000/api/v1"
```

### 3. Database Migration & Seed
```bash
# Validate Prisma schema
npm --workspace backend exec prisma validate

# Run database migrations
npm run db:migrate

# Seed database with demo admin, staff, customers, products & plans
npm run db:seed
```

### 4. Running the Application
```bash
# Start backend server (http://localhost:4000)
npm run dev:backend

# Start frontend application (http://localhost:5173)
npm run dev:frontend
```

### 5. Running Automated Tests
```bash
# Run Vitest test suite (5 test suites, 33 tests)
npm test
```

### 6. Production Build
```bash
# Build frontend for production
npm run build
```

---

## 5. Documentation
- [DATABASE_SCHEMA.md](file:///f:/ai/sms/shared/DATABASE_SCHEMA.md) - Complete entity relationship and model dictionary.
- [API_CONTRACT.md](file:///f:/ai/sms/shared/API_CONTRACT.md) - Detailed request and response examples for all API endpoints.
- [PROJECT_RULES.md](file:///f:/ai/sms/shared/PROJECT_RULES.md) - Engineering rules, security constraints, and architectural guidelines.
=======
# SMS
# Brightloop Subscription Management System (SMS)

**Brightloop SMS** is an enterprise‑grade, full‑stack subscription management platform built with **JavaScript only**. It supports product & plan configuration, quotations, subscription lifecycles, recurring billing, invoicing, taxes, discounts, payments, analytics and a customer portal – all without any external SaaS APIs.

## Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui, Lucide, React Router 7, Axios, React‑Hook‑Form, Zod
- **Backend**: Node 22+, Express 5, PostgreSQL (Neon or local), Prisma ORM, JWT, bcryptjs, Zod
- **Background Jobs**: Redis, BullMQ, node‑cron (worker process)
- **Testing**: Vitest, Supertest, Playwright
- **Containerisation**: Docker‑Compose (Redis, optional PostgreSQL)

## Repository Structure
```
subscription-management-system/
  frontend/
    ...
  backend/
    ...
  shared/
    API_CONTRACT.md
    DATABASE_SCHEMA.md
    PROJECT_RULES.md
  docker-compose.yml
  package.json
  .gitignore
  README.md
```

## Prerequisites
- Node 22+ (npm 10+)
- Docker Desktop (for Redis & optional PostgreSQL)
- PostgreSQL instance (local or Neon) – see `.env.example`

## Quick Start (Development)
```bash
# Install dependencies for all packages
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit the .env files with your DB credentials

# Run database migrations and seed data
npm run db:migrate
npm run db:seed

# Start the whole stack (frontend, backend, worker)
npm run dev
```
- Frontend runs at **http://localhost:5173**
- Backend API at **http://localhost:4000/api/v1**
- Worker process logs background jobs.

## Scripts
| Script | Description |
|--------|-------------|
| `install:all` | Installs dependencies for root, frontend and backend |
| `dev` | Starts frontend, backend and worker concurrently |
| `dev:frontend` | Starts Vite dev server |
| `dev:backend` | Starts Express server |
| `worker` | Starts BullMQ worker process |
| `db:migrate` | Runs Prisma migrations |
| `db:seed` | Executes seed script |
| `test` | Runs all Vitest, Supertest and Playwright tests |
| `build` | Builds frontend for production |

## Production Build
```bash
npm run build   # builds frontend assets
# Deploy backend (Node) and serve built static files via any static server or CDN.
```

## Documentation
- **API contract** – `shared/API_CONTRACT.md`
- **Database schema** – `shared/DATABASE_SCHEMA.md`
- **Project rules** – `shared/PROJECT_RULES.md`
>>>>>>> 273eb49be7302666d0ff6070584877ca75f99098
