import cors from "cors";
import express from "express";
import helmet from "helmet";
import {
  AppError,
  attachRequestContext,
  attachTraceContext,
  createLogger,
  env,
  getMetrics,
  observeHttpRequest
} from "@platform/shared";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { createLogRoutes } from "./routes/logRoutes.js";

const logger = createLogger("logging-service");

export function buildApp(logProcessor, { readinessHandler } = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ALLOWED_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));
  app.use(attachRequestContext("logging-service", logger));
  app.use(attachTraceContext("logging-service", logger));

  app.use((req, res, next) => {
    res.on("finish", () => {
      observeHttpRequest({
        service: "logging-service",
        method: req.method,
        route: req.route?.path || req.path,
        statusCode: res.statusCode,
        durationMs: performance.now() - req.context.startedAt
      });
    });
    next();
  });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", readinessHandler || ((_req, res) => res.json({ status: "ready" })));
  app.get("/metrics", async (_req, res) => {
    res.setHeader("content-type", "text/plain; version=0.0.4");
    res.send(await getMetrics());
  });

  app.use("/internal/logs", createLogRoutes(logProcessor));
  app.use("/dashboard", dashboardRoutes);

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    logger.error({ err: error, statusCode, requestId: _req.context?.requestId }, error.message);
    res.status(statusCode).json({
      error: error instanceof AppError ? error.message : "Internal server error",
      details: error.details || error.errors || null,
      requestId: _req.context?.requestId || null
    });
  });

  return app;
}
