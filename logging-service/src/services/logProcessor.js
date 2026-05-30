import { Queue, Worker } from "bullmq";
import { env, getRedisClient } from "@platform/shared";
import { LogRepository } from "../repositories/logRepository.js";
import {
  ALERT_COOLDOWN_SECONDS,
  ALERT_METRIC_ERROR_RATE,
  buildAlertIncidentKey,
  shouldOpenAlertIncident,
  shouldResolveAlertIncident
} from "../utils/alertPolicy.js";

const redis = getRedisClient();

export class LogProcessor {
  constructor(websocketHub, logger) {
    this.websocketHub = websocketHub;
    this.logger = logger;
    this.repository = new LogRepository();
    this.queue = new Queue("request-events", { connection: redis });
    this.worker = new Worker(
      "request-events",
      async (job) => this.processEvent(job.data),
      { connection: redis }
    );

    this.worker.on("failed", (_job, error) => {
      this.logger.error({ err: error }, "request event processing failed");
    });
  }

  async enqueue(event) {
    await this.queue.add("request-event", event, {
      removeOnComplete: 1000,
      removeOnFail: 1000
    });
  }

  async processEvent(event) {
    await this.repository.persistEvent(event);

    const redisKey = `dashboard:metrics:${event.organizationId}:${event.apiId}`;
    const multi = redis.multi();
    multi.hincrby(redisKey, "requests", 1);
    multi.hincrby(redisKey, "errors", event.statusCode >= 500 ? 1 : 0);
    multi.hincrby(redisKey, "latencyTotal", event.latencyMs);
    multi.expire(redisKey, 3600);
    await multi.exec();

    const metrics = await redis.hgetall(redisKey);
    const requests = Number(metrics.requests || 0);
    const errors = Number(metrics.errors || 0);
    const errorRate = requests ? errors / requests : 0;

    this.websocketHub.broadcast({
      type: "metric-update",
      organizationId: event.organizationId,
      apiId: event.apiId,
      requests,
      errors,
      avgLatency: requests ? Number(metrics.latencyTotal || 0) / requests : 0,
      timestamp: new Date().toISOString()
    });

    if (shouldOpenAlertIncident({ requests, errorRate, threshold: env.DEFAULT_ALERT_ERROR_RATE })) {
      const triggered = await this.tryOpenAlertIncident({
        organizationId: event.organizationId,
        apiId: event.apiId,
        metricName: ALERT_METRIC_ERROR_RATE
      });

      if (!triggered) {
        return;
      }

      const alert = await this.repository.insertAlert({
        organizationId: event.organizationId,
        apiId: event.apiId,
        level: "critical",
        metricName: ALERT_METRIC_ERROR_RATE,
        message: `Error rate reached ${(errorRate * 100).toFixed(2)}% in the recent window`
      });
      this.websocketHub.broadcast({ type: "alert", alert });
      return;
    }

    if (shouldResolveAlertIncident({ errorRate, threshold: env.DEFAULT_ALERT_ERROR_RATE })) {
      await this.closeAlertIncident({
        organizationId: event.organizationId,
        apiId: event.apiId,
        metricName: ALERT_METRIC_ERROR_RATE
      });
    }
  }

  async tryOpenAlertIncident({ organizationId, apiId, metricName }) {
    const incidentKey = this.getIncidentKey({ organizationId, apiId, metricName });
    const result = await redis.set(incidentKey, "open", "EX", ALERT_COOLDOWN_SECONDS, "NX");
    return result === "OK";
  }

  async closeAlertIncident({ organizationId, apiId, metricName }) {
    const incidentKey = this.getIncidentKey({ organizationId, apiId, metricName });
    const wasOpen = await redis.del(incidentKey);
    if (!wasOpen) {
      return;
    }

    await this.repository.resolveOpenAlerts({ organizationId, apiId, metricName });
  }

  getIncidentKey({ organizationId, apiId, metricName }) {
    return buildAlertIncidentKey({ organizationId, apiId, metricName });
  }
}
