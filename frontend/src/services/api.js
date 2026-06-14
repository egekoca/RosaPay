async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...options.headers },
    ...options
  });

  const body = await response.json();
  if (!response.ok) {
    const code = typeof body.error === "string" ? body.error : body.error?.code;
    const message = typeof body.error === "string" ? body.error : body.error?.message;
    const error = new Error(message || code || "API_REQUEST_FAILED");
    error.code = code;
    error.details = body.error?.details;
    throw error;
  }

  return body;
}

export const api = {
  bootstrap: () => request("/api/bootstrap"),
  overview: () => request("/api/overview"),
  fundTestnetAccount: (payload) => request("/api/testnet/fund", { method: "POST", body: JSON.stringify(payload) }),
  createBusiness: (payload) => request("/api/businesses", { method: "POST", body: JSON.stringify(payload) }),
  createBranch: (payload) => request("/api/branches", { method: "POST", body: JSON.stringify(payload) }),
  createPayment: (payload, options = {}) => request("/api/payments", {
    method: "POST",
    headers: options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : undefined,
    body: JSON.stringify(payload)
  }),
  getPayment: (paymentId) => request(`/api/payments/${paymentId}`),
  getCheckout: (paymentId) => request(`/api/checkout/${paymentId}`),
  buildPaymentTransaction: (paymentId, payload) => request(`/api/payments/${paymentId}/build-transaction`, { method: "POST", body: JSON.stringify(payload) }),
  submitSignedTransaction: (paymentId, payload) => request(`/api/payments/${paymentId}/submit-signed-transaction`, { method: "POST", body: JSON.stringify(payload) }),
  verifyPayment: (paymentId, payload) => request(`/api/payments/${paymentId}/verify`, { method: "POST", body: JSON.stringify(payload) })
};
