import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outletIndex, outletOfUrl, extractLinks, mentionedOutlets } from '../pipeline/crowd/lib.mjs';
import { scoreA, sharers, confidence, gateA1, capMentions, communityWeights, spikeDays, wilson, classify, scoreAll } from '../pipeline/crowd/score.mjs';
import { parseParties } from '../pipeline/crowd/anchors.mjs';

const src = [{ id: 'yle', name: 'Yle Uutiset', domain: 'yle.fi', country: 'FI' }, { id: 'ku', name: 'Kansan Uutiset', domain: 'kansanuutiset.fi', country: 'FI' },
  { id: 'yle-news', name: 'Yle News', domain: 'yle.fi/news', country: 'FI' }, { id: 'bbc', name: 'BBC', domain: 'bbc.com', country: 'GB' }];
const idx = outletIndex(src);

test('link extraction: subdomain match, tracking stripped, dedupe, non-outlets ignored', () => {
  assert.equal(idx.length, 2);
  assert.equal(outletOfUrl('https://www.yle.fi/a/74-1', idx), 'yle');
  assert.equal(outletOfUrl('https://svenska.yle.fi/x', idx), 'yle');
  assert.equal(outletOfUrl('https://notyle.fi/x', idx), null);
  const l = extractLinks(['https://yle.fi/a/1?utm=1', 'https://yle.fi/a/1#x', 'https://kansanuutiset.fi/a', 'https://example.com/'], idx);
  assert.deepEqual(l.map((x) => x.source_id), ['yle', 'ku']);
  assert.deepEqual(mentionedOutlets('Kansan Uutiset kirjoitti, ja yle.fi myös', idx).sort(), ['ku', 'yle']);
});

test('A: one vote per sharer, repeat weight, seeded CI is deterministic', () => {
  const sh = [{ actor: 'a', p: -1, url_hash: '1' }, { actor: 'a', p: -1, url_hash: '2' }, { actor: 'a', p: -1, url_hash: '3' }, { actor: 'a', p: -1, url_hash: '4' }, { actor: 'a', p: -1, url_hash: '5' }, { actor: 'b', p: 1, url_hash: '1' }];
  const S = sharers(sh); assert.equal(S.length, 2);
  assert.equal(S.find((x) => x.actor === 'a').w, 0.5); // 5 urls capped at 4 -> 1/sqrt(4)
  const r1 = scoreA(sh, 's'), r2 = scoreA(sh, 's');
  assert.deepEqual(r1, r2);
  assert.ok(Math.abs(r1.a - (-0.5 + 1) / 1.5) < 1e-9);
  assert.ok(r1.ci_lo <= r1.a && r1.a <= r1.ci_hi);
  assert.equal(r1.conf, 'none'); // n < 30
});

test('confidence levels', () => {
  assert.equal(confidence(10, 10, 0, 1), 'none');
  assert.equal(confidence(50, 4, 0, 1), 'none');
  assert.equal(confidence(50, 50, 0, 1), 'low');
  assert.equal(confidence(150, 150, 0, 0.5), 'medium');
  assert.equal(confidence(400, 400, 0.5, 0.8), 'high');
});

test('gate G-A1: order, violation, insufficient data', () => {
  const o = (a, conf = 'low') => ({ a, conf });
  assert.equal(gateA1({ demokraatti: o(-1), kansanuutiset: o(-1.2), verkkouutiset: o(0.8), suomenuutiset: o(1) }).passed, true);
  const bad = gateA1({ demokraatti: o(0.9), kansanuutiset: o(-1.2), verkkouutiset: o(0.8), suomenuutiset: o(1) });
  assert.equal(bad.passed, false); assert.ok(bad.value < 0);
  const miss = gateA1({ demokraatti: o(-1), kansanuutiset: o(-1, 'none'), verkkouutiset: o(1), suomenuutiset: o(1) });
  assert.equal(miss.passed, false); assert.match(miss.notes, /kansanuutiset/);
});

test('scoreAll keeps everything hidden while the gate fails', async () => {
  const mk = (id, p, n) => Array.from({ length: n }, (_, i) => ({ actor: `${id}${i}`, p, url_hash: `${i}`, source_id: id, shared_at: new Date().toISOString() }));
  const bad = await scoreAll({ shares: [...mk('demokraatti', 1, 40), ...mk('kansanuutiset', 1, 40), ...mk('verkkouutiset', -1, 40), ...mk('suomenuutiset', -1, 40)], mentions: [] });
  assert.equal(bad.validation[0].passed, false); assert.ok(bad.audience.every((r) => r.visible === false));
});

test('B: brigade cap per author, community cap 25%, spike flag, wilson', () => {
  const m = (a, d, c = 'x') => ({ actor_id: a, source_id: 'yle', posted_at: `2026-10-${String(d).padStart(2, '0')}T10:00:00Z`, community_id: c });
  const spam = Array.from({ length: 30 }, (_, i) => m('bot', 1 + (i % 28)));
  assert.equal(capMentions(spam).length, 2); // 14-day spacing within one month, max 3
  const big = [...Array.from({ length: 100 }, (_, i) => m(`a${i}`, 1, 'big')), ...Array.from({ length: 20 }, (_, i) => m(`b${i}`, 1, 's1')), ...Array.from({ length: 20 }, (_, i) => m(`c${i}`, 1, 's2')), ...Array.from({ length: 20 }, (_, i) => m(`d${i}`, 1, 's3')), ...Array.from({ length: 20 }, (_, i) => m(`e${i}`, 1, 's4'))];
  const w = communityWeights(big), tot = w.reduce((a, b) => a + b, 0), bigW = w.filter((_, i) => big[i].community_id === 'big').reduce((a, b) => a + b, 0);
  assert.ok(bigW / tot <= 0.2501, `big share ${bigW / tot}`);
  const days = { 1: 3, 2: 4, 3: 3, 4: 4, 5: 3, 6: 3, 7: 60 };
  assert.deepEqual(spikeDays(days), ['7']);
  const [lo, hi] = wilson(5, 10); assert.ok(lo < 0.5 && hi > 0.5 && lo > 0.2);
});

test('B: classify needs two agreeing models and substring evidence', async () => {
  const text = 'Yle on aivan puolueellinen vasemmistolle';
  const mkLlm = (ja, jb) => { const r = [{ model: 'm1', json: ja }, { model: 'm2', json: jb }]; return { ask: async () => r.shift() }; };
  const j = { stance: 'negative', lean_claim: 'left', quality_claim: 'none', evidence: 'puolueellinen vasemmistolle' };
  assert.deepEqual((await classify(mkLlm(j, j), text, 'Yle')).models, ['m1', 'm2']);
  assert.deepEqual((await classify(mkLlm(j, { ...j, lean_claim: 'none' }), text, 'Yle')).flags, ['disagree']);
  assert.deepEqual((await classify(mkLlm({ ...j, evidence: 'keksitty lause' }, j), text, 'Yle')).flags, ['bad_json_or_evidence']);
});

test('parties.yaml parser feeds anchor positions', () => {
  const p = parseParties(); assert.ok(p.find((x) => x.code === 'vas').p < 0 && p.find((x) => x.code === 'ps').p > 1);
});
