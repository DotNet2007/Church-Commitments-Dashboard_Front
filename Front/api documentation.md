# Church Management System --- Frontend API Handoff

**Audience:** Frontend developers\
**Backend:** NestJS + TypeScript + Prisma + Microsoft SQL Server\
**API prefix:** `/api`\
**Local development URL:** `http://localhost:3002/api`\
**Authentication:** JWT Bearer token\
**Token lifetime:** 8 hours

> This guide consolidates the API work completed so far. Examples show
> the expected request/response structure and field names based on the
> agreed backend design. Where the exact runtime response shape has not
> yet been verified, it is explicitly marked as an example to confirm
> against Postman.

---

## 1. Base URL and request conventions

Configure the API base URL in the frontend environment:

```env
VITE_API_BASE_URL=http://localhost:3002/api
```

Use the deployed backend URL in production.

### Headers

For authenticated requests:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Do not send the `Authorization` header for login.

### Naming convention

The backend Prisma model uses PascalCase field names (for example,
`FullName`, `MemberId`, `PaymentDate`). Preserve the exact property
casing in request bodies and when reading responses.

### Dates and money

- Send date-only values as `YYYY-MM-DD`, unless an endpoint explicitly
  expects a date-time.
- Money values are decimal amounts. Treat them as numbers in the UI,
  but avoid floating-point calculations for financial totals; use
  backend-calculated values where available.
- A month in payment allocations is represented by the first day of
  that month, e.g. `2026-03-01`.

### Common status handling

- `401 Unauthorized`: token missing, invalid, expired, or invalidated;
  return the administrator to login.
- `404 Not Found`: requested record does not exist.
- `400 Bad Request`: validation or business-rule error; display the
  returned message near the relevant form.
- `409 Conflict`: duplicate receipt number, conflicting
  commitment/payment state, or concurrency conflict where applicable.
- Other `5xx` responses: show a generic error and log diagnostic
  details; do not expose stack traces to the user.

---

## 2. Authentication

All endpoints below other than login require a valid JWT unless stated
otherwise.

### 2.1 Login

`POST /auth/login`

**Purpose:** Authenticate an administrator and obtain an access token.

**Request body**

```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Successful response --- illustrative**

```json
{
  "access_token": "<jwt>",
  "expiresIn": "8h"
}
```

The actual token property names should be confirmed from the current
`/auth/login` response in Postman. Store the token using the frontend
application's agreed secure session-storage approach. Attach it as a
Bearer token on subsequent authenticated requests.

### 2.2 Current authenticated administrator

`GET /auth/me`

**Purpose:** Verify the current session and retrieve the authenticated
administrator's basic identity.

**Request body:** None.

**Headers:** Bearer token required.

**Successful response --- illustrative**

```json
{
  "id": 1,
  "username": "admin"
}
```

The authenticated request user is based on the JWT strategy's `id` and
`username` properties.

---

## 3. Members

Members represent people who have a monthly financial commitment.
Creating a member also creates their initial commitment in the same
operation and database transaction.

### 3.1 Endpoint summary

---

Method Endpoint Purpose

---

`POST` `/members` Create a member and
their initial monthly
commitment

`GET` `/members` List active members

`GET` `/members/:id` Get one member and its
details

`PATCH` `/members/:id` Update profile fields
only

`PATCH` `/members/:id/close` Soft-close a member

`PATCH` `/members/:id/reopen` Reopen a previously
closed member

---

All require authentication.

### 3.2 Create member with initial commitment

`POST /members`

**Purpose:** Create the member and their first commitment together. If
either creation fails, neither should be saved.

**Request body**

```json
{
  "FullName": "John Doe",
  "Phone": "01234567890",
  "JoiningDate": "2026-01-15",
  "Notes": "Optional notes",
  "MonthlyAmount": 500,
  "EffectiveFrom": "2026-01-01"
}
```

---

Field Type Required Meaning

---

`FullName` string Yes Member's full
name; 2--150
characters

`Phone` string No Phone number;
maximum 30
characters

`JoiningDate` date string Yes Actual joining
date

`Notes` string No Optional notes;
maximum 500
characters

`MonthlyAmount` number Yes Initial monthly
commitment
amount

`EffectiveFrom` date string Yes First month the
commitment
applies from;
use the first
day of the month

---

**Successful response --- illustrative**

```json
{
  "Id": 1,
  "FullName": "John Doe",
  "Phone": "01234567890",
  "JoiningDate": "2026-01-15",
  "Notes": "Optional notes",
  "IsClosed": false,
  "CreatedAt": "2026-01-15T10:00:00.000Z",
  "UpdatedAt": "2026-01-15T10:00:00.000Z",
  "Commitments": [
    {
      "Id": 1,
      "MemberId": 1,
      "MonthlyAmount": "500.00",
      "EffectiveFrom": "2026-01-01",
      "EffectiveTo": null
    }
  ]
}
```

The exact response nesting and decimal serialization should be confirmed
against the running API.

### 3.3 List active members

`GET /members`

**Purpose:** Populate the main Members list.

**Request body:** None.

**Successful response --- illustrative**

```json
[
  {
    "Id": 1,
    "FullName": "John Doe",
    "Phone": "01234567890",
    "JoiningDate": "2026-01-15",
    "Notes": "Optional notes",
    "IsClosed": false,
    "CreatedAt": "2026-01-15T10:00:00.000Z",
    "UpdatedAt": "2026-01-15T10:00:00.000Z"
  }
]
```

Only active members are returned. Closed members are excluded. A
dedicated endpoint to list closed members has not been established in
the API work documented here.

### 3.4 Get member by ID

`GET /members/:id`

Example: `GET /members/1`

**Purpose:** Load a member's detail/edit view and related information.

**Request body:** None.

**Successful response:** One member object. The member detail
implementation may include related commitment history; use the actual
response returned by the API rather than assuming the list response
shape.

### 3.5 Update member profile

`PATCH /members/:id`

**Purpose:** Update profile information only. This operation must not
modify the member's monthly commitment or commitment history.

**Request body:** Send only fields to update.

```json
{
  "FullName": "John Updated",
  "Phone": "01000000000",
  "Notes": "Updated notes"
}
```

Field Type Required

---

`FullName` string No
`Phone` string or null No
`JoiningDate` date string No
`Notes` string or null No

**Successful response:** Updated member object (confirm exact shape from
Postman).

### 3.6 Close member

`PATCH /members/:id/close`

Example: `PATCH /members/1/close`

**Purpose:** Soft-close a member without deleting historical records.

**Request body:** None.

**Successful response:** Updated member record or service result
(confirm exact shape from Postman).

Business effects: - `IsClosed` becomes `true`. - `ClosedAt` and
`ClosedBy` are recorded. - The member no longer appears in
`GET /members`. - Historical commitments, payments, and allocations are
preserved.

The UI should ask for confirmation before closing.

### 3.7 Reopen member

`PATCH /members/:id/reopen`

Example: `PATCH /members/1/reopen`

**Purpose:** Reopen a previously closed member.

**Request body:** None.

**Successful response:** Updated member record or service result
(confirm exact shape from Postman).

Reopening does not automatically create or change a financial
commitment.

---

## 4. Commitments

A commitment defines the monthly amount a member is expected to pay
during an effective date range. Commitment history is preserved;
changing an amount creates a new effective period rather than
overwriting the historical amount.

### 4.1 Endpoint summary

---

Method Endpoint Purpose

---

`GET` `/commitments/member/:memberId` Get a member's
commitment history

`GET` `/commitments/member/:memberId/current` Get the current
applicable commitment

`PATCH` `/commitments/:id` Change a commitment
from a specified
effective month

---

There is no separate initial `POST /commitments` operation in the agreed
design. The initial commitment is created through `POST /members`.

### 4.2 Get commitment history

`GET /commitments/member/:memberId`

Example: `GET /commitments/member/1`

**Purpose:** Display all historical and current commitment periods for a
member.

**Request body:** None.

**Successful response --- illustrative**

```json
[
  {
    "Id": 1,
    "MemberId": 1,
    "MonthlyAmount": "500.00",
    "EffectiveFrom": "2026-01-01",
    "EffectiveTo": "2026-04-30"
  },
  {
    "Id": 2,
    "MemberId": 1,
    "MonthlyAmount": "700.00",
    "EffectiveFrom": "2026-05-01",
    "EffectiveTo": null
  }
]
```

`EffectiveTo: null` means the commitment is ongoing.

### 4.3 Get current commitment

`GET /commitments/member/:memberId/current`

Example: `GET /commitments/member/1/current`

**Purpose:** Retrieve the commitment currently in effect for the member.

**Request body:** None.

**Successful response --- illustrative**

```json
{
  "Id": 2,
  "MemberId": 1,
  "MonthlyAmount": "700.00",
  "EffectiveFrom": "2026-05-01",
  "EffectiveTo": null
}
```

If no current commitment exists, handle the backend's not-found
response.

### 4.4 Change a commitment

`PATCH /commitments/:id`

Example: `PATCH /commitments/1`

**Purpose:** Change the monthly amount from a selected effective month
while preserving the old commitment period.

**Request body --- illustrative**

```json
{
  "MonthlyAmount": 700,
  "EffectiveFrom": "2026-05-01"
}
```

The exact DTO property names should be checked against the current
commitment DTO before frontend implementation.

**Business rules** - The new commitment begins on the effective month
supplied. - The previous commitment ends on the last day of the
preceding month. - Historical amounts remain unchanged. - Unpaid months
before the new effective month retain the old amount; they are not
recalculated. - Commitment periods must not overlap or contain gaps
between consecutive periods. - Only one current ongoing commitment can
exist for a member.

Example: if the old amount is 500 from January and the new amount is 700
effective May, January--April remain at 500 and May onward is 700.

**Successful response:** Updated/new commitment result (confirm exact
response shape from Postman).

---

## 5. Payments

A payment is a recorded receipt from a member. The backend automatically
allocates the payment to the member's oldest unpaid months first. The
frontend must not choose or reorder allocation months.

### 5.1 Endpoint summary

---

Method Endpoint Purpose

---

`POST` `/payments/member/:memberId` Record a payment for a
member and allocate it
automatically

`GET` `/payments` List payments with
pagination and filters

`GET` `/payments/member/:memberId` List one member's
payments with
pagination and filters

`GET` `/payments/:id` Get one payment's
details

`PATCH` `/payments/:id/receipt-number` Correct the receipt
number only

---

All require authentication.

### 5.2 Record payment

`POST /payments/member/:memberId`

Example: `POST /payments/member/1`

**Purpose:** Record a payment and automatically allocate its full amount
to the oldest unpaid months. Payment creation and allocation are one
atomic transaction.

**Request body**

```json
{
  "Amount": 1200,
  "ReceiptNumber": "RCPT-2026-0001",
  "PaymentDate": "2026-03-15",
  "PaymentMethod": "CASH",
  "Notes": "March payment"
}
```

---

Field Type Required Meaning

---

`Amount` number Yes Amount received;
must be positive

`ReceiptNumber` string Yes Manually
entered,
globally unique
receipt number

`PaymentDate` date string Yes Date the payment
was received

`PaymentMethod` string Yes `CASH` or
`INSTAPAY`

`Notes` string No Optional notes

---

**Successful response --- illustrative**

```json
{
  "Id": 1,
  "MemberId": 1,
  "ReceiptNumber": "RCPT-2026-0001",
  "Amount": "1200.00",
  "PaymentDate": "2026-03-15",
  "RecordedAt": "2026-03-15T12:00:00.000Z",
  "PaymentMethod": "CASH",
  "Notes": "March payment",
  "Allocations": [
    {
      "Id": 1,
      "PaymentId": 1,
      "CommitmentId": 1,
      "PeriodMonth": "2026-01-01",
      "AllocatedAmount": "500.00"
    },
    {
      "Id": 2,
      "PaymentId": 1,
      "CommitmentId": 1,
      "PeriodMonth": "2026-02-01",
      "AllocatedAmount": "500.00"
    },
    {
      "Id": 3,
      "PaymentId": 1,
      "CommitmentId": 1,
      "PeriodMonth": "2026-03-01",
      "AllocatedAmount": "200.00"
    }
  ]
}
```

The example illustrates allocation behavior; the actual response may
include additional related member/user fields or use a different nesting
shape.

**Allocation rules** - Oldest unpaid month is filled first. - Partial
allocation of a month is allowed. - Advance payments are allowed. - If
the latest commitment is ongoing (`EffectiveTo: null`), the payment may
cover future months without a fixed future limit. - If the latest
commitment has an end date, that month is the maximum month the payment
can cover. - If a finite commitment period cannot absorb the full
payment, reject the entire payment. Do not save a partial payment. - The
sum of allocations must equal the payment amount. - The backend
determines all allocations; the frontend should display the returned
allocations.

### 5.3 List all payments

`GET /payments`

**Purpose:** Display the payments register with pagination, searching,
filtering, and sorting.

**Request body:** None. All options are query parameters.

**Supported query parameters**

---

Parameter Type Default / allowed Purpose
values

---

`page` number `1` Page number

`limit` number `20`, maximum Rows per page
`100`

`search` string Optional Search receipt
number or member
name

`memberId` number Optional Filter by member

`paymentMethod` string `CASH` or Filter by payment
`INSTAPAY` method

`dateFrom` date Optional Include payments
on/after this
date

`dateTo` date Optional Include payments
on/before this
date

`year` number Optional year needed

`minAmount` number Optional Minimum payment
amount

`maxAmount` number Optional Maximum payment
amount

`sortBy` string `PaymentDate`, Sort field
`RecordedAt`,  
 `Amount`,  
 `ReceiptNumber`

`sortOrder` string `asc` or `desc` Sort direction

---

Example:

```http
GET /payments?page=1&limit=20&search=John&paymentMethod=CASH&dateFrom=2026-01-01&dateTo=2026-03-31&sortBy=PaymentDate&sortOrder=desc
```

**Successful response --- pagination structure**

```json
{
  "data": [
    {
      "Id": 1,
      "MemberId": 1,
      "ReceiptNumber": "RCPT-2026-0001",
      "Amount": "1200.00",
      "PaymentDate": "2026-03-15",
      "RecordedAt": "2026-03-15T12:00:00.000Z",
      "PaymentMethod": "CASH",
      "Notes": "March payment"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Use `meta` to build pagination controls. The `data` array contains the
payment rows.

### 5.4 List payments for one member

`GET /payments/member/:memberId`

Example:

```http
GET /payments/member/1?page=1&limit=10&search=RCPT-2026
```

**Purpose:** Show a member's payment history.

**Request body:** None. Uses the same pagination, search, date, amount,
method, and sorting options supported by the global list, where
applicable.

**Successful response:** Same `{ "data": [...], "meta": {...} }`
pagination structure as `GET /payments`.

### 5.5 Get payment details

`GET /payments/:id`

Example: `GET /payments/1`

**Purpose:** Open a single payment/receipt details view, including its
allocations.

**Request body:** None.

**Successful response --- illustrative**

```json
{
  "Id": 1,
  "MemberId": 1,
  "ReceiptNumber": "RCPT-2026-0001",
  "Amount": "1200.00",
  "PaymentDate": "2026-03-15",
  "RecordedAt": "2026-03-15T12:00:00.000Z",
  "PaymentMethod": "CASH",
  "Notes": "March payment",
  "Allocations": []
}
```

The actual response should be checked for the included member, creator,
and allocation fields.

### 5.6 Change receipt number

`PATCH /payments/:id/receipt-number`

Example: `PATCH /payments/1/receipt-number`

**Purpose:** Correct the receipt number on an existing payment.

**Request body**

```json
{
  "ReceiptNumber": "RCPT-2026-0001-CORRECTED"
}
```

Only the receipt number can be changed. Payment amount, member, payment
date, payment method, notes, and allocations are immutable through the
API. Receipt numbers must remain globally unique.

**Successful response:** Updated payment or update result (confirm exact
shape from Postman).

---

## 6. Audit logs

Audit logs provide a read-only history of successful administrative
actions. They are not technical application logs.

### 6.1 Endpoint summary

Method Endpoint Purpose

---

`GET` `/audit-logs` List audit logs with pagination and filters
`GET` `/audit-logs/:id` Get one audit log entry

All require authentication. Initially, all administrators can read audit
logs; role-based restrictions have not been implemented.

### 6.2 List audit logs

`GET /audit-logs`

**Purpose:** Display the administrative activity history.

**Request body:** None. Use query parameters.

---

Parameter Type Default / allowed Purpose
values

---

`page` number `1` Page number

`limit` number `20`, maximum Rows per page
`100`

`userId` number Optional Filter by
administrator

`action` string Optional Filter by action

`entityName` string Optional Filter by entity
type

`entityId` number Optional Filter by
affected record
ID

`dateFrom` date Optional Start date

`dateTo` date Optional End date

`sortOrder` string `asc` or `desc`; Sort by creation
default `desc` time

---

Example:

```http
GET /audit-logs?page=1&limit=20&entityName=Member&action=CREATE&sortOrder=desc
```

**Successful response --- pagination structure**

```json
{
  "data": [
    {
      "Id": 1,
      "UserId": 1,
      "EntityName": "Member",
      "EntityId": 1,
      "Action": "CREATE",
      "OldValues": null,
      "NewValues": "{\"FullName\":\"John Doe\"}",
      "CreatedAt": "2026-01-15T10:00:00.000Z",
      "User": {
        "Id": 1,
        "Username": "admin"
      }
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

`OldValues` and `NewValues` are serialized JSON strings when populated.
The frontend may parse them for a change-detail view, but should handle
null or invalid JSON safely.

### 6.3 Get audit log by ID

`GET /audit-logs/:id`

Example: `GET /audit-logs/1`

**Purpose:** Show the full details of one audit event.

**Request body:** None.

**Successful response:** One audit log object including the associated
administrator (`User`). Use the same fields shown in the list example.

Audit logs are append-only. There are no update or delete endpoints.

---

## 7. Endpoint index

---

Module Method Endpoint Main use

---

Auth `POST` `/auth/login` Sign in

Auth `GET` `/auth/me` Current
admin/session

Members `POST` `/members` Create member +
initial
commitment

Members `GET` `/members` Active member
list

Members `GET` `/members/:id` Member details

Members `PATCH` `/members/:id` Edit profile

Members `PATCH` `/members/:id/close` Soft-close member

Members `PATCH` `/members/:id/reopen` Reopen member

Commitments `GET` `/commitments/member/:memberId` Commitment
history

Commitments `GET` `/commitments/member/:memberId/current` Current
commitment

Commitments `PATCH` `/commitments/:id` Change commitment
from effective
month

Payments `POST` `/payments/member/:memberId` Record payment +
auto-allocation

Payments `GET` `/payments` Paginated payment
register

Payments `GET` `/payments/member/:memberId` Member payment
history

Payments `GET` `/payments/:id` Payment details

Payments `PATCH` `/payments/:id/receipt-number` Correct receipt
number

Audit logs `GET` `/audit-logs` Paginated audit
history

Audit logs `GET` `/audit-logs/:id` Audit event
details

---

---

## 8. Frontend integration rules

1.  Centralize HTTP calls in API service modules; do not put raw request
    logic in every UI component.
2.  Attach the JWT automatically to authenticated requests.
3.  Handle `401` centrally and return the administrator to login.
4.  Use member/payment/commitment IDs for API operations, never names or
    phone numbers as identifiers.
5.  Do not permanently delete members or payments.
6.  Do not calculate payment allocations in the frontend. Display the
    allocations returned by the backend.
7.  Do not allow editing payment details other than the receipt number.
8.  Keep member profile editing separate from commitment changes.
9.  Show loading, empty, success, and error states.
10. Use pagination metadata returned by the backend rather than assuming
    the number of records.
11. Confirm destructive-looking actions such as closing a member.
12. Treat audit logs as read-only.

### Suggested service organization

```text
src/
  services/
    api.ts
    auth.service.ts
    members.service.ts
    commitments.service.ts
    payments.service.ts
    audit-logs.service.ts
  types/
    auth.types.ts
    member.types.ts
    commitment.types.ts
    payment.types.ts
    audit-log.types.ts
```

---

## 9. Verification notes before frontend integration

The following distinction matters:

- **Previously tested according to the project work:** Authentication,
  Members endpoints, and Payment endpoints.
- **Implementation supplied, but final compile/Postman confirmation
  has not been reported in the project conversation:** Commitment
  endpoints and Audit Logs endpoints.

Before relying on the illustrative response examples, capture the actual
JSON returned by each endpoint in Postman and adjust frontend types to
match it. In particular, verify: - exact login response token
property; - exact create-member and member-detail response nesting; -
exact commitment update response; - exact payment create/detail response
and included relation names; - exact audit-log list/detail response.

This document intentionally does not invent user-management endpoints,
closed-member listing endpoints, payment deletion/voiding endpoints,
manual allocation endpoints, or audit-log mutation endpoints because
these were not established as available API operations in the documented
project work.
