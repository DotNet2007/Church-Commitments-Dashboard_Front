# Frontend Integration Guide — Revenues & Expenses

This document describes the Revenue and Expense APIs exposed by the current NestJS backend.

> Base URL examples below use `https://YOUR_API_HOST`. Replace it with your deployed API URL.
> All routes include the `/api` prefix and require JWT authentication.

## 1. Authentication and common behavior

Send the access token returned by login with every request:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

The backend derives the organization and user IDs from the authenticated JWT. **Do not send `OrganizationId`, `UserId`, `CreatedBy`, or journal-entry fields from the frontend.**

- Amounts are decimal values with a maximum of two decimal places.
- Dates should be sent as ISO date strings, e.g. `2026-11-20`.
- List endpoints return `{ data, meta }` pagination objects.
- Normal list/detail endpoints exclude soft-deleted transactions.
- The backend creates accounting journal entries automatically. The frontend must not create journal entries itself.
- Use the account IDs supplied by the existing Accounts API/UI. This document does not define new account/category lookup endpoints.

---

# 2. Expenses

## 2.1 Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/expenses` | Create one expense |
| `GET` | `/api/expenses` | List expenses with pagination and filters |
| `GET` | `/api/expenses/:id` | Get one expense and its journal history |
| `PATCH` | `/api/expenses/:id` | Update an expense |
| `DELETE` | `/api/expenses/:id` | Soft-delete an expense and reverse its active posting |

All endpoints require the JWT header.

## 2.2 Create expense — `POST /api/expenses`

### Request fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `TransactionDate` | string | Yes | ISO date string |
| `CategoryId` | number | Yes | Active Expense account/category in the current organization |
| `SubcategoryId` | number or `null` | Conditional | Required when the selected category has active children; must be omitted or `null` when it has none |
| `Description` | string or `null` | No | Maximum 500 characters |
| `ReceiptNumber` | string or `null` | No | Maximum 50 characters |
| `TotalAmount` | number | Yes | Greater than zero; maximum 2 decimal places |
| `PaymentMethod` | string | Yes | `CASH`, `BANK`, or `SPLIT` |
| `CashAmount` | number | Conditional | Non-negative; maximum 2 decimal places |
| `BankAmount` | number | Conditional | Non-negative; maximum 2 decimal places |

### Category and subcategory behavior

The frontend should load/select the category first, then show only its children as subcategory choices.

- If the category has active subcategories, the user **must** select one.
- If the category has no active subcategories, do not allow a subcategory selection and send `SubcategoryId: null` or omit the field.
- A subcategory must be an active, non-group, direct child of the selected category and belong to the authenticated organization.
- If the category has no children, it must itself be a posting account (not a group account).
- The backend validates all these rules; frontend checks are for user experience only.

### Payment behavior

`CashAmount + BankAmount` must equal `TotalAmount`.

| `PaymentMethod` | Cash amount | Bank amount |
|---|---:|---:|
| `CASH` | Equal to total | `0` |
| `BANK` | `0` | Equal to total |
| `SPLIT` | Positive amount | Positive amount |

For `CASH` and `BANK`, the backend fills the corresponding full amount automatically if both `CashAmount` and `BankAmount` are omitted. For `SPLIT`, send both amounts explicitly.

### Example: Cash

```json
{
  "TransactionDate": "2026-11-20",
  "CategoryId": 51,
  "SubcategoryId": 52,
  "Description": "Office supplies",
  "ReceiptNumber": "EXP-0001",
  "TotalAmount": 1000,
  "PaymentMethod": "CASH",
  "CashAmount": 1000,
  "BankAmount": 0
}
```

### Example: Bank

```json
{
  "TransactionDate": "2026-11-20",
  "CategoryId": 51,
  "SubcategoryId": 52,
  "TotalAmount": 2500,
  "PaymentMethod": "BANK",
  "CashAmount": 0,
  "BankAmount": 2500
}
```

### Example: Split

```json
{
  "TransactionDate": "2026-11-20",
  "CategoryId": 51,
  "SubcategoryId": 52,
  "Description": "Church maintenance",
  "TotalAmount": 10000,
  "PaymentMethod": "SPLIT",
  "CashAmount": 4000,
  "BankAmount": 6000
}
```

### Example: category without subcategories

```json
{
  "TransactionDate": "2026-11-20",
  "CategoryId": 60,
  "SubcategoryId": null,
  "TotalAmount": 500,
  "PaymentMethod": "CASH",
  "CashAmount": 500,
  "BankAmount": 0
}
```

Do not send an unrelated or arbitrary account ID as a payment source. Payment accounts are resolved by the backend to the organization's operational Cash and Bank accounts.

## 2.3 List expenses — `GET /api/expenses`

### Query parameters

| Parameter | Type | Default | Description |
|---|---|---:|---|
| `page` | number | `1` | Page number, minimum 1 |
| `limit` | number | `20` | Page size, 1–100 |
| `sortOrder` | string | `desc` | `asc` or `desc`; sorts by transaction date and then ID |
| `categoryId` | number | — | Filter by category |
| `subcategoryId` | number | — | Filter by subcategory |
| `paymentMethod` | string | — | `CASH`, `BANK`, or `SPLIT` |
| `dateFrom` | string | — | Inclusive start date |
| `dateTo` | string | — | Inclusive end date |

Example:

```http
GET /api/expenses?page=1&limit=20&sortOrder=desc&categoryId=51&paymentMethod=SPLIT&dateFrom=2026-11-01&dateTo=2026-11-30
```

### Response shape

```json
{
  "data": [
    {
      "Id": 123,
      "TransactionDate": "2026-11-20T00:00:00.000Z",
      "CategoryId": 51,
      "SubcategoryId": 52,
      "Description": "Office supplies",
      "ReceiptNumber": "EXP-0001",
      "TotalAmount": "1000.00",
      "PaymentMethod": "CASH",
      "CashAmount": "1000.00",
      "BankAmount": "0.00",
      "Category": {},
      "Subcategory": {}
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

The `Category` and `Subcategory` values are included account records. Amounts may be serialized as decimal strings by Prisma; handle them as decimal values in the frontend rather than relying on floating-point arithmetic for accounting calculations.

## 2.4 Get expense detail — `GET /api/expenses/:id`

Returns the expense, its `Category` and `Subcategory`, plus `JournalEntries`. Each journal entry includes its `Lines`.

Example route:

```http
GET /api/expenses/123
```

Use this endpoint when opening an expense detail/history view.

## 2.5 Update expense — `PATCH /api/expenses/:id`

Send only the fields being changed. The backend merges the supplied values with the existing transaction, then validates the complete resulting transaction.

Example:

```json
{
  "TransactionDate": "2026-11-21",
  "Description": "Updated office supplies",
  "TotalAmount": 1200,
  "PaymentMethod": "SPLIT",
  "CashAmount": 500,
  "BankAmount": 700
}
```

If changing the category, ensure the subcategory is also updated/cleared as appropriate for the new category's hierarchy.

**Accounting effect:** the backend reverses the previous active journal posting and creates a replacement posting as part of the update. The frontend should make one PATCH request only; do not submit separate journal requests.

## 2.6 Delete expense — `DELETE /api/expenses/:id`

Example:

```http
DELETE /api/expenses/123
```

This is a soft delete, not a physical database deletion. The backend reverses the active journal posting and retains the journal history. Deleted expenses are excluded from normal list/detail results.

---

# 3. Revenues

## 3.1 Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/revenues` | Create and post a Revenue transaction |
| `GET` | `/api/revenues` | List revenues with pagination and filters |
| `GET` | `/api/revenues/:id` | Get one revenue and its journal history |
| `PATCH` | `/api/revenues/:id` | Update a revenue |
| `DELETE` | `/api/revenues/:id` | Soft-delete a revenue and reverse its active posting |

All endpoints require the JWT header.

## 3.2 Create revenue — `POST /api/revenues`

Revenue supports two transaction types:

- `INDIVIDUAL`: one receipt number (optional) and exactly one payment source, Cash or Bank.
- `BATCH`: an optional receipt range and Cash, Bank, or a combination of both.

### Request fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `TransactionType` | string | Yes | `INDIVIDUAL` or `BATCH` |
| `AccountId` | number | Yes | Active, non-group Income account in the current organization |
| `TransactionDate` | string | Yes | ISO date string; cannot be in the future |
| `Description` | string or `null` | No | Maximum 500 characters |
| `TotalAmount` | number | Yes | Greater than zero; maximum 2 decimal places |
| `CashAmount` | number | No at DTO boundary | Non-negative; maximum 2 decimal places; must satisfy payment rules |
| `BankAmount` | number | No at DTO boundary | Non-negative; maximum 2 decimal places; must satisfy payment rules |
| `ReceiptNumber` | number or `null` | No | Individual receipt only; positive integer |
| `ReceiptRangeStart` | number or `null` | No | Batch receipt range start; positive integer |
| `ReceiptRangeEnd` | number or `null` | No | Batch receipt range end; positive integer |

For every Revenue transaction, `CashAmount + BankAmount` must equal `TotalAmount`.

### Example: Individual Revenue paid by Cash

```json
{
  "TransactionType": "INDIVIDUAL",
  "AccountId": 4001,
  "TransactionDate": "2026-11-20",
  "Description": "Individual donation",
  "TotalAmount": 500,
  "CashAmount": 500,
  "BankAmount": 0,
  "ReceiptNumber": 205
}
```

### Example: Individual Revenue paid by Bank

```json
{
  "TransactionType": "INDIVIDUAL",
  "AccountId": 4001,
  "TransactionDate": "2026-11-20",
  "TotalAmount": 750,
  "CashAmount": 0,
  "BankAmount": 750,
  "ReceiptNumber": 206
}
```

An Individual transaction must use exactly one payment source. It cannot use both Cash and Bank, and it cannot include a batch receipt range.

### Example: Batch Revenue with split payment

```json
{
  "TransactionType": "BATCH",
  "AccountId": 4001,
  "TransactionDate": "2026-11-20",
  "Description": "Sunday service",
  "TotalAmount": 10000,
  "CashAmount": 4000,
  "BankAmount": 6000,
  "ReceiptRangeStart": 200,
  "ReceiptRangeEnd": 204
}
```

A Batch transaction cannot include `ReceiptNumber`. If one receipt-range boundary is provided, both `ReceiptRangeStart` and `ReceiptRangeEnd` must be provided. The end must be greater than or equal to the start.

### Receipt uniqueness

Receipt numbers and ranges are checked within the authenticated organization:

- An Individual receipt number cannot already be used or fall inside a Batch receipt range.
- A Batch range cannot overlap another Batch range or contain an Individual receipt number.
- Soft-deleted Revenue records continue reserving their receipt numbers/ranges.

## 3.3 List revenues — `GET /api/revenues`

### Query parameters

| Parameter | Type | Default | Description |
|---|---|---:|---|
| `page` | number | `1` | Page number, minimum 1 |
| `limit` | number | `20` | Page size, 1–100 |
| `sortOrder` | string | `desc` | `asc` or `desc` |
| `transactionType` | string | — | `INDIVIDUAL` or `BATCH` |
| `accountId` | number | — | Filter by Income account |
| `dateFrom` | string | — | Inclusive start date |
| `dateTo` | string | — | Inclusive end date |

Example:

```http
GET /api/revenues?page=1&limit=20&sortOrder=desc&transactionType=INDIVIDUAL&accountId=4001&dateFrom=2026-11-01&dateTo=2026-11-30
```

### Response shape

```json
{
  "data": [
    {
      "Id": 456,
      "TransactionType": "INDIVIDUAL",
      "AccountId": 4001,
      "TransactionDate": "2026-11-20T00:00:00.000Z",
      "Description": "Individual donation",
      "TotalAmount": "500.00",
      "CashAmount": "500.00",
      "BankAmount": "0.00",
      "ReceiptNumber": 205,
      "ReceiptRangeStart": null,
      "ReceiptRangeEnd": null,
      "Account": {
        "Id": 4001,
        "AccountCode": "4001",
        "AccountName": "Donations"
      },
      "ReceiptCount": 1
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

`ReceiptCount` is calculated by the backend and is not stored as a database field. It is the inclusive range size (`ReceiptRangeEnd - ReceiptRangeStart + 1`) when both range boundaries are present; otherwise it is `null`.

## 3.4 Get revenue detail — `GET /api/revenues/:id`

Returns the Revenue record, its Income `Account`, calculated `ReceiptCount`, and `JournalEntries` with their `Lines`.

Example:

```http
GET /api/revenues/456
```

## 3.5 Update revenue — `PATCH /api/revenues/:id`

Send only the fields being changed. The backend merges and validates the complete transaction, including payment totals, transaction type rules, Income account validity, and receipt uniqueness.

Example:

```json
{
  "Description": "Updated Sunday service",
  "TotalAmount": 12000,
  "CashAmount": 5000,
  "BankAmount": 7000
}
```

If changing `TransactionType`, also send the receipt fields and payment values that make the resulting transaction valid.

**Accounting effect:** the backend reverses the previous active journal posting and creates a replacement posting atomically. The frontend should make one PATCH request only.

## 3.6 Delete revenue — `DELETE /api/revenues/:id`

Example:

```http
DELETE /api/revenues/456
```

This soft-deletes the Revenue record and reverses its active journal posting. The record and journal history are retained; receipt numbers/ranges remain reserved.

---

# 4. Accounting behavior handled by the backend

The frontend must not create, edit, reverse, or delete journal entries directly.

## Expense posting

For an Expense of 10,000, paid with 4,000 Cash and 6,000 Bank:

| Account | Debit | Credit |
|---|---:|---:|
| Selected Expense posting account | 10,000 | 0 |
| Cash (account code `1001`) | 0 | 4,000 |
| Bank (account code `1004`) | 0 | 6,000 |

The Expense posting account is:
- the selected Subcategory when the Category has active children; or
- the Category itself when it has no children and is a posting account.

## Revenue posting

For a Revenue of 10,000, received with 4,000 Cash and 6,000 Bank:

| Account | Debit | Credit |
|---|---:|---:|
| Cash (account code `1001`) | 4,000 | 0 |
| Bank (account code `1004`) | 6,000 | 0 |
| Selected Income account | 0 | 10,000 |

Create/update/delete operations, journal postings/reversals, and audit records are handled by the backend in database transactions.

---

# 5. Frontend implementation checklist

## Expenses form

- [ ] Date is required.
- [ ] Load/select an Expense Category.
- [ ] If the Category has children, require one of its Subcategories.
- [ ] If the Category has no children, hide/disable Subcategory and send `null` or omit it.
- [ ] Description is optional.
- [ ] Receipt number is optional.
- [ ] Amount is required and greater than zero.
- [ ] Payment method is Cash, Bank, or Split.
- [ ] Cash and Bank values always add up to the Total.
- [ ] Do not provide attachment upload.
- [ ] Submit only to the Expenses endpoint; do not create journal entries from the frontend.

## Revenues form

- [ ] Choose Individual or Batch.
- [ ] Select an active, non-group Income account.
- [ ] Date is required and cannot be in the future.
- [ ] Total is greater than zero.
- [ ] Cash plus Bank equals Total.
- [ ] Individual: exactly one of Cash or Bank is positive.
- [ ] Batch: Cash, Bank, or both may be used.
- [ ] Individual uses `ReceiptNumber`; Batch uses `ReceiptRangeStart` and `ReceiptRangeEnd`.
- [ ] Do not allow duplicate/overlapping receipt numbers or ranges; still handle backend conflict responses.
- [ ] Display `ReceiptCount` from the API response rather than calculating/storing a separate value in the frontend.

## Shared list/detail behavior

- [ ] Support pagination using `page` and `limit`.
- [ ] Support the relevant date and account/category filters.
- [ ] Display returned decimal amounts accurately.
- [ ] Read journal history from detail responses if the UI needs to show accounting history.
- [ ] After create/update/delete, refresh the relevant list/detail data from the API.
- [ ] Treat delete as soft-delete; do not expect a permanently erased record.

---

# 6. Important implementation boundaries

- Do not send organization or user identifiers in the body.
- Do not expose arbitrary Cash/Bank account selection for these transactions; the backend uses the organization's operational Cash and Bank accounts.
- Do not create journal entries in frontend code.
- Do not assume a successful frontend validation guarantees acceptance; always handle API validation/conflict errors.
- The request/response examples above illustrate the current DTOs and service return shapes. Prisma Decimal fields may arrive as strings.
