import crypto from 'node:crypto';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

const DEFAULT_TTL_MS = Math.max(Number(process.env.AIME_COLLECTOR_LOCK_TTL_MS || 120000), 30000);

function lockKey(scope: string) {
  return `collectorLock:${scope}`;
}

function token() {
  return crypto.randomUUID();
}

export interface CollectorLock {
  scope: string;
  owner: string;
  acquiredAt: string;
  expiresAt: string;
}

export async function acquireCollectorLock(scope: string, ttlMs = DEFAULT_TTL_MS): Promise<CollectorLock | null> {
  const key = lockKey(scope);
  const now = Date.now();
  const current = getCollectionData(key, null) as CollectorLock | null;

  if (current && new Date(current.expiresAt).getTime() > now) return null;

  const lock: CollectorLock = {
    scope,
    owner: token(),
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString()
  };

  setCollectionData(key, lock);
  return lock;
}

export async function releaseCollectorLock(lock: CollectorLock): Promise<boolean> {
  const key = lockKey(lock.scope);
  const current = getCollectionData(key, null) as CollectorLock | null;
  if (!current || current.owner !== lock.owner) return false;
  setCollectionData(key, null);
  return true;
}

export function isCollectorLockHeld(scope: string): boolean {
  const current = getCollectionData(lockKey(scope), null) as CollectorLock | null;
  return Boolean(current && new Date(current.expiresAt).getTime() > Date.now());
}
