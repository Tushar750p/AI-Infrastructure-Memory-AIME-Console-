import crypto from 'node:crypto';
import { createClient } from 'redis';

type Bucket = { count: number; resetAt: number };
const localBuckets = new Map<string, Bucket>();
let redisClient: any = null;
let redisAttempted = false;

async function getRedis(): Promise<any> {
  if (redisAttempted) return redisClient;
  redisAttempted = true;
  if (!process.env.REDIS_URL) return null;
  try {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', error => console.warn('[Auth Rate Limit] Redis error:', error instanceof Error ? error.message : String(error)));
    await client.connect();
    redisClient = client;
  } catch (error) {
    console.warn('[Auth Rate Limit] Redis unavailable; using process-local limiter:', error instanceof Error ? error.message : String(error));
  }
  return redisClient;
}

function localConsume(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = localBuckets.get(key);
  if (!current || current.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

export interface RateLimitOptions { key: string; limit: number; windowMs: number; }

export async function consumeAuthRateLimit(options: RateLimitOptions) {
  const safeKey = 'aime:auth-rate:' + crypto.createHash('sha256').update(options.key).digest('hex');
  const redis = await getRedis();
  if (!redis) return localConsume(safeKey, options.limit, options.windowMs);
  const script = 'local current = redis.call("INCR", KEYS[1])\n' +
    'if current == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end\n' +
    'local ttl = redis.call("PTTL", KEYS[1])\n' +
    'return {current, ttl}';
  const result = await redis.eval(script, { keys: [safeKey], arguments: [String(options.windowMs)] });
  const count = Number(result[0]);
  const ttl = Math.max(Number(result[1]), 0);
  return { allowed: count <= options.limit, remaining: Math.max(0, options.limit - count), resetAt: Date.now() + ttl };
}