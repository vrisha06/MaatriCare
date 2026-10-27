import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reply, detectLanguage } from './chatbot.js';

const intentOf = (q) => reply(q).intent;

test('danger words in English, Hinglish and Hindi are emergencies', () => {
  for (const q of ['I am bleeding', 'baby moving less since morning', 'mujhe bahut bukhar hai', 'सिर में तेज़ सिरदर्द और धुंधला दिख रहा है']) {
    const r = reply(q);
    assert.equal(r.intent, 'danger', q);
    assert.equal(r.emergency, true);
  }
});

test('a danger word wins even when another topic is mentioned', () => {
  assert.equal(intentOf('what should I eat, I have some bleeding'), 'danger');
});

test('a longer phrase claims its words before a danger word inside it', () => {
  assert.equal(intentOf('खून की कमी के लिए क्या करें'), 'iron');
  assert.equal(intentOf('khoon ki kami hai'), 'iron');
});

test('topics are recognised', () => {
  assert.equal(intentOf('When should I take iron tablets?'), 'iron');
  assert.equal(intentOf('how many checkups do I need'), 'checkups');
  assert.equal(intentOf('kya khana chahiye'), 'diet');
  assert.equal(intentOf('टीका कब लगेगा'), 'vaccine');
  assert.equal(intentOf('is delivery free in government hospital'), 'delivery');
  assert.equal(intentOf('माँ का दूध कब शुरू करें'), 'breastfeeding');
});

test('short keywords only match whole words', () => {
  assert.notEqual(intentOf('can I get this in hindi'), 'greeting');
  assert.equal(intentOf('hi'), 'greeting');
});

test('unknown questions get the fallback in the chosen language', () => {
  const r = reply('what is the capital of France', 'hi');
  assert.equal(r.intent, null);
  assert.match(r.text, /आशा/);
});

test('suggestion chips answer by intent id', () => {
  assert.equal(reply('vaccine', 'hi').intent, 'vaccine');
});

test('Devanagari input is detected as Hindi', () => {
  assert.equal(detectLanguage('नमस्ते'), 'hi');
  assert.equal(detectLanguage('hello'), null);
});
