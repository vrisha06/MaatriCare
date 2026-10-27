import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DANGER_SIGNS, rangeErrors, VISIT_FIELDS } from '@maatricare/shared';
import { useSession } from '../../App.jsx';
import { localPatients, provisionalAssessment, queueVisit, sync } from '../../offline.js';
import { NumberField } from '../../components/fields.jsx';
import AssessmentCard from '../../components/AssessmentCard.jsx';

const NEXT_STEP = {
  emergency: 'Call 108 now and inform the PHC. The PHC doctor is alerted when this record syncs.',
  high: 'The PHC doctor will be alerted to review and may refer her. Follow up within 24 hours.',
  moderate: 'Arrange a teleconsult or PHC visit this week.',
  low: 'Continue routine antenatal visits.',
};

export default function NewVisit() {
  const { patientId } = useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const patient = localPatients(user.id).find((p) => p.id === patientId);
  const [form, setForm] = useState({ sbp: '', dbp: '', hb: '', weightKg: '', gestWeeks: '', dangerSigns: [] });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(null);

  if (!patient) return <p className="narrow">Patient not found. <Link to="/">Back</Link></p>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleSign = (s) =>
    setForm({ ...form, dangerSigns: form.dangerSigns.includes(s) ? form.dangerSigns.filter((x) => x !== s) : [...form.dangerSigns, s] });

  const values = {
    sbp: Number(form.sbp), dbp: Number(form.dbp), hb: Number(form.hb), weightKg: Number(form.weightKg),
    gestWeeks: form.gestWeeks === '' ? null : Number(form.gestWeeks), dangerSigns: form.dangerSigns,
  };
  const valid = Object.keys(rangeErrors(form, VISIT_FIELDS)).length === 0;
  const preview = valid ? provisionalAssessment(patient, values) : null;

  function submit(e) {
    e.preventDefault();
    const errs = rangeErrors(form, VISIT_FIELDS);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    queueVisit(user.id, { ...values, patientId });
    if (navigator.onLine) sync(user.id).catch(() => {});
    setSaved(preview);
  }

  if (saved) {
    return (
      <div className="narrow">
        <h1>Visit saved</h1>
        <AssessmentCard assessment={saved} provisional />
        <div className={`card next-step edge-${saved.level}`}>
          <strong>Next step</strong>
          <p>{NEXT_STEP[saved.level]}</p>
        </div>
        <button className="primary" onClick={() => navigate('/')}>Back to my patients</button>
      </div>
    );
  }

  return (
    <form className="narrow card form" onSubmit={submit} noValidate>
      <h1>Visit · {patient.name}</h1>
      <p className="muted small">{patient.age} yrs · {patient.heightCm} cm · {patient.parity} previous birth{patient.parity === 1 ? '' : 's'}</p>
      <div className="grid2">
        <NumberField label="Systolic BP (mmHg)" value={form.sbp} onChange={set('sbp')} error={errors.sbp} />
        <NumberField label="Diastolic BP (mmHg)" value={form.dbp} onChange={set('dbp')} error={errors.dbp} />
        <NumberField label="Haemoglobin (g/dL)" step="0.1" value={form.hb} onChange={set('hb')} error={errors.hb} />
        <NumberField label="Weight (kg)" step="0.1" value={form.weightKg} onChange={set('weightKg')} error={errors.weightKg} />
        <NumberField label="Weeks pregnant" value={form.gestWeeks} onChange={set('gestWeeks')} error={errors.gestWeeks} />
      </div>
      <fieldset>
        <legend>Danger signs today</legend>
        {Object.entries(DANGER_SIGNS).map(([key, d]) => (
          <label key={key} className={`check ${d.level === 'emergency' ? 'danger' : ''}`}>
            <input type="checkbox" checked={form.dangerSigns.includes(key)} onChange={() => toggleSign(key)} /> {d.label}
          </label>
        ))}
      </fieldset>
      {preview && <AssessmentCard assessment={preview} provisional />}
      <button className="primary">Save visit</button>
    </form>
  );
}
