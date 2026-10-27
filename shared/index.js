export { assess, LEVELS, DANGER_SIGNS, model } from './risk.js';
export { featurize, bmi } from './features.js';
export { RANGES, rangeErrors, PATIENT_FIELDS, VISIT_FIELDS } from './validate.js';

export const REFERRAL_STATUSES = ['created', 'accepted', 'in_transit', 'arrived', 'outcome_recorded', 'closed'];
// Only the receiving facility can confirm these.
export const RECEIVER_STATUSES = ['accepted', 'arrived', 'outcome_recorded'];
export const FACILITY_TIERS = { SC: 'Sub-Centre', PHC: 'Primary Health Centre', RH: 'Rural Hospital', DH: 'District Hospital' };
