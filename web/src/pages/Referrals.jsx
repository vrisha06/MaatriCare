import { Link } from 'react-router-dom';
import { useSession } from '../App.jsx';
import { useApi, formatDateTime } from '../hooks.js';
import ReferralActions, { STATUS_LABELS } from '../components/ReferralActions.jsx';

export default function Referrals() {
  const { user } = useSession();
  const [referrals, error, reload] = useApi('/api/referrals');
  if (error) return <p className="error">{error.message}</p>;
  if (!referrals) return <p className="muted">Loading…</p>;

  const direction = (r) =>
    user.role !== 'doctor' ? '' : r.toFacilityId === user.facilityId ? 'Incoming' : 'Outgoing';

  return (
    <div>
      <h1>Referrals</h1>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              {user.role === 'doctor' && <th>Direction</th>}
              <th>Patient</th><th>From → To</th><th>Reason</th><th>Created</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => (
              <tr key={r.id} className={r.overdue ? 'overdue' : ''}>
                {user.role === 'doctor' && <td>{direction(r)}</td>}
                <td><Link to={`/patients/${r.patientId}`}>{r.patientName}</Link></td>
                <td className="small">{r.fromName} → {r.toName}</td>
                <td className="small">{r.reason}</td>
                <td className="small">{formatDateTime(r.createdAt)}</td>
                <td>
                  {STATUS_LABELS[r.status]}
                  {r.overdue && <span className="pill warn">Overdue</span>}
                </td>
                <td><ReferralActions referral={r} onChange={reload} /></td>
              </tr>
            ))}
            {referrals.length === 0 && <tr><td colSpan="7" className="muted">No referrals.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
