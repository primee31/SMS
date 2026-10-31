# Brightloop SMS - Complete Database Schema Reference

This document provides the full entity relationship, model definitions, field attributes, constraints, indexes, and enums for the entire Brightloop Subscription Management System (SMS) database implemented via Prisma ORM for PostgreSQL.

---

## 1. Enums

| Enum | Allowed Values | Usage |
|------|----------------|-------|
| `Role` | `ADMIN`, `STAFF`, `CUSTOMER` | User role-based access control |
| `CustomerStatus` | `ACTIVE`, `INACTIVE`, `ARCHIVED` | Lifecycle status of a customer record |
| `ProductType` | `SERVICE`, `GOODS` | Catalog item categorization |
| `BillingFrequency` | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` | Subscription and plan cadence |
| `QuotationStatus` | `DRAFT`, `SENT`, `CONFIRMED`, `CANCELLED`, `EXPIRED` | Quotation workflow state |
| `SubscriptionStatus`| `DRAFT`, `QUOTATION`, `CONFIRMED`, `ACTIVE`, `PAUSED`, `CANCELLED`, `CLOSED`, `EXPIRED` | Subscription lifecycle state |
| `InvoiceStatus` | `DRAFT`, `POSTED`, `PAID`, `PARTIALLY_PAID`, `OVERDUE`, `VOID`, `CANCELLED` | Invoice billing state |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` | Transaction state |
| `PaymentMethod` | `CREDIT_CARD`, `BANK_TRANSFER`, `CASH`, `MANUAL`, `CHECK` | Method of payment settlement |
| `DiscountType` | `PERCENTAGE`, `FIXED_AMOUNT` | Coupon and promotional discount calculation |
| `TaxType` | `PERCENTAGE`, `FIXED` | Taxation calculation |
| `NotificationType` | `INFO`, `WARNING`, `SUCCESS`, `BILLING`, `SYSTEM` | Real-time user alert category |

---

## 2. Models (All 21 Implemented Entities)

### 1. `User`
- **Purpose**: Authenticated application accounts (Administrators, Staff agents, and Customers).
- **Fields**:
  - `id`: `String` (UUID PK)
  - `email`: `String` (Unique, Lowercase)
  - `passwordHash`: `String` (bcryptjs)
  - `firstName`: `String`
  - `lastName`: `String`
  - `role`: `Role` (Default: `CUSTOMER`)
  - `isActive`: `Boolean` (Default: `true`)
  - `createdAt`, `updatedAt`: `DateTime`
  - `deletedAt`: `DateTime?` (Soft delete)
- **Relations**: 1-to-1 with `Customer`, 1-to-many with `RefreshToken`, `PasswordResetToken`, `AuditLog`, `Notification`.

### 2. `Customer`
- **Purpose**: Company or individual client profile.
- **Fields**:
  - `id`: `String` (UUID PK)
  - `userId`: `String?` (Unique FK to `User`)
  - `name`: `String`
  - `email`: `String` (Unique)
  - `phone`, `company`, `taxNumber`: `String?`
  - `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`: `String?`
  - `status`: `CustomerStatus` (Default: `ACTIVE`)
  - `notes`: `String?`
  - `createdAt`, `updatedAt`: `DateTime`
  - `deletedAt`: `DateTime?`
- **Relations**: Subscriptions, Invoices, Quotations, Payments, DiscountUsages.

### 3. `Product`
- **Purpose**: Goods or services sold on subscription or as one-off add-ons.
- **Fields**:
  - `id`: `String` (UUID PK)
  - `name`: `String`
  - `type`: `ProductType` (Default: `SERVICE`)
  - `salesPrice`: `Decimal(12, 2)`
  - `costPrice`: `Decimal(12, 2)` (Default: `0.00`)
  - `notes`: `String?`
  - `isActive`: `Boolean` (Default: `true`)
  - `createdAt`, `updatedAt`: `DateTime`, `deletedAt`: `DateTime?`
- **Relations**: 1-to-many with `ProductVariant`, `PlanProduct`, `QuotationLine`, `SubscriptionLine`, `InvoiceLine`.

### 4. `ProductVariant`
- **Purpose**: Product variations with configurable additional pricing (e.g. Odoo brand connector adds +560).
- **Fields**:
  - `id`: `String` (UUID PK)
  - `productId`: `String` (FK to `Product`)
  - `name`: `String`
  - `sku`: `String?`
  - `additionalPrice`: `Decimal(12, 2)` (Default: `0.00`)
  - `isActive`: `Boolean` (Default: `true`)
  - `createdAt`, `updatedAt`: `DateTime`, `deletedAt`: `DateTime?`
- **Indexes**: `@@index([productId])`

### 5. `Plan`
- **Purpose**: Reusable billing definitions.
- **Fields**:
  - `id`: `String` (UUID PK)
  - `name`: `String`
  - `code`: `String` (Unique, uppercase)
  - `description`: `String?`
  - `billingFrequency`: `BillingFrequency` (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`)
  - `price`: `Decimal(12, 2)`
  - `minQuantity`: `Int` (Default: `1`)
  - `availableFrom`, `availableUntil`: `DateTime?`
  - `autoClose`: `Boolean` (Default: `false`)
  - `earlyCloseAllowed`: `Boolean` (Default: `true`)
  - `pauseAllowed`: `Boolean` (Default: `true`)
  - `renewalAllowed`: `Boolean` (Default: `true`)
  - `isActive`: `Boolean` (Default: `true`)
  - `createdAt`, `updatedAt`: `DateTime`, `deletedAt`: `DateTime?`

### 6. `PlanProduct`
- **Purpose**: Join table linking Plans to bundled products with quantities.
- **Constraints**: `@@unique([planId, productId])`

### 7. `QuotationTemplate`
- **Purpose**: Pre-configured terms and validity settings for rapid quotation creation.

### 8. `Quotation` & 9. `QuotationLine`
- **Purpose**: Sales quotes with line items, discounts, taxes, and validity dates.

### 10. `Subscription` & 11. `SubscriptionLine`
- **Purpose**: Active customer recurring contracts, period trackers, next billing dates, and lines.
- **Constraints**: Unique `subscriptionNumber`.

### 12. `Tax`
- **Purpose**: Regional and sales tax rates (e.g. 20% VAT, 10% GST).

### 13. `Discount` & 14. `DiscountUsage`
- **Purpose**: Percentage or fixed coupons, usage tracking, and redemptions.

### 15. `Invoice` & 16. `InvoiceLine`
- **Purpose**: Billing statements generated per billing period.
- **Critical Constraint**: `@@unique([subscriptionId, billingPeriodStart, billingPeriodEnd])` guarantees idempotent billing generation without duplicate invoices.
- **Historical Snapshots**: `InvoiceLine` stores immutable snapshots of `productName`, `variantName`, `unitPrice`, `taxRateSnapshot`, and `total` to maintain audit integrity regardless of future catalog changes.

### 17. `Payment`
- **Purpose**: Payments recorded against invoices with method, status, and reference.
- **Constraints**: Unique `paymentNumber`.

### 18. `Notification`
- **Purpose**: Internal user notifications with read status.

### 19. `AuditLog`
- **Purpose**: Security trail recording action, entity, entityId, oldValues, newValues, ipAddress, userAgent, and actor userId.

### 20. `PasswordResetToken`
- **Purpose**: Cryptographically secure SHA-256 hashed one-time tokens with expiration and single-use enforcement.

### 21. `RefreshToken`
- **Purpose**: Cryptographically secure SHA-256 hashed refresh tokens for JWT rotation and revocation.
