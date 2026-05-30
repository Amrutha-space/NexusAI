import Redis from "ioredis";
import { Pool } from "pg";
import { env } from "../config/env.js";

let redisClient;
let pgPool;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true
    });
  }

  return redisClient;
}

export function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DB,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }

  return pgPool;
}
