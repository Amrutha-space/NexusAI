import express from "express";
import { env } from "@platform/shared";
import { GatewayService } from "../services/gatewayService.js";

const router = express.Router();
const service = new GatewayService();

router.all("/:slug/*", express.raw({ type: "*/*", limit: "2mb" }), async (req, res, next) => {
  const startTime = performance.now();
  let apiKey;

  try {
    apiKey = await service.authenticateApiKey(req.headers["x-api-key"]);
    const wildcardPath = req.params[0] ? `/${req.params[0]}` : "/";
    const result = await service.proxyRequest({
      slug: req.params.slug,
      path: wildcardPath,
      method: req.method,
      headers: req.headers,
      traceparent: req.trace?.traceparent,
      queryString: new URLSearchParams(req.query).toString(),
      body: req.body,
      apiKey
    });

    const contentType = result.headers["content-type"] || "application/octet-stream";
    res.status(result.status);
    res.setHeader("x-cache-hit", String(Boolean(result.cacheHit)));
    res.setHeader("content-type", contentType);
    res.send(result.body);

    service.emitRequestEvent({
      organizationId: apiKey.organization_id,
      apiId: apiKey.api_id,
      apiKeyId: apiKey.id,
      routeSlug: req.params.slug,
      method: req.method,
      statusCode: result.status,
      latencyMs: Math.round(performance.now() - startTime),
      cacheHit: Boolean(result.cacheHit),
      billableAmount: Number(env.DEFAULT_BILLING_RATE.toFixed(4))
    });
  } catch (error) {
    if (apiKey?.organization_id && apiKey?.api_id) {
      service.emitRequestEvent({
        organizationId: apiKey.organization_id,
        apiId: apiKey.api_id,
        apiKeyId: apiKey.id,
        routeSlug: req.params.slug,
        method: req.method,
        statusCode: error.statusCode || 500,
        latencyMs: Math.round(performance.now() - startTime),
        cacheHit: false,
        errorMessage: error.message,
        billableAmount: 0
      });
    }
    next(error);
  }
});

export default router;
