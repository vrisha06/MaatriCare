import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DANGER_SIGNS, FACILITY_TIERS, LEVELS } from '@maatricare/shared';
import { api } from '../api.js';
import { useSession } from '../App.jsx';
import { useApi, formatDate, formatDateTime } from '../hooks.js';
import AssessmentCard from '../components/AssessmentCard.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import ReferralActions, { StatusSteps } from '../components/ReferralActions.jsx';

const ACTION_LABELS = {
  'patient.registered': 'Registered by ASHA',
  'visit.recorded': 'Visit recorded',
  'alert.raised': 'High-risk alert raised',
  'visit.confirmed': 'Score confirmed by doctor',
  'visit.overridden': 'Score overridden by doctor',
  'referral.created': 'Referral created',
  'referral.status': 'Referral status changed',
};

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const [data, error, reload] = useApi(`/api/patients/${id}`);

  if (error) return <p className="error">{error.message}</p>;
  if (!data) return <p className="muted">Loading…</p>;
  const { patient, visits, referrals, timeline } = data;
  const latest = visits[0];

  return (
    <div className="detail">
      <div className="card">
        <div className="row between">
          <div>
            <h1>{patient.name}</h1>
            <div className="muted">
              {patient.age} yrs · {patient.villageName} · ASHA {patient.ashaName}
              {patient.phone && ` · ${patient.phone}`} · ABHA {patient.abhaId ?? 'not linked'}
            </div>
            <div className="muted small">
              {patient.heightCm} cm · {patient.parity} previous birth{patient.parity === 1 ? '' : 's'}
              {patient.prevCsection ? ' · previous C-section' : ''}
              {patient.prevLoss ? ' · previous stillbirth/miscarriage' : ''}
            </div>
          </div>
          <RiskBadge level={patient.effectiveLevel} reviewed={!!patient.reviewedAt} />
        </div>
      </div>

      <div className="two-col">
        <div>
          <h2>Latest visit · {formatDate(latest?.visitedAt)}</h2>
          {latest ? (
            <>
              <p className="small">
                BP {latest.sbp}/{latest.dbp} · Hb {latest.hb} g/dL · {latest.weightKg} kg
                {latest.gestWeeks && ` · ${latest.gestWeeks} weeks`}
                {latest.dangerSigns.length > 0 && ` · ${latest.dangerSigns.map((s) => DANGER_SIGNS[s]?.label).join(', ')}`}
              </p>
              <AssessmentCard assessment={latest.assessment} />
              <Review visit={latest} canReview={user.role === 'doctor'} onDone={reload} />
            </>
          ) : (
            <p className="muted">No visits recorded yet.</p>
          )}
        </div>

        <div>
          <h2>Referrals</h2>
          {referrals.length === 0 && <p className="muted">No referrals.</p>}
          {referrals.map((r) => (
            <div key={r.id} className={`card referral ${r.overdue ? 'overdue' : ''}`}>
              <div className="row between">
                <strong>{r.fromName} → {r.toName}</strong>
                {r.overdue && <span className="pill warn">Overdue</span>}
              </div>
              <div className="small">{r.reason} · {formatDateTime(r.createdAt)}</div>
              <StatusSteps status={r.status} />
              <ReferralActions referral={r} onChange={reload} />
            </div>
          ))}
          {user.role === 'doctor' && <NewReferral patient={patient} visit={latest} onDone={reload} />}
        </div>
      </div>

      <h2>Visit history</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr><th>Date</th><th>BP</th><th>Hb</th><th>Weight</th><th>Weeks</th><th>Model</th><th>Final</th></tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id}>
                <td>{formatDate(v.visitedAt)}</td>
                <td>{v.sbp}/{v.dbp}</td>
                <td>{v.hb}</td>
                <td>{v.weightKg}</td>
                <td>{v.gestWeeks ?? '—'}</td>
                <td><RiskBadge level={v.level} /></td>
                <td>
                  <RiskBadge level={v.reviewedLevel ?? v.level} reviewed={!!v.reviewedAt} />
                  {v.reviewReason && <div className="muted small">{v.reviewReason}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Audit trail</h2>
      <ul className="timeline card">
        {timeline.map((t) => (
          <li key={t.seq}>
            <span className="muted small">{formatDateTime(t.at)}</span>
            <span>
              {ACTION_LABELS[t.action] ?? t.action}
              {t.data?.to && t.action !== 'referral.created' && ` → ${t.data.to}`}
              {t.data?.reason && `: ${t.data.reason}`}
              {t.data?.note && `: ${t.data.note}`}
              {t.data?.level && ` (${t.data.level})`}
              {t.actorName && <span className="muted"> · {t.actorName}</span>}
            </span>
            <code className="hash" title={t.hash}>{t.hash.slice(0, 10)}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Review({ visit, canReview, onDone }) {
  const [level, setLevel] = useState(visit.level);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  if (visit.reviewedAt) {
    return (
      <p className="small">
        Reviewed by {visit.reviewedByName} on {formatDateTime(visit.reviewedAt)}: <RiskBadge level={visit.reviewedLevel} />
        {visit.reviewReason && ` — ${visit.reviewReason}`}
      </p>
    );
  }
  if (!canReview) return <p className="muted small">Not yet reviewed by a doctor.</p>;

  const override = level !== visit.level;
  async function submit() {
    setError(null);
    try {
      await api(`/api/visits/${visit.id}/review`, { level, reason });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card review">
      <strong>Doctor review</strong>
      <div className="row">
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}{l === visit.level ? ' (scored)' : ''}</option>)}
        </select>
        <button className="primary" onClick={submit} disabled={override && !reason.trim()}>
          {override ? 'Save override' : 'Confirm score'}
        </button>
      </div>
      {override && <textarea placeholder="Reason for override (required)" value={reason} onChange={(e) => setReason(e.target.value)} />}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function NewReferral({ patient, visit, onDone }) {
  const { user } = useSession();
  const [meta] = useApi('/api/meta');
  const suggested = visit?.assessment?.rules[0]?.label ?? visit?.assessment?.factors[0]?.label ?? '';
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [reason, setReason] = useState(suggested);
  const [error, setError] = useState(null);

  if (!open) return <button onClick={() => setOpen(true)}>+ New referral</button>;
  const targets = (meta?.facilities ?? []).filter((f) => f.id !== user.facilityId);

  async function submit() {
    setError(null);
    try {
      await api('/api/referrals', { patientId: patient.id, visitId: visit?.id, toFacilityId: to, reason });
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card form">
      <strong>New referral</strong>
      <select value={to} onChange={(e) => setTo(e.target.value)}>
        <option value="">Refer to…</option>
        {targets.map((f) => <option key={f.id} value={f.id}>{f.name} ({FACILITY_TIERS[f.tier]})</option>)}
      </select>
      <textarea placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="primary" onClick={submit} disabled={!to || !reason.trim()}>Create referral</button>
        <button className="link" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
