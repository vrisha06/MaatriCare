import express from 'express';
import { randomUUID } from 'node:crypto';
import { assess, LEVELS, DANGER_SIGNS, REFERRAL_STATUSES, RECEIVER_STATUSES, rangeErrors, PATIENT_FIELDS, VISIT_FIELDS } from '@maatricare/shared';
import { tx } from './db.js';
import { audit, verifyChain } from './audit.js';
import { login, authenticate, requireRole } from './auth.js';

const OVERDUE_HOURS = Number(process.env.REFERRAL_OVERDUE_HOURS ?? 48);
const OPEN_STATUSES = ['created', 'accepted', 'in_transit'];
const COMPLETED_STATUSES = ['arrived', 'outcome_recorded', 'closed'];

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const now = () => new Date().toISOString();
const toCamel = (s) => s.replace(/_(\w)/g, (_, c) => c.toUpperCase());
const JSON_COLUMNS = new Set(['danger_signs', 'assessment', 'data']);
const camel = (row) =>
  row && Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), JSON_COLUMNS.has(k) && v ? JSON.parse(v) : v]));
const levelRank = (l) => LEVELS.indexOf(l);

function checkRanges(values, fields, what) {
  const errors = rangeErrors(values, fields);
  if (Object.keys(errors).length) throw new HttpError(400, `Invalid ${what}`, errors);
}

// Which patients a user may see: an ASHA her own, a doctor those in the PHC's
// villages or referred to/from their facility, an admin everyone.
function scope(user) {
  if (user.role === 'asha') return ['p.asha_id = ?', [user.id]];
  if (user.role === 'doctor') {
    return [
      `(p.village_id IN (SELECT id FROM villages WHERE phc_id = ?)
        OR p.id IN (SELECT patient_id FROM referrals WHERE to_facility_id = ? OR from_facility_id = ?))`,
      [user.facility_id, user.facility_id, user.facility_id],
    ];
  }
  return ['1 = 1', []];
}

const PATIENT_LIST_SQL = `
  SELECT p.*, vil.name AS village_name, u.name AS asha_name,
         v.id AS visit_id, v.visited_at, v.gest_weeks, v.level, v.score, v.reviewed_level, v.reviewed_at,
         v.assessment, COALESCE(v.reviewed_level, v.level) AS effective_level,
         (SELECT COUNT(*) FROM referrals r WHERE r.patient_id = p.id AND r.status IN ('created','accepted','in_transit')) AS open_referrals
  FROM patients p
  JOIN villages vil ON vil.id = p.village_id
  JOIN users u ON u.id = p.asha_id
  LEFT JOIN visits v ON v.id = (SELECT id FROM visits WHERE patient_id = p.id ORDER BY visited_at DESC LIMIT 1)`;

const REFERRAL_SQL = `
  SELECT r.*, p.name AS patient_name, f1.name AS from_name, f1.tier AS from_tier, f2.name AS to_name, f2.tier AS to_tier
  FROM referrals r JOIN patients p ON p.id = r.patient_id
  JOIN facilities f1 ON f1.id = r.from_facility_id JOIN facilities f2 ON f2.id = r.to_facility_id`;

function referralRow(row) {
  const r = camel(row);
  r.overdue = OPEN_STATUSES.includes(r.status) && Date.now() - Date.parse(r.createdAt) > OVERDUE_HOURS * 3600e3;
  return r;
}

export function createApp(db) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const visiblePatient = (user, id) => {
    const [where, params] = scope(user);
    const p = db.prepare(`${PATIENT_LIST_SQL} WHERE p.id = ? AND ${where}`).get(id, ...params);
    if (!p) throw new HttpError(404, 'Patient not found');
    return p;
  };

  app.post('/api/login', (req, res) => {
    const session = login(db, req.body?.username, req.body?.password);
    if (!session) return res.status(401).json({ error: 'Wrong username or password' });
    res.json({ token: session.token, user: camel(session.user) });
  });

  app.use('/api', authenticate(db));

  app.get('/api/me', (req, res) => res.json(camel(req.user)));

  app.get('/api/meta', (req, res) => {
    res.json({
      facilities: db.prepare('SELECT * FROM facilities ORDER BY tier, name').all().map(camel),
      villages: db.prepare('SELECT * FROM villages ORDER BY name').all().map(camel),
    });
  });

  // Offline ASHA app pushes queued patients and visits. Idempotent by client-generated id.
  app.post('/api/sync', requireRole('asha'), (req, res) => {
    const { patients = [], visits = [] } = req.body ?? {};
    const result = tx(db, () => {
      for (const p of patients) {
        if (db.prepare('SELECT 1 FROM patients WHERE id = ?').get(p.id)) continue;
        if (!p.id || !p.name?.trim()) throw new HttpError(400, 'Patient needs an id and a name');
        checkRanges(p, PATIENT_FIELDS, `patient ${p.name}`);
        db.prepare(
          `INSERT INTO patients (id, name, age, phone, abha_id, village_id, asha_id, height_cm, parity, prev_csection, prev_loss, created_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(p.id, p.name.trim(), p.age, p.phone ?? null, p.abhaId ?? null, req.user.village_id, req.user.id,
          p.heightCm, p.parity, p.prevCsection ? 1 : 0, p.prevLoss ? 1 : 0, p.createdAt ?? now(), now());
        audit(db, { actorId: req.user.id, action: 'patient.registered', entity: 'patient', entityId: p.id });
      }

      return visits.map((v) => {
        const existing = db.prepare('SELECT id, level, score, assessment FROM visits WHERE id = ?').get(v.id);
        if (existing) return camel(existing);
        const p = db.prepare('SELECT * FROM patients WHERE id = ? AND asha_id = ?').get(v.patientId, req.user.id);
        if (!p) throw new HttpError(400, `Unknown patient for visit ${v.id}`);
        checkRanges(v, VISIT_FIELDS, 'visit');
        const dangerSigns = (v.dangerSigns ?? []).filter((s) => s in DANGER_SIGNS);
        const a = assess({
          age: p.age, heightCm: p.height_cm, parity: p.parity, prevCsection: !!p.prev_csection, prevLoss: !!p.prev_loss,
          sbp: v.sbp, dbp: v.dbp, hb: v.hb, weightKg: v.weightKg, dangerSigns,
        });
        db.prepare(
          `INSERT INTO visits (id, patient_id, asha_id, visited_at, gest_weeks, sbp, dbp, hb, weight_kg, danger_signs, level, score, assessment, model_version, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(v.id, p.id, req.user.id, v.visitedAt ?? now(), v.gestWeeks ?? null, v.sbp, v.dbp, v.hb, v.weightKg,
          JSON.stringify(dangerSigns), a.level, a.score, JSON.stringify(a), a.modelVersion, now());
        audit(db, { actorId: req.user.id, action: 'visit.recorded', entity: 'visit', entityId: v.id,
          data: { patientId: p.id, level: a.level, score: a.score, modelVersion: a.modelVersion } });
        if (levelRank(a.level) >= levelRank('high')) {
          audit(db, { actorId: req.user.id, action: 'alert.raised', entity: 'visit', entityId: v.id, data: { patientId: p.id, level: a.level } });
        }
        return { id: v.id, level: a.level, score: a.score, assessment: a };
      });
    });
    res.json({ patients: patients.map((p) => p.id), visits: result });
  });

  // Risk-ranked list. For doctors this is the worklist: unreviewed high-risk cases first.
  app.get('/api/patients', (req, res) => {
    const [where, params] = scope(req.user);
    const rows = db.prepare(`${PATIENT_LIST_SQL} WHERE ${where}`).all(...params).map(camel);
    rows.sort((a, b) =>
      levelRank(b.effectiveLevel) - levelRank(a.effectiveLevel)
      || (a.reviewedAt ? 1 : 0) - (b.reviewedAt ? 1 : 0)
      || (b.score ?? 0) - (a.score ?? 0));
    res.json(rows);
  });

  app.get('/api/patients/:id', (req, res) => {
    const patient = camel(visiblePatient(req.user, req.params.id));
    const visits = db.prepare(
      'SELECT v.*, r.name AS reviewed_by_name FROM visits v LEFT JOIN users r ON r.id = v.reviewed_by WHERE patient_id = ? ORDER BY visited_at DESC',
    ).all(patient.id).map(camel);
    const referrals = db.prepare(`${REFERRAL_SQL} WHERE r.patient_id = ? ORDER BY r.created_at DESC`).all(patient.id).map(referralRow);
    const ids = [patient.id, ...visits.map((v) => v.id), ...referrals.map((r) => r.id)];
    const timeline = db.prepare(
      `SELECT a.seq, a.at, a.action, a.entity, a.entity_id, a.data, a.hash, u.name AS actor_name
       FROM audit a LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.entity_id IN (${ids.map(() => '?').join(',')}) ORDER BY a.seq DESC`,
    ).all(...ids).map(camel);
    res.json({ patient, visits, referrals, timeline });
  });

  app.post('/api/visits/:id/review', requireRole('doctor'), (req, res) => {
    const { level, reason } = req.body ?? {};
    const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id);
    if (!visit) throw new HttpError(404, 'Visit not found');
    visiblePatient(req.user, visit.patient_id);
    if (!LEVELS.includes(level)) throw new HttpError(400, 'Unknown risk level');
    if (level !== visit.level && !reason?.trim()) throw new HttpError(400, 'A reason is required to override the score');
    tx(db, () => {
      db.prepare('UPDATE visits SET reviewed_level = ?, review_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
        .run(level, reason?.trim() || null, req.user.id, now(), visit.id);
      audit(db, { actorId: req.user.id, action: level === visit.level ? 'visit.confirmed' : 'visit.overridden', entity: 'visit',
        entityId: visit.id, data: { from: visit.level, to: level, reason: reason?.trim() || null } });
    });
    res.json(camel(db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)));
  });

  app.get('/api/referrals', requireRole('doctor', 'admin'), (req, res) => {
    const mine = req.user.role === 'doctor';
    const rows = db.prepare(`${REFERRAL_SQL} ${mine ? 'WHERE r.from_facility_id = ? OR r.to_facility_id = ?' : ''} ORDER BY r.updated_at DESC`)
      .all(...(mine ? [req.user.facility_id, req.user.facility_id] : []));
    res.json(rows.map(referralRow));
  });

  app.post('/api/referrals', requireRole('doctor'), (req, res) => {
    const { patientId, visitId = null, toFacilityId, reason } = req.body ?? {};
    visiblePatient(req.user, patientId);
    if (!reason?.trim()) throw new HttpError(400, 'A referral reason is required');
    if (!db.prepare('SELECT 1 FROM facilities WHERE id = ?').get(toFacilityId)) throw new HttpError(400, 'Unknown destination facility');
    if (toFacilityId === req.user.facility_id) throw new HttpError(400, 'Cannot refer to your own facility');
    const id = randomUUID();
    tx(db, () => {
      db.prepare(
        `INSERT INTO referrals (id, patient_id, visit_id, from_facility_id, to_facility_id, reason, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)`,
      ).run(id, patientId, visitId, req.user.facility_id, toFacilityId, reason.trim(), req.user.id, now(), now());
      audit(db, { actorId: req.user.id, action: 'referral.created', entity: 'referral', entityId: id,
        data: { patientId, from: req.user.facility_id, to: toFacilityId, reason: reason.trim() } });
    });
    res.status(201).json(referralRow(db.prepare(`${REFERRAL_SQL} WHERE r.id = ?`).get(id)));
  });

  // Statuses only move forward: created → accepted → in_transit → arrived → outcome_recorded → closed.
  app.post('/api/referrals/:id/status', requireRole('doctor'), (req, res) => {
    const { status, note } = req.body ?? {};
    const r = db.prepare('SELECT * FROM referrals WHERE id = ?').get(req.params.id);
    if (!r || ![r.from_facility_id, r.to_facility_id].includes(req.user.facility_id)) throw new HttpError(404, 'Referral not found');
    if (REFERRAL_STATUSES.indexOf(status) <= REFERRAL_STATUSES.indexOf(r.status)) {
      throw new HttpError(400, `Cannot move a referral from ${r.status} to ${status}`);
    }
    if (RECEIVER_STATUSES.includes(status) && req.user.facility_id !== r.to_facility_id) {
      throw new HttpError(403, 'Only the receiving facility can confirm this step');
    }
    if (status === 'outcome_recorded' && !note?.trim()) throw new HttpError(400, 'Describe the outcome');
    tx(db, () => {
      db.prepare('UPDATE referrals SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), r.id);
      audit(db, { actorId: req.user.id, action: 'referral.status', entity: 'referral', entityId: r.id,
        data: { from: r.status, to: status, note: note?.trim() || null } });
    });
    res.json(referralRow(db.prepare(`${REFERRAL_SQL} WHERE r.id = ?`).get(r.id)));
  });

  app.get('/api/admin/summary', requireRole('admin'), (req, res) => {
    const patients = db.prepare(`${PATIENT_LIST_SQL}`).all().map(camel);
    const villages = db.prepare(
      'SELECT v.id, v.name, f.name AS phc_name FROM villages v JOIN facilities f ON f.id = v.phc_id ORDER BY v.name',
    ).all().map((v) => {
      const mine = patients.filter((p) => p.villageId === v.id);
      const counts = Object.fromEntries(LEVELS.map((l) => [l, mine.filter((p) => p.effectiveLevel === l).length]));
      return { ...camel(v), patients: mine.length, unscreened: mine.filter((p) => !p.visitId).length, ...counts };
    });
    const referrals = db.prepare('SELECT status, created_at FROM referrals').all().map(referralRow);
    const completed = referrals.filter((r) => COMPLETED_STATUSES.includes(r.status)).length;
    res.json({
      villages,
      referrals: {
        total: referrals.length,
        completed,
        open: referrals.filter((r) => OPEN_STATUSES.includes(r.status)).length,
        overdue: referrals.filter((r) => r.overdue).length,
        completionRate: referrals.length ? completed / referrals.length : null,
      },
      overdueHours: OVERDUE_HOURS,
    });
  });

  app.get('/api/audit/verify', requireRole('admin'), (req, res) => res.json(verifyChain(db)));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}
