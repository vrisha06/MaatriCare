import { useState } from 'react';
import { api } from '../api.js';
import { useApi } from '../hooks.js';

const COLUMNS = [
  ['unscreened', 'Not screened', '--c-none'],
  ['low', 'Low', '--c-low'],
  ['moderate', 'Moderate', '--c-moderate'],
  ['high', 'High', '--c-high'],
  ['emergency', 'Emergency', '--c-emergency'],
];

export default function AdminDashboard() {
  const [summary, error] = useApi('/api/admin/summary');
  const [chain, setChain] = useState(null);

  if (error) return <p className="error">{error.message}</p>;
  if (!summary) return <p className="muted">Loading…</p>;

  const { villages, referrals, overdueHours } = summary;
  const total = villages.reduce((n, v) => n + v.patients, 0);
  const urgent = villages.reduce((n, v) => n + v.high + v.emergency, 0);
  const max = Math.max(1, ...villages.flatMap((v) => COLUMNS.map(([k]) => v[k])));

  return (
    <div>
      <h1>Block overview</h1>
      <div className="tiles">
        <Tile label="Registered pregnancies" value={total} />
        <Tile label="High or emergency risk" value={urgent} tone="high" />
        <Tile label="Referral completion" value={referrals.completionRate === null ? '—' : `${Math.round(referrals.completionRate * 100)}%`}
          note={`${referrals.completed} of ${referrals.total} reached the destination`} />
        <Tile label="Overdue referrals" value={referrals.overdue} tone={referrals.overdue ? 'emergency' : undefined}
          note={`open more than ${overdueHours} h`} />
      </div>

      <h2>Risk by village</h2>
      <div className="table-wrap card">
        <table className="heatmap">
          <thead>
            <tr><th>Village</th><th>PHC</th><th>Patients</th>{COLUMNS.map(([k, label]) => <th key={k}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {villages.map((v) => (
              <tr key={v.id}>
                <td><strong>{v.name}</strong></td>
                <td className="small">{v.phcName}</td>
                <td>{v.patients}</td>
                {COLUMNS.map(([k, , color]) => (
                  <td key={k} className="cell" style={{ background: v[k] ? `color-mix(in srgb, var(${color}) ${15 + (v[k] / max) * 70}%, transparent)` : undefined }}>
                    {v[k] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Audit integrity</h2>
      <div className="card row between">
        <span>
          {chain === null && 'Every clinical action is written to a hash-chained audit log.'}
          {chain?.ok && `Chain intact: ${chain.checked} entries verified. Head ${chain.head.slice(0, 16)}…`}
          {chain && !chain.ok && <span className="error">Tampering detected at entry #{chain.brokenAt}.</span>}
        </span>
        <button onClick={async () => setChain(await api('/api/audit/verify'))}>Verify chain</button>
      </div>
    </div>
  );
}

function Tile({ label, value, note, tone }) {
  return (
    <div className={`card tile ${tone ? `edge-${tone}` : ''}`}>
      <div className="muted small">{label}</div>
      <div className="tile-value">{value}</div>
      {note && <div className="muted small">{note}</div>}
    </div>
  );
}
