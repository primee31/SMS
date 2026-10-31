# Brightloop SMS - Project Architecture & Engineering Rules

## 1. Core Language & Runtime Constraints
1. **JavaScript ES Modules Only**:
   - Every file must use Node.js standard ES Modules (`import`/`export`).
   - Frontend files must use `.js` and `.jsx`.
   - Backend files must use `.js`.
   - **No TypeScript**: No `.ts`, `.tsx`, `tsconfig.json`, or TypeScript compiler tools.
2. **Zero External SaaS Dependencies**:
   - No Gemini API, OpenAI API, or external LLM services.
   - No external email APIs (SendGrid, Mailgun, AWS SES, etc.). Password resets utilize the secure local token workflow.
   - No external payment gateway SDKs (Stripe, PayPal, etc.). All payment records are processed through internal accounting logic.
3. **Architecture Stack**:
   - Frontend: React 19, Vite, Tailwind CSS, Lucide, React Router 7, Axios, React Hook Form, Zod.
   - Backend: Node 22+, Express 5, PostgreSQL, Prisma ORM, JWT, bcryptjs, Zod.
   - Workers: BullMQ, Redis, node-cron.

---

## 2. Database Design & Integrity Rules
1. **Financial Calculations**:
   - All financial numbers (`salesPrice`, `costPrice`, `additionalPrice`, `subtotal`, `taxAmount`, `discountAmount`, `grandTotal`, `amountPaid`, `amountDue`) must use PostgreSQL `Decimal` (`@db.Decimal(12, 2)`). Never store money as floating point integers/floats.
2. **Historical Integrity for Invoices**:
   - `InvoiceLine` must store snapshots of item prices and tax rates at generation time (`productName`, `variantName`, `unitPrice`, `taxRateSnapshot`, `taxAmount`, `total`). Updating product catalog prices must never alter previously generated invoices.
3. **Idempotent Billing Guarantee**:
   - Invoices require the composite unique constraint:  
     `@@unique([subscriptionId, billingPeriodStart, billingPeriodEnd])`  
     This mathematically prevents duplicate billing for the same subscription period.
4. **Soft Deletes**:
   - Master entities (`User`, `Customer`, `Product`, `ProductVariant`, `Plan`, `Invoice`, etc.) implement `deletedAt DateTime?` to preserve auditability.

---

## 3. Security & Access Control
1. **Password Security**:
   - Minimum 9 characters.
   - Must contain at least 1 uppercase letter, 1 lowercase letter, and 1 special symbol.
   - Hashed using `bcryptjs` with salt rounds = 10.
2. **Token Rotation**:
   - Access tokens have short TTL (15m).
   - Refresh tokens are cryptographically random strings (40 bytes hex), stored as SHA-256 hashes in the `RefreshToken` database table.
   - Automatic rotation: on refresh, the used token is revoked, a new token is created, and old tokens cannot be reused.
   - Delivered in HTTP-only, SameSite=Lax cookies.
3. **Role-Based Access Control (RBAC)**:
   - `ADMIN`: Full management of users, catalog, plans, financial records, audit logs.
   - `STAFF`: Daily operations (customers, quotations, permitted subscriptions, payments). Cannot create staff or modify master catalog.
   - `CUSTOMER`: Access strictly isolated to own customer records (`requireOwnershipOrRole`). Never accept customer-supplied role upon registration.
4. **Audit Logging**:
   - Important create, update, delete, login, and password reset actions are logged to `AuditLog`.

---

## 4. Testing & Verification Rules
1. Every implemented feature must have automated test coverage using Vitest and Supertest.
2. Code is not complete until all test suites pass with zero failures.
3. Tests must cover:
   - Registration and strong password enforcement
   - Duplicate email rejection
   - Authentication, token rotation, and revocation
   - Password reset token expiration and reuse prevention
   - Admin-only staff creation and role enforcement
   - Customer data isolation
   - Product CRUD and configurable variant additional pricing (+560 Odoo connector example)
   - Plan validation (frequencies, policies, date logic)
