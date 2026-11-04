// Kuumat/Luetuimmat: hotness scoring, weights config, discussion fetchers (mock fetch), consent gating of usage events, refresh that never reshuffles, noindex, migration guards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { sat, outletReliability, aggEvents, scoreStory, run } from '../pipeline/hot.mjs';
import { keywords, discuss, fetchX, ADAPTERS } from '../pipeline/discuss.mjs';
import { createTracker, readFb, canAsk, answerFb } from '../web/track.js';
import { initState, onFetched, apply, pendingNew, newCount, shouldPoll, needsReload } from '../web/refresh.js';
import { t, setLang } from '../web/i18n.js';

const rd = (f) => readFileSync(new URL(f, import.meta.url), 'utf8'), W = JSON.parse(rd('../pipeline/hot_weights.json'));
const NOW = Date.parse('2026-11-04T12:00:00Z'), H = 3600e3, iso = (ms) => new Date(ms).toISOString();
const base = { last_at: iso(NOW), outlets: 10, owners: 8, reliability: 0.7, talk: 0, reads: 0, clicks: 0, paths: 0, dwell_n: 0, dwell_s: 0, up: 0, down: 0 };

// ---- scoring ----
test('hot: saturating log is monotone, 0 for no data, capped at 1', () => {
  assert.equal(sat(0, 10), 0); assert.equal(sat(-3, 10), 0);
  assert.ok(sat(1, 10) > 0 && sat(5, 10) > sat(1, 10) && sat(10, 10) === 1 && sat(500, 10) === 1);
});
test('hot: score is the documented weighted sum x recency, normalised to 0..100', () => {
  const full = scoreStory({ ...base, outlets: 99, owners: 99, reliability: 1, talk: 9999, reads: 99, clicks: 99, paths: 99, dwell_n: 9, dwell_s: 999, up: 9, down: 0 }, NOW);
  assert.equal(full.hot, 100); // every signal saturated, age 0
  const wsum = Object.values(W.weights).reduce((a, b) => a + b, 0), s = scoreStory(base, NOW);
  const manual = 100 * (W.weights.sources * sat(8, W.caps.sources) + W.weights.reliability * 0.7) / wsum;
  assert.ok(Math.abs(s.hot - manual) < 0.01, `${s.hot} vs ${manual}`);
  assert.deepEqual(Object.keys(s.parts).sort(), Object.keys(W.weights).sort());
  assert.ok(Math.abs(Object.values(s.parts).reduce((a, p) => a + p.c, 0) - s.hot) < 0.1, 'parts add up to the score');
});
test('hot: recency halves the score every half_life_h; no data is 0, not an average', () => {
  const a = scoreStory(base, NOW).hot, b = scoreStory({ ...base, last_at: iso(NOW - W.half_life_h * H) }, NOW).hot;
  assert.ok(Math.abs(b - a / 2) < 0.02);
  const none = scoreStory({ ...base, outlets: 0, owners: 0, reliability: 0 }, NOW);
  assert.equal(none.hot, 0); assert.deepEqual(none.why, []);
});
test('hot: dwell and feedback need min samples; discussion and reads raise the score', () => {
  assert.equal(scoreStory({ ...base, dwell_n: W.min_samples.dwell - 1, dwell_s: 90 }, NOW).parts.dwell.x, 0);
  assert.ok(scoreStory({ ...base, dwell_n: W.min_samples.dwell, dwell_s: 45 }, NOW).parts.dwell.x > 0.4);
  assert.equal(scoreStory({ ...base, up: 1, down: 1 }, NOW).parts.feedback.x, 0);
  assert.equal(scoreStory({ ...base, up: 3, down: 0 }, NOW).parts.feedback.x, 1);
  assert.equal(scoreStory({ ...base, up: 0, down: 4 }, NOW).parts.feedback.x, 0, 'negative feedback never pushes below zero');
  const a = scoreStory(base, NOW).hot;
  assert.ok(scoreStory({ ...base, talk: 240 }, NOW).hot > a); assert.ok(scoreStory({ ...base, reads: 8 }, NOW).hot > a);
});
test('hot: explanation = top contributors above the notable level, max why_top, keyed for i18n', () => {
  const s = scoreStory({ ...base, outlets: 18, owners: 14, talk: 240, reads: 9, clicks: 1 }, NOW);
  assert.ok(s.why.length <= W.why_top && s.why.length >= 2);
  assert.equal(s.why[0][0], 'src'); assert.equal(s.why[0][1], 18); // raw count, not the normalised value
  assert.ok(s.why.some(([k, n]) => k === 'talk' && n === 240));
  setLang('fi');
  for (const [k] of s.why) assert.notEqual(t('why_' + k, 3), 'why_' + k, `i18n ${k}`);
  assert.equal(t('why_talk', 240), '240 keskustelua'); assert.equal(t('why_src', 18), '18 lähdettä');
});
test('hot: reliability from existing ratings (MBFC fact, flagged, JSN decisions)', () => {
  assert.equal(outletReliability({ mbfc_fact: 'Very High' }), 1);
  assert.equal(outletReliability({ mbfc_fact: 'Mixed' }), 0.45);
  assert.equal(outletReliability({}), W.reliability.unknown);
  assert.equal(outletReliability({ flags: ['flagged'], mbfc_fact: 'High' }), W.reliability.flagged);
  assert.ok(outletReliability({ mbfc_fact: 'High', jsn_count: 2 }) < 0.9 && outletReliability({ mbfc_fact: 'High', jsn_count: 99 }) >= 0.9 - W.reliability.jsn_max - 1e-9);
  assert.ok(Object.values(W.reliability.fact).every((v) => v >= 0 && v <= 1));
});
test('weights config: positive, every weight has a signal, web method.json mirrors it', () => {
  const m = JSON.parse(rd('../web/method.json')).hot, c = JSON.parse(rd('../data/config.json')).hot;
  assert.ok(Object.values(W.weights).every((w) => w > 0));
  assert.deepEqual(m.weights, W.weights); assert.deepEqual(c.weights, W.weights);
  assert.equal(m.half_life_h, W.half_life_h); assert.equal(m.hot_min, W.hot_min);
  for (const k of ['sources', 'reads', 'clicks', 'paths', 'talk']) assert.ok(W.caps[k] > 0, k);
  assert.equal(W.discussion.x.enabled, false, 'X/Twitter stays off (paid API)');
});

// ---- usage aggregation ----
test('aggEvents: one vote per client, window, dwell minimum, latest feedback, inbound paths', () => {
  const e = (o) => ({ at: iso(NOW - H), cid: 'c1', s: 1, ...o });
  const a = aggEvents([e({ k: 'open' }), e({ k: 'open' }), e({ k: 'open', cid: 'c2' }), e({ k: 'click', cid: 'c3', src: 'yle' }), e({ k: 'open', at: iso(NOW - 99 * H), cid: 'c9' }),
    e({ k: 'dwell', ms: 40000 }), e({ k: 'dwell', ms: 90000, cid: 'c2' }), e({ k: 'dwell', ms: 1000, cid: 'c3' }),
    e({ k: 'fb', v: 1 }), e({ k: 'fb', v: -1 }), e({ k: 'fb', v: 1, cid: 'c2' }), e({ k: 'path', s: 1, s2: 2 }), e({ k: 'path', s: 1, s2: 2 }), e({ k: 'path', s: 3, s2: 2, cid: 'c2' })], NOW).get(1);
  assert.equal(a.reads, 3); assert.equal(a.clicks, 1); assert.equal(a.dwell_n, 2); assert.equal(a.dwell_s, 65);
  assert.equal(a.up, 1); assert.equal(a.down, 1);
  assert.equal(aggEvents([e({ k: 'path', s: 1, s2: 2 }), e({ k: 'path', s: 1, s2: 2 }), e({ k: 'path', s: 3, s2: 2, cid: 'c2' })], NOW).get(2).paths, 2);
});

// ---- discussion fetchers ----
const json = (o, ok = true) => ({ ok, status: ok ? 200 : 500, headers: new Headers(), body: null, arrayBuffer: async () => Buffer.from(JSON.stringify(o)) });
const mock = (log, fail = []) => async (url) => {
  log.push(url);
  const host = new URL(url).host; if (fail.includes(host)) throw new Error('down');
  if (host === 'www.reddit.com') return { ok: true, status: 200, headers: new Headers(), body: null, arrayBuffer: async () => Buffer.from(`<feed><entry><title>a</title><updated>${iso(NOW - 3600e3)}</updated></entry><entry><updated>${iso(NOW - 99 * 3600e3)}</updated></entry></feed>`) };
  if (host === 'api.bsky.app') return json({ posts: [{ replyCount: 4, quoteCount: 1 }, { replyCount: 0 }] });
  if (host === 'hn.algolia.com') return json({ nbHits: 3, hits: [{ num_comments: 10 }, { num_comments: 5 }] });
  return json({ statuses: [{ created_at: iso(NOW - H), replies_count: 2 }] });
};
const cfg = { ...W.discussion, delay_ms: 0 }, tmp = () => mkdtempSync(tmpdir() + '/hot-') + '/c.json', nosleep = async () => {};
const sts = [{ id: 1, title: 'EU and China resume talks on electric-vehicle tariffs' }, { id: 2, title: 'Floods displace thousands in southern India' }, { id: 3, title: 'ok' }];

test('keywords: distinctive words, no stop words, empty when nothing searchable', () => {
  assert.equal(keywords('EU and China resume talks on electric-vehicle tariffs'), 'China electric-vehicle tariffs');
  assert.equal(keywords('is it ok'), ''); assert.ok(keywords('Hallitus sopi budjettiriihessä 1,4 miljardin euron säästöistä').split(' ').length <= 3);
});
test('discuss: counts posts+comments inside the window, per-source results, cached on the second run, X is a stub', async () => {
  const log = [], cachePath = tmp(), c = { ...cfg, max_requests: 60 };
  const r = await discuss(sts, c, { fetch: mock(log), now: NOW, cachePath, sleep: nosleep });
  assert.equal(r.requests, 6); assert.equal(r.skipped, 1); // 2 searchable stories x 3 sources (mastodon needs a token); "ok" is not searchable
  const p = r.byId.get(1).parts; assert.deepEqual(p.bluesky, { n: 2, c: 5 }); assert.deepEqual(p.reddit, { n: 1, c: 0 }); assert.deepEqual(p.hn, { n: 3, c: 15 }); assert.ok(!p.mastodon);
  assert.deepEqual(r.src.bluesky, { req: 2, ok: 2, hits: 2 }); assert.equal(r.src.hn.ok, 2);
  assert.equal(r.byId.get(1).talk, 7 + 1 + 18);
  const again = await discuss(sts, c, { fetch: mock(log), now: NOW + H, cachePath, sleep: nosleep });
  assert.equal(again.requests, 0); assert.equal(again.cached, 2); assert.equal(again.byId.get(1).talk, 26);
  assert.equal(await fetchX(), null); assert.ok(!('x' in ADAPTERS));
});
test('discuss: request budget is a hard cap and failures are never fatal', async () => {
  const log = [];
  const r = await discuss(sts, { ...cfg, max_requests: 4 }, { fetch: mock(log), now: NOW, cachePath: tmp(), sleep: nosleep });
  assert.equal(log.length, 4); assert.equal(r.requests, 4);
  assert.ok(log.slice(0, 2).every((u) => u.includes('api.bsky.app')), 'pass 1 spreads the first source over all stories before any second source');
  const bad = await discuss(sts, { ...cfg, max_requests: 60 }, { fetch: mock([], ['www.reddit.com', 'hn.algolia.com', 'api.bsky.app']), now: NOW, cachePath: tmp(), sleep: nosleep });
  assert.equal(bad.byId.size, 0); assert.equal(bad.errors, 6); assert.deepEqual(bad.src.hn, { req: 2, ok: 0, hits: 0 }); // all sources down: no data, no throw, nothing cached
  const brk = await discuss([...sts, { id: 4, title: 'Another distinctive Headline about Tesla' }], { ...cfg, breaker: 1 }, { fetch: mock([], ['api.bsky.app']), now: NOW, cachePath: tmp(), sleep: nosleep });
  assert.equal(brk.src.bluesky.req, 1); // dead source is switched off after the breaker threshold
  const part = await discuss(sts, cfg, { fetch: mock([], ['www.reddit.com']), now: NOW, cachePath: tmp(), sleep: nosleep });
  assert.equal(part.byId.get(1).talk, 7 + 18);
  process.env.V_MASTODON_TOKEN = 't'; const mas = await discuss(sts, cfg, { fetch: mock([]), now: NOW, cachePath: tmp(), sleep: nosleep }); delete process.env.V_MASTODON_TOKEN;
  assert.deepEqual(mas.byId.get(1).parts.mastodon, { n: 1, c: 2 });
  const off = await discuss(sts, { ...cfg, bluesky: { enabled: false }, reddit: { enabled: false }, hn: { enabled: false }, mastodon: { enabled: false } }, { fetch: mock([]), now: NOW, cachePath: tmp(), sleep: nosleep });
  assert.equal(off.requests, 0);
});

// ---- run(): stub db ----
test('run: writes hot/reads/talk/hot_why through ONE rpc, clears stale, keeps previous talk when not fetched', async () => {
  const rpcs = [], stories = [{ id: 1, title: 'EU China tariffs talks', title_en: null, last_at: iso(NOW - H), n_articles: 5, score: 9, hot: 0, reads: 0, talk: 0 }, { id: 2, title: 'Old news story here', last_at: iso(NOW - 2 * H), n_articles: 3, score: 5, hot: 50, reads: 2, talk: 77 }, { id: 3, title: 'Single source only', last_at: iso(NOW - H), n_articles: 1, score: 1, hot: 20, reads: 0, talk: 0 }];
  const db = {
    async select(table, q) {
      if (table === 'sources') return [{ id: 'a', owner: 'A', flags: [], mbfc_fact: 'High' }, { id: 'b', owner: 'B', flags: [], mbfc_fact: 'Mixed' }, { id: 'c', owner: 'C', flags: ['flagged'] }];
      if (table === 'stories') return q.startsWith('hot=gt.0') ? [{ id: 9, last_at: iso(NOW - 200 * H), n_articles: 4, hot: 33 }] : stories;
      if (table === 'articles') return [{ story_id: 1, source_id: 'a' }, { story_id: 1, source_id: 'b' }, { story_id: 1, source_id: 'c' }, { story_id: 2, source_id: 'a' }, { story_id: 2, source_id: 'b' }, { story_id: 3, source_id: 'a' }];
      if (table === 'events') return [{ at: iso(NOW - H), cid: 'x1', k: 'open', s: 1 }, { at: iso(NOW - H), cid: 'x2', k: 'open', s: 1 }];
      return [];
    },
    async rpc(name, args) { rpcs.push([name, args]); return name === 'v_events_prune' ? 4 : 1; },
    async upsert() { throw new Error('not in live mode'); },
  };
  const calls = []; const f = async (url) => { calls.push(url); return mock([])(url); };
  const out = await run(db, {}, { now: NOW, discussOpts: { fetch: f, cachePath: tmp(), sleep: nosleep } });
  const upd = rpcs.filter(([n]) => n === 'v_hot_update'); assert.equal(upd.length, 1);
  const rows = Object.fromEntries(upd[0][1].rows.map((r) => [r.id, r]));
  assert.equal(rows[1].reads, 2); assert.ok(rows[1].hot > 0 && rows[1].talk > 0); assert.ok(rows[1].hot_why.some(([k]) => k === 'reads'));
  assert.equal(rows[2].talk >= 0, true);
  assert.deepEqual(rows[3], { id: 3, hot: 0, reads: 0, hot_why: null }); // 1 outlet < min_outlets: cleared
  assert.deepEqual(rows[9], { id: 9, hot: 0, reads: 0, hot_why: null }); // outside the window: cleared
  assert.equal(out.events_pruned, 4); assert.equal(out.usage_stories, 1); assert.ok(calls.length <= W.discussion.max_requests);
  assert.ok(rpcs.every(([n]) => /^v_/.test(n)));
});
test('run: a story without a fresh discussion fetch keeps its previous talk value', async () => {
  const rpcs = [], db = {
    async select(table) { return table === 'sources' ? [{ id: 'a', owner: 'A', flags: [] }, { id: 'b', owner: 'B', flags: [] }] : table === 'stories' ? [{ id: 1, title: 'ok', last_at: iso(NOW - H), n_articles: 4, score: 3, hot: 0, reads: 0, talk: 120 }]
      : table === 'articles' ? [{ story_id: 1, source_id: 'a' }, { story_id: 1, source_id: 'b' }] : []; },
    async rpc(n, a) { rpcs.push([n, a]); return 0; } };
  await run(db, {}, { now: NOW, discussOpts: { fetch: mock([]), cachePath: tmp(), sleep: nosleep } }); // title "ok" is not searchable
  assert.equal(rpcs.find(([n]) => n === 'v_hot_update')[1].rows[0].talk, 120);
});

// ---- consent gating of usage events ----
const mem = () => { const m = new Map(); return { io: { get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v), del: (k) => m.delete(k) }, m }; };
test('consent: without consent.stats nothing is queued, stored or sent, and no client id is created', () => {
  const { io, m } = mem(), sent = []; let on = false, now = 1e6;
  const tr = createTracker({ io, send: (c, e) => sent.push([c, e]), enabled: () => on, now: () => now });
  tr.open(1); now += 9000; tr.click(1, 'yle'); tr.fb(1, 1); tr.open(2); tr.leave(); tr.flush();
  assert.equal(sent.length, 0); assert.equal(m.size, 0, 'no cid in storage');
});
test('consent: with consent events carry an anonymous 24-char id, open/click/dwell/path/fb, batches <= 20', () => {
  const { io, m } = mem(), sent = []; let now = 1e6; const tr = createTracker({ io, send: (c, e) => sent.push([c, e]), enabled: () => true, now: () => now });
  tr.open(1); now += 5000; tr.click(1, 'yle'); now += 5000; tr.open(2); now += 4000; tr.leave(); tr.fb(2, -1); tr.flush();
  const all = sent.flatMap(([, e]) => e), cid = sent[0][0];
  assert.match(cid, /^[a-z0-9]{24}$/); assert.equal(m.get('v.cid'), cid); assert.ok(sent.every(([c, e]) => c === cid && e.length <= 20));
  assert.deepEqual(all.map((e) => e.k), ['open', 'click', 'dwell', 'open', 'path', 'dwell', 'fb']);
  assert.deepEqual(all.find((e) => e.k === 'path'), { k: 'path', s: 1, s2: 2 }); assert.equal(all.filter((e) => e.k === 'dwell')[0].ms, 10000);
  assert.ok(all.every((e) => Object.keys(e).every((k) => ['k', 's', 's2', 'src', 'ms', 'v'].includes(k))), 'no other fields leave the device');
});
test('consent: dwell counts visible time only, short visits and stale paths are dropped; withdrawing forgets the id', () => {
  const { io, m } = mem(), sent = []; let now = 1e6, on = true; const tr = createTracker({ io, send: (c, e) => sent.push(...e), enabled: () => on, now: () => now });
  tr.open(1); now += 10000; tr.setVisible(false); now += 600000; tr.setVisible(true); now += 5000; tr.leave();
  tr.open(2); now += 1000; tr.leave(); now += 31 * 60e3; tr.open(3); tr.leave(); tr.flush();
  assert.equal(sent.find((e) => e.k === 'dwell').ms, 15000); assert.equal(sent.filter((e) => e.k === 'dwell').length, 1);
  assert.ok(!sent.some((e) => e.k === 'path' && e.s2 === 3), 'paths only within 30 minutes');
  tr.open(4); tr.off(); on = false; assert.equal(m.has('v.cid'), false); sent.length = 0; tr.flush(); assert.equal(sent.length, 0);
});
test('feedback prompt: at most once per 3 days, only with consent, dismiss counts, answers stored locally', () => {
  const D3 = 3 * 864e5; let fb = readFb(null);
  assert.equal(canAsk(fb, NOW, false, 1), false); assert.equal(canAsk(fb, NOW, true, 1), true);
  fb = answerFb(fb, 1, 0, NOW); // dismissed
  assert.equal(canAsk(fb, NOW + D3 - 1, true, 2), false); assert.equal(canAsk(fb, NOW + D3, true, 2), true);
  assert.deepEqual(fb.ans, {});
  fb = answerFb(fb, 2, -1, NOW + D3); assert.deepEqual(fb.ans, { 2: -1 }); assert.equal(canAsk(fb, NOW + D3 * 2, true, 2), false, 'same story not asked twice');
  assert.deepEqual(readFb(JSON.stringify(fb)), fb); assert.deepEqual(readFb('{bad'), { last: 0, ans: {} });
  let big = readFb(null); for (let i = 0; i < 300; i++) big = answerFb(big, i, 1, NOW); assert.equal(Object.keys(big.ans).length, 200);
});
test('app.js: tracker is enabled only by consent.stats; cid never created otherwise', () => {
  const a = rd('../web/app.js'); assert.match(a, /enabled: \(\) => !!consRef\.current\.stats/); assert.match(a, /if \(!stats\) trk\.current\.off\(\)/);
});

// ---- refresh never reshuffles ----
const feed = (ids, n = 3) => ({ stories: ids.map((id) => ({ id, n_articles: n, hot: 0, reads: 0 })) });
test('refresh: fetched data waits in pending; the shown list never changes until a safe moment', () => {
  let st = initState(null);
  st = onFetched(st, feed([1, 2, 3]), 10); assert.deepEqual(st.shown.stories.map((s) => s.id), [1, 2, 3]); assert.equal(st.pending, null);
  const shown = st.shown; st = onFetched(st, feed([9, 1, 2, 3]), 20);
  assert.equal(st.shown, shown, 'same object: the visible list did not move'); assert.equal(pendingNew(st), 1); assert.equal(st.checked, 20);
  st = onFetched(st, feed([8, 9, 1, 2, 3]), 30); assert.equal(st.shown, shown); assert.equal(pendingNew(st), 2, 'latest data replaces the earlier pending');
  st = apply(st); assert.notEqual(st.shown, shown); assert.deepEqual(st.shown.stories.map((s) => s.id), [8, 9, 1, 2, 3]); assert.equal(st.pending, null); assert.equal(pendingNew(st), 0);
});
test('refresh: identical data makes no pill; a changed article count waits silently', () => {
  let st = onFetched(initState(null), feed([1, 2]), 1);
  st = onFetched(st, feed([1, 2]), 2); assert.equal(st.pending, null); assert.equal(pendingNew(st), 0);
  st = onFetched(st, feed([1, 2], 4), 3); assert.ok(st.pending); assert.equal(pendingNew(st), 0, 'update without new stories: no pill, applied at the next safe moment');
  assert.equal(newCount(feed([1]), feed([1, 5, 6])), 2);
});
test('refresh: polls only while visible, at the interval, never concurrently; deploy change reloads', () => {
  const o = { now: 1000, last: 0, every: 180e3, visible: true };
  assert.equal(shouldPoll(o), false); assert.equal(shouldPoll({ ...o, now: 180e3 }), true);
  assert.equal(shouldPoll({ ...o, now: 999e3, visible: false }), false, 'paused while hidden'); assert.equal(shouldPoll({ ...o, now: 999e3, busy: true }), false);
  assert.equal(needsReload(1, 1), false); assert.equal(needsReload(1, 2), true); assert.equal(needsReload(null, 2), false); assert.equal(needsReload(1, undefined), false);
});
test('app.js: background refresh is wired to safe moments only', () => {
  const a = rd('../web/app.js');
  assert.match(a, /const f = \(\) => \{ safe\(\); setR\(parse\(\)\)/); // navigation applies
  assert.match(a, /hiddenAt\.current > 60000\) safe\(\)/); // tab return applies
  assert.equal([...a.matchAll(/setRaw\(/g)].filter((m) => !/setRaw\(j\)|setRaw\(rs\.current\.shown\)/.test(a.slice(m.index, m.index + 30))).length, 0, 'setRaw only from load/poll-without-pending/safe');
  assert.ok(JSON.parse(rd('../web/version.json')).web >= 1);
});

// ---- no SEO, internal tool ----
test('noindex: meta robots on every page, robots.txt disallows all, no sitemap/schema/OG', () => {
  for (const f of ['index.html', 'lataa.html']) assert.match(rd(`../web/${f}`), /<meta name="robots" content="noindex,nofollow">/);
  assert.match(rd('../web/robots.txt'), /^User-agent: \*\nDisallow: \/\n?$/);
  const h = rd('../web/index.html'); assert.doesNotMatch(h, /og:|application\/ld\+json|sitemap/i);
});

// ---- migration guards ----
test('migration v2_hot.sql: v_-prefixed only, anon insert-only via RPC, explicit column grants, no select *', () => {
  const sql = rd('../supabase/migrations/v2_hot.sql'), code = sql.replace(/--.*$/gm, '');
  for (const m of code.matchAll(/create (?:or replace )?(?:table|function|index)(?: if not exists)? (\w+)/g)) assert.match(m[1], /^v_/, m[1]);
  for (const m of code.matchAll(/alter table (\w+)/g)) assert.match(m[1], /^v_/);
  assert.match(code, /alter table v_events enable row level security/); assert.match(code, /revoke all on v_events from anon, authenticated/);
  assert.match(code, /grant select \(hot, reads, talk, hot_why\) on v_stories to anon/);
  assert.doesNotMatch(code, /grant[^;]*\bon v_events\b[^;]*\bto anon/i); assert.doesNotMatch(code, /create policy[^;]*v_events[^;]*to anon/i);
  assert.doesNotMatch(code, /grant select on v_stories|grant select on v_events|select \*/i);
  assert.match(code, /grant execute on function v_event\(text, jsonb\) to anon/);
  assert.doesNotMatch(code, /grant execute on function v_hot_update[^;]*to anon|grant execute on function v_events_prune[^;]*to anon/);
  assert.match(code, /rate limited/); assert.match(code, /security definer/); assert.match(code, /\{16,40\}/);
  assert.doesNotMatch(code, /\b(drop table|truncate|delete from v_(?!events))/i);
});
test('run.mjs hooks hot after rank', () => {
  const r = rd('../pipeline/run.mjs'); assert.ok(r.indexOf("hook('hot'") > r.indexOf("hook('rank'") && r.indexOf("hook('hot'") < r.indexOf("hook('summarize'"));
});
