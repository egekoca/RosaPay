import { isValidStellarPublicKey } from "../../../packages/stellar/src/stellarGateway.js";

export function createMerchantService({ store, network, auditService }) {
  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `business-${Date.now()}`;
  }

  return {
    getBootstrap() {
      return {
        ...store.getState(),
        network
      };
    },

    listBusinesses() {
      return store.listBusinesses();
    },

    listBranches() {
      return store.listBranches();
    },

    createBusiness(input) {
      const name = String(input.name || "").trim();
      if (!name) {
        return { ok: false, error: "BUSINESS_NAME_REQUIRED", details: { field: "name" } };
      }

      const business = {
        id: `bus_${Math.random().toString(36).slice(2, 8)}`,
        name,
        slug: slugify(input.slug || name),
        branches: 0,
        status: "ACTIVE",
        received: "0.00 XLM"
      };

      store.addBusiness(business);
      auditService.record("Business created", business.id);

      return { ok: true, business };
    },

    createBranch(input) {
      const business = store.listBusinesses().find((item) => item.id === input.businessId);
      const name = String(input.name || "").trim();
      const wallet = String(input.wallet || "").trim();

      if (!business) return { ok: false, error: "BUSINESS_NOT_FOUND", details: { field: "businessId" } };
      if (!name) return { ok: false, error: "BRANCH_NAME_REQUIRED", details: { field: "name" } };
      if (!wallet) return { ok: false, error: "BRANCH_WALLET_REQUIRED", details: { field: "wallet" } };
      if (!isValidStellarPublicKey(wallet)) return { ok: false, error: "INVALID_STELLAR_PUBLIC_KEY", details: { field: "wallet" } };

      const branch = {
        id: `br_${Math.random().toString(36).slice(2, 8)}`,
        businessId: business.id,
        business: business.name,
        name,
        wallet,
        payments: 0,
        status: "ACTIVE"
      };

      store.addBranch(branch);
      auditService.record("Branch created", branch.id);

      return { ok: true, branch };
    }
  };
}
