// Demo data. Every login below uses the test password DEMO_PASSWORD.
import { rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { openDb } from './db.js';
import { createApp } from './app.js';
import { hashPassword } from './auth.js';

export const DEMO_PASSWORD = 'demo123';

const FACILITIES = [
  ['sc-rampur', 'Rampur Sub-Centre', 'SC'],
  ['phc-kheri', 'Kheri PHC', 'PHC'],
  ['rh-sidhauli', 'Sidhauli Rural Hospital', 'RH'],
  ['dh-sitapur', 'Sitapur District Hospital', 'DH'],
];
const VILLAGES = [
  ['v-rampur', 'Rampur'], ['v-lalpur', 'Lalpur'], ['v-sonpur', 'Sonpur'], ['v-devgaon', 'Devgaon'],
];
export const USERS = [
  ['asha.sunita', 'Sunita Devi', 'asha', null, 'v-rampur'],
  ['asha.meena', 'Meena Kumari', 'asha', null, 'v-lalpur'],
  ['asha.rekha', 'Rekha Yadav', 'asha', null, 'v-sonpur'],
  ['asha.geeta', 'Geeta Verma', 'asha', null, 'v-devgaon'],
  ['dr.anil', 'Dr. Anil Sharma', 'doctor', 'phc-kheri', null],
  ['dr.kavita', 'Dr. Kavita Singh', 'doctor', 'dh-sitapur', null],
  ['admin', 'Block Health Officer', 'admin', null, null],
];

export function seedReference(db) {
  for (const [id, name, tier] of FACILITIES) db.prepare('INSERT INTO facilities VALUES (?, ?, ?)').run(id, name, tier);
  for (const [id, name] of VILLAGES) db.prepare('INSERT INTO villages VALUES (?, ?, ?)').run(id, name, 'phc-kheri');
  const hash = hashPassword(DEMO_PASSWORD);
  for (const [username, name, role, facility, village] of USERS) {
    db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)').run(`u-${username}`, name, username, hash, role, facility, village);
  }
}

// [name, age, heightCm, parity, prevCsection, prevLoss, [sbp, dbp, hb, weightKg, gestWeeks, dangerSigns]]
const PATIENTS = {
  'asha.sunita': [
    ['Pooja Kumari', 17, 148, 0, false, false, [118, 76, 8.4, 41, 22, []]],
    ['Anita Devi', 26, 154, 1, false, false, [112, 72, 11.8, 54, 28, []]],
    ['Rani Yadav', 31, 150, 2, true, false, [148, 96, 10.2, 61, 34, ['severe_headache']]],
  ],
  'asha.meena': [
    ['Sarita Pal', 22, 156, 0, false, false, [108, 70, 12.1, 50, 16, []]],
    ['Kiran Gupta', 38, 151, 4, false, true, [134, 86, 9.6, 66, 30, []]],
    ['Laxmi Devi', 24, 143, 1, false, false, [164, 112, 9.9, 49, 36, []]],
  ],
  'asha.rekha': [
    ['Shabnam Bano', 20, 152, 0, false, false, [116, 74, 6.4, 44, 26, []]],
    ['Usha Maurya', 29, 158, 2, false, false, [110, 68, 11.2, 57, 20, []]],
    ['Neha Verma', 27, 153, 1, false, false, [122, 80, 10.8, 52, 38, ['heavy_bleeding']]],
  ],
  'asha.geeta': [
    ['Kamla Devi', 34, 149, 3, true, true, [138, 88, 9.1, 70, 32, []]],
    ['Priya Singh', 23, 155, 0, false, false, [114, 74, 11.5, 53, 12, []]],
  ],
};

async function api(base, token, path, body) {
  const res = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: ${json.error}`);
  return json;
}

// Clinical demo data goes through the real API, so it is scored and audited like live data.
async function seedDemo(db) {
  const server = createApp(db).listen(0);
  const base = `http://localhost:${server.address().port}`;
  const signIn = async (username) => (await api(base, null, '/api/login', { username, password: DEMO_PASSWORD })).token;
  try {
    const visitByName = {};
    for (const [username, list] of Object.entries(PATIENTS)) {
      const token = await signIn(username);
      const patients = [];
      const visits = [];
      list.forEach(([name, age, heightCm, parity, prevCsection, prevLoss, [sbp, dbp, hb, weightKg, gestWeeks, dangerSigns]], i) => {
        const id = randomUUID();
        patients.push({ id, name, age, heightCm, parity, prevCsection, prevLoss, phone: `98${String(10000000 + i * 7919).slice(0, 8)}` });
        const visitId = randomUUID();
        visitByName[name] = { patientId: id, visitId };
        visits.push({ id: visitId, patientId: id, sbp, dbp, hb, weightKg, gestWeeks, dangerSigns,
          visitedAt: new Date(Date.now() - (i + 1) * 86400e3).toISOString() });
      });
      await api(base, token, '/api/sync', { patients, visits });
    }

    const anil = await signIn('dr.anil');
    await api(base, anil, `/api/visits/${visitByName['Anita Devi'].visitId}/review`, { level: 'low' });
    await api(base, anil, `/api/visits/${visitByName['Kamla Devi'].visitId}/review`,
      { level: 'high', reason: 'Two previous adverse outcomes; wants specialist review' });
    const laxmi = await api(base, anil, '/api/referrals', { patientId: visitByName['Laxmi Devi'].patientId,
      visitId: visitByName['Laxmi Devi'].visitId, toFacilityId: 'dh-sitapur', reason: 'Severe hypertension at 36 weeks' });
    const neha = await api(base, anil, '/api/referrals', { patientId: visitByName['Neha Verma'].patientId,
      visitId: visitByName['Neha Verma'].visitId, toFacilityId: 'dh-sitapur', reason: 'Antepartum haemorrhage' });
    await api(base, anil, '/api/referrals', { patientId: visitByName['Shabnam Bano'].patientId,
      visitId: visitByName['Shabnam Bano'].visitId, toFacilityId: 'rh-sidhauli', reason: 'Severe anaemia, needs IV iron' });

    const kavita = await signIn('dr.kavita');
    await api(base, kavita, `/api/referrals/${neha.id}/status`, { status: 'accepted' });
    await api(base, kavita, `/api/referrals/${neha.id}/status`, { status: 'arrived' });
    // Backdate one open referral so the dashboard has an overdue case to show.
    db.prepare('UPDATE referrals SET created_at = ? WHERE id = ?').run(new Date(Date.now() - 3 * 86400e3).toISOString(), laxmi.id);
  } finally {
    server.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.env.DB_PATH;
  const db = (() => {
    if (!path) {
      const file = new URL('../data/maatricare.db', import.meta.url);
      for (const suffix of ['', '-wal', '-shm']) rmSync(new URL(file.href + suffix), { force: true });
    }
    return openDb();
  })();
  seedReference(db);
  await seedDemo(db);
  console.log(`Seeded demo data. Users: ${USERS.map((u) => u[0]).join(', ')} (password: ${DEMO_PASSWORD})`);
}
