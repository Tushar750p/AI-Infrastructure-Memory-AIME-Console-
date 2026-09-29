import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { InfrastructureEvent } from '../types/infrastructureEvent.js';
import { getCollectionData } from '../db/firestoreDb.js';

let adminDb: any = null;
let initialized = false;
const pendingEvents = new Map<string, InfrastructureEvent>();
const pendingSnapshots = new Map<string, any>();

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
    console.warn('[Durable History] Admin Firestore unavailable:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export function queueInfrastructureEvent(event: InfrastructureEvent): void {
  if (process.env.AIME_DURABLE_STATE !== 'true') return;
  pendingEvents.set(event.id, event);
}

export function queueTimeMachineSnapshot(snapshot: any): void {
  if (process.env.AIME_DURABLE_STATE !== 'true') return;
  pendingSnapshots.set(snapshot.id, snapshot);
}

export async function flushDurableInfrastructureHistory(): Promise<{ events: number; snapshots: number }> {
  const db = getAdminDb();
  if (!db) return { events: 0, snapshots: 0 };

  const events = [...pendingEvents.values()];
  const snapshots = [...pendingSnapshots.values()];
  if (!events.length && !snapshots.length) return { events: 0, snapshots: 0 };

  try {
    const batch = db.batch();
    for (const event of events) {
      batch.set(db.collection('infrastructureEvents').doc(String(event.id)), {
        ...event,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    for (const snapshot of snapshots) {
      batch.set(db.collection('timeMachineSnapshots').doc(String(snapshot.id)), {
        ...snapshot,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    await batch.commit();
    for (const event of events) pendingEvents.delete(event.id);
    for (const snapshot of snapshots) pendingSnapshots.delete(snapshot.id);
    return { events: events.length, snapshots: snapshots.length };
  } catch (error) {
    console.warn('[Durable History] Flush failed; retaining queued records:', error instanceof Error ? error.message : String(error));
    return { events: 0, snapshots: 0 };
  }
}

export function durableHistoryQueueSize() {
  return { events: pendingEvents.size, snapshots: pendingSnapshots.size };
}

export function loadRecentHistoryForRecovery(organizationId: string, limit = 100): {
  events: InfrastructureEvent[];
  snapshots: any[];
} {
  const events = getCollectionData('infrastructureEvents', [])
    .filter((event: InfrastructureEvent) => event.organizationId === organizationId)
    .slice(0, limit);
  const snapshots = getCollectionData('timeMachineSnapshots', [])
    .filter((snapshot: any) => snapshot.organizationId === organizationId)
    .slice(0, limit);
  return { events, snapshots };
}
