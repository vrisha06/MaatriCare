import model from './model.json' with { type: 'json' };
import { featurize, FEATURE_LABELS, NOTABLE } from './features.js';

export const LEVELS = ['low', 'moderate', 'high', 'emergency'];

export const DANGER_SIGNS = {
  heavy_bleeding: { label: 'Vaginal bleeding', level: 'emergency' },
  convulsions: { label: 'Convulsions / fits', level: 'emergency' },
  unconscious: { label: 'Unconscious or very drowsy', level: 'emergency' },
  severe_headache: { label: 'Severe headache or blurred vision', level: 'high' },
  reduced_fetal_movement: { label: 'Reduced fetal movement', level: 'high' },
  severe_abdominal_pain: { label: 'Severe abdominal pain', level: 'high' },
  high_fever: { label: 'High fever', level: 'high' },
  breathlessness: { label: 'Breathlessness', level: 'high' },
  swelling: { label: 'Swelling of face or hands', level: 'high' },
};

const rank = (level) => LEVELS.indexOf(level);
const maxLevel = (a, b) => (rank(a) >= rank(b) ? a : b);

// Deterministic clinical rules. They can only raise the level, never lower it.
function applyRules(v) {
  const hits = [];
  if (v.sbp >= 160 || v.dbp >= 110) hits.push({ label: `Severe hypertension (${v.sbp}/${v.dbp})`, level: 'high' });
  else if (v.sbp >= 140 || v.dbp >= 90) hits.push({ label: `High blood pressure (${v.sbp}/${v.dbp})`, level: 'moderate' });
  if (v.hb < 7) hits.push({ label: `Severe anaemia (Hb ${v.hb} g/dL)`, level: 'high' });
  for (const sign of v.dangerSigns ?? []) {
    const d = DANGER_SIGNS[sign];
    if (d) hits.push({ label: d.label, level: d.level });
  }
  return hits;
}

function modelScore(v) {
  const x = featurize(v);
  let z = model.intercept;
  const contributions = model.features.map((f, i) => {
    const c = (model.coef[i] * (x[f] - model.mean[i])) / model.scale[i];
    z += c;
    return { feature: f, impact: c };
  });
  return { score: 1 / (1 + Math.exp(-z)), contributions };
}

/**
 * Score one antenatal visit.
 * @param v {age, sbp, dbp, hb, heightCm, weightKg, parity, prevCsection, prevLoss, dangerSigns[]}
 */
export function assess(v) {
  const { score, contributions } = modelScore(v);
  const { moderate, high } = model.thresholds;
  const modelLevel = score >= high ? 'high' : score >= moderate ? 'moderate' : 'low';
  const rules = applyRules(v);
  const level = rules.reduce((lvl, r) => maxLevel(lvl, r.level), modelLevel);

  const factors = contributions
    .filter((c) => c.impact > 0.1 && (NOTABLE[c.feature]?.(v) ?? true))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map((c) => ({ label: FEATURE_LABELS[c.feature](v), impact: Number(c.impact.toFixed(2)) }));

  return {
    level,
    score: Number(score.toFixed(3)),
    modelLevel,
    rules,
    factors,
    modelVersion: model.version,
  };
}

export { model };
