import test from "node:test";
import assert from "node:assert/strict";
import {
  ALERT_COOLDOWN_SECONDS,
  ALERT_METRIC_ERROR_RATE,
  buildAlertIncidentKey,
  shouldOpenAlertIncident,
  shouldResolveAlertIncident
} from "../../logging-service/src/utils/alertPolicy.js";

test("alert policy opens only after threshold and minimum request volume", () => {
  assert.equal(
    shouldOpenAlertIncident({ requests: 19, errorRate: 0.5, threshold: 0.15 }),
    false
  );
  assert.equal(
    shouldOpenAlertIncident({ requests: 25, errorRate: 0.14, threshold: 0.15 }),
    false
  );
  assert.equal(
    shouldOpenAlertIncident({ requests: 25, errorRate: 0.2, threshold: 0.15 }),
    true
  );
});

test("alert policy resolves when error rate recovers", () => {
  assert.equal(
    shouldResolveAlertIncident({ errorRate: 0.1, threshold: 0.15 }),
    true
  );
  assert.equal(
    shouldResolveAlertIncident({ errorRate: 0.2, threshold: 0.15 }),
    false
  );
});

test("alert policy builds a stable redis incident key", () => {
  const key = buildAlertIncidentKey({
    organizationId: "org-1",
    apiId: "api-1",
    metricName: ALERT_METRIC_ERROR_RATE
  });

  assert.equal(key, "alerts:incident:org-1:api-1:error_rate");
  assert.equal(ALERT_COOLDOWN_SECONDS, 300);
});

