export const ALERT_COOLDOWN_SECONDS = 300;
export const ALERT_METRIC_ERROR_RATE = "error_rate";

export function shouldOpenAlertIncident({ requests, errorRate, threshold }) {
  return requests >= 20 && errorRate >= threshold;
}

export function shouldResolveAlertIncident({ errorRate, threshold }) {
  return errorRate < threshold;
}

export function buildAlertIncidentKey({ organizationId, apiId, metricName }) {
  return `alerts:incident:${organizationId}:${apiId}:${metricName}`;
}

