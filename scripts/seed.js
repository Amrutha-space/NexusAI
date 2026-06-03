import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || "platform",
  password: process.env.POSTGRES_PASSWORD || "platform",
  database: process.env.POSTGRES_DB || "developer_platform"
});

const seedUser = {
  organizationId: "0e13c0f0-bf87-4de8-9d11-53fd9c4f0b01",
  userId: "d9d1b3c7-cf54-4ca7-9130-d9cbbf949111",
  apiId: "2d8a139d-713d-4e29-8804-8546c7bf2001",
  keyId: "1d90c9f2-10fe-4cba-873b-65a9b31e8101",
  email: "owner@example.com",
  password: "PlatformPass123!",
  apiKeySecret: "ak_live_seed_platform_key"
};
const seedUpstreamUrl = process.env.SEED_UPSTREAM_URL || "http://mock-upstream-service:4010";

async function run() {
  const passwordHash = await bcrypt.hash(seedUser.password, 12);

  await pool.query(
    `
    INSERT INTO organizations (id, name)
    VALUES ($1, 'Seed Organization')
    ON CONFLICT (id) DO NOTHING
    `,
    [seedUser.organizationId]
  );

  await pool.query(
    `
    INSERT INTO users (id, email, password_hash, name)
    VALUES ($1, $2, $3, 'Seed Owner')
    ON CONFLICT (email) DO NOTHING
    `,
    [seedUser.userId, seedUser.email, passwordHash]
  );

  await pool.query(
    `
    INSERT INTO memberships (organization_id, user_id, role)
    VALUES ($1, $2, 'admin')
    ON CONFLICT (organization_id, user_id) DO NOTHING
    `,
    [seedUser.organizationId, seedUser.userId]
  );

  await pool.query(
    `
    INSERT INTO apis (
      id, organization_id, name, slug, upstream_url, description,
      cache_ttl_seconds, retry_count, timeout_ms, circuit_breaker_threshold
    )
    VALUES ($1, $2, 'Payments API', 'payments', $3, 'Seed upstream API', 15, 2, 5000, 5)
    ON CONFLICT (slug) DO UPDATE SET
      upstream_url = EXCLUDED.upstream_url,
      updated_at = NOW()
    `,
    [seedUser.apiId, seedUser.organizationId, seedUpstreamUrl]
  );

  await pool.query(
    `
    INSERT INTO api_keys (
      id, organization_id, api_id, name, role, key_hash, key_prefix,
      rate_limit_strategy, requests_per_minute, burst_capacity, window_size_seconds
    )
    VALUES (
      $1, $2, $3, 'Seed API Key', 'admin',
      encode(digest($4, 'sha256'), 'hex'), left($4, 16),
      'token_bucket', 120, 40, 60
    )
    ON CONFLICT (key_hash) DO NOTHING
    `,
    [seedUser.keyId, seedUser.organizationId, seedUser.apiId, seedUser.apiKeySecret]
  );

  console.log(JSON.stringify(seedUser, null, 2));
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
