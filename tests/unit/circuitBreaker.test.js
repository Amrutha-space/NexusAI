import test from "node:test";
import assert from "node:assert/strict";
import { CircuitBreakerRegistry } from "../../gateway-service/src/services/circuitBreaker.js";

test("circuit breaker opens after threshold failures", () => {
  const registry = new CircuitBreakerRegistry();

  registry.onFailure("payments", 2);
  registry.onFailure("payments", 2);

  assert.throws(() => registry.assertCanProceed("payments", 2));
});

test("circuit breaker closes after success", () => {
  const registry = new CircuitBreakerRegistry();

  registry.onFailure("payments", 2);
  registry.onSuccess("payments", 2);

  assert.doesNotThrow(() => registry.assertCanProceed("payments", 2));
});

