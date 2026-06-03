# Render Deployment Checklist

## Required Safety Step

Never commit `.env`. If a real OpenAI key, database password, or internal token was pasted into `.env`, rotate it before making the repository public.

## Service Environment

Use the same values across all backend services:

```bash
JWT_SECRET=<strong shared secret>
INTERNAL_SERVICE_TOKEN=<strong shared internal token>
```

For managed PostgreSQL, prefer:

```bash
DATABASE_URL=<render postgres external or internal database URL>
PGSSLMODE=require
DATABASE_SSL=true
```

For managed Redis, prefer:

```bash
REDIS_URL=<render redis url>
```

If Render gives host/port instead of URLs, use:

```bash
POSTGRES_HOST=<host>
POSTGRES_PORT=5432
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<password>
POSTGRES_DB=<database>
POSTGRES_SSL=true
REDIS_HOST=<host>
REDIS_PORT=6379
REDIS_TLS=true
```

## Service URLs

Gateway must use base URLs only:

```bash
AUTH_SERVICE_URL=https://auth-service-xxxx.onrender.com
RATE_LIMITER_SERVICE_URL=https://rate-limiter-service-xxxx.onrender.com
LOGGING_SERVICE_URL=https://logging-service-xxxx.onrender.com
GATEWAY_SERVICE_URL=https://gateway-service-xxxx.onrender.com
```

Do not include route paths such as `/internal/rate-limits/evaluate` in service URL env vars.

## Seed Demo API

For Render, seed with the deployed mock upstream URL:

```bash
SEED_UPSTREAM_URL=https://mock-upstream-service.onrender.com
npm run seed
```

The seed script updates the existing `payments` API upstream URL if it already exists.

## Verification

```bash
curl https://gateway-service-xxxx.onrender.com/ready
curl https://rate-limiter-service-xxxx.onrender.com/ready
curl https://logging-service-xxxx.onrender.com/ready
```

Then:

```bash
curl -X POST https://gateway-service-xxxx.onrender.com/proxy/payments/payments/charge \
  -H "Content-Type: application/json" \
  -H "x-api-key: ak_live_seed_platform_key" \
  -d '{"amount":299,"currency":"USD"}'
```

Expected:

```json
{"chargeId":"...","amount":299,"currency":"USD","status":"succeeded"}
```

## If Gateway Says Rate Limiter Unavailable

Check:

- `RATE_LIMITER_SERVICE_URL` points to the rate-limiter base URL.
- `INTERNAL_SERVICE_TOKEN` is identical in gateway and rate-limiter services.
- `REDIS_URL` is set on the rate-limiter service.
- `curl https://rate-limiter-service-xxxx.onrender.com/ready` returns `status: ready`.
