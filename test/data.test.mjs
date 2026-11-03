import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const sources = load('sources.json'), config = load('config.json');
const yaml = readFileSync(new URL('../data/parties.yaml', import.meta.url), 'utf8');

test('sources: fields, types, unique ids and domains', () => {
  const str = ['id', 'name', 'domain', 'country', 'lang', 'feed_url', 'via', 'source_url', 'checked_on', 'status', 'group'];
  const nullable = ['region', 'owner', 'owner_type', 'tie', 'paywall', 'kind', 'funding', 'mbfc_lean', 'mbfc_fact', 'mbfc_date', 'mbfc_url', 'note'];
  for (const s of sources) {
    for (const k of str) assert.equal(typeof s[k], 'string', `${s.id}.${k}`);
    for (const k of nullable) assert.ok(k in s && (s[k] === null || typeof s[k] === 'string'), `${s.id}.${k}`);
    assert.ok(Array.isArray(s.flags), `${s.id}.flags`);
    assert.ok(s.jsn_member === null || typeof s.jsn_member === 'boolean', `${s.id}.jsn_member`);
    assert.ok(s.jsn_count === null || Number.isInteger(s.jsn_count), `${s.id}.jsn_count`);
    assert.match(s.feed_url, /^https?:\/\//); assert.match(s.source_url, /^https?:\/\//);
    assert.match(s.checked_on, /^\d{4}-\d\d-\d\d$/);
    assert.ok(['ok', 'dead'].includes(s.status), `${s.id}.status`);
    assert.ok(['rss', 'gnews'].includes(s.via), `${s.id}.via`);
    assert.match(s.lang, /^[a-z]{2}$/, `${s.id}.lang`);
    assert.ok(Object.keys(config.lean_map).includes(s.mbfc_lean) || s.mbfc_lean === null, `${s.id}.mbfc_lean`);
    if (s.mbfc_lean) assert.ok(s.mbfc_date && s.mbfc_url, `${s.id} MBFC needs date+url`);
  }
  for (const k of ['id', 'domain', 'feed_url']) assert.equal(new Set(sources.map((s) => s[k])).size, sources.length, `unique ${k}`);
});

test('sources: counts and special groups', () => {
  const n = (g) => sources.filter((s) => s.group === g).length;
  assert.ok(n('global') >= 300);
  assert.ok(sources.filter((s) => s.group === 'fi' && s.status === 'ok').length >= 17);
  assert.ok(n('independent') >= 10);
  const flagged = sources.filter((s) => s.flags.includes('flagged'));
  assert.ok(flagged.some((s) => s.id === 'mvlehti'));
  const yle = sources.find((s) => s.id === 'yle');
  assert.equal(yle.owner_type, 'public'); assert.equal(yle.funding, 'Yle-vero');
  assert.ok(sources.find((s) => s.id === 'reuters').via === 'gnews');
  const g = sources.filter((x) => x.group === 'global'); assert.ok(g.filter((s) => s.mbfc_lean).length / g.length >= 0.5, 'global MBFC coverage');
});

test('config: required keys', () => {
  const need = { rank: ['half_life_h', 'article_weight', 'top_min_outlets'], cluster: ['join_cos', 'merge_cos', 'twin_cos', 'guard_jaccard', 'dup_cos_same_source'],
    bars: ['min_rated'], sivuutetut: ['A', 'B', 'D', 'active_group_min_articles', 'window_h'], clickbait: ['threshold', 'weights'],
    retention: ['emb_days', 'bodies_days', 'stories_days'], llm: ['calls_per_run', 'calls_per_day'], voice: ['buckets', 'gate'] };
  for (const [k, subs] of Object.entries(need)) for (const sk of subs) assert.ok(sk in config[k], `${k}.${sk}`);
  assert.equal(config.voice_visible, false);
  assert.equal(Object.keys(config.clickbait.weights).length, 10);
  assert.equal(config.rank.top_min_outlets, 3);
});

test('parties.yaml: positions in -2..+2, gov flags, name variants', () => {
  const rows = [...yaml.matchAll(/^\s*- \{code: (\w+),.*?\bp: (-?[\d.]+),\s*gov: (true|false),\s*variants: \[([^\]]+)\]/gm)];
  assert.ok(rows.length >= 8, 'parsed parties');
  for (const [, code, p, , variants] of rows) { assert.ok(Math.abs(+p) <= 2, `${code} p`); assert.ok(variants.trim().length > 0, `${code} variants`); }
  assert.deepEqual(rows.filter((r) => r[3] === 'true').map((r) => r[1]).sort(), ['kd', 'kok', 'ps', 'r']);
});
