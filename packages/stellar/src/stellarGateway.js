import { Asset, Horizon, Memo, Networks, Operation, StrKey, TransactionBuilder } from "@stellar/stellar-sdk";

export function isValidStellarPublicKey(value) {
  return StrKey.isValidEd25519PublicKey(String(value || ""));
}

export class MockStellarGateway {
  constructor({ network }) {
    this.network = network;
  }

  async verifyPayment({ payment, transactionHash }) {
    if (!transactionHash || transactionHash.length < 6) {
      return { ok: false, status: "FAILED", reason: "INVALID_TRANSACTION_HASH" };
    }

    return {
      ok: true,
      status: "CONFIRMED",
      network: this.network.id,
      transaction: {
        hash: transactionHash,
        memo: payment.memo,
        destination: payment.destination,
        amount: `${payment.amount} ${payment.asset}`,
        fee: "0.00001 XLM"
      }
    };
  }

  async buildPaymentTransaction({ payment, source }) {
    return Buffer.from(JSON.stringify({
      mode: "mock",
      source,
      destination: payment.destination,
      amount: payment.amount,
      asset: payment.asset,
      memo: payment.memo
    })).toString("base64");
  }

  async submitSignedTransaction() {
    return {
      hash: `mock_${Date.now()}`,
      ledger: 0,
      successful: true,
      resultXdr: "mock"
    };
  }

  async fundTestnetAccount({ address }) {
    return {
      ok: true,
      mode: "mock",
      address
    };
  }
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount.toFixed(7);
}

function isLikelyTransactionHash(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ""));
}

export class HorizonStellarGateway {
  constructor({ network, fetchImpl = fetch }) {
    this.network = network;
    this.fetch = fetchImpl;
    this.server = new Horizon.Server(network.horizonUrl);
    this.networkPassphrase = Networks.TESTNET;
  }

  async getJson(path) {
    const url = new URL(path, this.network.horizonUrl);
    const response = await this.fetch(url);

    if (response.status === 404) return null;
    if (!response.ok) {
      return {
        horizonError: true,
        status: response.status,
        body: await response.text()
      };
    }

    return response.json();
  }

  async verifyPayment({ payment, transactionHash }) {
    if (!isLikelyTransactionHash(transactionHash)) {
      return { ok: false, status: "FAILED", reason: "INVALID_TRANSACTION_HASH" };
    }

    const transaction = await this.getJson(`/transactions/${transactionHash}`);
    if (!transaction) {
      return { ok: false, status: "FAILED", reason: "ONCHAIN_TRANSACTION_NOT_FOUND" };
    }

    if (transaction.horizonError) {
      return { ok: false, status: "FAILED", reason: "HORIZON_REQUEST_FAILED" };
    }

    if (!transaction.successful) {
      return { ok: false, status: "FAILED", reason: "ONCHAIN_TRANSACTION_FAILED" };
    }

    if (transaction.memo !== payment.memo) {
      return { ok: false, status: "FAILED", reason: "ONCHAIN_MEMO_MISMATCH" };
    }

    const operations = await this.getJson(`/transactions/${transactionHash}/operations?limit=200`);
    if (!operations || operations.horizonError) {
      return { ok: false, status: "FAILED", reason: "HORIZON_REQUEST_FAILED" };
    }

    const records = operations._embedded?.records || [];
    const paymentOperations = records.filter((operation) => operation.type === "payment");
    const matchingOperation = paymentOperations.find((operation) => {
      const assetMatches = payment.asset === "XLM"
        ? operation.asset_type === "native"
        : operation.asset_code === payment.asset;

      return assetMatches
        && operation.to === payment.destination
        && normalizeAmount(operation.amount) === normalizeAmount(payment.amount);
    });

    if (!matchingOperation) {
      return { ok: false, status: "FAILED", reason: "ONCHAIN_PAYMENT_OPERATION_NOT_FOUND" };
    }

    return {
      ok: true,
      status: "CONFIRMED",
      network: this.network.id,
      transaction: {
        hash: transactionHash,
        memo: transaction.memo,
        destination: matchingOperation.to,
        amount: `${matchingOperation.amount} ${payment.asset}`,
        fee: `${normalizeAmount(Number(transaction.fee_charged || 0) / 10000000)} XLM`,
        customer: matchingOperation.from || transaction.source_account,
        confirmedAt: transaction.created_at,
        ledger: transaction.ledger,
        operationId: matchingOperation.id
      }
    };
  }

  async buildPaymentTransaction({ payment, source }) {
    const account = await this.server.loadAccount(source);
    const fee = await this.server.fetchBaseFee();
    const asset = payment.asset === "XLM" ? Asset.native() : new Asset(payment.asset, payment.assetIssuer);

    return new TransactionBuilder(account, {
      fee: String(fee),
      networkPassphrase: this.networkPassphrase
    })
      .addOperation(Operation.payment({
        destination: payment.destination,
        asset,
        amount: payment.amount
      }))
      .addMemo(Memo.text(payment.memo))
      .setTimeout(180)
      .build()
      .toXDR();
  }

  async submitSignedTransaction({ signedXdr }) {
    const transaction = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
    const response = await this.server.submitTransaction(transaction);

    return {
      hash: response.hash,
      ledger: response.ledger,
      successful: response.successful,
      resultXdr: response.result_xdr
    };
  }

  async fundTestnetAccount({ address }) {
    if (!isValidStellarPublicKey(address)) {
      return { ok: false, reason: "INVALID_STELLAR_PUBLIC_KEY" };
    }

    const url = new URL("https://friendbot.stellar.org");
    url.searchParams.set("addr", address);
    const response = await this.fetch(url);

    if (!response.ok) {
      return {
        ok: false,
        reason: "FRIENDBOT_REQUEST_FAILED",
        status: response.status,
        detail: await response.text()
      };
    }

    return {
      ok: true,
      address,
      response: await response.json()
    };
  }
}

export function createStellarGateway({ network, mode = "mock" }) {
  if (mode === "mock") {
    return new MockStellarGateway({ network });
  }

  if (mode === "horizon") {
    return new HorizonStellarGateway({ network });
  }

  throw new Error(`Unsupported Stellar gateway mode: ${mode}`);
}
