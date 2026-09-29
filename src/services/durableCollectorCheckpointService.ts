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

function docId(organizationId: string, collector: string) {
  return organizationId + '__' + collector;
}

export async function getDurableCollectorCheckpoint(organizationId: string, collector: string, fallback: any): Promise<any> {
  const key = 'collectorCheckpoint:' + organizationId + ':' + collector;
  const db = getAdminDb();
  if (!db) return getCollectionData(key, fallback);
  try {
    const snapshot = await db.collection('collectorCheckpoints').doc(docId(organizationId, collector)).get();
    return snapshot.exists ? snapshot.data() : fallback;
  } catch (error) {
    console.warn('[Durable State] Checkpoint read failed; using compatibility store:', error instanceof Error ? error.message : String(error));
    return getCollectionData(key, fallback);
  }
}

export async function setDurableCollectorCheckpoint(checkpoint: any): Promise<void> {
  const key = 'collectorCheckpoint:' + checkpoint.organizationId + ':' + checkpoint.collector;
  const db = getAdminDb();
  if (!db) { setCollectionData(key, checkpoint); return; }
  try {
    await db.collection('collectorCheckpoints').doc(docId(checkpoint.organizationId, checkpoint.collector)).set({
      ...checkpoint,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('[Durable State] Checkpoint write failed; using compatibility store:', error instanceof Error ? error.message : String(error));
    setCollectionData(key, checkpoint);
  }
}
