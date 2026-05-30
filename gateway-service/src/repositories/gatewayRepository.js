import { AppError, getPgPool } from "@platform/shared";

const pool = getPgPool();

export class GatewayRepository {
  async createApi(organizationId, payload) {
    try {
      const result = await pool.query(
        `
        INSERT INTO apis (
          organization_id,
          name,
          slug,
          upstream_url,
          description,
          cache_ttl_seconds,
          retry_count,
          timeout_ms,
          circuit_breaker_threshold
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
        `,
        [
          organizationId,
          payload.name,
          payload.slug,
          payload.upstreamUrl,
          payload.description,
          payload.cacheTtlSeconds,
          payload.retryCount,
          payload.timeoutMs,
          payload.circuitBreakerThreshold
        ]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === "23505" && error.constraint === "apis_slug_key") {
        throw new AppError(`API slug "${payload.slug}" already exists`, 409);
      }
      throw error;
    }
  }

  async listApis(organizationId) {
    const result = await pool.query(
      "SELECT * FROM apis WHERE organization_id = $1 ORDER BY created_at DESC",
      [organizationId]
    );
    return result.rows;
  }

  async getApiById(organizationId, apiId) {
    const result = await pool.query(
      "SELECT * FROM apis WHERE organization_id = $1 AND id = $2 LIMIT 1",
      [organizationId, apiId]
    );
    return result.rows[0] || null;
  }

  async getApiBySlug(slug) {
    const result = await pool.query("SELECT * FROM apis WHERE slug = $1 AND is_active = TRUE LIMIT 1", [slug]);
    return result.rows[0] || null;
  }

  async createApiKey(organizationId, apiId, payload) {
    const result = await pool.query(
      `
      INSERT INTO api_keys (
        organization_id,
        api_id,
        name,
        role,
        key_hash,
        key_prefix,
        rate_limit_strategy,
        requests_per_minute,
        burst_capacity,
        window_size_seconds
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, organization_id, api_id, name, role, key_prefix, rate_limit_strategy,
                requests_per_minute, burst_capacity, window_size_seconds, is_active, created_at
      `,
      [
        organizationId,
        apiId,
        payload.name,
        payload.role,
        payload.keyHash,
        payload.keyPrefix,
        payload.rateLimitStrategy,
        payload.requestsPerMinute,
        payload.burstCapacity,
        payload.windowSizeSeconds
      ]
    );
    return result.rows[0];
  }

  async listApiKeys(organizationId, apiId) {
    const result = await pool.query(
      `
      SELECT id, name, role, key_prefix, rate_limit_strategy, requests_per_minute,
             burst_capacity, window_size_seconds, is_active, created_at, revoked_at
      FROM api_keys
      WHERE organization_id = $1 AND api_id = $2
      ORDER BY created_at DESC
      `,
      [organizationId, apiId]
    );
    return result.rows;
  }

  async getApiKeyById(organizationId, keyId) {
    const result = await pool.query(
      "SELECT * FROM api_keys WHERE organization_id = $1 AND id = $2 LIMIT 1",
      [organizationId, keyId]
    );
    return result.rows[0] || null;
  }

  async findApiKeyByHash(keyHash) {
    const result = await pool.query(
      `
      SELECT
        ak.*,
        a.slug,
        a.upstream_url,
        a.cache_ttl_seconds,
        a.retry_count,
        a.timeout_ms,
        a.circuit_breaker_threshold
      FROM api_keys ak
      JOIN apis a ON a.id = ak.api_id
      WHERE ak.key_hash = $1
        AND ak.is_active = TRUE
        AND a.is_active = TRUE
      LIMIT 1
      `,
      [keyHash]
    );
    return result.rows[0] || null;
  }

  async revokeApiKey(organizationId, keyId) {
    const result = await pool.query(
      `
      UPDATE api_keys
      SET is_active = FALSE, revoked_at = NOW()
      WHERE organization_id = $1 AND id = $2
      RETURNING id, revoked_at
      `,
      [organizationId, keyId]
    );
    return result.rows[0] || null;
  }

  async updateApiKeyHash(organizationId, keyId, keyHash, keyPrefix) {
    const result = await pool.query(
      `
      UPDATE api_keys
      SET key_hash = $3, key_prefix = $4, revoked_at = NULL, is_active = TRUE
      WHERE organization_id = $1 AND id = $2
      RETURNING id, key_prefix
      `,
      [organizationId, keyId, keyHash, keyPrefix]
    );
    return result.rows[0] || null;
  }

  async getBillingSummary(organizationId) {
    const result = await pool.query(
      `
      SELECT
        COALESCE(SUM(billable_amount), 0)::float AS total_spend,
        COALESCE(SUM(request_count), 0)::int AS requests
      FROM usage_rollups
      WHERE organization_id = $1
        AND bucket_minute >= NOW() - INTERVAL '30 days'
      `,
      [organizationId]
    );
    return result.rows[0];
  }

  async insertAuditLog({ organizationId, actorUserId, action, resourceType, resourceId, requestId, metadata }) {
    await pool.query(
      `
      INSERT INTO audit_logs (
        organization_id,
        actor_user_id,
        action,
        resource_type,
        resource_id,
        request_id,
        metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [organizationId, actorUserId, action, resourceType, resourceId || null, requestId || null, metadata || {}]
    );
  }

  async getAuditLogs(organizationId) {
    const result = await pool.query(
      `
      SELECT
        id,
        actor_user_id,
        action,
        resource_type,
        resource_id,
        request_id,
        metadata,
        created_at
      FROM audit_logs
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [organizationId]
    );

    return result.rows;
  }
}
