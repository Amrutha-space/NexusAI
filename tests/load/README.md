# Load Testing Guide

This project uses `k6` for lightweight local load testing.

## Prerequisites

- Start the stack with `docker compose up --build`
- Seed data with `npm run docker:seed`
- Install `k6` locally

## Scripts

### 1. Smoke validation

```bash
k6 run tests/load/platform-smoke.js
```

Good for confirming the gateway is reachable and the seeded API key works.

### 2. Mixed benchmark

```bash
k6 run tests/load/platform-benchmark.js
```

Default profile mixes successful and failing traffic so you can observe:

- success throughput
- retry / circuit-breaker behavior
- alert generation
- latency under load

### 3. Rate limit profile

```bash
PROFILE=rate_limit k6 run tests/load/platform-benchmark.js
```

Good for measuring how quickly the gateway begins returning `429`.

### 4. Failure profile

```bash
PROFILE=failure k6 run tests/load/platform-benchmark.js
```

Good for validating error handling, retries, and circuit breaking.

## Useful Environment Variables

```bash
GATEWAY_URL=http://localhost:4000
API_KEY=ak_live_seed_platform_key
PROFILE=mixed
NORMAL_AMOUNT=299
FAILURE_AMOUNT=6000
RATE_LIMIT_RPS=80
FAILURE_VUS=20
```

## Outputs

Each benchmark run writes a summary snapshot to:

```bash
tests/load/last-summary.json
```

This is useful for comparing runs before and after changes.

## How To Talk About Results

When demoing the project, focus on:

- p95 and p99 latency
- proportion of `201` vs `429` during throttling
- presence of `502`/`503` during forced failures
- dashboard alert behavior under error bursts

