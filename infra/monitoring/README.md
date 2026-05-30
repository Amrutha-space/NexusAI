# Monitoring

NexusAI Gateway exposes Prometheus metrics from every backend service at `/metrics`.

Start the monitoring profile:

```bash
docker compose --profile monitoring up -d prometheus grafana
```

Open:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

Default Grafana login:

- user: `admin`
- password: `admin`

The provisioned dashboard shows:

- request throughput by service
- p95 latency by service
- 5xx rate
- gateway RPS
- rate-limit decision throughput
