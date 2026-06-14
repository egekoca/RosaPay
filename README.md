# Rosa Pay

Mock-first Stellar payment request and checkout application.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

If port `3000` is already in use:

```bash
PORT=3001 npm run dev
```

The current milestone serves the frontend through the backend server. So `npm run dev`, `npm run backend:dev` and `npm run frontend:dev` all start the same local Rosa Pay app.

By default the app uses SQLite:

```bash
npm run dev
```

The local database is created at `backend/data/rosapay.sqlite`. To use the old in-memory mock store:

```bash
DATA_STORE=mock npm run dev
```

To choose a custom SQLite file:

```bash
DATABASE_PATH=/tmp/rosapay.sqlite npm run dev
```

Mock Stellar verification is used by default for local UI work. To require real Stellar testnet Horizon verification:

```bash
STELLAR_MODE=horizon npm run dev
```

In `horizon` mode a payment is marked `PAID` only after the transaction is found on Stellar and destination, memo, amount and asset all match the payment request.

For real wallet checkout, install Freighter, switch it to TESTNET, then run:

```bash
STELLAR_MODE=horizon npm run dev
```

For live testing, create a branch whose destination wallet is a real Stellar TESTNET public key. The Branches screen includes a Friendbot helper to fund testnet wallets.

The Merchant menu also includes `Live Test Setup`, which creates a valid branch and payment request for a real testnet wallet in one flow.

The customer wallet screen includes `Fund Freighter Testnet Wallet` so the paying wallet can receive testnet XLM before signing.

## Structure

- `frontend`: Merchant dashboard and customer checkout UI.
- `backend`: Mock API, backend services and web server.
- `packages/domain`: Shared mock data and payment payload helpers.
- `packages/stellar`: Stellar gateway boundary. The current gateway is mock-only and shaped for testnet verification.
- `docs/architecture.md`: Architecture notes and Stellar testnet plan.
- `docs/api-contract.md`: API success/error response contract.
- `docs/project-plan.md`: Step-by-step project plan.
- `docs/checklist.md`: Trackable build checklist.

## Current Flows

- Merchant dashboard with businesses, branches, payment requests, transactions, customers, security and settings screens.
- Create mock payment request through `POST /api/payments`.
- Render checkout link and QR payload.
- Build Freighter-signed Stellar testnet payments and verify them on-chain in `STELLAR_MODE=horizon`.
