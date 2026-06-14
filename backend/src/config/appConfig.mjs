import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = fileURLToPath(new URL("..", import.meta.url));
const rootDir = normalize(join(backendDir, "../.."));

export const appConfig = {
  port: Number(process.env.PORT || 3000),
  rootDir,
  frontendDir: join(rootDir, "frontend"),
  stellarMode: process.env.STELLAR_MODE || "mock",
  dataStore: process.env.DATA_STORE || "sqlite",
  databasePath: process.env.DATABASE_PATH || join(rootDir, "backend/data/rosapay.sqlite")
};
