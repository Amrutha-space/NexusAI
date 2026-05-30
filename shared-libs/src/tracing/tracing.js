import crypto from "node:crypto";
import { env } from "../config/env.js";

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function createTraceContext(incomingTraceparent) {
  const parts = typeof incomingTraceparent === "string" ? incomingTraceparent.split("-") : [];
  const traceId = parts.length === 4 && parts[1]?.length === 32 ? parts[1] : randomHex(16);
  const parentSpanId = parts.length === 4 && parts[2]?.length === 16 ? parts[2] : null;
  const spanId = randomHex(8);

  return {
    traceId,
    spanId,
    parentSpanId,
    traceparent: `00-${traceId}-${spanId}-01`
  };
}

export function attachTraceContext(service, logger) {
  return (req, res, next) => {
    const trace = createTraceContext(req.headers.traceparent);
    req.trace = {
      ...trace,
      service,
      namespace: env.OTEL_SERVICE_NAMESPACE
    };

    res.setHeader("traceparent", trace.traceparent);
    res.on("finish", () => {
      logger.info(
        {
          traceId: trace.traceId,
          spanId: trace.spanId,
          parentSpanId: trace.parentSpanId,
          statusCode: res.statusCode,
          service,
          namespace: env.OTEL_SERVICE_NAMESPACE
        },
        "http trace span completed"
      );
    });
    next();
  };
}

export function getTraceHeaders(req, extra = {}) {
  return {
    traceparent: req.trace?.traceparent,
    ...extra
  };
}
