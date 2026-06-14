import { readJson, sendError, sendJson } from "../http/json.mjs";

async function readBodyOrThrow(req) {
  return readJson(req);
}

function sendServiceResult(res, result, successStatus, successBody) {
  if (result.ok) {
    sendJson(res, successStatus, successBody(result));
    return;
  }

  sendError(res, 422, result.error, result.details);
}

export function createApiRouter({ merchantService, reportingService, paymentService, testnetService }) {
  return async function handleApi(req, res, pathname) {
    try {
      if (req.method === "GET" && pathname === "/api/bootstrap") {
        sendJson(res, 200, merchantService.getBootstrap());
        return true;
      }

      if (req.method === "GET" && pathname === "/api/overview") {
        sendJson(res, 200, reportingService.getOverview());
        return true;
      }

      if (req.method === "POST" && pathname === "/api/testnet/fund") {
        const result = await testnetService.fundAccount(await readBodyOrThrow(req));
        sendServiceResult(res, result, 200, (body) => ({ address: body.address, result: body.result }));
        return true;
      }

      if (req.method === "GET" && pathname === "/api/businesses") {
        sendJson(res, 200, { businesses: merchantService.listBusinesses() });
        return true;
      }

      if (req.method === "POST" && pathname === "/api/businesses") {
        const result = merchantService.createBusiness(await readBodyOrThrow(req));
        sendServiceResult(res, result, 201, (body) => ({ business: body.business }));
        return true;
      }

      if (req.method === "GET" && pathname === "/api/branches") {
        sendJson(res, 200, { branches: merchantService.listBranches() });
        return true;
      }

      if (req.method === "POST" && pathname === "/api/branches") {
        const result = merchantService.createBranch(await readBodyOrThrow(req));
        sendServiceResult(res, result, 201, (body) => ({ branch: body.branch }));
        return true;
      }

      if (req.method === "POST" && pathname === "/api/payments") {
        const result = paymentService.createPayment(await readBodyOrThrow(req), {
          idempotencyKey: req.headers["idempotency-key"]
        });
        sendServiceResult(res, result, 201, (body) => body);
        return true;
      }

      const buildTransactionMatch = pathname.match(/^\/api\/payments\/([^/]+)\/build-transaction$/);
      if (req.method === "POST" && buildTransactionMatch) {
        const result = await paymentService.buildWalletTransaction(buildTransactionMatch[1], await readBodyOrThrow(req));
        if (!result) {
          sendError(res, 404, "PAYMENT_NOT_FOUND");
        } else if (!result.ok) {
          sendError(res, 422, result.error, result.details);
        } else {
          sendJson(res, 200, result);
        }
        return true;
      }

      const submitTransactionMatch = pathname.match(/^\/api\/payments\/([^/]+)\/submit-signed-transaction$/);
      if (req.method === "POST" && submitTransactionMatch) {
        const result = await paymentService.submitWalletTransaction(submitTransactionMatch[1], await readBodyOrThrow(req));
        if (!result) {
          sendError(res, 404, "PAYMENT_NOT_FOUND");
        } else if (!result.verification.ok) {
          sendError(res, 422, result.verification.reason, {
            paymentId: result.payment.id,
            status: result.payment.status,
            submissionError: result.submissionError
          });
        } else {
          sendJson(res, 200, result);
        }
        return true;
      }

      const paymentDetailMatch = pathname.match(/^\/api\/payments\/([^/]+)$/);
      if (req.method === "GET" && paymentDetailMatch) {
        const detail = paymentService.getPaymentDetail(paymentDetailMatch[1]);
        if (!detail) sendError(res, 404, "PAYMENT_NOT_FOUND");
        else sendJson(res, 200, detail);
        return true;
      }

      const checkoutMatch = pathname.match(/^\/api\/checkout\/([^/]+)$/);
      if (req.method === "GET" && checkoutMatch) {
        const checkout = paymentService.getCheckout(checkoutMatch[1]);
        if (!checkout) sendError(res, 404, "PAYMENT_NOT_FOUND");
        else sendJson(res, 200, checkout);
        return true;
      }

      const verifyMatch = pathname.match(/^\/api\/payments\/([^/]+)\/verify$/);
      if (req.method === "POST" && verifyMatch) {
        const result = await paymentService.verifyPayment(verifyMatch[1], await readBodyOrThrow(req));
        if (!result) {
          sendError(res, 404, "PAYMENT_NOT_FOUND");
          return true;
        }

        if (!result.verification.ok) {
          sendError(res, 422, result.verification.reason, {
            paymentId: result.payment.id,
            status: result.payment.status
          });
        } else {
          sendJson(res, 200, result);
        }
        return true;
      }

      return false;
    } catch (error) {
      if (error.code === "BAD_JSON") {
        sendError(res, 400, "BAD_JSON");
        return true;
      }

      throw error;
    }
  };
}
