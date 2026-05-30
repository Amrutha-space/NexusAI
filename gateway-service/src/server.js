import { createLogger, createReadinessHandler, env, getPgPool, getRedisClient } from "@platform/shared";
import { buildApp } from "./app.js";

const readinessHandler = createReadinessHandler("gateway-service", [
  {
    name: "postgres",
    run: async () => {
      await getPgPool().query("SELECT 1");
    }
  },
  {
    name: "redis",
    run: async () => {
      await getRedisClient().ping();
    }
  }
]);

const app = buildApp({ readinessHandler });
const logger = createLogger("gateway-service");

async function start() {
  await getPgPool().query("SELECT 1");
  await getRedisClient().ping();
  app.listen(env.GATEWAY_PORT, () => {
    logger.info({ port: env.GATEWAY_PORT }, "gateway-service listening");
  });
}

start().catch((error) => {
  logger.error({ err: error }, "failed to start gateway-service");
  process.exit(1);
});
