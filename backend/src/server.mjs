import { createServer } from "node:http";
import { appConfig } from "./config/appConfig.mjs";
import { sendError } from "./http/json.mjs";
import { serveStatic } from "./http/staticServer.mjs";
import { createMockStore } from "./repositories/mockStore.mjs";
import { createSqliteStore } from "./repositories/sqliteStore.mjs";
import { createApiRouter } from "./routes/apiRouter.mjs";
import { createAuditService } from "./services/auditService.mjs";
import { createMerchantService } from "./services/merchantService.mjs";
import { createPaymentService } from "./services/paymentService.mjs";
import { createReportingService } from "./services/reportingService.mjs";
import { createTestnetService } from "./services/testnetService.mjs";
import { ROSA_NETWORK } from "../../packages/domain/src/mockData.js";
import { createStellarGateway } from "../../packages/stellar/src/stellarGateway.js";

const store = appConfig.dataStore === "mock"
  ? createMockStore()
  : createSqliteStore({ databasePath: appConfig.databasePath });
const stellarGateway = createStellarGateway({
  network: ROSA_NETWORK,
  mode: appConfig.stellarMode
});

const auditService = createAuditService({ store });
const merchantService = createMerchantService({ store, network: ROSA_NETWORK, auditService });
const reportingService = createReportingService({ store });
const paymentService = createPaymentService({ store, stellarGateway, network: ROSA_NETWORK, auditService });
const testnetService = createTestnetService({ stellarGateway });
const handleApi = createApiRouter({ merchantService, reportingService, paymentService, testnetService });

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname)) {
      return;
    }

    await serveStatic({
      res,
      pathname: url.pathname,
      frontendDir: appConfig.frontendDir
    });
  } catch (error) {
    sendError(res, 500, "INTERNAL_SERVER_ERROR", { detail: error.message });
  }
});

server.listen(appConfig.port, () => {
  console.log(`Rosa Pay running at http://localhost:${appConfig.port}`);
});
