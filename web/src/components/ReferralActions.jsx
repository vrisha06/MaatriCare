import { useState } from 'react';
import { REFERRAL_STATUSES, RECEIVER_STATUSES } from '@maatricare/shared';
import { api } from '../api.js';
import { useSession } from '../App.jsx';

export const STATUS_LABELS = {
  created: 'Created', accepted: 'Accepted', in_transit: 'In transit',
  arrived: 'Arrived', outcome_recorded: 'Outcome recorded', closed: 'Closed',
};

export function StatusSteps({ status }) {
  const at = REFERRAL_STATUSES.indexOf(status);
  return (
    <ol className="steps">
      {REFERRAL_STATUSES.map((s, i) => (
        <li key={s} className={i < at ? 'done' : i === at ? 'current' : ''}>{STATUS_LABELS[s]}</li>
      ))}
    </ol>
  );
}

// Moves a referral to its next status. Only doctors at the sending or receiving facility can.
export default function ReferralActions({ referral, onChange }) {
  const { user } = useSession();
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const next = REFERRAL_STATUSES[REFERRAL_STATUSES.indexOf(referral.status) + 1];
  const allowed = RECEIVER_STATUSES.includes(next)
    ? user.facilityId === referral.toFacilityId
    : [referral.fromFacilityId, referral.toFacilityId].includes(user.facilityId);
  if (!next || user.role !== 'doctor' || !allowed) return null;
  const needsNote = next === 'outcome_recorded';

  async function advance() {
    setError(null);
    try {
      onChange(await api(`/api/referrals/${referral.id}/status`, { status: next, note }));
      setNote('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="row referral-actions">
      {needsNote && <input placeholder="Outcome (e.g. delivered, admitted, discharged)" value={note} onChange={(e) => setNote(e.target.value)} />}
      <button onClick={advance} disabled={needsNote && !note.trim()}>Mark {STATUS_LABELS[next].toLowerCase()}</button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}
