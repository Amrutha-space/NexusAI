import assert from "node:assert/strict";
import test from "node:test";
import { AiInsightsService } from "../../logging-service/src/services/aiInsightsService.js";

test("AI insights flags traffic anomalies and recommends scale-out", () => {
  const service = new AiInsightsService({});
  const insights = service.buildInsights({
    currentWindow: {
      requests: 5000,
      errors: 700,
      avg_latency: 640,
      p95_latency: 1400
    },
    baselineWindow: {
      requests: 900,
      errors: 9,
      avg_latency: 180,
      p95_latency: 320
    },
    apiHealth: [
      {
        id: "api-1",
        name: "Payments API",
        slug: "payments",
        cache_ttl_seconds: 30,
        requests: 5000,
        errors: 700,
        avg_latency: 640,
        p95_latency: 1400
      }
    ],
    recentErrors: [
      {
        route_slug: "payments",
        method: "POST",
        status_code: 502,
        latency_ms: 1600,
        error_message: "upstream failed"
      }
    ],
    cacheCandidates: []
  });

  assert.equal(insights.anomaly.severity, "critical");
  assert.equal(insights.scaling.autoscalingSignal, "scale-out");
  assert.equal(insights.scaling.recommendedReplicas, 5);
  assert.equal(insights.logDebug.affectedApi.slug, "payments");
});

test("AI insights recommends cache TTL for slow GET-heavy routes", () => {
  const service = new AiInsightsService({});
  const insights = service.buildInsights({
    currentWindow: {
      requests: 20,
      errors: 0,
      avg_latency: 90,
      p95_latency: 130
    },
    baselineWindow: {
      requests: 18,
      errors: 0,
      avg_latency: 100,
      p95_latency: 140
    },
    apiHealth: [],
    recentErrors: [],
    cacheCandidates: [
      {
        name: "Catalog API",
        slug: "catalog",
        cache_ttl_seconds: 0,
        requests: 200,
        avg_latency: 620,
        cache_hits: 0
      }
    ]
  });

  assert.equal(insights.anomaly.severity, "normal");
  assert.equal(insights.cache.candidates[0].slug, "catalog");
  assert.equal(insights.cache.candidates[0].recommendedTtlSeconds, 120);
});
