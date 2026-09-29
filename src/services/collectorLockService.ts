import crypto from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

const DEFAULT_TTL_MS = Math.max(Number(process.env.AIME_COLLECTOR_LOCK_TTL_MS || 120000), 30000);
const RELEASE_SCRIPT = 'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
const RENEW_SCRIPT = 'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end';
let redisClient: any = null;
let redisAttempted = false;

function lockKey(scope: string) {
  return `aime:collector-lock:${scope}`;
}

function token() {
  return crypto.randomUUID();
}

async function getRedis(): Promise<any> {
  if (redisAttempted) return redisClient;
  redisAttempted = true;

  if (!process.env.REDIS_URL) return null;

  try {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', error => {
      console.warn('[Collector Lock] Redis error:', error instanceof Error ? error.message : String(error));
    });
    await client.connect();
    redisClient = client;
    return client;
  } catch (error) {
    console.warn('[Collector Lock] Redis unavailable; using compatibility lock:', error instanceof Error ? error.message : String(error));
    redisClient = null;
    return null;
  }
}

export interface CollectorLock {
  scope: string;
  owner: string;
  acquiredAt: string;
  expiresAt: string;
}

export async function acquireCollectorLock(scope: string, ttlMs = DEFAULT_TTL_MS): Promise<CollectorLock | null> {
  const owner = token();
  const acquiredAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const lock: CollectorLock = { scope, owner, acquiredAt, expiresAt };
  const redis = await getRedis();

  if (redis) {
    const result = await redis.set(lockKey(scope), owner, { NX: true, PX: ttlMs });
    return result === 'OK' ? lock : null;
  }

  const key = lockKey(scope);
  const now = Date.now();
  const current = getCollectionData(key, null) as CollectorLock | null;
  if (current && new Date(current.expiresAt).getTime() > now) return null;
  setCollectionData(key, lock);
  return lock;
}

export async function renewCollectorLock(lock: CollectorLock, ttlMs = DEFAULT_TTL_MS): Promise<boolean> {
  const redis = await getRedis();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  if (redis) {
    const result = await redis.eval(RENEW_SCRIPT, {
      keys: [lockKey(lock.scope)],
      arguments: [lock.owner, String(ttlMs)]
    });
    if (Number(result) !== 1) return false;
    lock.expiresAt = expiresAt;
    return true;
  }

  const key = lockKey(lock.scope);
  const current = getCollectionData(key, null) as CollectorLock | null;
  if (!current || current.owner !== lock.owner || new Date(current.expiresAt).getTime() <= Date.now()) return false;
  lock.expiresAt = expiresAt;
  setCollectionData(key, lock);
  return true;
}

export async function releaseCollectorLock(lock: CollectorLock): Promise<boolean> {
  const redis = await getRedis();

  if (redis) {
    const result = await redis.eval(RELEASE_SCRIPT, { keys: [lockKey(lock.scope)], arguments: [lock.owner] });
    return Number(result) === 1;
  }

  const key = lockKey(lock.scope);
  const current = getCollectionData(key, null) as CollectorLock | null;
  if (!current || current.owner !== lock.owner) return false;
  setCollectionData(key, null);
  return true;
}

export async function isCollectorLockHeld(scope: string): Promise<boolean> {
  const redis = await getRedis();

  if (redis) return Boolean(await redis.get(lockKey(scope)));

  const current = getCollectionData(lockKey(scope), null) as CollectorLock | null;
  return Boolean(current && new Date(current.expiresAt).getTime() > Date.now());
}
