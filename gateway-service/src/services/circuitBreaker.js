import { CIRCUIT_STATE, AppError } from "@platform/shared";

export class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  get(slug, threshold) {
    if (!this.breakers.has(slug)) {
      this.breakers.set(slug, {
        state: CIRCUIT_STATE.CLOSED,
        failures: 0,
        openedAt: 0,
        threshold
      });
    }

    return this.breakers.get(slug);
  }

  assertCanProceed(slug, threshold) {
    const breaker = this.get(slug, threshold);

    if (breaker.state === CIRCUIT_STATE.OPEN) {
      const elapsed = Date.now() - breaker.openedAt;
      if (elapsed < 30000) {
        throw new AppError("Upstream circuit is open", 503);
      }

      breaker.state = CIRCUIT_STATE.HALF_OPEN;
    }
  }

  onSuccess(slug, threshold) {
    const breaker = this.get(slug, threshold);
    breaker.state = CIRCUIT_STATE.CLOSED;
    breaker.failures = 0;
  }

  onFailure(slug, threshold) {
    const breaker = this.get(slug, threshold);
    breaker.failures += 1;
    if (breaker.failures >= threshold) {
      breaker.state = CIRCUIT_STATE.OPEN;
      breaker.openedAt = Date.now();
    }
  }
}

