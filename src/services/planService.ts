/**
 * planService.ts
 * CRUD for DietPlan documents.
 * Ownership: every Firestore path is scoped to users/{userId}/…
 * Falls back to localStorage when Firestore is unavailable.
 */
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebaseConfig';
import { DietPlan } from '../types';

const LOCAL_PLAN_PREFIX = 'dietdecode_plan_';
const LOCAL_ACTIVE_ID_PREFIX = 'dietdecode_active_plan_';
const LOCAL_HISTORY_PREFIX = 'dietdecode_plan_history_';

// ---------- guard ----------

/**
 * Returns true only when Firestore is initialised AND the current user is the
 * authenticated owner of the requested userId.  This prevents any path where
 * a stale db reference or wrong uid could reach Firestore.
 */
function firestoreAvailableFor(userId: string): boolean {
  if (!isFirebaseConfigured || !db) return false;
  const currentUid = auth?.currentUser?.uid;
  if (!currentUid) return false;
  if (currentUid !== userId) {
    console.error('[planService] UID mismatch — refusing Firestore access', { currentUid, userId });
    return false;
  }
  return true;
}

// ---------- Firestore helpers (only called after guard) ----------

function plansCol(userId: string) {
  // db is checked non-null before this is called
  return collection(db!, 'users', userId, 'dietPlans');
}

function activePlanDoc(userId: string) {
  return doc(db!, 'users', userId, 'meta', 'activePlan');
}

// ---------- Local-storage helpers ----------

function lsSetPlan(planId: string, plan: DietPlan) {
  try {
    localStorage.setItem(`${LOCAL_PLAN_PREFIX}${planId}`, JSON.stringify(plan));
  } catch { /* quota exceeded — ignore */ }
}

function lsGetPlan(planId: string): DietPlan | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_PLAN_PREFIX}${planId}`);
    return raw ? (JSON.parse(raw) as DietPlan) : null;
  } catch {
    return null;
  }
}

function lsSetActivePlanId(userId: string, planId: string) {
  localStorage.setItem(`${LOCAL_ACTIVE_ID_PREFIX}${userId}`, planId);
}

function lsGetActivePlanId(userId: string): string | null {
  return localStorage.getItem(`${LOCAL_ACTIVE_ID_PREFIX}${userId}`);
}

function lsGetHistory(userId: string): DietPlan[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_HISTORY_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as DietPlan[]) : [];
  } catch {
    return [];
  }
}

function lsAddToHistory(userId: string, plan: DietPlan) {
  const existing = lsGetHistory(userId);
  const filtered = existing.filter((p) => p.id !== plan.id);
  const updated = [plan, ...filtered].slice(0, 10);
  try {
    localStorage.setItem(`${LOCAL_HISTORY_PREFIX}${userId}`, JSON.stringify(updated));
  } catch { /* ignore */ }
}

// ---------- Public API ----------

/**
 * Save (create or update) a DietPlan for a user.
 * Always persists locally first. Syncs to Firestore if auth + db are ready.
 * Throws if the caller does not own userId (uid mismatch).
 */
export async function savePlan(userId: string, plan: DietPlan): Promise<void> {
  const updatedPlan: DietPlan = { ...plan, userId, updatedAt: new Date().toISOString() };

  // Local-first — instant feedback regardless of network
  lsSetPlan(plan.id, updatedPlan);
  lsSetActivePlanId(userId, plan.id);
  lsAddToHistory(userId, updatedPlan);

  if (firestoreAvailableFor(userId)) {
    // Non-blocking background sync so user never waits on Firestore latency
    (async () => {
      try {
        const batch = writeBatch(db!);
        batch.set(doc(plansCol(userId), plan.id), updatedPlan);
        batch.set(activePlanDoc(userId), { planId: plan.id, updatedAt: updatedPlan.updatedAt });
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore savePlan timeout')), 3000)
        );
        await Promise.race([batch.commit(), timeout]);
      } catch (err) {
        console.warn('[planService] Firestore savePlan sync (persisted locally):', err);
      }
    })();
  }
}

/**
 * Fetch the active DietPlan for userId.
 * Checks local storage first for zero-latency retrieval, falling back to Firestore.
 * Returns null when no plan has been saved yet.
 */
export async function getActivePlan(userId: string): Promise<DietPlan | null> {
  // Check local storage first for instant response
  const activePlanId = lsGetActivePlanId(userId);
  if (activePlanId) {
    const localPlan = lsGetPlan(activePlanId);
    if (localPlan) return localPlan;
  }

  if (firestoreAvailableFor(userId)) {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore getActivePlan timeout')), 900)
      );
      const metaSnap = await Promise.race([getDoc(activePlanDoc(userId)), timeout]);
      if (metaSnap.exists()) {
        const { planId } = metaSnap.data() as { planId: string };
        const planSnap = await Promise.race([getDoc(doc(plansCol(userId), planId)), timeout]);
        if (planSnap.exists()) {
          const plan = planSnap.data() as DietPlan;
          lsSetPlan(plan.id, plan);
          lsSetActivePlanId(userId, plan.id);
          return plan;
        }
      }
      return null;
    } catch (err) {
      console.warn('[planService] Firestore getActivePlan fallback:', err);
    }
  }

  return null;
}

/**
 * Mark a specific plan as active without modifying its content.
 */
export async function setActivePlan(userId: string, planId: string): Promise<void> {
  lsSetActivePlanId(userId, planId);

  if (firestoreAvailableFor(userId)) {
    try {
      await setDoc(activePlanDoc(userId), { planId, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.warn('[planService] setActivePlan Firestore write failed:', err);
    }
  }
}

/**
 * Fetch all saved plan versions for userId, newest first.
 */
export async function getPlanHistory(userId: string): Promise<DietPlan[]> {
  if (firestoreAvailableFor(userId)) {
    try {
      const q = query(plansCol(userId), orderBy('createdAt', 'desc'));
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('getPlanHistory timeout')), 900)
      );
      const snap = await Promise.race([getDocs(q), timeout]);
      const plans = snap.docs.map((d) => d.data() as DietPlan);
      plans.forEach((p) => lsSetPlan(p.id, p));
      return plans;
    } catch (err) {
      console.warn('[planService] getPlanHistory Firestore failed — falling back to localStorage:', err);
    }
  }
  return lsGetHistory(userId);
}
