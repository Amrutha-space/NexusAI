import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";
import { check, sleep } from "k6";

const gatewayUrl = __ENV.GATEWAY_URL || "http://localhost:4000";
const apiKey = __ENV.API_KEY || "ak_live_seed_platform_key";
const currency = __ENV.CURRENCY || "USD";
const normalAmount = Number(__ENV.NORMAL_AMOUNT || 299);
const failureAmount = Number(__ENV.FAILURE_AMOUNT || 6000);
const profile = __ENV.PROFILE || "mixed";
const cooloffSleep = Number(__ENV.COOLOFF_SLEEP || 0.2);

const status201Rate = new Rate("status_201_rate");
const status429Rate = new Rate("status_429_rate");
const status5xxRate = new Rate("status_5xx_rate");
const scenarioLatency = new Trend("scenario_latency_ms", true);
const unexpectedResponses = new Counter("unexpected_responses");

const scenarioConfigs = {
  mixed: {
    executor: "ramping-arrival-rate",
    startRate: 5,
    timeUnit: "1s",
    preAllocatedVUs: 20,
    maxVUs: 120,
    stages: [
      { target: 20, duration: "30s" },
      { target: 60, duration: "45s" },
      { target: 60, duration: "30s" },
      { target: 10, duration: "15s" }
    ],
    exec: "mixedTraffic"
  },
  rate_limit: {
    executor: "constant-arrival-rate",
    rate: Number(__ENV.RATE_LIMIT_RPS || 80),
    timeUnit: "1s",
    duration: __ENV.RATE_LIMIT_DURATION || "45s",
    preAllocatedVUs: 40,
    maxVUs: 160,
    exec: "rateLimitTraffic"
  },
  failure: {
    executor: "constant-vus",
    vus: Number(__ENV.FAILURE_VUS || 20),
    duration: __ENV.FAILURE_DURATION || "30s",
    exec: "failureTraffic"
  }
};

const selectedScenario = scenarioConfigs[profile] || scenarioConfigs.mixed;

export const options = {
  scenarios: {
    [profile]: selectedScenario
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<4000"],
    http_req_failed: ["rate<0.35"],
    status_201_rate: ["rate>0.10"],
    checks: ["rate>0.90"]
  },
  summaryTrendStats: ["avg", "min", "med", "p(95)", "p(99)", "max"]
};

function sendCharge(amount, tags) {
  const response = http.post(
    `${gatewayUrl}/proxy/payments/payments/charge`,
    JSON.stringify({ amount, currency }),
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      tags
    }
  );

  scenarioLatency.add(response.timings.duration, tags);
  status201Rate.add(response.status === 201);
  status429Rate.add(response.status === 429);
  status5xxRate.add(response.status >= 500);

  return response;
}

export function mixedTraffic() {
  const shouldFail = Math.random() < 0.2;
  const response = sendCharge(shouldFail ? failureAmount : normalAmount, {
    profile: "mixed",
    intent: shouldFail ? "failure" : "success"
  });

  const ok = check(response, {
    "mixed request returns expected status": (res) => [201, 429, 502, 503].includes(res.status)
  });

  if (!ok) {
    unexpectedResponses.add(1);
  }

  sleep(cooloffSleep);
}

export function rateLimitTraffic() {
  const response = sendCharge(normalAmount, {
    profile: "rate_limit",
    intent: "burst"
  });

  const ok = check(response, {
    "rate-limit profile returns 201, 429, or 503": (res) => [201, 429, 503].includes(res.status)
  });

  if (!ok) {
    unexpectedResponses.add(1);
  }
}

export function failureTraffic() {
  const response = sendCharge(failureAmount, {
    profile: "failure",
    intent: "upstream_error"
  });

  const ok = check(response, {
    "failure profile returns 502, 503, or 429": (res) => [429, 502, 503].includes(res.status)
  });

  if (!ok) {
    unexpectedResponses.add(1);
  }

  sleep(cooloffSleep);
}

export function handleSummary(data) {
  const snapshot = {
    profile,
    iterations: data.metrics.iterations?.count || 0,
    checksPassRate: data.metrics.checks?.passes && data.metrics.checks?.fails !== undefined
      ? data.metrics.checks.passes / (data.metrics.checks.passes + data.metrics.checks.fails)
      : null,
    httpReqDurationP95: data.metrics.http_req_duration?.["p(95)"] || null,
    httpReqDurationP99: data.metrics.http_req_duration?.["p(99)"] || null,
    status201Rate: data.metrics.status_201_rate?.rate || 0,
    status429Rate: data.metrics.status_429_rate?.rate || 0,
    status5xxRate: data.metrics.status_5xx_rate?.rate || 0,
    unexpectedResponses: data.metrics.unexpected_responses?.count || 0
  };

  return {
    stdout: `${JSON.stringify(snapshot, null, 2)}\n`,
    "tests/load/last-summary.json": JSON.stringify(snapshot, null, 2)
  };
}

