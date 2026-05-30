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
import managementRoutes from "./routes/managementRoutes.js";
import proxyRoutes from "./routes/proxyRoutes.js";

const logger = createLogger("gateway-service");

export function buildApp({ readinessHandler } = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ALLOWED_ORIGIN }));
  app.use(attachRequestContext("gateway-service", logger));
  app.use(attachTraceContext("gateway-service", logger));

  app.use((req, res, next) => {
    res.on("finish", () => {
      observeHttpRequest({
        service: "gateway-service",
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
  app.get("/docs", (_req, res) => {
    res.json({
      message: "Developer API Management Platform",
      endpoints: {
        auth: "/auth-service/auth/*",
        management: "/management/*",
        proxy: "/proxy/:slug/*"
      }
    });
  });

  app.use("/management", managementRoutes);
  app.use("/proxy", proxyRoutes);

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    logger.error({ err: error, statusCode, requestId: _req.context?.requestId }, error.message);
    res.status(statusCode).json({
      error:
        error instanceof AppError
          ? error.message
          : error.name === "ZodError"
            ? "Validation failed"
            : "Internal server error",
      details: error.details || error.issues || error.errors || null,
      requestId: _req.context?.requestId || null
    });
  });

  return app;
}
