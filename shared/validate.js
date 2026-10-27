// Plausible ranges for field entry (FR-02). Shared so the ASHA app rejects a typo
// before it is queued, instead of the whole sync batch failing on the server.
export const RANGES = {
  age: [12, 55],
  heightCm: [120, 200],
  parity: [0, 15],
  sbp: [60, 250],
  dbp: [30, 150],
  hb: [3, 20],
  weightKg: [25, 200],
  gestWeeks: [4, 44],
};

export function rangeErrors(values, fields) {
  const errors = {};
  for (const f of fields) {
    const v = values[f];
    const [lo, hi] = RANGES[f];
    if (v === null || v === undefined || v === '') {
      if (f !== 'gestWeeks') errors[f] = 'Required';
    } else if (!Number.isFinite(Number(v)) || Number(v) < lo || Number(v) > hi) {
      errors[f] = `Must be between ${lo} and ${hi}`;
    }
  }
  if (fields.includes('dbp') && !errors.sbp && !errors.dbp && Number(values.dbp) >= Number(values.sbp)) {
    errors.dbp = 'Diastolic must be lower than systolic';
  }
  return errors;
}

export const PATIENT_FIELDS = ['age', 'heightCm', 'parity'];
export const VISIT_FIELDS = ['sbp', 'dbp', 'hb', 'weightKg', 'gestWeeks'];
