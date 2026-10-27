import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../App.jsx';
import { useApi, formatDate } from '../hooks.js';
import RiskBadge from '../components/RiskBadge.jsx';

const isUrgent = (p) => p.effectiveLevel === 'high' || p.effectiveLevel === 'emergency';
const FILTERS = {
  review: ['Needs review', (p) => p.visitId && !p.reviewedAt && (isUrgent(p) || p.effectiveLevel === 'moderate')],
  urgent: ['High and emergency', isUrgent],
  all: ['All', () => true],
};

export default function Worklist() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [patients, error] = useApi('/api/patients');
  const [filter, setFilter] = useState(user.role === 'doctor' ? 'review' : 'all');

  if (error) return <p className="error">{error.message}</p>;
  if (!patients) return <p className="muted">Loading…</p>;
  const shown = patients.filter(FILTERS[filter][1]);

  return (
    <div>
      <div className="row between">
        <h1>{user.role === 'doctor' ? 'Worklist' : 'All patients'}</h1>
        <div className="tabs">
          {Object.entries(FILTERS).map(([k, [label, fn]]) => (
            <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
              {label} <span className="count">{patients.filter(fn).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Risk</th><th>Patient</th><th>Village</th><th>Weeks</th><th>Why flagged</th><th>Last visit</th><th>Referral</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="clickable" onClick={() => navigate(`/patients/${p.id}`)}>
                <td><RiskBadge level={p.effectiveLevel} reviewed={!!p.reviewedAt} /></td>
                <td><strong>{p.name}</strong><div className="muted small">{p.age} yrs · ASHA {p.ashaName}</div></td>
                <td>{p.villageName}</td>
                <td>{p.gestWeeks ?? '—'}</td>
                <td className="small">
                  {p.assessment
                    ? [...p.assessment.rules.map((r) => r.label), ...p.assessment.factors.map((f) => f.label)].slice(0, 2).join(' · ') || '—'
                    : '—'}
                </td>
                <td>{formatDate(p.visitedAt)}</td>
                <td>{p.openReferrals > 0 ? <span className="pill">Open</span> : ''}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan="7" className="muted">Nothing here.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
