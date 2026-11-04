// Hotness ("Kuumat") + most read ("Luetuimmat"). ONE explainable score, weights in hot_weights.json:
//   hot = 100 * sum(w_i * x_i) / sum(w_i) * 0.5^(age_h / half_life_h),  x_i in 0..1, a signal without data is 0.
// Signals: sources (independent owners), reliability (outlet ratings), talk (Reddit/HN/Mastodon counts), reads, clicks (story->outlet), paths (story->story), dwell, feedback.
// Usage events (v_events) exist only for readers who allowed consent.stats; they are aggregated here, never exposed to anon. Runs after rank; failures only set hot_error.
import { readFileSync } from 'node:fs';
import { discuss } from './discuss.mjs';
import { patchRows } from './cluster.mjs';
const rd = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const CFG = rd('../data/config.json'), WEIGHTS = rd('./hot_weights.json');
const H = 3600e3;

export const sat = (v, cap) => (v > 0 && cap > 0 ? Math.min(1, Math.log1p(v) / Math.log1p(cap)) : 0); // saturating log: 1 reader counts a lot, the 100th little
const median = (xs) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// One outlet -> 0..1 from existing ratings: MBFC factual label, flagged, Finnish press-council decisions (jsn_count).
export function outletReliability(src, R = WEIGHTS.reliability) {
  if ((src.flags || []).includes('flagged')) return R.flagged;
  const base = R.fact[src.mbfc_fact] ?? R.unknown;
  return Math.max(0, base - Math.min(R.jsn_max, (src.jsn_count || 0) * R.jsn_penalty));
}

// events: [{at,cid,k,s,s2,src,ms,v}] -> per-story usage in the window. One vote per client: distinct clients for reads/clicks, one dwell and one answer per client.
export function aggEvents(events, now = Date.now(), W = WEIGHTS) {
  const from = now - W.usage_window_h * H, g = new Map(), get = (s) => { let o = g.get(s); if (!o) g.set(s, o = { rd: new Set(), ck: new Set(), pa: new Set(), dw: new Map(), fb: new Map() }); return o; };
  for (const e of events) {
    const t = Date.parse(e.at); if (!(t >= from && t <= now + 6e4) || e.s == null) continue;
    const o = get(+e.s);
    if (e.k === 'open') o.rd.add(e.cid);
    else if (e.k === 'click') { o.rd.add(e.cid); o.ck.add(e.cid); }
    else if (e.k === 'path' && e.s2 != null) get(+e.s2).pa.add(`${e.cid}>${e.s}`); // inbound transition into s2
    else if (e.k === 'dwell' && e.ms >= W.dwell_min_s * 1000) o.dw.set(e.cid, Math.max(o.dw.get(e.cid) || 0, e.ms));
    else if (e.k === 'fb' && (e.v === 1 || e.v === -1)) o.fb.set(e.cid, e.v); // latest answer per client (events arrive in time order)
  }
  const out = new Map();
  for (const [s, o] of g) { const f = [...o.fb.values()]; out.set(s, { reads: o.rd.size, clicks: o.ck.size, paths: o.pa.size, dwell_n: o.dw.size, dwell_s: median([...o.dw.values()]) / 1000, up: f.filter((v) => v > 0).length, down: f.filter((v) => v < 0).length }); }
  return out;
}

const WHY_KEY = { sources: 'src', talk: 'talk', reads: 'reads', clicks: 'click', paths: 'path', dwell: 'dwell', feedback: 'fb', reliability: 'rel' };
// st: {last_at, outlets, owners, reliability, talk, reads, clicks, paths, dwell_n, dwell_s, up, down} -> {hot, parts, why}
export function scoreStory(st, now = Date.now(), W = WEIGHTS) {
  const x = {
    sources: sat(st.owners, W.caps.sources), reliability: st.outlets ? st.reliability : 0, talk: sat(st.talk, W.caps.talk), reads: sat(st.reads, W.caps.reads), clicks: sat(st.clicks, W.caps.clicks), paths: sat(st.paths, W.caps.paths),
    dwell: st.dwell_n >= W.min_samples.dwell ? Math.min(1, st.dwell_s / W.caps.dwell_s) : 0,
    feedback: st.up + st.down >= W.min_samples.feedback ? Math.max(0, (st.up - st.down) / (st.up + st.down)) : 0,
  };
  const wsum = Object.values(W.weights).reduce((a, b) => a + b, 0), age = Math.max(0, now - Date.parse(st.last_at)) / H, decay = 0.5 ** (age / W.half_life_h);
  const raw = { sources: st.outlets, talk: st.talk, reads: st.reads, clicks: st.clicks, paths: st.paths, dwell: Math.round(st.dwell_s), feedback: st.up, reliability: Math.round(st.reliability * 100) };
  const parts = {}; let sumC = 0;
  for (const k of Object.keys(W.weights)) { const c = 100 * W.weights[k] * (x[k] || 0) / wsum * decay; parts[k] = { x: +(x[k] || 0).toFixed(3), c: +c.toFixed(2), n: raw[k] }; sumC += c; }
  const why = Object.keys(parts).filter((k) => parts[k].x >= W.why_min_x && (k !== 'reliability' || parts[k].x >= 0.7)).sort((a, b) => parts[b].c - parts[a].c).slice(0, W.why_top).map((k) => [WHY_KEY[k], parts[k].n]);
  return { hot: +Math.min(100, sumC).toFixed(2), parts, why };
}

export async function run(db, ctx = {}, { now = Date.now(), W = WEIGHTS, discussOpts = {} } = {}) {
  const dry = process.env.V_DRY === '1', cut = now - W.window_h * H, iso = (ms) => new Date(ms).toISOString();
  const srcs = new Map((await db.select('sources', 'select=id,owner,flags,mbfc_fact,jsn_count')).map((s) => [s.id, s]));
  const flagged = (s) => CFG.flagged.in_rank === false && (s.flags || []).includes('flagged');
  const live = (await db.select('stories', dry ? '' : `last_at=gte.${iso(cut)}&select=id,title,title_en,last_at,n_articles,score,hot,reads,talk&limit=5000`)).filter((s) => Date.parse(s.last_at) >= cut && s.n_articles > 0);
  const by = new Map(live.map((s) => [s.id, new Set()])), ids = [...by.keys()];
  for (let i = 0; i < ids.length; i += 150)
    for (const a of await db.select('articles', `story_id=in.(${ids.slice(i, i + 150).join(',')})&select=story_id,source_id`)) { const s = srcs.get(a.source_id); if (s && !flagged(s)) by.get(a.story_id)?.add(a.source_id); }
  const cand = live.filter((s) => by.get(s.id).size >= W.min_outlets);
  const usage = aggEvents(await db.select('events', dry ? '' : `at=gte.${iso(now - W.usage_window_h * H)}&select=at,cid,k,s,s2,src,ms,v&limit=${W.events.max_rows}`), now, W);
  let d = { byId: new Map(), requests: 0, errors: 0, cached: 0, skipped: 0 };
  try { d = await discuss([...cand].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), W.discussion, { now, ...discussOpts }); } catch { d.errors++; }
  const z = { reads: 0, clicks: 0, paths: 0, dwell_n: 0, dwell_s: 0, up: 0, down: 0 }, rows = [];
  for (const s of cand) {
    const set = [...by.get(s.id)].map((id) => srcs.get(id)), owners = new Set(set.map((x) => x.owner || '?' + x.id)).size;
    const talk = d.byId.get(s.id)?.talk ?? s.talk ?? 0; // not fetched this run (budget): keep the previous value instead of flapping to 0
    const r = scoreStory({ last_at: s.last_at, outlets: set.length, owners, reliability: set.reduce((a, x) => a + outletReliability(x, W.reliability), 0) / set.length, talk, ...z, ...(usage.get(s.id) || {}) }, now, W);
    const u = usage.get(s.id)?.reads ?? 0;
    rows.push({ id: s.id, hot: r.hot, reads: u, talk, hot_why: r.why });
  }
  const old = new Map(live.map((s) => [s.id, s]));
  const changed = rows.filter((r) => { const o = old.get(r.id); return Math.abs((o.hot ?? 0) - r.hot) > 0.05 || (o.reads ?? 0) !== r.reads || (o.talk ?? 0) !== r.talk; });
  const out = new Set(cand.map((s) => s.id));
  const stale = live.filter((s) => !out.has(s.id) && ((s.hot ?? 0) > 0 || (s.reads ?? 0) > 0)).map((s) => ({ id: s.id, hot: 0, reads: 0, hot_why: null }));
  const old2 = (await db.select('stories', 'hot=gt.0&select=id,last_at,n_articles,hot')).filter((s) => (s.hot ?? 0) > 0 && (Date.parse(s.last_at) < cut || !(s.n_articles > 0)) && !old.has(s.id)).map((s) => ({ id: s.id, hot: 0, reads: 0, hot_why: null }));
  const all = [...changed, ...stale, ...old2];
  if (dry) await patchRows(db, 'stories', all);
  else for (let i = 0; i < all.length; i += 200) await db.rpc('v_hot_update', { rows: all.slice(i, i + 200) });
  let pruned = 0; try { const p = await db.rpc('v_events_prune', { days: W.events.retention_days }); pruned = typeof p === 'number' ? p : 0; } catch {}
  const top = [...rows].sort((a, b) => b.hot - a.hot).filter((r) => r.hot >= W.hot_min).length;
  return { scored: rows.length, hot: top, patched: all.length, talk_requests: d.requests, talk_cached: d.cached, talk_errors: d.errors, usage_stories: usage.size, events_pruned: pruned };
}
