# Rosa Pay Build Checklist

## Core Rule

- [x] Horizon mode: no on-chain proof, no `PAID` status.
- [x] Database stores application state only.
- [x] Stellar remains the source of truth for payment validity.

## Step 1: Architecture Foundation

- [x] Create clear `backend` and `frontend` folders.
- [x] Split backend into config, HTTP, routes, services and repositories.
- [x] Keep Stellar integration behind `packages/stellar`.

## Step 2: Mock Product Completion

- [x] Merchant dashboard mock screens.
- [x] Business creation with mock API.
- [x] Branch creation with mock API.
- [x] Payment request creation with mock API.
- [x] Customer checkout states: pending, paid, expired.
- [x] Merchant payment detail states and receipt.
- [ ] Polish loading, empty and form-level error states.

## Step 3: Backend Domain API

- [x] Consistent API error format.
- [x] Validation details for API errors.
- [x] Merchant payment detail and customer checkout separated.
- [x] Audit service centralized.
- [x] Transaction hash duplicate protection.
- [x] Payment creation idempotency with `Idempotency-Key`.

## Step 4: Database Layer

- [x] Choose SQLite for local development.
- [x] Add SQLite repository.
- [x] Add schema initialization.
- [x] Seed mock data into SQLite.
- [x] Keep mock repository as fallback.
- [x] Verify persistence across server restarts.

## Step 5: Stellar Testnet Verification

- [x] Implement Horizon testnet transaction lookup.
- [x] Verify successful transaction status on-chain.
- [x] Verify destination wallet.
- [x] Verify memo equals payment request ID.
- [x] Verify amount and asset.
- [x] Reject duplicate transaction hashes.
- [x] Only then set DB payment status to `PAID`.

## Step 6: Wallet Signing

- [x] Add Freighter connect flow.
- [x] Build Stellar testnet payment transaction in checkout.
- [x] Submit signed transaction.
- [x] Poll/backend refresh verification result after submit.
- [x] Validate live branch destination wallets as Stellar public keys.
- [x] Add testnet Friendbot funding helper.
- [x] Add Live Test Setup screen for branch/payment creation.
- [x] Add customer Freighter wallet funding helper.
- [ ] Perform live Freighter TESTNET end-to-end payment with real funded wallets.

## Step 7: Production Readiness

- [ ] Merchant auth.
- [ ] Rate limiting.
- [ ] Production env config.
- [ ] Deployment config.
- [ ] End-to-end tests.
