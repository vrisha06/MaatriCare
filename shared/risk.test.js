import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, featurize, model } from './index.js';

const healthy = { age: 24, sbp: 110, dbp: 70, hb: 12, heightCm: 155, weightKg: 55, parity: 1, prevCsection: false, prevLoss: false, dangerSigns: [] };

test('featurize produces exactly the features the model was trained on', () => {
  assert.deepEqual(Object.keys(featurize(healthy)), model.features);
});

test('healthy profile is low risk', () => {
  assert.equal(assess(healthy).level, 'low');
});

test('severe hypertension forces high even if the model says low', () => {
  const r = assess({ ...healthy, sbp: 165, dbp: 112 });
  assert.equal(r.level, 'high');
  assert.ok(r.rules.some((h) => h.label.startsWith('Severe hypertension')));
});

test('bleeding is an emergency', () => {
  assert.equal(assess({ ...healthy, dangerSigns: ['heavy_bleeding'] }).level, 'emergency');
});

test('normal vitals are never listed as reasons', () => {
  const r = assess({ ...healthy, age: 17, dbp: 78, sbp: 124 });
  assert.ok(!r.factors.some((f) => f.label.includes('BP')));
});

test('risk factors raise the score and are explained', () => {
  const r = assess({ ...healthy, age: 17, hb: 8, prevLoss: true });
  assert.ok(r.score > assess(healthy).score);
  assert.ok(r.factors.length > 0);
  assert.ok(r.factors.some((f) => f.label.includes('haemoglobin')));
});
