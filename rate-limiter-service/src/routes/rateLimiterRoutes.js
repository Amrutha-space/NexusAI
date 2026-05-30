import express from "express";
import { UnauthorizedError, env } from "@platform/shared";
import { RateLimiterService } from "../services/rateLimiterService.js";

const router = express.Router();
const service = new RateLimiterService();

router.use((req, _res, next) => {
  if (req.headers["x-internal-token"] !== env.INTERNAL_SERVICE_TOKEN) {
    return next(new UnauthorizedError("Invalid internal service token"));
  }

  return next();
});

router.post("/evaluate", async (req, res, next) => {
  try {
    const result = await service.evaluate(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

