import { z } from "zod";
import { RATE_LIMIT_STRATEGIES, ROLES } from "../constants/index.js";

const upstreamUrlSchema = z.string().superRefine((value, ctx) => {
  if (!/^https?:\/\//.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "upstreamUrl must start with http:// or https://"
    });
    return;
  }

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "upstreamUrl must use http or https"
      });
    }

    if (!parsed.hostname) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "upstreamUrl must include a hostname"
      });
    }
  } catch (_error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "upstreamUrl must be a valid absolute URL"
    });
  }
});

export const registrationSchema = z.object({
  organizationName: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(128)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128)
});

export const apiSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  upstreamUrl: upstreamUrlSchema,
  description: z.string().max(500).optional().default(""),
  cacheTtlSeconds: z.coerce.number().min(0).max(3600).default(0),
  retryCount: z.coerce.number().min(0).max(5).default(2),
  timeoutMs: z.coerce.number().min(100).max(30000).default(5000),
  circuitBreakerThreshold: z.coerce.number().min(1).max(20).default(5)
});

export const apiKeySchema = z.object({
  name: z.string().min(2).max(120),
  role: z.enum([ROLES.ADMIN, ROLES.USER]).default(ROLES.USER),
  rateLimitStrategy: z.enum([RATE_LIMIT_STRATEGIES.TOKEN_BUCKET, RATE_LIMIT_STRATEGIES.SLIDING_WINDOW]),
  requestsPerMinute: z.coerce.number().min(1).max(100000),
  burstCapacity: z.coerce.number().min(1).max(100000),
  windowSizeSeconds: z.coerce.number().min(1).max(3600).default(60)
});
