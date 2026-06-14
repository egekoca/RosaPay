import { isValidStellarPublicKey } from "../../../packages/stellar/src/stellarGateway.js";

export function createTestnetService({ stellarGateway }) {
  return {
    async fundAccount(input) {
      const address = String(input.address || "").trim();
      if (!isValidStellarPublicKey(address)) {
        return { ok: false, error: "INVALID_STELLAR_PUBLIC_KEY", details: { field: "address" } };
      }

      const result = await stellarGateway.fundTestnetAccount({ address });
      if (!result.ok) {
        return { ok: false, error: result.reason || "FRIENDBOT_REQUEST_FAILED", details: result };
      }

      return { ok: true, address, result };
    }
  };
}
