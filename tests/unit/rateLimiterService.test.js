import test from "node:test";
import assert from "node:assert/strict";
import { RateLimiterService } from "../../rate-limiter-service/src/services/rateLimiterService.js";

test("rate limiter service validates inputs", async () => {
  const service = new RateLimiterService();
  await assert.rejects(() => service.evaluate({ strategy: "token_bucket" }));
});

