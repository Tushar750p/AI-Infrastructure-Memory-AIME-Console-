import crypto from 'node:crypto';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getCollectionData, setCollectionData } from '../db/firestoreDb.js';

let adminDb: any = null;
let initialized = false;

function getAdminDb(): any {
  if (initialized) return adminDb;
  initialized = true;
  if (process.env.AIME_DURABLE_STATE !== 'true') return null;
  try {
    const app = getApps()[0] || initializeApp(
      process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
        ? { credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          }) }
        : { credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID }
    );
    adminDb = getFirestore(app);
    return adminDb;
  } catch (error) {
    console.warn('[Durable State] Admin Firestore unavailable; using compatibility store:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

function durableId(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function getDurableState<T>(key: string, fallback: T): Promise<T> {
  const db = getAdminDb();
  if (!db) return getCollectionData(key, fallback) as T;
  try {
    const snapshot = await db.collection('aimeDurableState').doc(durableId(key)).get();
    if (!snapshot.exists) return fallback;
    return (snapshot.data()?.value as T) ?? fallback;
  } catch (error) {
    console.warn('[Durable State] Read failed; using compatibility store:', error instanceof Error ? error.message : String(error));
    return getCollectionData(key, fallback) as T;
  }
}

export async function setDurableState<T>(key: string, value: T): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    setCollectionData(key, value);
    return;
  }
  try {
    await db.collection('aimeDurableState').doc(durableId(key)).set({
      key,
      value,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('[Durable State] Write failed; using compatibility store:', error instanceof Error ? error.message : String(error));
    setCollectionData(key, value);
  }
}
