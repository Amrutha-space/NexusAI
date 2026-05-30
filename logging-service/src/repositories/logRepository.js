import { getPgPool } from "@platform/shared";

const pool = getPgPool();

export class LogRepository {
  async persistEvent(event) {
    await pool.query(
      `
      INSERT INTO request_logs (
        organization_id,
        api_id,
        api_key_id,
        route_slug,
        method,
        status_code,
        latency_ms,
        cache_hit,
        error_message
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        event.organizationId,
        event.apiId,
        event.apiKeyId,
        event.routeSlug,
        event.method,
        event.statusCode,
        event.latencyMs,
        event.cacheHit,
        event.errorMessage || null
      ]
    );

    await pool.query(
      `
      INSERT INTO usage_rollups (
        organization_id,
        api_id,
        api_key_id,
        bucket_minute,
        request_count,
        error_count,
        total_latency_ms,
        billable_amount
      ) VALUES ($1,$2,$3,date_trunc('minute', NOW()),1,$4,$5,$6)
      ON CONFLICT (organization_id, api_id, api_key_id, bucket_minute)
      DO UPDATE SET
        request_count = usage_rollups.request_count + 1,
        error_count = usage_rollups.error_count + EXCLUDED.error_count,
        total_latency_ms = usage_rollups.total_latency_ms + EXCLUDED.total_latency_ms,
        billable_amount = usage_rollups.billable_amount + EXCLUDED.billable_amount
      `,
      [
        event.organizationId,
        event.apiId,
        event.apiKeyId,
        event.statusCode >= 500 ? 1 : 0,
        event.latencyMs,
        event.billableAmount
      ]
    );
  }

  async insertAlert({ organizationId, apiId, level, metricName, message }) {
    const result = await pool.query(
      `
      INSERT INTO alerts (organization_id, api_id, level, metric_name, message)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, organization_id, api_id, level, metric_name, message, triggered_at
      `,
      [organizationId, apiId, level, metricName, message]
    );

    return result.rows[0];
  }

  async resolveOpenAlerts({ organizationId, apiId, metricName }) {
    await pool.query(
      `
      UPDATE alerts
      SET resolved_at = NOW()
      WHERE organization_id = $1
        AND api_id = $2
        AND metric_name = $3
        AND resolved_at IS NULL
      `,
      [organizationId, apiId, metricName]
    );
  }

  async getOverview(organizationId) {
    const result = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_requests,
        COALESCE(AVG(latency_ms), 0)::float AS avg_latency,
        COALESCE(SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END), 0)::int AS total_errors
      FROM request_logs
      WHERE organization_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      [organizationId]
    );
    return result.rows[0];
  }

  async getLatencyPercentiles(organizationId) {
    const result = await pool.query(
      `
      SELECT
        COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms), 0)::float AS p50,
        COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::float AS p95,
        COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms), 0)::float AS p99
      FROM request_logs
      WHERE organization_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      [organizationId]
    );
    return result.rows[0];
  }

  async getTrafficSeries(organizationId) {
    const result = await pool.query(
      `
      SELECT
        to_char(bucket_minute, 'YYYY-MM-DD"T"HH24:MI:00"Z"') AS time,
        SUM(request_count)::int AS requests,
        SUM(error_count)::int AS errors,
        COALESCE(SUM(total_latency_ms) / NULLIF(SUM(request_count), 0), 0)::float AS avg_latency
      FROM usage_rollups
      WHERE organization_id = $1
        AND bucket_minute >= NOW() - INTERVAL '3 hours'
      GROUP BY bucket_minute
      ORDER BY bucket_minute ASC
      `,
      [organizationId]
    );
    return result.rows;
  }

  async getApiUsage(organizationId) {
    const result = await pool.query(
      `
      SELECT
        a.name,
        a.slug,
        SUM(u.request_count)::int AS requests,
        SUM(u.error_count)::int AS errors,
        COALESCE(AVG(u.total_latency_ms / NULLIF(u.request_count, 0)), 0)::float AS avg_latency,
        SUM(u.billable_amount)::float AS spend
      FROM usage_rollups u
      JOIN apis a ON a.id = u.api_id
      WHERE u.organization_id = $1
        AND u.bucket_minute >= NOW() - INTERVAL '24 hours'
      GROUP BY a.id
      ORDER BY requests DESC
      `,
      [organizationId]
    );
    return result.rows;
  }

  async getAlerts(organizationId) {
    const result = await pool.query(
      `
      SELECT id, api_id, level, metric_name, message, triggered_at, resolved_at
      FROM alerts
      WHERE organization_id = $1
      ORDER BY triggered_at DESC
      LIMIT 20
      `,
      [organizationId]
    );
    return result.rows;
  }

  async getIntelligenceSnapshot(organizationId) {
    const [currentWindow, baselineWindow, apiHealth, recentErrors, cacheCandidates] = await Promise.all([
      pool.query(
        `
        SELECT
          COUNT(*)::int AS requests,
          COALESCE(SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END), 0)::int AS errors,
          COALESCE(AVG(latency_ms), 0)::float AS avg_latency,
          COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::float AS p95_latency
        FROM request_logs
        WHERE organization_id = $1
          AND created_at >= NOW() - INTERVAL '15 minutes'
        `,
        [organizationId]
      ),
      pool.query(
        `
        SELECT
          COUNT(*)::int AS requests,
          COALESCE(SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END), 0)::int AS errors,
          COALESCE(AVG(latency_ms), 0)::float AS avg_latency,
          COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::float AS p95_latency
        FROM request_logs
        WHERE organization_id = $1
          AND created_at >= NOW() - INTERVAL '24 hours'
          AND created_at < NOW() - INTERVAL '15 minutes'
        `,
        [organizationId]
      ),
      pool.query(
        `
        SELECT
          a.id,
          a.name,
          a.slug,
          a.cache_ttl_seconds,
          COUNT(l.*)::int AS requests,
          COALESCE(SUM(CASE WHEN l.status_code >= 500 THEN 1 ELSE 0 END), 0)::int AS errors,
          COALESCE(AVG(l.latency_ms), 0)::float AS avg_latency,
          COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY l.latency_ms), 0)::float AS p95_latency
        FROM apis a
        LEFT JOIN request_logs l
          ON l.api_id = a.id
          AND l.organization_id = a.organization_id
          AND l.created_at >= NOW() - INTERVAL '24 hours'
        WHERE a.organization_id = $1
        GROUP BY a.id
        ORDER BY requests DESC, a.created_at DESC
        `,
        [organizationId]
      ),
      pool.query(
        `
        SELECT
          route_slug,
          method,
          status_code,
          error_message,
          latency_ms,
          created_at
        FROM request_logs
        WHERE organization_id = $1
          AND (status_code >= 500 OR latency_ms >= 1000 OR error_message IS NOT NULL)
        ORDER BY created_at DESC
        LIMIT 12
        `,
        [organizationId]
      ),
      pool.query(
        `
        SELECT
          a.name,
          a.slug,
          a.cache_ttl_seconds,
          COUNT(l.*)::int AS requests,
          COALESCE(AVG(l.latency_ms), 0)::float AS avg_latency,
          COALESCE(SUM(CASE WHEN l.cache_hit THEN 1 ELSE 0 END), 0)::int AS cache_hits
        FROM apis a
        LEFT JOIN request_logs l
          ON l.api_id = a.id
          AND l.organization_id = a.organization_id
          AND l.method = 'GET'
          AND l.created_at >= NOW() - INTERVAL '24 hours'
        WHERE a.organization_id = $1
        GROUP BY a.id
        HAVING COUNT(l.*) > 0
        ORDER BY requests DESC
        LIMIT 8
        `,
        [organizationId]
      )
    ]);

    return {
      currentWindow: currentWindow.rows[0],
      baselineWindow: baselineWindow.rows[0],
      apiHealth: apiHealth.rows,
      recentErrors: recentErrors.rows,
      cacheCandidates: cacheCandidates.rows
    };
  }
}
