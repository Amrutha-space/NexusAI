import test from "node:test";
import assert from "node:assert/strict";

const baseUrls = {
  auth: process.env.AUTH_URL || "http://localhost:4001",
  gateway: process.env.GATEWAY_URL || "http://localhost:4000",
  logging: process.env.LOGGING_URL || "http://localhost:4003"
};

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  return { response, data };
}

test("live stack login, audit log access, and readiness endpoints work", async (t) => {
  if (process.env.RUN_LIVE_STACK !== "1") {
    t.skip("Set RUN_LIVE_STACK=1 to execute live integration tests.");
    return;
  }

  const login = await jsonRequest(`${baseUrls.auth}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@example.com",
      password: "PlatformPass123!"
    })
  });

  assert.equal(login.response.status, 200);
  assert.ok(login.data.token);

  const headers = {
    Authorization: `Bearer ${login.data.token}`
  };

  const [gatewayReady, authReady, rateLimiterReady, loggingReady, auditLogs] = await Promise.all([
    jsonRequest(`${baseUrls.gateway}/ready`),
    jsonRequest(`${baseUrls.auth}/ready`),
    jsonRequest("http://localhost:4002/ready"),
    jsonRequest(`${baseUrls.logging}/ready`),
    jsonRequest(`${baseUrls.gateway}/management/audit-logs`, { headers })
  ]);

  assert.equal(gatewayReady.response.status, 200);
  assert.equal(authReady.response.status, 200);
  assert.equal(rateLimiterReady.response.status, 200);
  assert.equal(loggingReady.response.status, 200);
  assert.equal(auditLogs.response.status, 200);
  assert.ok(Array.isArray(auditLogs.data.auditLogs));
});
