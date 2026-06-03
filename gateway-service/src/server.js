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
const port = env.PORT || env.GATEWAY_PORT;

async function start() {
  await getPgPool().query("SELECT 1");
  await getRedisClient().ping();
  app.listen(port, () => {
    logger.info({ port }, "gateway-service listening");
  });
}

start().catch((error) => {
  logger.error({ err: error }, "failed to start gateway-service");
  process.exit(1);
});
