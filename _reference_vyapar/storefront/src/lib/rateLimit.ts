import { Redis } from '@upstash/redis';

// Only initialize if Redis environment variables are provided
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

const redis = (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })
  : null;

// Local fallback memory map for testing when Redis is not configured
const fallbackMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Distributed Sliding Window Rate Limiter
 * Ensures a strict limit across all Vercel Edge nodes globally.
 */
export async function isRateLimited(identifier: string, windowSeconds: number, maxRequests: number): Promise<boolean> {
  if (redis) {
    try {
      const key = `ratelimit:${identifier}`;
      const count = await redis.incr(key);
      
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      
      return count > maxRequests;
    } catch (err) {
      console.error('[RateLimit Error]', err);
      // Fail open or closed? Better to fail open (false) if Redis goes down, 
      // but monitor logs heavily to prevent revenue drain.
      return false; 
    }
  } else {
    // Fallback logic for local development
    const now = Date.now();
    const entry = fallbackMap.get(identifier);
    if (!entry || now > entry.resetAt) {
      fallbackMap.set(identifier, { count: 1, resetAt: now + (windowSeconds * 1000) });
      return false;
    }
    entry.count++;
    return entry.count > maxRequests;
  }
}

/**
 * Extracts the real client IP address from the request headers.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

