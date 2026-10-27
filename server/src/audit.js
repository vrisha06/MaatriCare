import { createHash } from 'node:crypto';

// Append-only, hash-chained audit log. Each entry's hash covers the previous hash,
// so editing or deleting any past row breaks verification from that row onward.
// Phase 3 anchors these hashes to a permissioned ledger (Hyperledger Fabric).
const GENESIS = '0'.repeat(64);

function hashEntry(prevHash, e) {
  return createHash('sha256')
    .update(prevHash + JSON.stringify([e.at, e.actor_id, e.action, e.entity, e.entity_id, e.data]))
    .digest('hex');
}

export function audit(db, { actorId = null, action, entity, entityId, data = {} }) {
  const prev = db.prepare('SELECT hash FROM audit ORDER BY seq DESC LIMIT 1').get();
  const e = { at: new Date().toISOString(), actor_id: actorId, action, entity, entity_id: entityId, data: JSON.stringify(data) };
  const prevHash = prev?.hash ?? GENESIS;
  const hash = hashEntry(prevHash, e);
  db.prepare(
    'INSERT INTO audit (at, actor_id, action, entity, entity_id, data, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(e.at, e.actor_id, e.action, e.entity, e.entity_id, e.data, prevHash, hash);
  return hash;
}

export function verifyChain(db) {
  let prevHash = GENESIS;
  let count = 0;
  for (const row of db.prepare('SELECT * FROM audit ORDER BY seq').iterate()) {
    if (row.prev_hash !== prevHash || hashEntry(prevHash, row) !== row.hash) {
      return { ok: false, brokenAt: row.seq, checked: count };
    }
    prevHash = row.hash;
    count++;
  }
  return { ok: true, checked: count, head: prevHash };
}
