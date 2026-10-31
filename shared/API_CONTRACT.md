# Brightloop SMS - API Contract Specification (v1)

Base URL: `/api/v1`  
Protocol: `HTTPS` (or `HTTP` for local development)  
Payload: `application/json`

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/register`
Customer self-registration. Forces role = `CUSTOMER`.
- **Request Body**:
```json
{
  "email": "customer@example.com",
  "password": "Password#2026",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Corp",
  "phone": "+1-555-0100"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c1f7a28e-89a5-4841-8631-0164eef4662d",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Set-Cookie**: `refreshToken=<random_token>; HttpOnly; SameSite=Lax; Path=/api/v1/auth`

---

### `POST /api/v1/auth/login`
Authenticate with email and password.
- **Request Body**:
```json
{
  "email": "admin@brightloop.com",
  "password": "Admin#1234"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e2a149f1-...",
      "email": "admin@brightloop.com",
      "firstName": "System",
      "lastName": "Administrator",
      "role": "ADMIN"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### `POST /api/v1/auth/refresh`
Rotates refresh token and issues new access token.
- **Cookie Header**: `refreshToken=<token>` (or body: `{ "refreshToken": "<token>" }`)
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### `POST /api/v1/auth/logout`
Revokes active refresh token and clears cookie.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `POST /api/v1/auth/forgot-password`
Initiates password reset workflow.
- **Request Body**: `{ "email": "customer@example.com" }`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "If an account exists with this email, a reset link has been generated.",
  "devResetToken": "3f9e8a..."
}
```

---

### `POST /api/v1/auth/reset-password`
Consumes reset token and sets new password.
- **Request Body**:
```json
{
  "token": "3f9e8a...",
  "newPassword": "NewPassword#2026"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in."
}
```

---

### `GET /api/v1/auth/me`
Fetches current authenticated user profile.
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "role": "ADMIN",
    "customer": null
  }
}
```

---

## 2. User Administration Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/users` | `ADMIN` | List users with search, role filter, sorting & pagination |
| `POST` | `/api/v1/users/staff` | `ADMIN` | Create internal Staff member |
| `GET` | `/api/v1/users/:id` | `ADMIN` or Self | Get user profile |
| `PATCH`| `/api/v1/users/:id` | `ADMIN` or Self | Update user details or role |
| `DELETE`| `/api/v1/users/:id` | `ADMIN` | Soft delete user & revoke tokens |

---

## 3. Customer Management Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/customers` | `ADMIN`, `STAFF` | List customers with pagination & filters |
| `POST` | `/api/v1/customers` | `ADMIN`, `STAFF` | Create customer record |
| `GET` | `/api/v1/customers/:id` | `ADMIN`, `STAFF`, Owner | Get customer profile & summary |
| `PATCH`| `/api/v1/customers/:id` | `ADMIN`, `STAFF`, Owner | Update customer fields |
| `DELETE`| `/api/v1/customers/:id` | `ADMIN` | Archive customer record |

---

## 4. Product & Variant Endpoints

### `GET /api/v1/products`
Lists products with variants and effective pricing.
- **Query Params**: `page=1&limit=10&search=ERP&type=SERVICE`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Enterprise ERP Suite",
      "type": "SERVICE",
      "salesPrice": "1200.00",
      "costPrice": "400.00",
      "variants": [
        {
          "id": "...",
          "name": "Odoo Brand Connector",
          "sku": "ERP-ODOO-560",
          "additionalPrice": "560.00",
          "effectivePrice": 1760
        }
      ]
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### `POST /api/v1/products/:id/variants`
Add configurable variant with additional pricing.
- **Request Body**:
```json
{
  "name": "Odoo Brand Connector",
  "sku": "ERP-ODOO-560",
  "additionalPrice": 560
}
```

---

## 5. Billing Plan Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/plans` | Authenticated | List all billing plans |
| `POST` | `/api/v1/plans` | `ADMIN` | Create plan (Daily, Weekly, Monthly, Yearly) |
| `GET` | `/api/v1/plans/:id` | Authenticated | Get plan details and bundled products |
| `PATCH`| `/api/v1/plans/:id` | `ADMIN` | Update plan pricing, policies, or dates |
| `DELETE`| `/api/v1/plans/:id` | `ADMIN` | Soft delete billing plan |

---

---

## 6. Tax Configuration Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/taxes` | Authenticated | List all active taxes (e.g. VAT 20%, GST 10%) |
| `POST` | `/api/v1/taxes` | `ADMIN` | Create a new tax definition (PERCENTAGE or FIXED) |
| `GET` | `/api/v1/taxes/:id` | Authenticated | Retrieve tax details by ID |
| `PATCH`| `/api/v1/taxes/:id` | `ADMIN` | Update tax attributes or rates |
| `DELETE`| `/api/v1/taxes/:id` | `ADMIN` | Soft delete a tax definition |

---

## 7. Discount & Promotion Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/discounts` | `ADMIN`, `STAFF` | List discounts with pagination and status filters |
| `POST` | `/api/v1/discounts` | `ADMIN` | Create coupon/promo code (PERCENTAGE or FIXED_AMOUNT) |
| `POST` | `/api/v1/discounts/validate` | Authenticated | Validate promo code and calculate discount on order amount |
| `GET` | `/api/v1/discounts/:id` | `ADMIN`, `STAFF` | Retrieve discount details by ID |
| `PATCH`| `/api/v1/discounts/:id` | `ADMIN` | Update discount parameters or validity window |
| `DELETE`| `/api/v1/discounts/:id` | `ADMIN` | Soft delete discount definition |

---

## 8. Quotation Endpoints

### `POST /api/v1/quotations`
Create a quote for a customer with line items, optional discount, and taxes.
- **Authorization**: `ADMIN`, `STAFF`
- **Request Body**:
```json
{
  "customerId": "c1f7a28e-...",
  "terms": "Net 30. Standard SLA applies.",
  "validUntil": "2026-12-31T23:59:59.000Z",
  "discountId": "d1e2f3...",
  "lines": [
    {
      "productId": "p1a2b3...",
      "variantId": "v1c2d3...",
      "planId": "plan-uuid-...",
      "quantity": 1,
      "unitPrice": 1200.00,
      "taxId": "tax-uuid-..."
    }
  ]
}
```

### Quotation Lifecycle Endpoints
| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/quotations` | Authenticated | List quotes (Customers limited to own quotes) |
| `GET` | `/api/v1/quotations/:id` | Authenticated | Retrieve quotation details with computed totals |
| `PATCH`| `/api/v1/quotations/:id` | `ADMIN`, `STAFF` | Update quotation details and line items (Draft only) |
| `POST` | `/api/v1/quotations/:id/status` | `ADMIN`, `STAFF` | Transition status (`DRAFT`, `SENT`, `CONFIRMED`, `CANCELLED`) |
| `POST` | `/api/v1/quotations/:id/convert` | `ADMIN`, `STAFF` | Convert confirmed quotation into an active Subscription |
| `DELETE`| `/api/v1/quotations/:id` | `ADMIN` | Soft delete quotation record |

---

## 9. Subscription Endpoints

### `POST /api/v1/subscriptions`
Directly create a recurring subscription contract.
- **Authorization**: `ADMIN`, `STAFF`

### Subscription Lifecycle Endpoints
| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/subscriptions` | Authenticated | List subscriptions (Ownership enforced for Customers) |
| `GET` | `/api/v1/subscriptions/:id` | Authenticated | Retrieve subscription, plan cadence, and billing lines |
| `PATCH`| `/api/v1/subscriptions/:id` | `ADMIN`, `STAFF` | Update subscription metadata, addresses, or renewal flags |
| `POST` | `/api/v1/subscriptions/:id/pause` | `ADMIN`, `STAFF` | Pause subscription recurring cycle |
| `POST` | `/api/v1/subscriptions/:id/resume` | `ADMIN`, `STAFF` | Resume paused subscription |
| `POST` | `/api/v1/subscriptions/:id/cancel` | Authenticated | Cancel subscription with reason log |
| `POST` | `/api/v1/subscriptions/:id/renew` | `ADMIN`, `STAFF` | Force renewal and advance billing cycle date |

---

## 10. Invoice Endpoints

### `POST /api/v1/invoices`
Generate a manual invoice or snapshot an upcoming billing period.
- **Authorization**: `ADMIN`, `STAFF`
- **Idempotency**: Composite unique constraint `[subscriptionId, billingPeriodStart, billingPeriodEnd]` ensures no duplicate billing.

### Invoice Lifecycle Endpoints
| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/invoices` | Authenticated | List invoices with filter by customer, status, date |
| `GET` | `/api/v1/invoices/:id` | Authenticated | Get invoice with immutable price snapshots & tax rates |
| `POST` | `/api/v1/invoices/:id/post` | `ADMIN`, `STAFF` | Post draft invoice to finalized state for collection |
| `POST` | `/api/v1/invoices/:id/void` | `ADMIN` | Void posted invoice with audit reason |

---

## 11. Payment Endpoints

### `POST /api/v1/payments`
Record offline or manual payment settlement against an invoice.
- **Authorization**: `ADMIN`, `STAFF`
- **Request Body**:
```json
{
  "invoiceId": "inv-uuid-...",
  "amount": 1440.00,
  "paymentMethod": "BANK_TRANSFER",
  "transactionReference": "TXN-2026-99881",
  "notes": "Wire transfer received and verified."
}
```
- **Automated Settlement**: Automatically advances invoice status from `POSTED` -> `PARTIALLY_PAID` or `PAID` based on `amountDue` balance.

### Payment Management Endpoints
| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/payments` | Authenticated | List payment records |
| `GET` | `/api/v1/payments/:id` | Authenticated | Get specific payment receipt |
| `POST` | `/api/v1/payments/:id/refund` | `ADMIN` | Process refund and update invoice balance |

---

## 12. Standard Error Format
All errors return consistent JSON:
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error explanation",
    "code": "ERROR_CODE_IDENTIFIER",
    "details": []
  }
}
```

