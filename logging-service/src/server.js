import http from "node:http";
import { WebSocketServer } from "ws";
import { createLogger, createReadinessHandler, env, getPgPool, getRedisClient } from "@platform/shared";
import { buildApp } from "./app.js";
import { LogProcessor } from "./services/logProcessor.js";
import { WebsocketHub } from "./services/websocketHub.js";

const logger = createLogger("logging-service");
const websocketHub = new WebsocketHub();
const logProcessor = new LogProcessor(websocketHub, logger);
const readinessHandler = createReadinessHandler("logging-service", [
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
const app = buildApp(logProcessor, { readinessHandler });
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: "/ws" });
const port = env.PORT || env.LOGGING_PORT;

websocketHub.attach(wsServer);

async function start() {
  await getPgPool().query("SELECT 1");
  await getRedisClient().ping();
  server.listen(port, () => {
    logger.info({ port }, "logging-service listening");
  });
}

start().catch((error) => {
  logger.error({ err: error }, "failed to start logging-service");
  process.exit(1);
});
