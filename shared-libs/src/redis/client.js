import Redis from "ioredis";
import { Pool } from "pg";
import { env } from "../config/env.js";

let redisClient;
let pgPool;

export function getRedisClient() {
  if (!redisClient) {
    const options = {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5000
    };

    if (env.REDIS_URL) {
      redisClient = new Redis(env.REDIS_URL, options);
    } else {
      redisClient = new Redis({
        ...options,
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        tls: env.REDIS_TLS ? {} : undefined
      });
    }
  }

  return redisClient;
}

export function getPgPool() {
  if (!pgPool) {
    const useSsl = env.POSTGRES_SSL || env.DATABASE_SSL || env.PGSSLMODE === "require";
    const poolOptions = env.DATABASE_URL
      ? {
          connectionString: env.DATABASE_URL,
          ssl: useSsl ? { rejectUnauthorized: false } : undefined
        }
      : {
          host: env.POSTGRES_HOST,
          port: env.POSTGRES_PORT,
          user: env.POSTGRES_USER,
          password: env.POSTGRES_PASSWORD,
          database: env.POSTGRES_DB,
          ssl: useSsl ? { rejectUnauthorized: false } : undefined
        };

    pgPool = new Pool({
      ...poolOptions,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }

  return pgPool;
}
