import express from "express";
import { UnauthorizedError, env } from "@platform/shared";

export function createLogRoutes(logProcessor) {
  const router = express.Router();

  router.use((req, _res, next) => {
    if (req.headers["x-internal-token"] !== env.INTERNAL_SERVICE_TOKEN) {
      return next(new UnauthorizedError("Invalid internal service token"));
    }

    return next();
  });

  router.post("/events", async (req, res, next) => {
    try {
      await logProcessor.enqueue(req.body);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

