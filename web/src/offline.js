// Offline store for the ASHA view: a cache of the last server patient list plus a
// queue of patients and visits recorded since. The queue is pushed to /api/sync
// whenever the device is online. Keys are per user so a shared phone stays separate.
import { assess } from '@maatricare/shared';
import { api } from './api.js';

const key = (userId, kind) => `mc:${kind}:${userId}`;

function read(userId, kind, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key(userId, kind))) ?? fallback;
  } catch {
    return fallback;
  }
}
const write = (userId, kind, value) => localStorage.setItem(key(userId, kind), JSON.stringify(value));

export const getQueue = (userId) => read(userId, 'queue', { patients: [], visits: [] });
export const pendingCount = (userId) => {
  const q = getQueue(userId);
  return q.patients.length + q.visits.length;
};

export function queuePatient(userId, patient) {
  const q = getQueue(userId);
  q.patients.push({ ...patient, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  write(userId, 'queue', q);
  return q.patients.at(-1);
}

export function queueVisit(userId, visit) {
  const q = getQueue(userId);
  q.visits.push({ ...visit, id: crypto.randomUUID(), visitedAt: new Date().toISOString() });
  write(userId, 'queue', q);
  return q.visits.at(-1);
}

// On-device provisional score, so the ASHA sees risk immediately even with no signal.
export function provisionalAssessment(patient, visit) {
  return assess({
    age: patient.age, heightCm: patient.heightCm, parity: patient.parity,
    prevCsection: !!patient.prevCsection, prevLoss: !!patient.prevLoss,
    sbp: visit.sbp, dbp: visit.dbp, hb: visit.hb, weightKg: visit.weightKg, dangerSigns: visit.dangerSigns,
  });
}

// Server list + queued items, with queued visits shown as the latest (provisional) result.
export function localPatients(userId) {
  const q = getQueue(userId);
  const byId = new Map(read(userId, 'cache', []).map((p) => [p.id, { ...p }]));
  for (const p of q.patients) byId.set(p.id, { ...p, pending: true });
  for (const v of q.visits) {
    const p = byId.get(v.patientId);
    if (!p) continue;
    const a = provisionalAssessment(p, v);
    Object.assign(p, { visitId: v.id, visitedAt: v.visitedAt, gestWeeks: v.gestWeeks, level: a.level,
      effectiveLevel: a.level, score: a.score, assessment: a, pendingVisit: true });
  }
  return [...byId.values()];
}

let syncing = null;
export function sync(userId) {
  // One sync at a time; a second caller waits for the running one.
  syncing ??= (async () => {
    try {
      const q = getQueue(userId);
      if (q.patients.length || q.visits.length) {
        await api('/api/sync', q);
        // Drop only what was sent; anything queued meanwhile stays.
        const sent = new Set([...q.patients, ...q.visits].map((x) => x.id));
        const now = getQueue(userId);
        write(userId, 'queue', {
          patients: now.patients.filter((p) => !sent.has(p.id)),
          visits: now.visits.filter((v) => !sent.has(v.id)),
        });
      }
      write(userId, 'cache', await api('/api/patients'));
      write(userId, 'lastSync', new Date().toISOString());
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

export const lastSync = (userId) => read(userId, 'lastSync', null);
