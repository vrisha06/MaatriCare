import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEVELS } from '@maatricare/shared';
import { useSession } from '../../App.jsx';
import { useOnline, formatDate, formatDateTime } from '../../hooks.js';
import { localPatients, pendingCount, sync, lastSync } from '../../offline.js';
import RiskBadge from '../../components/RiskBadge.jsx';

export default function AshaHome() {
  const { user } = useSession();
  const online = useOnline();
  const [patients, setPatients] = useState(() => localPatients(user.id));
  const [status, setStatus] = useState(null);

  const refresh = () => setPatients(localPatients(user.id));
  const doSync = useCallback(async () => {
    setStatus('Syncing…');
    try {
      await sync(user.id);
      setStatus(null);
    } catch (err) {
      setStatus(`Sync failed: ${err.message}`);
    }
    refresh();
  }, [user.id]);

  useEffect(() => {
    if (online) doSync();
  }, [online, doSync]);

  const sorted = [...patients].sort(
    (a, b) => LEVELS.indexOf(b.effectiveLevel) - LEVELS.indexOf(a.effectiveLevel) || a.name.localeCompare(b.name),
  );
  const pending = pendingCount(user.id);
  const synced = lastSync(user.id);

  return (
    <div className="narrow">
      <div className="row between">
        <h1>My patients</h1>
        <Link className="button primary" to="/register">+ Register</Link>
      </div>
      <div className="syncbar">
        <span>
          {pending ? `${pending} record${pending > 1 ? 's' : ''} waiting to sync` : 'All records synced'}
          {synced && <span className="muted"> · last sync {formatDateTime(synced)}</span>}
        </span>
        <button onClick={doSync} disabled={!online || status === 'Syncing…'}>Sync now</button>
      </div>
      {status && <p className={status.startsWith('Sync failed') ? 'error' : 'muted'}>{status}</p>}

      {sorted.length === 0 && <p className="muted">No patients yet. Register a pregnant woman to begin.</p>}
      <ul className="cards">
        {sorted.map((p) => (
          <li key={p.id} className={`card patient-card edge-${p.effectiveLevel ?? 'none'}`}>
            <div className="row between">
              <div>
                <strong>{p.name}</strong>
                <div className="muted small">
                  {p.age} yrs{p.gestWeeks ? ` · ${p.gestWeeks} weeks` : ''} · last visit {formatDate(p.visitedAt)}
                  {p.pending && ' · not synced'}
                </div>
              </div>
              <RiskBadge level={p.effectiveLevel} provisional={p.pendingVisit} reviewed={!!p.reviewedAt} />
            </div>
            {p.assessment && (p.assessment.rules.length > 0 || p.assessment.factors.length > 0) && (
              <div className="reasons small">
                {[...p.assessment.rules.map((r) => r.label), ...p.assessment.factors.map((f) => f.label)].slice(0, 3).join(' · ')}
              </div>
            )}
            <div className="row">
              <Link className="button" to={`/visit/${p.id}`}>Record visit</Link>
              {p.openReferrals > 0 && <span className="pill">Referral open</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
