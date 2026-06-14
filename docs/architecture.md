# Rosa Pay Architecture

Rosa Pay is a non-custodial Stellar payment request and checkout product. The first milestone runs with mock data, but the boundaries are shaped for Stellar testnet and later mainnet.

## Applications

- `frontend`: Merchant dashboard and customer checkout UI.
- `backend`: Backend-for-frontend and payment orchestration API.
- `packages/domain`: Shared domain fixtures and model conventions.
- `packages/stellar`: Stellar gateway boundary. Mock implementation exists now; Horizon/Freighter integration belongs here.

## Core Domain

- Merchant: account owner with a public Stellar address.
- Business: merchant-owned brand or shop.
- Branch: payment location with destination public address.
- Payment request: amount, asset, destination, required memo, status, expiration.
- Transaction: verified on-chain payment record tied to one request.
- Customer: public wallet address observed through payments; no Rosa Pay account is required.

## Payment Flow

1. Merchant creates a payment request.
2. API stores the request with a unique ID, memo, destination, amount, asset, network and expiry.
3. Web renders QR/link payload for checkout.
4. Customer opens checkout, connects a Stellar wallet, reviews the payment and signs externally.
5. Backend verifies transaction hash, memo, destination, amount, asset and network.
6. Payment request moves to `PAID`, `FAILED`, or remains `PENDING`.

## Service Boundaries

- `paymentService`: Creates payment requests, reads request state, accepts verification callbacks.
- `stellarGateway`: Owns Horizon/Testnet network calls, transaction lookup and validation.
- `merchantService`: Manages businesses, branches and merchant settings.
- `reportingService`: Aggregates dashboard metrics, customers and transactions.
- `auditService`: Records and lists audit events for domain entities.

## Current Backend Layout

- `backend/src/server.mjs`: HTTP server composition root.
- `backend/src/config`: Runtime config such as port, frontend directory and Stellar mode.
- `backend/src/http`: HTTP primitives for JSON and static file serving.
- `backend/src/routes`: API route matching and response mapping.
- `backend/src/services`: Business logic and orchestration.
- `backend/src/repositories`: Data access boundary. Current implementation is in-memory mock storage.

Current mock implementation keeps data in memory inside the API process. Persistent storage should replace this with tables for merchants, businesses, branches, payment requests, transactions, audit events and idempotency keys.

Current SQLite implementation uses local database storage for the same repository contract. The DB stores application state only; Stellar remains the source of truth for payment validity.

For real verification, run with `STELLAR_MODE=horizon`. In that mode the backend checks Stellar Horizon before moving a payment request to `PAID`.

## Stellar Testnet Plan

- Use Stellar testnet by default.
- Never store private keys or seed phrases.
- Require memo on every merchant payment request.
- Validate destination, memo, asset, amount and ledger network before marking a request paid.
- Add idempotency for transaction hash and payment request ID.
- Use Freighter on web checkout for browser signing first; add WalletConnect/mobile wallet support after the testnet path is stable.
