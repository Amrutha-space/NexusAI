# Reviewer Guide

## What This Project Demonstrates

- API gateway design with control-plane and data-plane separation
- SaaS multi-tenancy with organizations, memberships, API products, and API keys
- Distributed systems patterns: retries, circuit breaking, async queues, cache, and Redis-backed throttling
- Operational experience: metrics, alerts, rollups, billing summary, and real-time dashboard updates

## Candidate Narrative

This project is strongest when presented as a platform engineering / backend systems project rather than a generic full-stack app. The story to tell is:

1. The platform turns raw upstream services into governed API products.
2. The gateway protects upstreams with auth, keys, retries, caching, circuit breaking, and distributed rate limits.
3. The observability pipeline converts traffic into actionable metrics, usage, and incident-style alerts.
4. The dashboard gives operators and developers a clean control surface for APIs, keys, and production health.

## High-Signal Files

- `gateway-service/src/services/gatewayService.js`
  Central request orchestration for management APIs, API key auth, rate-limit checks, proxying, and telemetry emission.

- `gateway-service/src/services/upstreamClient.js`
  Retry, cache, timeout, and circuit-breaker behavior on the request path.

- `rate-limiter-service/src/services/rateLimiterService.js`
  Redis Lua scripts for token bucket and sliding window rate limiting.

- `logging-service/src/services/logProcessor.js`
  Async ingestion, rollup updates, live metric fan-out, and incident-aware alert deduplication.

- `shared-libs/src/validation/schemas.js`
  Shared boundary validation for management APIs and stronger upstream URL enforcement.

- `scripts/migrate.js`
  Versioned SQL migration runner for schema changes beyond one-time container initialization.

- `gateway-service/src/repositories/gatewayRepository.js`
  Includes persisted audit logging for privileged management operations.

## Recommended Demo Flow

1. Start the stack with Docker Compose.
2. Seed the environment with `npm run docker:seed`.
3. Login through the dashboard.
4. Create an API and an API key.
5. Send gateway traffic with the seeded key.
6. Trigger rate limiting and error alerts to show protections and observability.

## Quality Signals

- Unit tests cover validation, circuit breaking, alert policy, and rate-limit input handling.
- End-to-end smoke verification covers login, gateway proxying, and dashboard metrics on a running stack.
- Structured k6 load profiles cover smoke, mixed traffic, throttling, and upstream-failure scenarios.
- Live integration verification covers `/ready` endpoints and audit-log access on a running stack.
- Frontend build passes in CI.
- Docker Compose config is validated in CI.
- Alerting behavior now opens a single incident during an error-rate spike instead of flooding duplicates.

## Suggested Resume Bullets

- Built a multi-tenant API management platform with Node.js, PostgreSQL, Redis, Docker, and React to manage API products, credentials, rate limits, and live observability.
- Implemented distributed rate limiting with Redis Lua scripts using token bucket and sliding window algorithms for per-key traffic governance.
- Added reliability protections including retries, circuit breakers, request caching, async telemetry ingestion, and incident-aware alert deduplication.
- Shipped CI-backed verification with unit tests, backend smoke checks, frontend production builds, and end-to-end local environment validation.
