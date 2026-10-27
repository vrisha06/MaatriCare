// Must stay in step with featurize() in ml/train.py.
export function bmi({ heightCm, weightKg }) {
  return weightKg / (heightCm / 100) ** 2;
}

export function featurize(v) {
  const b = bmi(v);
  return {
    age_under_18: v.age < 18 ? 1 : 0,
    age_over_35: v.age > 35 ? 1 : 0,
    sbp: v.sbp,
    dbp: v.dbp,
    hb: v.hb,
    bmi_low: b < 18.5 ? 1 : 0,
    bmi_high: b >= 30 ? 1 : 0,
    grand_multipara: v.parity >= 4 ? 1 : 0,
    prev_csection: v.prevCsection ? 1 : 0,
    prev_loss: v.prevLoss ? 1 : 0,
    short_stature: v.heightCm < 145 ? 1 : 0,
  };
}

// A continuous vital can nudge the score up while still being normal (e.g. DBP 76).
// Only name it as a reason once it crosses a clinical cut-off.
export const NOTABLE = {
  sbp: (v) => v.sbp >= 130,
  dbp: (v) => v.dbp >= 85,
  hb: (v) => v.hb < 11,
};

// Plain-language reason shown to ASHAs and doctors when a feature pushes risk up.
export const FEATURE_LABELS = {
  age_under_18: (v) => `Age under 18 (${v.age})`,
  age_over_35: (v) => `Age over 35 (${v.age})`,
  sbp: (v) => `Systolic BP ${v.sbp} mmHg`,
  dbp: (v) => `Diastolic BP ${v.dbp} mmHg`,
  hb: (v) => `Low haemoglobin (${v.hb} g/dL)`,
  bmi_low: (v) => `Underweight (BMI ${bmi(v).toFixed(1)})`,
  bmi_high: (v) => `Obesity (BMI ${bmi(v).toFixed(1)})`,
  grand_multipara: (v) => `${v.parity} previous births`,
  prev_csection: () => 'Previous C-section',
  prev_loss: () => 'Previous stillbirth or miscarriage',
  short_stature: (v) => `Short stature (${v.heightCm} cm)`,
};
