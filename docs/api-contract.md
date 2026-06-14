# Rosa Pay API Contract

## Success Responses

Success responses return the requested resource directly.

Examples:

```json
{
  "business": {
    "id": "bus_123",
    "name": "Rosa Cafe",
    "slug": "rosa-cafe",
    "branches": 0,
    "status": "ACTIVE",
    "received": "0.00 XLM"
  }
}
```

```json
{
  "ok": true,
  "payment": {},
  "payload": {}
}
```

## Error Responses

All API errors use the same shape:

```json
{
  "error": {
    "code": "PAYMENT_AMOUNT_INVALID",
    "message": "Payment amount must be greater than zero.",
    "details": {
      "field": "amount"
    }
  }
}
```

`details` is optional and should contain machine-readable metadata only.

## Current Endpoints

- `GET /api/bootstrap`
- `GET /api/overview`
- `POST /api/testnet/fund`
- `GET /api/businesses`
- `POST /api/businesses`
- `GET /api/branches`
- `POST /api/branches`
- `POST /api/payments`
- `GET /api/payments/:paymentId`
- `POST /api/payments/:paymentId/build-transaction`
- `POST /api/payments/:paymentId/submit-signed-transaction`
- `POST /api/payments/:paymentId/verify`
- `GET /api/checkout/:paymentId`

## Payment Detail vs Checkout

`GET /api/payments/:paymentId` is the merchant-facing detail endpoint. It can return operational metadata such as audit events.

`GET /api/checkout/:paymentId` is the customer-facing checkout endpoint. It returns only the fields needed to render and verify the checkout screen.

## Validation Rules

- Business name is required.
- Branch business, name and destination wallet are required.
- Payment branch, positive amount and supported asset are required.
- Current supported asset is `XLM`.
- Payment verification requires a transaction hash.
- Duplicate transaction hashes are rejected.
- Already-paid and expired payments cannot be verified again.
- In `STELLAR_MODE=horizon`, payment verification requires an on-chain Stellar transaction matching destination, memo, amount and asset.
- Wallet signing builds an unsigned Stellar transaction XDR from the customer's source wallet and submits a Freighter-signed XDR back to the backend.

## Idempotency

`POST /api/payments` supports the `Idempotency-Key` header.

When the same key is used more than once, Rosa Pay returns the original payment response instead of creating a second payment request.

Example:

```http
POST /api/payments
Idempotency-Key: checkout-button-123
```

The response includes:

```json
{
  "idempotency": {
    "key": "checkout-button-123",
    "replayed": false
  }
}
```

On replay, `replayed` is `true`.
