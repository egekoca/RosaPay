# Rosa Pay Project Plan

## Step 1: Architecture Foundation

Status: done.

- Create clear `backend` and `frontend` folders.
- Split backend into config, HTTP helpers, routes, services and repositories.
- Keep shared domain models and Stellar integration behind package boundaries.
- Run mock UI and mock API from one local command.

## Step 2: Mock Product Completion

Status: done for backend Horizon verification.

- Finish merchant dashboard screens.
- Finish business, branch and payment request CRUD flows.
- Finish customer checkout flow: scan, checkout, wallet selection, review, success.
- Add realistic empty, loading, error and paid/expired states.

Current progress:

- Business creation works through mock API.
- Branch creation works through mock API.
- Payment request creation and mock verification already work.
- Payment amount validation, unsupported asset validation and missing branch validation work.
- Payment requests now carry `createdAt`, `expiresAt` and expiry display metadata.
- Verification rejects duplicate transaction hashes, already-paid payments and expired payments.
- Checkout API returns current payment status and receipt transaction details.
- Customer checkout now has pending, paid and expired status views plus manual status refresh.
- Success receipt shows transaction hash, customer wallet and network.
- Merchant payment detail now refreshes current status from API and shows receipt details for paid payments.
- Merchant payment detail hides the payable QR after paid/expired status.

## Step 3: Backend Domain API

Status: in progress.

- Add request validation for create payment and verify payment.
- Add explicit service methods for merchants, businesses, branches, payments, transactions and audit logs.
- Add consistent API error format.
- Add idempotency rules for payment creation and transaction verification.

Current progress:

- API errors now use `{ error: { code, message, details } }`.
- Bad JSON returns `400 BAD_JSON`.
- Validation errors include machine-readable field details.
- Frontend API client supports the new error format.
- Current API contract is documented in `docs/api-contract.md`.
- Payment service now separates merchant `getPaymentDetail` from customer `getCheckout`.
- Audit event writes are centralized in `auditService`.
- `POST /api/payments` supports `Idempotency-Key` and replays the original payment response for repeated keys.

Step 3 completion notes:

- Domain APIs are separated enough for the mock milestone.
- Validation and error response contracts are stable enough for the database layer.
- Transaction hash idempotency and payment creation idempotency are both covered in mock storage.

## Step 4: Database Layer

Status: done for initial SQLite layer.

- Choose SQLite for local speed or PostgreSQL for production alignment.
- Replace in-memory repository with database repositories.
- Add migrations for merchants, businesses, branches, payment requests, transactions, customers and audit events.
- Keep mock seed data for local development.

Current progress:

- SQLite selected for local development.
- Build checklist created in `docs/checklist.md`.
- SQLite repository added with schema initialization.
- Mock seed data is written into SQLite on first boot.
- `DATA_STORE=mock` keeps the old in-memory store available as fallback.
- Payment requests and idempotency records persist across server restarts.

## Step 5: Stellar Testnet Verification

Status: in progress.

- Implement Horizon testnet transaction lookup in `packages/stellar`.
- Verify transaction hash, destination, memo, amount, asset and network.
- Reject duplicate transaction hashes.
- Add polling or webhook-like status refresh for pending requests.

Current progress:

- `STELLAR_MODE=horizon` enables real Stellar Horizon transaction lookup.
- Horizon verification checks successful transaction, memo, destination, amount and asset.
- DB payment status changes to `PAID` only when the Stellar gateway returns `ok: true`.
- Mock mode remains available for local UI development.
- API-level test confirms invalid hash is rejected and payment remains `PENDING` in `horizon` mode.

## Step 6: Wallet Signing

Status: in progress.

- Add Freighter wallet connection to checkout.
- Build and submit Stellar testnet payment transaction from the browser wallet.
- Keep Rosa Pay non-custodial: no private keys, no seed phrases, no custody.
- Add WalletConnect/mobile wallet support after Freighter is stable.

Current progress:

- Checkout uses Freighter `requestAccess`, `getNetwork` and `signTransaction`.
- Backend can build unsigned Stellar payment XDR for the selected payment request.
- Backend can submit signed XDR to Horizon and then verify the resulting hash before marking `PAID`.
- Branch creation validates real Stellar public keys.
- Testnet Friendbot funding helper is available at `POST /api/testnet/fund`.
- Merchant UI includes a Live Test Setup screen for creating a real testnet branch and payment request.

## Step 7: Production Readiness

- Add auth for merchant dashboard.
- Add rate limiting and audit logging.
- Add environment config for testnet/mainnet.
- Add deployment setup.
- Add end-to-end tests for payment request and checkout flows.
