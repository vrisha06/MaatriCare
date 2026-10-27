import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PATH = fileURLToPath(new URL('../data/maatricare.db', import.meta.url));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, tier TEXT NOT NULL CHECK (tier IN ('SC','PHC','RH','DH'))
);
CREATE TABLE IF NOT EXISTS villages (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phc_id TEXT NOT NULL REFERENCES facilities(id)
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('asha','doctor','admin')),
  facility_id TEXT REFERENCES facilities(id), village_id TEXT REFERENCES villages(id)
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, age INTEGER NOT NULL, phone TEXT, abha_id TEXT,
  village_id TEXT NOT NULL REFERENCES villages(id), asha_id TEXT NOT NULL REFERENCES users(id),
  height_cm REAL NOT NULL, parity INTEGER NOT NULL DEFAULT 0,
  prev_csection INTEGER NOT NULL DEFAULT 0, prev_loss INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, synced_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), asha_id TEXT NOT NULL REFERENCES users(id),
  visited_at TEXT NOT NULL, gest_weeks INTEGER, sbp INTEGER NOT NULL, dbp INTEGER NOT NULL,
  hb REAL NOT NULL, weight_kg REAL NOT NULL, danger_signs TEXT NOT NULL DEFAULT '[]',
  level TEXT NOT NULL, score REAL NOT NULL, assessment TEXT NOT NULL, model_version TEXT NOT NULL,
  reviewed_level TEXT, review_reason TEXT, reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT,
  synced_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS visits_patient ON visits(patient_id, visited_at);
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), visit_id TEXT REFERENCES visits(id),
  from_facility_id TEXT NOT NULL REFERENCES facilities(id), to_facility_id TEXT NOT NULL REFERENCES facilities(id),
  reason TEXT NOT NULL, status TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor_id TEXT, action TEXT NOT NULL,
  entity TEXT NOT NULL, entity_id TEXT NOT NULL, data TEXT NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_entity ON audit(entity, entity_id);
`;

export function openDb(path = process.env.DB_PATH ?? DEFAULT_PATH) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
