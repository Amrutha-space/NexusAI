import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_SECRET: z.string().min(16),
  INTERNAL_SERVICE_TOKEN: z.string().min(8),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string().default("platform"),
  POSTGRES_PASSWORD: z.string().default("platform"),
  POSTGRES_DB: z.string().default("developer_platform"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  AUTH_PORT: z.coerce.number().default(4001),
  RATE_LIMITER_PORT: z.coerce.number().default(4002),
  LOGGING_PORT: z.coerce.number().default(4003),
  GATEWAY_PORT: z.coerce.number().default(4000),
  FRONTEND_ALLOWED_ORIGIN: z.string().default("http://localhost:5173"),
  AUTH_SERVICE_URL: z.string().url().default("http://localhost:4001"),
  RATE_LIMITER_SERVICE_URL: z.string().url().default("http://localhost:4002"),
  LOGGING_SERVICE_URL: z.string().url().default("http://localhost:4003"),
  GATEWAY_SERVICE_URL: z.string().url().default("http://localhost:4000"),
  DEFAULT_ALERT_ERROR_RATE: z.coerce.number().default(0.15),
  DEFAULT_BILLING_RATE: z.coerce.number().default(0.0025),
  REQUEST_ID_HEADER: z.string().default("x-request-id"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4-nano"),
  OPENAI_RESPONSES_URL: z.string().url().default("https://api.openai.com/v1/responses"),
  OPENAI_LOG_ANALYSIS_ENABLED: z.coerce.boolean().default(false),
  OTEL_SERVICE_NAMESPACE: z.string().default("nexusai-gateway"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional()
});

export const env = envSchema.parse(process.env);
