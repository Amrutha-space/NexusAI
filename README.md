# NexusAI Gateway

[![CI](https://img.shields.io/badge/CI-GitHub_Actions-181717?logo=github)](#)
[![Node](https://img.shields.io/badge/Node-20+-43853d?logo=node.js&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](#)
[![Redis](https://img.shields.io/badge/Redis-7-d82c20?logo=redis&logoColor=white)](#)

AI-powered cloud-native API management and traffic optimization platform with:

- Central API gateway and multi-tenant control plane
- JWT auth and RBAC
- API key lifecycle management
- Redis-backed distributed rate limiting with token bucket and sliding window strategies
- Retry, circuit breaker, caching, async logging, analytics, alerts, and real-time dashboard updates
- NexusAI intelligence for anomaly detection, AI log debugging, predictive scaling, smart cache recommendations, and adaptive traffic policy
- Optional OpenAI-powered root-cause analysis using the Responses API
- Prometheus/Grafana monitoring profile and trace propagation across services
- Kubernetes manifests with service discovery, health probes, and HPA examples

## Why This Project Is Strong

- Demonstrates backend and platform engineering skills beyond CRUD
- Models a real product problem: API governance, protection, observability, and monetization
- Shows production-minded patterns such as distributed rate limiting, async ingestion, AI-assisted incident analysis, and incident-aware alerting
- Includes CI validation, seed data, local infrastructure, and operational documentation

## Resume Pitch

Built NexusAI Gateway, an AI-powered cloud-native API management platform inspired by API Gateway, Stripe, and Datadog using Node.js, PostgreSQL, Redis, Docker, Kubernetes manifests, and React. Implemented distributed rate limiting, API key lifecycle management, retries, circuit breaking, async observability pipelines, WebSocket live metrics, AI anomaly detection, AI log debugging, predictive scaling recommendations, smart cache recommendations, alert deduplication, and CI-backed verification.

## Portfolio Highlights

- Designed a control plane and data plane split across independently deployable services
- Implemented Redis Lua-based token bucket and sliding window rate limiting
- Added async event ingestion, usage rollups, simulated billing, and incident-aware alert deduplication
- Built a live operational dashboard with traffic metrics, alert states, and API/key management
- Added NexusAI operations panels for anomaly score, root-cause recommendations, replica planning, and cache optimization
- Added local infra, migration tooling, readiness checks, audit logs, smoke verification, CI validation, and reviewer-focused technical documentation

## Services

- `auth-service`: tenant onboarding, login, JWT issuance
- `gateway-service`: API registry, key management, request proxying
- `rate-limiter-service`: distributed rate-limit evaluation
- `logging-service`: queued observability pipeline, rollups, alerts, WebSocket telemetry
- `mock-upstream-service`: local upstream used for localhost validation
- `frontend-dashboard`: React dashboard for onboarding, control plane, and analytics
- `shared-libs`: common config, logging, metrics, security, validation, DB/Redis clients

## NexusAI Features

- AI anomaly detection from recent request volume, error rate, and p95 latency
- AI log debugging summaries for slow/failing request clusters, with optional OpenAI analysis
- Predictive scaling recommendations for gateway replicas
- Smart cache TTL recommendations for GET-heavy APIs
- Adaptive rate-limit mode recommendations for overload protection

Enable OpenAI log explanations by setting:

```bash
OPENAI_LOG_ANALYSIS_ENABLED=true
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-nano
```

The local heuristic engine remains the fallback so demos still work without an API key.

See `docs/NEXUSAI_GATEWAY.md` for the architecture and portfolio story.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. In a second shell, run `npm install`.
4. Apply schema migrations with `npm run docker:migrate`.
5. Seed the environment with `npm run docker:seed`.
6. Open `http://localhost:5173`.
7. Login with:
   - email: `owner@example.com`
   - password: `PlatformPass123!`
8. Use seeded API key for proxy tests:
   - `ak_live_seed_platform_key`

## Example Requests

- Login: `POST http://localhost:4001/auth/login`
- Readiness: `GET http://localhost:4000/ready`
- Register API: `POST http://localhost:4000/management/apis`
- Create API key: `POST http://localhost:4000/management/apis/:apiId/keys`
- Audit log history: `GET http://localhost:4000/management/audit-logs`
- Route traffic: `POST http://localhost:4000/proxy/payments/payments/charge`
- Metrics: `GET http://localhost:4003/dashboard/overview`

## Testing

- Unit tests: `npm test`
- Backend import smoke: `npm run verify:imports`
- Live integration checks: `npm run test:integration`
- End-to-end smoke: `npm run test:smoke`
- Postman collection: `tests/gateway/gateway.postman_collection.json`
- Load smoke test: `k6 run tests/load/platform-smoke.js`
- Load benchmark profiles: `k6 run tests/load/platform-benchmark.js`
- Load testing guide: `tests/load/README.md`
- Load-test report template: `tests/load/RESULTS.md`
- Monitoring profile: `infra/monitoring/README.md`
- Kubernetes manifests: `infra/k8s/README.md`

## Deployment Notes

- All configuration is environment-based.
- Dockerfiles are included for each service.
- The system is suitable for Render/AWS ECS style container deployments.
- Versioned SQL migrations are available under `infra/postgres/migrations`.
- Redis is used for cache, rate limiting, queueing, and real-time metric state.
- PostgreSQL stores control-plane entities, logs, rollups, and alerts.
- Audit logs capture privileged management actions such as API creation and key lifecycle changes.
- Each backend service exposes `/health` and dependency-aware `/ready` endpoints.
- GitHub Actions CI runs tests, backend import verification, frontend build, and Compose validation.
