export function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

const errorMessages = {
  BAD_JSON: "Request body must be valid JSON.",
  BUSINESS_NAME_REQUIRED: "Business name is required.",
  BRANCH_NAME_REQUIRED: "Branch name is required.",
  BRANCH_WALLET_REQUIRED: "Branch destination wallet is required.",
  INVALID_STELLAR_PUBLIC_KEY: "Wallet must be a valid Stellar public key.",
  FRIENDBOT_REQUEST_FAILED: "Could not fund testnet account with Friendbot.",
  BUSINESS_NOT_FOUND: "Business was not found.",
  BRANCH_NOT_FOUND: "Branch was not found.",
  PAYMENT_NOT_FOUND: "Payment request was not found.",
  PAYMENT_AMOUNT_INVALID: "Payment amount must be greater than zero.",
  PAYMENT_AMOUNT_TOO_HIGH: "Payment amount exceeds the allowed mock limit.",
  PAYMENT_ASSET_UNSUPPORTED: "Only XLM is supported in this milestone.",
  PAYMENT_TRANSACTION_HASH_REQUIRED: "Transaction hash is required.",
  INVALID_TRANSACTION_HASH: "Transaction hash format is invalid.",
  DUPLICATE_TRANSACTION_HASH: "This transaction hash has already been processed.",
  PAYMENT_ALREADY_PAID: "This payment request has already been paid.",
  PAYMENT_EXPIRED: "This payment request has expired.",
  PAYMENT_SOURCE_REQUIRED: "Source wallet address is required.",
  SIGNED_TRANSACTION_REQUIRED: "Signed transaction XDR is required.",
  ONCHAIN_TRANSACTION_NOT_FOUND: "Transaction was not found on Stellar.",
  ONCHAIN_TRANSACTION_FAILED: "Stellar transaction was not successful.",
  ONCHAIN_MEMO_MISMATCH: "Stellar transaction memo does not match the payment request.",
  ONCHAIN_PAYMENT_OPERATION_NOT_FOUND: "No matching Stellar payment operation was found.",
  HORIZON_REQUEST_FAILED: "Could not read transaction data from Stellar Horizon.",
  STELLAR_TRANSACTION_BUILD_FAILED: "Could not build Stellar transaction.",
  STELLAR_TRANSACTION_SUBMIT_FAILED: "Could not submit signed Stellar transaction.",
  INTERNAL_SERVER_ERROR: "Unexpected server error."
};

export function sendError(res, statusCode, code, details = undefined) {
  sendJson(res, statusCode, {
    error: {
      code,
      message: errorMessages[code] || code,
      ...(details ? { details } : {})
    }
  });
}

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("BAD_JSON");
    error.code = "BAD_JSON";
    throw error;
  }
}
