import http from "k6/http";
import { check, sleep } from "k6";

const gatewayUrl = __ENV.GATEWAY_URL || "http://localhost:4000";
const apiKey = __ENV.API_KEY || "ak_live_seed_platform_key";
const amount = Number(__ENV.AMOUNT || 149);
const sleepSeconds = Number(__ENV.SLEEP_SECONDS || 1);

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
    checks: ["rate>0.95"]
  }
};

export default function () {
  const response = http.post(
    `${gatewayUrl}/proxy/payments/payments/charge`,
    JSON.stringify({ amount, currency: "USD" }),
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      tags: {
        scenario: "smoke"
      }
    }
  );

  check(response, {
    "smoke status is 201 or 429": (res) => [201, 429].includes(res.status)
  });

  sleep(sleepSeconds);
}

