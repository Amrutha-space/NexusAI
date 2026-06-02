import { AppError, getRedisClient } from "@platform/shared";

const redis = getRedisClient();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class UpstreamClient {
  constructor(circuitBreakerRegistry) {
    this.circuitBreakerRegistry = circuitBreakerRegistry;
  }

  async execute({ api, path, method, headers, queryString, body }) {
    this.circuitBreakerRegistry.assertCanProceed(api.slug, api.circuit_breaker_threshold);

    const cacheKey = `gateway:cache:${api.slug}:${method}:${path}:${queryString}`;
    if (method === "GET" && api.cache_ttl_seconds > 0) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...parsed, cacheHit: true };
      }
    }

    const upstreamUrl = new URL(api.upstream_url);
    const forwardedUrl = new URL(path + (queryString ? `?${queryString}` : ""), upstreamUrl);
    const filteredHeaders = {
      "content-type": headers["content-type"] || "application/json"
    };

    let lastError;
    for (let attempt = 0; attempt <= api.retry_count; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), api.timeout_ms);
      try {
      
const normalizedBody =
  ["GET", "HEAD"].includes(method)
    ? undefined
    : Buffer.isBuffer(body)
      ? body.toString()
      : typeof body === "object"
        ? JSON.stringify(body)
        : body;

const response = await fetch(forwardedUrl, {
  method,
  headers: filteredHeaders,
  body: normalizedBody,
  signal: controller.signal
});



        clearTimeout(timeout);

        const rawBody = Buffer.from(await response.arrayBuffer());
        const result = {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: rawBody,
          cacheHit: false
        };

        if (response.status >= 500) {
          throw new AppError(`Upstream responded with ${response.status}`, 502);
        }

        this.circuitBreakerRegistry.onSuccess(api.slug, api.circuit_breaker_threshold);

        if (method === "GET" && api.cache_ttl_seconds > 0 && response.ok) {
          await redis.set(cacheKey, JSON.stringify({
            status: result.status,
            headers: result.headers,
            body: result.body.toString("base64")
          }), "EX", api.cache_ttl_seconds);
        }

        return result;
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;
        this.circuitBreakerRegistry.onFailure(api.slug, api.circuit_breaker_threshold);
        if (attempt < api.retry_count) {
          await delay(150 * 2 ** attempt);
        }
      }
    }

    throw new AppError(lastError?.message || "Upstream request failed", 502);
  }

  deserializeCachedResponse(result) {
    if (result.cacheHit && typeof result.body === "string") {
      return {
        ...result,
        body: Buffer.from(result.body, "base64")
      };
    }

    return result;
  }
}

