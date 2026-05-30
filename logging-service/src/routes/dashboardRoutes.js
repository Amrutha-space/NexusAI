import express from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError, env } from "@platform/shared";
import { LogRepository } from "../repositories/logRepository.js";
import { AiInsightsService } from "../services/aiInsightsService.js";

const router = express.Router();
const repository = new LogRepository();
const aiInsightsService = new AiInsightsService(repository);

router.use((req, _res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return next(new UnauthorizedError("Missing bearer token"));
  }

  try {
    req.auth = jwt.verify(token, env.JWT_SECRET);
    return next();
  } catch (_error) {
    return next(new UnauthorizedError("Invalid bearer token"));
  }
});

router.get("/overview", async (req, res, next) => {
  try {
    const overview = await repository.getOverview(req.auth.organizationId);
    const latency = await repository.getLatencyPercentiles(req.auth.organizationId);
    res.json({
      overview: {
        requests: Number(overview.total_requests || 0),
        errorRate: overview.total_requests
          ? Number(overview.total_errors || 0) / Number(overview.total_requests)
          : 0,
        avgLatency: Number(overview.avg_latency || 0),
        p50: Number(latency.p50 || 0),
        p95: Number(latency.p95 || 0),
        p99: Number(latency.p99 || 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/traffic", async (req, res, next) => {
  try {
    const data = await repository.getTrafficSeries(req.auth.organizationId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get("/usage", async (req, res, next) => {
  try {
    const data = await repository.getApiUsage(req.auth.organizationId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get("/alerts", async (req, res, next) => {
  try {
    const alerts = await repository.getAlerts(req.auth.organizationId);
    res.json({ alerts });
  } catch (error) {
    next(error);
  }
});

router.get("/intelligence", async (req, res, next) => {
  try {
    const intelligence = await aiInsightsService.getInsights(req.auth.organizationId);
    res.json({ intelligence });
  } catch (error) {
    next(error);
  }
});

export default router;
