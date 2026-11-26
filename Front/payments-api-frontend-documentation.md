# Payments API --- Frontend Update Documentation

This document describes the payment delete and edit endpoints for
frontend implementation.

## Authentication

These endpoints require a valid JWT access token. Send it using the
application's standard authorization header:

``` http
Authorization: Bearer <access_token>
```

## 1. Delete payment

Permanently deletes a payment and its associated allocations.

### Endpoint

``` http
DELETE /api/payments/:id
```

### Example request

``` http
DELETE /api/payments/15
```

No request body is required.

### Success response

``` json
{
  "message": "Payment deleted successfully",
  "paymentId": 15
}
```

### Frontend requirements

-   Add a **Delete** button to each payment.
-   Display a confirmation dialog before deletion.
-   Clearly explain that the operation permanently deletes the payment.
-   After success, refresh the payment list and the member's financial
    details.
-   Display the backend error message if deletion fails.

## 2. Edit payment

Updates payment information. If the payment amount changes, the backend
recalculates allocations for all payments belonging to that member.

### Endpoint

``` http
PATCH /api/payments/:id
```

### Editable fields

  -----------------------------------------------------------------------
  Field                   Type                    Description
  ----------------------- ----------------------- -----------------------
  `ReceiptNumber`         string                  Payment receipt number

  `PaymentMethod`         string                  Payment method,
                                                  e.g. `CASH` or
                                                  `INSTAPAY`

  `Amount`                number                  Payment amount
  -----------------------------------------------------------------------

All fields are optional, but at least one field must be provided.

### Example: update all fields

``` json
{
  "ReceiptNumber": "REC-2026-020",
  "PaymentMethod": "INSTAPAY",
  "Amount": 750
}
```

### Example: update amount only

``` json
{
  "Amount": 500
}
```

### Success response

The endpoint returns the updated payment, including its member
information and allocations. The response follows the backend payment
response structure.

### Allocation recalculation behavior

  Updated field     Recalculates allocations?
  ----------------- ---------------------------
  `ReceiptNumber`   No
  `PaymentMethod`   No
  `Amount`          Yes

When `Amount` changes:

-   The backend recalculates allocations for all payments belonging to
    that member.
-   The backend updates the allocation records as part of the payment
    update operation.
-   The frontend should refresh payment history, allocation details, and
    financial balances after success.

## 3. Error handling

  -----------------------------------------------------------------------
  HTTP status             Meaning                 Suggested frontend
                                                  behavior
  ----------------------- ----------------------- -----------------------
  `200`                   Operation successful    Update or refresh the
                                                  relevant payment and
                                                  financial data.

  `400`                   Invalid request or      Show the backend
                          validation error        message and allow the
                                                  user to correct the
                                                  input.

  `404`                   Payment not found       Show a message that the
                                                  payment may have been
                                                  removed or is
                                                  unavailable.

  `409`                   Conflict, such as a     Show the backend
                          duplicate receipt       message and allow the
                          number or a concurrent  user to retry when
                          financial operation     appropriate.
  -----------------------------------------------------------------------

## 4. Frontend implementation checklist

-   [ ] Include the JWT authorization header.
-   [ ] Add a delete action to each payment.
-   [ ] Confirm with the user before permanently deleting a payment.
-   [ ] Add an edit form for receipt number, payment method, and amount.
-   [ ] Send only the fields changed by the user.
-   [ ] Do not send an empty PATCH body.
-   [ ] After a successful delete, refresh the payment list and member
    financial details.
-   [ ] After a successful edit, refresh payment history, allocation
    details, and financial balances.
-   [ ] Display backend error messages for failed requests.
