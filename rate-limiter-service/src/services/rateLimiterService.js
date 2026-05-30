import { RATE_LIMIT_STRATEGIES, ValidationError, getRedisClient } from "@platform/shared";

const tokenBucketScript = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRatePerMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

local elapsed = math.max(0, now - lastRefill)
local refill = elapsed * refillRatePerMs
tokens = math.min(capacity, tokens + refill)

local allowed = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
end

redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
redis.call("PEXPIRE", key, 120000)

return { allowed, tokens }
`;

const slidingWindowScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call("ZREMRANGEBYSCORE", key, 0, now - windowMs)
local current = redis.call("ZCARD", key)

if current >= limit then
  return {0, current}
end

redis.call("ZADD", key, now, tostring(now) .. "-" .. redis.call("INCR", key .. ":seq"))
redis.call("PEXPIRE", key, windowMs)
redis.call("PEXPIRE", key .. ":seq", windowMs)
return {1, current + 1}
`;

export class RateLimiterService {
  async evaluate(payload) {
    if (!payload.identifier || !payload.strategy) {
      throw new ValidationError("identifier and strategy are required");
    }

    if (payload.strategy === RATE_LIMIT_STRATEGIES.TOKEN_BUCKET) {
      return this.runTokenBucket(payload);
    }

    if (payload.strategy === RATE_LIMIT_STRATEGIES.SLIDING_WINDOW) {
      return this.runSlidingWindow(payload);
    }

    throw new ValidationError(`Unsupported rate limit strategy: ${payload.strategy}`);
  }

  async runTokenBucket({ identifier, requestsPerMinute, burstCapacity }) {
    const redis = getRedisClient();
    const now = Date.now();
    const refillRatePerMs = requestsPerMinute / 60000;
    const [allowed, remainingTokens] = await redis.eval(
      tokenBucketScript,
      1,
      `rate-limit:token:${identifier}`,
      burstCapacity,
      refillRatePerMs,
      now,
      1
    );

    return {
      allowed: Boolean(allowed),
      remaining: Math.floor(Number(remainingTokens)),
      retryAfterMs: Boolean(allowed) ? 0 : Math.ceil(1000 / Math.max(refillRatePerMs, 0.001))
    };
  }

  async runSlidingWindow({ identifier, requestsPerMinute, windowSizeSeconds }) {
    const redis = getRedisClient();
    const now = Date.now();
    const windowMs = windowSizeSeconds * 1000;
    const [allowed, currentCount] = await redis.eval(
      slidingWindowScript,
      1,
      `rate-limit:window:${identifier}`,
      now,
      windowMs,
      requestsPerMinute
    );

    return {
      allowed: Boolean(allowed),
      remaining: Math.max(requestsPerMinute - Number(currentCount), 0),
      retryAfterMs: Boolean(allowed) ? 0 : windowMs
    };
  }
}
