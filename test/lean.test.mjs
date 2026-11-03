import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucket, outletScore, confidence, computeLean, loadParties, t3Bucket } from '../pipeline/lean.mjs';

const P = [{ code: 'kok', p: 1.13, gov: true }, { code: 'ps', p: 1.27, gov: true }, { code: 'sd', p: -0.58, gov: false }, { code: 'vas', p: -1.38, gov: false }];
const cfg = { version: 1, voice_visible: false, voice: { buckets: [-1.2, -0.4, 0.4, 1.2], conf: { high_n: 200, medium_n: 100, low_n: 30, within_buckets: 1 } } };

test('buckets at the cutpoints', () => {
  assert.deepEqual([-2, -1.2, -0.5, -0.4, 0, 0.39, 0.4, 1.19, 1.2, 2].map((s) => bucket(s)), [-2, -1, -1, 0, 0, 0, 1, 1, 2, 2]);
});

test('score, gov share, normalisation per article', () => {
  const o = outletScore([{ kok: 3, ps: 1 }, { sd: 1 }, {}, null, { kok: 1, zzz: 5 }], P);
  assert.equal(o.n, 3);
  assert.ok(Math.abs(o.gov_share - (1 + 0 + 1) / 3) < 1e-3);
  assert.ok(Math.abs(o.S - ((0.75 * 1.13 + 0.25 * 1.27) + -0.58 + 1.13) / 3) < 1e-3);
});

test('confidence levels', () => {
  const c = cfg.voice.conf;
  assert.equal(confidence(250, 1, { t3: 1, sanity: 2 }, c), 'high');
  assert.equal(confidence(250, 1, { t3: 1 }, c), 'medium'); // no sanity label
  assert.equal(confidence(250, 2, { mbfc: 0, sanity: 2 }, c), 'low'); // >1 bucket from reference
  assert.equal(confidence(120, -1, { mbfc: -2 }, c), 'medium');
  assert.equal(confidence(120, 1, {}, c), 'low');
  assert.equal(confidence(10, 0, { mbfc: 0 }, c), 'none');
});

test('computeLean on synthetic outlets; visible follows config; tie flag', () => {
  const rows = [];
  for (let i = 0; i < 120; i++) { rows.push({ source_id: 'right', voice: { kok: 3, ps: 1 } }); rows.push({ source_id: 'left', voice: { vas: 1, sd: 1 } }); }
  for (let i = 0; i < 40; i++) rows.push({ source_id: 'mid', voice: { kok: 1, sd: 1 } });
  rows.push({ source_id: 'tiny', voice: { kok: 1 } });
  const out = Object.fromEntries(computeLean(rows, P, cfg, { right: { mbfc: 1 }, left: { tie: 2 } }).map((r) => [r.source_id, r]));
  assert.equal(out.right.bucket, 1); assert.equal(out.right.conf, 'medium');
  assert.equal(out.left.bucket, -1); assert.equal(out.left.differs_tie, true); assert.equal(out.left.conf, 'low');
  assert.equal(out.mid.bucket, 0); assert.equal(out.mid.conf, 'low');
  assert.equal(out.tiny.conf, 'none'); assert.ok(Object.values(out).every((r) => r.visible === false && r.source === 'voice'));
  assert.equal(computeLean(rows, P, { ...cfg, voice_visible: true })[0].visible, true);
});

test('parties.yaml loads; T3 bucket mapping', () => {
  const ps = loadParties(new URL('../data/parties.yaml', import.meta.url));
  assert.equal(ps.length, 9); assert.deepEqual(ps.find((x) => x.code === 'kok'), { code: 'kok', p: 1.13, gov: true });
  assert.equal(t3Bucket(0, 100), 2); assert.equal(t3Bucket(50, 100), 0); assert.equal(t3Bucket(0, 0), null);
});
