/**
 * Rate limiting — uses Upstash Redis when configured, otherwise allows all requests.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let apiLimiter: Ratelimit | null = null;
let chatLimiter: Ratelimit | null = null;
let redisAvailable: boolean | null = null;

function isRedisConfigured(): boolean {
  if (redisAvailable !== null) return redisAvailable;
  redisAvailable = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  return redisAvailable;
}

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function checkRateLimit(
  identifier: string,
  type: 'api' | 'chat' = 'api'
): Promise<{ success: boolean; remaining: number }> {
  // No Redis configured — skip rate limiting
  if (!isRedisConfigured()) {
    return { success: true, remaining: -1 };
  }

  try {
    const limiter = type === 'chat' ? getChatLimiter() : getApiLimiter();
    const { success, remaining } = await limiter.limit(identifier);
    return { success, remaining };
  } catch {
    // Redis error — allow the request
    return { success: true, remaining: -1 };
  }
}

function getApiLimiter() {
  if (!apiLimiter) {
    apiLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'ratelimit:api',
    });
  }
  return apiLimiter;
}

function getChatLimiter() {
  if (!chatLimiter) {
    chatLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix: 'ratelimit:chat',
    });
  }
  return chatLimiter;
}
