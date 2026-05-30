# API Documentation

## Auth Service

### `POST /auth/register`
- Creates an organization and owner user.

### `POST /auth/login`
- Returns JWT and user metadata.

### `GET /auth/me`
- Requires bearer token.

## Gateway Management

### `GET /management/apis`
- Lists APIs for the authenticated organization.

### `POST /management/apis`
- Admin only.
- Body: `name`, `slug`, `upstreamUrl`, `description`, `cacheTtlSeconds`, `retryCount`, `timeoutMs`, `circuitBreakerThreshold`

### `GET /management/apis/:apiId/keys`
- Lists API keys for an API.

### `POST /management/apis/:apiId/keys`
- Admin only.
- Body: `name`, `role`, `rateLimitStrategy`, `requestsPerMinute`, `burstCapacity`, `windowSizeSeconds`

### `POST /management/keys/:keyId/rotate`
- Admin only.

### `POST /management/keys/:keyId/revoke`
- Admin only.

### `GET /management/billing`
- Returns 30-day simulated billing totals.

## Gateway Proxy

### `ALL /proxy/:slug/*`
- Requires `x-api-key`.
- Applies per-key rate limits, cache, retries, and circuit breaker protections.

## Observability

### `GET /dashboard/overview`
- Requests, error rate, average latency, p50/p95/p99.

### `GET /dashboard/traffic`
- Time series over the recent 3 hours.

### `GET /dashboard/usage`
- Usage analytics per API.

### `GET /dashboard/alerts`
- Recent triggered alerts.

### `WS /ws`
- Real-time metric and alert stream.
