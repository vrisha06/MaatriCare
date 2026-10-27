import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { seedReference, DEMO_PASSWORD } from '../src/seed.js';

let db, server, base;
const tokens = {};

async function call(who, path, body) {
  const res = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(tokens[who] && { authorization: `Bearer ${tokens[who]}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  db = openDb(':memory:');
  seedReference(db);
  server = createApp(db).listen(0);
  base = `http://localhost:${server.address().port}`;
  for (const u of ['asha.sunita', 'asha.meena', 'dr.anil', 'dr.kavita', 'admin']) {
    tokens[u] = (await call(null, '/api/login', { username: u, password: DEMO_PASSWORD })).body.token;
  }
});
after(() => server.close());

const patient = { id: randomUUID(), name: 'Test Mother', age: 17, heightCm: 148, parity: 0, prevCsection: false, prevLoss: false };
const visit = { id: randomUUID(), patientId: patient.id, sbp: 166, dbp: 112, hb: 8, weightKg: 44, gestWeeks: 30, dangerSigns: [] };

test('wrong password is rejected', async () => {
  assert.equal((await call(null, '/api/login', { username: 'admin', password: 'nope' })).status, 401);
});

test('ASHA sync scores the visit server-side and is idempotent', async () => {
  const first = await call('asha.sunita', '/api/sync', { patients: [patient], visits: [visit] });
  assert.equal(first.status, 200);
  assert.equal(first.body.visits[0].level, 'high');
  const again = await call('asha.sunita', '/api/sync', { patients: [patient], visits: [visit] });
  assert.equal(again.body.visits[0].id, visit.id);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM visits').get().n, 1);
});

test('out-of-range vitals are rejected and nothing is written', async () => {
  const bad = { ...visit, id: randomUUID(), sbp: 900 };
  const res = await call('asha.sunita', '/api/sync', { visits: [bad] });
  assert.equal(res.status, 400);
  assert.ok(res.body.details.sbp);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM visits').get().n, 1);
});

test('patients are scoped by role', async () => {
  assert.equal((await call('asha.sunita', '/api/patients')).body.length, 1);
  assert.equal((await call('asha.meena', '/api/patients')).body.length, 0);
  assert.equal((await call('asha.meena', `/api/patients/${patient.id}`)).status, 404);
  assert.equal((await call('dr.kavita', '/api/patients')).body.length, 0);
  const worklist = (await call('dr.anil', '/api/patients')).body;
  assert.equal(worklist[0].id, patient.id);
  assert.equal(worklist[0].effectiveLevel, 'high');
});

test('overriding a score requires a reason', async () => {
  assert.equal((await call('dr.anil', `/api/visits/${visit.id}/review`, { level: 'moderate' })).status, 400);
  const ok = await call('dr.anil', `/api/visits/${visit.id}/review`, { level: 'emergency', reason: 'Headache reported on call' });
  assert.equal(ok.body.reviewedLevel, 'emergency');
});

test('referral moves forward only and becomes visible to the destination', async () => {
  const created = await call('dr.anil', '/api/referrals', { patientId: patient.id, visitId: visit.id, toFacilityId: 'dh-sitapur', reason: 'Severe hypertension' });
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal((await call('dr.kavita', '/api/patients')).body.length, 1);
  assert.equal((await call('dr.anil', `/api/referrals/${id}/status`, { status: 'accepted' })).status, 403);
  assert.equal((await call('dr.kavita', `/api/referrals/${id}/status`, { status: 'arrived' })).body.status, 'arrived');
  assert.equal((await call('dr.kavita', `/api/referrals/${id}/status`, { status: 'accepted' })).status, 400);
  assert.equal((await call('dr.kavita', `/api/referrals/${id}/status`, { status: 'outcome_recorded' })).status, 400);
  assert.equal((await call('asha.sunita', '/api/referrals')).status, 403);
});

test('patient timeline shows the audit trail', async () => {
  const { body } = await call('dr.anil', `/api/patients/${patient.id}`);
  const actions = body.timeline.map((t) => t.action);
  for (const a of ['patient.registered', 'visit.recorded', 'alert.raised', 'visit.overridden', 'referral.created', 'referral.status']) {
    assert.ok(actions.includes(a), `missing ${a}`);
  }
});

test('admin summary counts and audit chain verification detects tampering', async () => {
  const summary = (await call('admin', '/api/admin/summary')).body;
  const rampur = summary.villages.find((v) => v.name === 'Rampur');
  assert.equal(rampur.emergency, 1);
  assert.equal(summary.referrals.completed, 1);
  assert.equal((await call('admin', '/api/audit/verify')).body.ok, true);
  db.prepare("UPDATE audit SET data = '{}' WHERE action = 'visit.overridden'").run();
  const broken = (await call('admin', '/api/audit/verify')).body;
  assert.equal(broken.ok, false);
});
