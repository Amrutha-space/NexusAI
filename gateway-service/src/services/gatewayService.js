import {
  AppError,
  RATE_LIMIT_STRATEGIES,
  apiKeySchema,
  apiSchema,
  env,
  generateApiKey,
  getBaseHeaders,
  hashApiKey,
  parseJsonResponse
} from "@platform/shared";
import { GatewayRepository } from "../repositories/gatewayRepository.js";
import { CircuitBreakerRegistry } from "./circuitBreaker.js";
import { UpstreamClient } from "./upstreamClient.js";

const repository = new GatewayRepository();
const upstreamClient = new UpstreamClient(new CircuitBreakerRegistry());

export class GatewayService {
  async createApi(organizationId, payload, actor = {}) {
    const validated = apiSchema.parse(payload);
    const api = await repository.createApi(organizationId, validated);
    await this.recordAudit({
      organizationId,
      actorUserId: actor.userId,
      requestId: actor.requestId,
      action: "api.created",
      resourceType: "api",
      resourceId: api.id,
      metadata: {
        slug: api.slug,
        upstreamUrl: api.upstream_url
      }
    });
    return api;
  }

  async listApis(organizationId) {
    return repository.listApis(organizationId);
  }

  async createApiKey(organizationId, apiId, payload, actor = {}) {
    const api = await repository.getApiById(organizationId, apiId);
    if (!api) {
      throw new AppError("API not found", 404);
    }

    const validated = apiKeySchema.parse(payload);
    const plainTextKey = generateApiKey();
    const keyPrefix = plainTextKey.slice(0, 16);
    const created = await repository.createApiKey(organizationId, apiId, {
      ...validated,
      keyHash: hashApiKey(plainTextKey),
      keyPrefix
    });

    await this.recordAudit({
      organizationId,
      actorUserId: actor.userId,
      requestId: actor.requestId,
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: created.id,
      metadata: {
        apiId,
        rateLimitStrategy: created.rate_limit_strategy,
        requestsPerMinute: created.requests_per_minute
      }
    });

    return {
      ...created,
      secret: plainTextKey
    };
  }

  async listApiKeys(organizationId, apiId) {
    return repository.listApiKeys(organizationId, apiId);
  }

  async getAuditLogs(organizationId) {
    return repository.getAuditLogs(organizationId);
  }

  async rotateApiKey(organizationId, keyId, actor = {}) {
    const existing = await repository.getApiKeyById(organizationId, keyId);
    if (!existing) {
      throw new AppError("API key not found", 404);
    }

    const plainTextKey = generateApiKey();
    const keyPrefix = plainTextKey.slice(0, 16);
    await repository.updateApiKeyHash(organizationId, keyId, hashApiKey(plainTextKey), keyPrefix);
    await this.recordAudit({
      organizationId,
      actorUserId: actor.userId,
      requestId: actor.requestId,
      action: "api_key.rotated",
      resourceType: "api_key",
      resourceId: keyId,
      metadata: {
        keyPrefix
      }
    });

    return { id: keyId, secret: plainTextKey, keyPrefix };
  }

  async revokeApiKey(organizationId, keyId, actor = {}) {
    const revoked = await repository.revokeApiKey(organizationId, keyId);
    if (!revoked) {
      throw new AppError("API key not found", 404);
    }

    await this.recordAudit({
      organizationId,
      actorUserId: actor.userId,
      requestId: actor.requestId,
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: keyId,
      metadata: {}
    });

    return revoked;
  }

  async getBillingSummary(organizationId) {
    return repository.getBillingSummary(organizationId);
  }

  async authenticateApiKey(plainTextKey) {
    if (!plainTextKey) {
      throw new AppError("Missing x-api-key header", 401);
    }

    const apiKey = await repository.findApiKeyByHash(hashApiKey(plainTextKey));
    if (!apiKey) {
      throw new AppError("Invalid API key", 401);
    }

    return apiKey;
  }

  async enforceRateLimit(apiKey) {
    const response = await fetch(`${env.RATE_LIMITER_SERVICE_URL}/internal/rate-limits/evaluate`, {
      method: "POST",
      headers: getBaseHeaders({
        "x-internal-token": env.INTERNAL_SERVICE_TOKEN
      }),
      body: JSON.stringify({
        identifier: apiKey.id,
        strategy: apiKey.rate_limit_strategy || RATE_LIMIT_STRATEGIES.TOKEN_BUCKET,
        requestsPerMinute: apiKey.requests_per_minute,
        burstCapacity: apiKey.burst_capacity,
        windowSizeSeconds: apiKey.window_size_seconds
      })
    });

    if (!response.ok) {
      throw new AppError("Rate limiter unavailable", 503);
    }

    return parseJsonResponse(response);
  }

  async proxyRequest({ slug, path, method, headers, queryString, body, apiKey }) {
    const api = await repository.getApiBySlug(slug);
    if (!api) {
      throw new AppError("API route not found", 404);
    }

    if (api.id !== apiKey.api_id) {
      throw new AppError("API key is not authorized for this API", 403);
    }

    const rateLimit = await this.enforceRateLimit(apiKey);
    if (!rateLimit.allowed) {
      throw new AppError("Rate limit exceeded", 429, { retryAfterMs: rateLimit.retryAfterMs });
    }

    const result = await upstreamClient.execute({
      api,
      path,
      method,
      headers,
      queryString,
      body
    });

    return upstreamClient.deserializeCachedResponse(result);
  }

  async emitRequestEvent(event) {
    try {
      await fetch(`${env.LOGGING_SERVICE_URL}/internal/logs/events`, {
        method: "POST",
        headers: getBaseHeaders({
          "x-internal-token": env.INTERNAL_SERVICE_TOKEN
        }),
        body: JSON.stringify(event)
      });
    } catch (_error) {
      return;
    }
  }

  async recordAudit(entry) {
    try {
      await repository.insertAuditLog(entry);
    } catch (_error) {
      return;
    }
  }
}
