import client from "prom-client";

client.collectDefaultMetrics();

export const httpRequestDuration = new client.Histogram({
  name: "platform_http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["service", "method", "route", "status_code"],
  buckets: [20, 50, 100, 200, 500, 1000, 2000, 5000]
});

export const httpRequestCount = new client.Counter({
  name: "platform_http_requests_total",
  help: "HTTP requests total",
  labelNames: ["service", "method", "route", "status_code"]
});

export function observeHttpRequest({ service, method, route, statusCode, durationMs }) {
  const labels = {
    service,
    method,
    route,
    status_code: String(statusCode)
  };

  httpRequestCount.inc(labels, 1);
  httpRequestDuration.observe(labels, durationMs);
}

export async function getMetrics() {
  return client.register.metrics();
}

