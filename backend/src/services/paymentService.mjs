import { buildPaymentPayload } from "../../../packages/domain/src/mockData.js";
import { isValidStellarPublicKey } from "../../../packages/stellar/src/stellarGateway.js";

const SUPPORTED_ASSETS = new Set(["XLM"]);
const EXPIRY_OPTIONS = new Map([
  ["15", 15],
  ["30", 30],
  ["60", 60],
  ["1440", 1440]
]);

function validateAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "PAYMENT_AMOUNT_INVALID", details: { field: "amount" } };
  }

  if (amount > 100000) {
    return { ok: false, error: "PAYMENT_AMOUNT_TOO_HIGH", details: { field: "amount", max: 100000 } };
  }

  return { ok: true, amount: amount.toFixed(2) };
}

function resolveExpiryMinutes(value) {
  const key = String(value || "30");
  return EXPIRY_OPTIONS.get(key) || 30;
}

function isExpired(payment) {
  return payment.expiresAt && new Date(payment.expiresAt).getTime() <= Date.now();
}

function formatExpiresIn(minutes) {
  if (minutes >= 1440) return "24h";
  if (minutes >= 60) return `${minutes / 60}h`;
  return `${minutes}m`;
}

function normalizeIdempotencyKey(value) {
  const key = String(value || "").trim();
  return key || null;
}

export function createPaymentService({ store, stellarGateway, network, auditService }) {
  function syncPaymentStatus(payment) {
    if (payment.status === "PENDING" && isExpired(payment)) {
      store.updatePaymentStatus(payment.id, "EXPIRED");
    }

    return payment;
  }

  function buildPaymentDetail(payment) {
    const currentPayment = syncPaymentStatus(payment);

    return {
      payment: currentPayment,
      payload: buildPaymentPayload(currentPayment),
      network,
      transaction: store.findTransactionByPaymentId(currentPayment.id) || null,
      auditEvents: auditService.listForEntity(currentPayment.id)
    };
  }

  function buildCheckout(payment) {
    const currentPayment = syncPaymentStatus(payment);

    return {
      payment: {
        id: currentPayment.id,
        business: currentPayment.business,
        branch: currentPayment.branch,
        amount: currentPayment.amount,
        asset: currentPayment.asset,
        status: currentPayment.status,
        memo: currentPayment.memo,
        destination: currentPayment.destination,
        expiresIn: currentPayment.expiresIn,
        expiresAt: currentPayment.expiresAt,
        description: currentPayment.description
      },
      payload: buildPaymentPayload(currentPayment),
      network,
      transaction: store.findTransactionByPaymentId(currentPayment.id) || null
    };
  }

  return {
    createPayment(input, options = {}) {
      const idempotencyKey = normalizeIdempotencyKey(options.idempotencyKey);
      if (idempotencyKey) {
        const existing = store.findIdempotencyRecord(idempotencyKey);
        if (existing) {
          return {
            ...existing.response,
            idempotency: {
              key: idempotencyKey,
              replayed: true
            }
          };
        }
      }

      const amount = validateAmount(input.amount);
      if (!amount.ok) return amount;

      const asset = input.asset || "XLM";
      if (!SUPPORTED_ASSETS.has(asset)) {
        return { ok: false, error: "PAYMENT_ASSET_UNSUPPORTED", details: { field: "asset", supported: [...SUPPORTED_ASSETS] } };
      }

      const branch = store.listBranches().find((item) => item.id === input.branchId);
      if (!branch) {
        return { ok: false, error: "BRANCH_NOT_FOUND", details: { field: "branchId" } };
      }

      const business = store.listBusinesses().find((item) => item.id === branch.businessId) || store.listBusinesses()[0];
      const id = `pay_${Math.random().toString(36).slice(2, 8)}`;
      const expiresInMinutes = resolveExpiryMinutes(input.expiresInMinutes);
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
      const payment = {
        id,
        businessId: business.id,
        branchId: branch.id,
        business: business.name,
        branch: branch.name,
        amount: amount.amount,
        asset,
        status: "PENDING",
        created: "now",
        createdAt: new Date().toISOString(),
        memo: id,
        destination: branch.wallet,
        expiresIn: formatExpiresIn(expiresInMinutes),
        expiresAt,
        description: input.description || "Rosa Pay payment"
      };

      store.addPayment(payment);
      auditService.record("Payment request created", id);

      const response = {
        ok: true,
        payment,
        payload: buildPaymentPayload(payment),
        ...(idempotencyKey ? { idempotency: { key: idempotencyKey, replayed: false } } : {})
      };

      if (idempotencyKey) {
        store.saveIdempotencyRecord(idempotencyKey, {
          operation: "createPayment",
          paymentId: payment.id,
          response
        });
      }

      return response;
    },

    getPaymentDetail(paymentId) {
      const payment = store.findPaymentById(paymentId);
      if (!payment) return null;

      return buildPaymentDetail(payment);
    },

    getCheckout(paymentId) {
      const payment = store.findPaymentById(paymentId);
      if (!payment) return null;

      return buildCheckout(payment);
    },

    async buildWalletTransaction(paymentId, input) {
      const payment = store.findPaymentById(paymentId);
      if (!payment) return null;

      if (!input.source) {
        return { ok: false, error: "PAYMENT_SOURCE_REQUIRED", details: { field: "source" } };
      }

      if (payment.status === "PAID") {
        return { ok: false, error: "PAYMENT_ALREADY_PAID", details: { paymentId: payment.id, status: payment.status } };
      }

      if (payment.status === "EXPIRED" || isExpired(payment)) {
        store.updatePaymentStatus(payment.id, "EXPIRED");
        return { ok: false, error: "PAYMENT_EXPIRED", details: { paymentId: payment.id, status: "EXPIRED" } };
      }

      if (!isValidStellarPublicKey(payment.destination)) {
        return { ok: false, error: "INVALID_STELLAR_PUBLIC_KEY", details: { field: "destination", paymentId: payment.id } };
      }

      try {
        const unsignedXdr = await stellarGateway.buildPaymentTransaction({
          payment,
          source: input.source
        });

        return {
          ok: true,
          payment,
          transaction: {
            unsignedXdr,
            source: input.source,
            networkPassphrase: "Test SDF Network ; September 2015"
          }
        };
      } catch (error) {
        return {
          ok: false,
          error: "STELLAR_TRANSACTION_BUILD_FAILED",
          details: { message: error.message }
        };
      }
    },

    async submitWalletTransaction(paymentId, input) {
      const payment = store.findPaymentById(paymentId);
      if (!payment) return null;

      if (!input.signedXdr) {
        return { ok: false, error: "SIGNED_TRANSACTION_REQUIRED", details: { field: "signedXdr" } };
      }

      try {
        const submission = await stellarGateway.submitSignedTransaction({
          signedXdr: input.signedXdr
        });

        const verificationResult = await this.verifyPayment(paymentId, {
          transactionHash: submission.hash,
          customer: input.customer
        });

        return {
          ...verificationResult,
          submission
        };
      } catch (error) {
        return {
          payment,
          verification: { ok: false, status: "FAILED", reason: "STELLAR_TRANSACTION_SUBMIT_FAILED" },
          submissionError: error.message
        };
      }
    },

    async verifyPayment(paymentId, input) {
      const payment = store.findPaymentById(paymentId);
      if (!payment) return null;

      if (!input.transactionHash) {
        return {
          payment,
          verification: { ok: false, status: "FAILED", reason: "PAYMENT_TRANSACTION_HASH_REQUIRED" }
        };
      }

      if (store.findTransactionByHash(input.transactionHash)) {
        return {
          payment,
          verification: { ok: false, status: "FAILED", reason: "DUPLICATE_TRANSACTION_HASH" }
        };
      }

      if (payment.status === "PAID") {
        return {
          payment,
          verification: { ok: false, status: "FAILED", reason: "PAYMENT_ALREADY_PAID" }
        };
      }

      if (payment.status === "EXPIRED" || isExpired(payment)) {
        store.updatePaymentStatus(payment.id, "EXPIRED");
        return {
          payment,
          verification: { ok: false, status: "FAILED", reason: "PAYMENT_EXPIRED" }
        };
      }

      const verification = await stellarGateway.verifyPayment({
        payment,
        transactionHash: input.transactionHash
      });

      if (verification.ok) {
        store.updatePaymentStatus(payment.id, "PAID");
        store.addTransaction({
          hash: verification.transaction.hash,
          payment: payment.id,
          customer: verification.transaction.customer || input.customer || "GNEW...TEST",
          amount: verification.transaction.amount,
          status: "CONFIRMED",
          time: verification.transaction.confirmedAt || "now"
        });
        auditService.record("Payment verified", payment.id);
      }

      return {
        payment,
        transaction: store.findTransactionByPaymentId(payment.id) || null,
        verification
      };
    }
  };
}
