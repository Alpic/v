import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLlm, resolveGeminiModels } from '../pipeline/llm.mjs';

const R = (status, body) => ({ status, ok: status < 300, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
const gem = (t) => R(200, { candidates: [{ content: { parts: [{ text: t }] } }] });
const orr = (t) => R(200, { choices: [{ message: { content: t } }] });
const LIST = R(200, { models: ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.1-flash-lite-preview', 'gemini-3.5-flash-lite-image', 'gemini-3.5-flash-preview-tts'].map((name) => ({ name: `models/${name}` })) });
function mk(handler, extra = {}) {
  const calls = []; let t = 0;
  const f = async (url, o) => { if (String(url).includes('?pageSize')) return LIST; calls.push(String(url)); return handler(String(url), o, calls.length); };
  const llm = createLlm({ config: { llm: { calls_per_run: 40, cool_s: 60 } }, env: { GEMINI_A_KEY: 'a', GEMINI_B_KEY: 'b', OPENROUTER_API_KEY: 'o' }, fetch: f, now: () => t, ...extra });
  return { llm, calls, tick: (s) => (t += s * 1000) };
}

test('model resolution picks newest non-preview', () => {
  assert.deepEqual(resolveGeminiModels(['models/gemini-3.5-flash-lite', 'models/gemini-3.8-flash', 'models/gemini-3.9-flash-preview', 'models/gemini-3.5-flash-lite-image'], ['flash-lite', 'flash']), ['gemini-3.5-flash-lite', 'gemini-3.8-flash']);
  assert.deepEqual(resolveGeminiModels([], ['flash']), ['gemini-2.5-flash']);
});

test('rotation: key A 429 -> key B same model; cooled slot skipped until 60 s pass', async () => {
  const { llm, calls, tick } = mk((url) => (url.includes('gemini-3.5-flash-lite') && url.includes('') && calls.length === 1 ? R(429, 'rate') : gem('{"x":1}')));
  const r = await llm.ask('hi', { json: true });
  assert.equal(r.model, 'gemini-3.5-flash-lite'); assert.deepEqual(r.json, { x: 1 });
  assert.equal(calls.length, 2);
  await llm.ask('again'); // A is cooling -> goes straight to B
  assert.equal(calls.length, 3);
  tick(61); await llm.ask('later'); // A back first
  assert.equal(calls.length, 4);
});

test('bad JSON cools slot and falls through to next model; 5xx too', async () => {
  const { llm } = mk((url, o, n) => (n === 1 ? gem('not json') : n === 2 ? R(503, 'x') : gem('```json\n{"ok":true}\n```')));
  const r = await llm.ask('q', { json: true });
  assert.deepEqual(r.json, { ok: true }); assert.equal(llm.stats().failures, 2);
});

test('daily-quota 429 disables slot for the run (even after cooling time)', async () => {
  const { llm, calls, tick } = mk((url, o, n) => (n === 1 ? R(429, 'Quota exceeded: GenerateRequestsPerDayPerProjectPerModel') : gem('ok')));
  await llm.ask('q'); tick(3600); const before = calls.length;
  await llm.ask('q'); await llm.ask('q');
  assert.ok(calls.slice(before).every((u, i) => i < 2 && !(u.includes('GEMINI') )));
  assert.equal(calls.length, before + 2);
});

test('budget: returns null after calls_per_run; all cooling -> null', async () => {
  const f = async (u) => (String(u).includes('?pageSize') ? LIST : gem('ok'));
  const llm = createLlm({ config: { llm: { calls_per_run: 2 } }, env: { GEMINI_A_KEY: 'a' }, fetch: f });
  assert.ok(await llm.ask('1')); assert.ok(await llm.ask('2')); assert.equal(await llm.ask('3'), null);
  assert.equal(llm.stats().calls, 2);
  const { llm: l2 } = mk(() => R(500, 'x'));
  assert.equal(await l2.ask('q'), null); // every slot fails once and cools
  assert.equal(await l2.ask('q'), null);
});

test('falls to OpenRouter :free and refuses non-free ids', async () => {
  const { llm, calls } = mk((url) => (url.includes('openrouter') ? orr('from-or') : R(429, 'x')), { orModels: ['openai/gpt-5', 'anthropic/claude:paid', 'nvidia/nemotron-3-super-120b-a12b:free'] });
  const r = await llm.ask('q');
  assert.equal(r.model, 'nvidia/nemotron-3-super-120b-a12b:free'); assert.equal(r.text, 'from-or');
  assert.ok(!JSON.stringify(calls).includes('gpt-5'));
  const bodies = []; const f = async (u, o) => { if (String(u).includes('?pageSize')) return LIST; bodies.push(o.body); return R(500, 'x'); };
  await createLlm({ env: { OPENROUTER_API_KEY: 'o' }, fetch: f, orModels: ['openai/gpt-5', 'a/b:free'] }).ask('q');
  assert.ok(bodies.every((b) => !b.includes('gpt-5')) && bodies.length === 1);
});
