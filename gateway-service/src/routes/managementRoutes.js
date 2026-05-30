import express from "express";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";
import { GatewayService } from "../services/gatewayService.js";

const router = express.Router();
const service = new GatewayService();

router.use(express.json({ limit: "1mb" }));
router.use(requireAuth);

router.get("/apis", async (req, res, next) => {
  try {
    const apis = await service.listApis(req.auth.organizationId);
    res.json({ apis });
  } catch (error) {
    next(error);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const auditLogs = await service.getAuditLogs(req.auth.organizationId);
    res.json({ auditLogs });
  } catch (error) {
    next(error);
  }
});

router.post("/apis", requireAdmin, async (req, res, next) => {
  try {
    const api = await service.createApi(req.auth.organizationId, req.body, {
      userId: req.auth.sub,
      requestId: req.context?.requestId
    });
    res.status(201).json({ api });
  } catch (error) {
    next(error);
  }
});

router.get("/apis/:apiId/keys", async (req, res, next) => {
  try {
    const keys = await service.listApiKeys(req.auth.organizationId, req.params.apiId);
    res.json({ keys });
  } catch (error) {
    next(error);
  }
});

router.post("/apis/:apiId/keys", requireAdmin, async (req, res, next) => {
  try {
    const apiKey = await service.createApiKey(req.auth.organizationId, req.params.apiId, req.body, {
      userId: req.auth.sub,
      requestId: req.context?.requestId
    });
    res.status(201).json({ apiKey });
  } catch (error) {
    next(error);
  }
});

router.post("/keys/:keyId/rotate", requireAdmin, async (req, res, next) => {
  try {
    const apiKey = await service.rotateApiKey(req.auth.organizationId, req.params.keyId, {
      userId: req.auth.sub,
      requestId: req.context?.requestId
    });
    res.json({ apiKey });
  } catch (error) {
    next(error);
  }
});

router.post("/keys/:keyId/revoke", requireAdmin, async (req, res, next) => {
  try {
    const apiKey = await service.revokeApiKey(req.auth.organizationId, req.params.keyId, {
      userId: req.auth.sub,
      requestId: req.context?.requestId
    });
    res.json({ apiKey });
  } catch (error) {
    next(error);
  }
});

router.get("/billing", async (req, res, next) => {
  try {
    const billing = await service.getBillingSummary(req.auth.organizationId);
    res.json({ billing });
  } catch (error) {
    next(error);
  }
});

export default router;
