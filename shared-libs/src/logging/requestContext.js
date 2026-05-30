import crypto from "node:crypto";
import { env } from "../config/env.js";

export function attachRequestContext(service, logger) {
  return (req, res, next) => {
    const requestId = req.headers[env.REQUEST_ID_HEADER] || crypto.randomUUID();
    req.context = {
      requestId,
      service,
      startedAt: performance.now()
    };

    req.logger = logger.child({
      requestId,
      service,
      method: req.method,
      path: req.path
    });

    res.setHeader(env.REQUEST_ID_HEADER, requestId);
    next();
  };
}

