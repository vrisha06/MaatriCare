import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rangeErrors, PATIENT_FIELDS } from '@maatricare/shared';
import { useSession } from '../../App.jsx';
import { queuePatient, sync } from '../../offline.js';
import { NumberField } from '../../components/fields.jsx';

const EMPTY = { name: '', age: '', phone: '', abhaId: '', heightCm: '', parity: '0', prevCsection: false, prevLoss: false };

export default function RegisterPatient() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function submit(e) {
    e.preventDefault();
    const errs = rangeErrors(form, PATIENT_FIELDS);
    if (!form.name.trim()) errs.name = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const p = queuePatient(user.id, {
      ...form, name: form.name.trim(), age: Number(form.age), heightCm: Number(form.heightCm), parity: Number(form.parity),
      phone: form.phone || null, abhaId: form.abhaId || null,
    });
    if (navigator.onLine) sync(user.id).catch(() => {});
    navigate(`/visit/${p.id}`);
  }

  return (
    <form className="narrow card form" onSubmit={submit} noValidate>
      <h1>Register pregnant woman</h1>
      <label>
        Full name
        <input value={form.name} onChange={set('name')} />
        {errors.name && <span className="error">{errors.name}</span>}
      </label>
      <div className="grid2">
        <NumberField label="Age (years)" value={form.age} onChange={set('age')} error={errors.age} />
        <NumberField label="Height (cm)" value={form.heightCm} onChange={set('heightCm')} error={errors.heightCm} />
        <NumberField label="Previous births" value={form.parity} onChange={set('parity')} error={errors.parity} />
        <label>
          Phone (optional)
          <input inputMode="tel" value={form.phone} onChange={set('phone')} />
        </label>
      </div>
      <label>
        ABHA ID (optional)
        <input value={form.abhaId} onChange={set('abhaId')} placeholder="Can be linked later" />
      </label>
      <label className="check">
        <input type="checkbox" checked={form.prevCsection} onChange={set('prevCsection')} /> Previous C-section
      </label>
      <label className="check">
        <input type="checkbox" checked={form.prevLoss} onChange={set('prevLoss')} /> Previous stillbirth or miscarriage
      </label>
      <p className="muted small">Consent: confirm the woman has agreed to her details being recorded.</p>
      <button className="primary">Save and record first visit</button>
    </form>
  );
}
