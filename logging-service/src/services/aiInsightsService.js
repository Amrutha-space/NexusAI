function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function round(value) {
  return Math.round(Number(value || 0));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreFromSignals(signals) {
  return clamp(Math.round(signals.reduce((total, signal) => total + signal, 0)), 0, 100);
}

export class AiInsightsService {
  constructor(repository) {
    this.repository = repository;
  }

  async getInsights(organizationId) {
    const snapshot = await this.repository.getIntelligenceSnapshot(organizationId);
    const insights = this.buildInsights(snapshot);
    insights.openaiAnalysis = await this.getOpenAiLogAnalysis({
      logDebug: insights.logDebug,
      anomaly: insights.anomaly,
      scaling: insights.scaling,
      apiHealth: insights.apiHealth
    });
    return insights;
  }

  buildInsights(snapshot) {
    const current = this.normalizeWindow(snapshot.currentWindow);
    const baseline = this.normalizeWindow(snapshot.baselineWindow);
    const apiHealth = snapshot.apiHealth.map((api) => this.normalizeApi(api));
    const recentErrors = snapshot.recentErrors || [];
    const anomaly = this.detectAnomaly(current, baseline);
    const scaling = this.recommendScaling(current, baseline);
    const cache = this.recommendCaching(snapshot.cacheCandidates || []);
    const logDebug = this.debugLogs(recentErrors, apiHealth);
    const adaptivePolicy = this.recommendAdaptivePolicy(current, apiHealth);

    return {
      generatedAt: new Date().toISOString(),
      model: "local-heuristic-ai-v1",
      summary: this.summarize({ anomaly, scaling, cache, logDebug, adaptivePolicy }),
      anomaly,
      scaling,
      cache,
      logDebug,
      adaptivePolicy,
      apiHealth
    };
  }

  normalizeWindow(window) {
    const requests = Number(window?.requests || 0);
    const errors = Number(window?.errors || 0);
    return {
      requests,
      errors,
      errorRate: ratio(errors, requests),
      avgLatency: Number(window?.avg_latency || 0),
      p95Latency: Number(window?.p95_latency || 0)
    };
  }

  normalizeApi(api) {
    const requests = Number(api.requests || 0);
    const errors = Number(api.errors || 0);
    return {
      id: api.id,
      name: api.name,
      slug: api.slug,
      requests,
      errors,
      errorRate: ratio(errors, requests),
      avgLatency: Number(api.avg_latency || 0),
      p95Latency: Number(api.p95_latency || 0),
      cacheTtlSeconds: Number(api.cache_ttl_seconds || 0)
    };
  }

  detectAnomaly(current, baseline) {
    const requestMultiplier = baseline.requests ? current.requests / baseline.requests : current.requests > 20 ? 2 : 1;
    const latencyMultiplier = baseline.p95Latency ? current.p95Latency / baseline.p95Latency : current.p95Latency > 800 ? 2 : 1;
    const errorDelta = current.errorRate - baseline.errorRate;
    const score = scoreFromSignals([
      requestMultiplier > 2 ? 32 : requestMultiplier > 1.4 ? 16 : 0,
      latencyMultiplier > 1.8 ? 28 : latencyMultiplier > 1.3 ? 14 : 0,
      current.errorRate > 0.2 ? 30 : current.errorRate > 0.05 ? 15 : 0,
      errorDelta > 0.1 ? 10 : 0
    ]);
    const severity = score >= 70 ? "critical" : score >= 40 ? "warning" : "normal";

    return {
      score,
      severity,
      requestMultiplier: Number(requestMultiplier.toFixed(2)),
      latencyMultiplier: Number(latencyMultiplier.toFixed(2)),
      message:
        severity === "normal"
          ? "Traffic is within the learned baseline."
          : `Detected ${severity} traffic drift: ${current.requests} requests, ${pct(current.errorRate)} errors, p95 ${round(current.p95Latency)} ms.`,
      signals: [
        `15m requests: ${current.requests}`,
        `Error rate: ${pct(current.errorRate)}`,
        `p95 latency: ${round(current.p95Latency)} ms`
      ]
    };
  }

  recommendScaling(current, baseline) {
    const rps15m = current.requests / 900;
    const pressure = scoreFromSignals([
      rps15m > 20 ? 35 : rps15m > 5 ? 20 : rps15m > 1 ? 10 : 0,
      current.p95Latency > 1000 ? 30 : current.p95Latency > 500 ? 16 : 0,
      current.errorRate > 0.1 ? 20 : current.errorRate > 0.03 ? 10 : 0,
      baseline.requests && current.requests > baseline.requests * 1.5 ? 15 : 0
    ]);
    const replicas = pressure >= 75 ? 5 : pressure >= 50 ? 3 : pressure >= 25 ? 2 : 1;

    return {
      pressure,
      recommendedReplicas: replicas,
      autoscalingSignal: pressure >= 50 ? "scale-out" : pressure >= 25 ? "watch" : "steady",
      reason: `Based on ${current.requests} requests in 15m, ${round(current.p95Latency)} ms p95 latency, and ${pct(current.errorRate)} error rate.`
    };
  }

  recommendCaching(cacheCandidates) {
    const ranked = cacheCandidates
      .map((api) => {
        const requests = Number(api.requests || 0);
        const avgLatency = Number(api.avg_latency || 0);
        const cacheTtlSeconds = Number(api.cache_ttl_seconds || 0);
        const cacheHits = Number(api.cache_hits || 0);
        const score = scoreFromSignals([
          requests >= 100 ? 35 : requests >= 20 ? 20 : 8,
          avgLatency >= 500 ? 30 : avgLatency >= 200 ? 16 : 4,
          cacheTtlSeconds === 0 ? 20 : 0,
          ratio(cacheHits, requests) < 0.2 ? 15 : 0
        ]);
        return {
          name: api.name,
          slug: api.slug,
          score,
          currentTtlSeconds: cacheTtlSeconds,
          recommendedTtlSeconds: cacheTtlSeconds || (avgLatency > 500 ? 120 : 60),
          reason: `${requests} GET requests with ${round(avgLatency)} ms average latency and ${pct(ratio(cacheHits, requests))} cache-hit ratio.`
        };
      })
      .sort((a, b) => b.score - a.score);

    return {
      candidates: ranked.slice(0, 3),
      message: ranked[0]
        ? `${ranked[0].name} is the strongest cache optimization candidate.`
        : "No GET-heavy cache candidates yet. Generate GET traffic to unlock cache insights."
    };
  }

  debugLogs(recentErrors, apiHealth) {
    if (recentErrors.length === 0) {
      return {
        severity: "normal",
        likelyCause: "No recent failing or slow requests found.",
        recommendation: "Keep observing live traffic. The system has no urgent debug cluster right now.",
        evidence: []
      };
    }

    const statusCounts = recentErrors.reduce((counts, event) => {
      counts[event.status_code] = (counts[event.status_code] || 0) + 1;
      return counts;
    }, {});
    const dominantStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const slowCount = recentErrors.filter((event) => Number(event.latency_ms || 0) >= 1000).length;
    const failingApi = apiHealth
      .filter((api) => api.requests > 0)
      .sort((a, b) => b.errorRate - a.errorRate || b.p95Latency - a.p95Latency)[0];

    let likelyCause = "Recent failures are clustered around upstream or gateway request handling.";
    let recommendation = "Inspect upstream health, retry settings, and circuit-breaker thresholds for the affected route.";
    if (dominantStatus === "429") {
      likelyCause = "Traffic is being throttled by rate limiting.";
      recommendation = "Review per-key quotas or switch high-throughput clients to a larger burst capacity.";
    } else if (Number(dominantStatus) >= 500) {
      likelyCause = "Upstream failures or exhausted service dependencies are causing 5xx responses.";
      recommendation = "Check upstream readiness, timeout values, and whether the circuit breaker is opening.";
    } else if (slowCount > recentErrors.length / 2) {
      likelyCause = "Latency degradation is the dominant issue.";
      recommendation = "Increase cache TTL for stable GET routes and consider scaling gateway/upstream replicas.";
    }

    return {
      severity: Number(dominantStatus) >= 500 || slowCount > 3 ? "warning" : "watch",
      likelyCause,
      recommendation,
      affectedApi: failingApi ? { name: failingApi.name, slug: failingApi.slug } : null,
      evidence: recentErrors.slice(0, 5).map((event) => ({
        routeSlug: event.route_slug,
        method: event.method,
        statusCode: Number(event.status_code),
        latencyMs: Number(event.latency_ms),
        errorMessage: event.error_message || null
      }))
    };
  }

  recommendAdaptivePolicy(current, apiHealth) {
    const hotApi = apiHealth
      .filter((api) => api.requests > 0)
      .sort((a, b) => b.requests - a.requests || b.errorRate - a.errorRate)[0];
    const mode = current.errorRate > 0.1 || current.p95Latency > 1000 ? "protective" : "balanced";

    return {
      mode,
      recommendation:
        mode === "protective"
          ? "Temporarily reduce burst capacity by 25% and prioritize cached GET traffic until error rate recovers."
          : "Keep current limits. Increase quotas only for trusted keys with stable latency.",
      targetApi: hotApi ? { name: hotApi.name, slug: hotApi.slug } : null
    };
  }

  summarize({ anomaly, scaling, cache, logDebug, adaptivePolicy }) {
    if (anomaly.severity !== "normal") {
      return `${anomaly.message} Recommended action: ${logDebug.recommendation}`;
    }

    if (scaling.autoscalingSignal !== "steady") {
      return `Traffic pressure is ${scaling.pressure}/100. Recommend ${scaling.recommendedReplicas} gateway replicas and ${adaptivePolicy.mode} rate-limit mode.`;
    }

    return `${cache.message} Platform health is steady with ${scaling.recommendedReplicas} gateway replica recommended.`;
  }

  async getOpenAiLogAnalysis(context) {
    if (!env.OPENAI_LOG_ANALYSIS_ENABLED || !env.OPENAI_API_KEY) {
      return {
        enabled: false,
        model: env.OPENAI_MODEL,
        summary: "OpenAI log analysis is disabled. Set OPENAI_LOG_ANALYSIS_ENABLED=true and OPENAI_API_KEY to enable live LLM root-cause explanations.",
        actions: []
      };
    }

    try {
      const response = await fetch(env.OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          input: [
            {
              role: "developer",
              content:
                "You are an SRE assistant for an API gateway. Analyze only the provided telemetry. Return concise JSON with summary, likely_cause, severity, and actions array."
            },
            {
              role: "user",
              content: JSON.stringify(context)
            }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "gateway_log_analysis",
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  summary: { type: "string" },
                  likely_cause: { type: "string" },
                  severity: { type: "string", enum: ["normal", "watch", "warning", "critical"] },
                  actions: {
                    type: "array",
                    items: { type: "string" },
                    maxItems: 5
                  }
                },
                required: ["summary", "likely_cause", "severity", "actions"]
              }
            }
          },
          max_output_tokens: 700
        })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenAI request failed with ${response.status}: ${body}`);
      }

      const data = await response.json();
      const text = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
      const parsed = JSON.parse(text || "{}");
      return {
        enabled: true,
        model: env.OPENAI_MODEL,
        summary: parsed.summary,
        likelyCause: parsed.likely_cause,
        severity: parsed.severity,
        actions: parsed.actions
      };
    } catch (error) {
      return {
        enabled: true,
        model: env.OPENAI_MODEL,
        summary: "OpenAI log analysis could not complete, so NexusAI is showing deterministic local analysis.",
        error: error.message,
        actions: []
      };
    }
  }
}
import { env } from "@platform/shared";
