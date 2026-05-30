import { createLogger, createReadinessHandler, env, getPgPool, getRedisClient } from "@platform/shared";
import { buildApp } from "./app.js";

const readinessHandler = createReadinessHandler("auth-service", [
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
const logger = createLogger("auth-service");

async function start() {
  await getPgPool().query("SELECT 1");
  await getRedisClient().ping();

  app.listen(env.AUTH_PORT, () => {
    logger.info({ port: env.AUTH_PORT }, "auth-service listening");
  });
}

start().catch((error) => {
  logger.error({ err: error }, "failed to start auth-service");
  process.exit(1);
});
