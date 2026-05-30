import test from "node:test";
import assert from "node:assert/strict";
import { apiSchema } from "../../shared-libs/src/validation/schemas.js";

test("api schema accepts valid upstream URLs", () => {
  const parsed = apiSchema.parse({
    name: "Payments API",
    slug: "payments",
    upstreamUrl: "https://api.example.com/v1",
    description: "payment flows",
    cacheTtlSeconds: 30,
    retryCount: 2,
    timeoutMs: 5000,
    circuitBreakerThreshold: 5
  });

  assert.equal(parsed.upstreamUrl, "https://api.example.com/v1");
});

test("api schema rejects malformed upstream URLs", () => {
  assert.throws(
    () =>
      apiSchema.parse({
        name: "Bad API",
        slug: "bad-api",
        upstreamUrl: "https:ai.com",
        description: "invalid",
        cacheTtlSeconds: 30,
        retryCount: 2,
        timeoutMs: 5000,
        circuitBreakerThreshold: 5
      }),
    /upstreamUrl/
  );
});

test("api schema rejects unsupported protocols", () => {
  assert.throws(
    () =>
      apiSchema.parse({
        name: "FTP API",
        slug: "ftp-api",
        upstreamUrl: "ftp://files.example.com",
        description: "invalid",
        cacheTtlSeconds: 30,
        retryCount: 2,
        timeoutMs: 5000,
        circuitBreakerThreshold: 5
      }),
    /http:\/\/ or https:\/\//
  );
});
