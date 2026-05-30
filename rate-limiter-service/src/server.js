import { createLogger, createReadinessHandler, env, getRedisClient } from "@platform/shared";
import { buildApp } from "./app.js";

const readinessHandler = createReadinessHandler("rate-limiter-service", [
  {
    name: "redis",
    run: async () => {
      await getRedisClient().ping();
    }
  }
]);

const app = buildApp({ readinessHandler });
const logger = createLogger("rate-limiter-service");

async function start() {
  await getRedisClient().ping();
  app.listen(env.RATE_LIMITER_PORT, () => {
    logger.info({ port: env.RATE_LIMITER_PORT }, "rate-limiter-service listening");
  });
}

start().catch((error) => {
  logger.error({ err: error }, "failed to start rate-limiter-service");
  process.exit(1);
});
