# NexusAI Gateway Load-Test Report

Use this report after running the k6 profiles. The goal is to show engineering maturity: latency, error behavior, rate limiting, and what NexusAI recommends after traffic.

## Environment

- Machine:
- Date:
- Commit:
- Profile:
- Docker services:
- Notes:

## Commands

```bash
k6 run tests/load/platform-smoke.js
k6 run tests/load/platform-benchmark.js
PROFILE=rate_limit k6 run tests/load/platform-benchmark.js
PROFILE=failure k6 run tests/load/platform-benchmark.js
```

## Results

| Profile | Requests | RPS | p95 latency | p99 latency | Error rate | 429 rate | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| smoke |  |  |  |  |  |  |  |
| mixed |  |  |  |  |  |  |  |
| rate_limit |  |  |  |  |  |  |  |
| failure |  |  |  |  |  |  |  |

## NexusAI Observations

Capture the intelligence endpoint after each profile:

```bash
curl http://localhost:4003/dashboard/intelligence \
  -H "Authorization: Bearer $TOKEN"
```

| Profile | AI Risk | Recommended Replicas | Adaptive Mode | Log Debugger Summary |
| --- | ---: | ---: | --- | --- |
| smoke |  |  |  |  |
| mixed |  |  |  |  |
| rate_limit |  |  |  |  |
| failure |  |  |  |  |

## Demo Talking Points

- The gateway stayed stateless; Redis coordinated rate-limit state.
- Logging remained asynchronous through BullMQ so user-facing request latency did not depend on analytics writes.
- NexusAI converted telemetry into operator decisions: anomaly score, root-cause summary, cache recommendation, and replica recommendation.
- Prometheus/Grafana tracked the same services from an external monitoring layer.
