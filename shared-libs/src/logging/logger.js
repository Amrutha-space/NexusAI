import pino from "pino";
import { env } from "../config/env.js";

export function createLogger(service) {
  return pino({
    level: env.NODE_ENV === "production" ? "info" : "debug",
    base: {
      service,
      env: env.NODE_ENV
    },
    timestamp: pino.stdTimeFunctions.isoTime
  });
}

