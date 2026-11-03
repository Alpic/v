// Crowd scoring (method.md 04_crowd): A = sharing alignment (weighted mean, bootstrap CI, confidence), B = perception (two-model agreement,
// caps, spike flag), gates. Pure functions first; main() reads/writes via db.mjs. Nothing is visible until gate G-A1 passes.
import { createHash } from 'node:crypto';
import { bucket } from '../lean.mjs';
export const METHOD = 1;
const rng = (seed) => { let a = parseInt(createHash('sha256').update(seed).digest('hex').slice(0, 8), 16); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const wmean = (xs) => { const W = xs.reduce((a, x) => a + x.w, 0); return W ? xs.reduce((a, x) => a + x.w * x.p, 0) / W : NaN; };

// shares of ONE outlet: [{actor, p, url_hash, anchor?}] -> one vote per sharer, w = 1/sqrt(min(k,4)) (k = distinct URLs).
export function sharers(shares) {
  const m = new Map();
  for (const s of shares) { const e = m.get(s.actor) || { actor: s.actor, p: s.p, urls: new Set(), anchor: s.anchor !== false }; e.urls.add(s.url_hash); m.set(s.actor, e); }
  return [...m.values()].map((e) => ({ actor: e.actor, p: e.p, anchor: e.anchor, w: 1 / Math.sqrt(Math.min(e.urls.size, 4)) }));
}
export function confidence(n, nAnchor, lo, hi) {
  const w = hi - lo;
  if (n < 30 || nAnchor < 5) return 'none';
  if (n >= 300 && w <= 0.4 && bucket(lo) === bucket(hi)) return 'high';
  if (n >= 100 && w <= 0.6) return 'medium';
  return 'low';
}
export function scoreA(shares, seed, draws = 1000) {
  const S = sharers(shares), n = S.length;
  if (!n) return { n_placed: 0, n_anchor: 0, a: null, ci_lo: null, ci_hi: null, sd: null, conf: 'none' };
  const a = wmean(S), r = rng(seed), bs = [];
  for (let d = 0; d < draws; d++) bs.push(wmean(Array.from({ length: n }, () => S[Math.floor(r() * n)])));
  const ci_lo = pct(bs, 0.025), ci_hi = pct(bs, 0.975), nAnchor = S.filter((x) => x.anchor).length;
  const sd = Math.sqrt(S.reduce((t, x) => t + (x.p - a) ** 2, 0) / n);
  return { n_placed: n, n_anchor: nAnchor, a, ci_lo, ci_hi, sd, conf: confidence(n, nAnchor, ci_lo, ci_hi) };
}
// G-A1 known order: Demokraatti and Kansan Uutiset must sit left of Verkkouutiset and Suomen Uutiset. value = smallest right-left gap.
export function gateA1(A, left = ['demokraatti', 'kansanuutiset'], right = ['verkkouutiset', 'suomenuutiset']) {
  const ids = [...left, ...right], missing = ids.filter((i) => A[i]?.a == null || A[i].conf === 'none');
  const gaps = left.flatMap((l) => right.map((r) => (A[r]?.a ?? NaN) - (A[l]?.a ?? NaN))).filter((g) => !Number.isNaN(g));
  const value = gaps.length ? Math.min(...gaps) : null;
  return { gate: 'G-A1', value, passed: !missing.length && value > 0, notes: missing.length ? `insufficient data: ${missing.join(',')}` : value > 0 ? 'order holds' : 'order violated' };
}

// ---- B ----
export const wilson = (k, n, z = 1.96) => { if (!n) return [0, 0]; const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - h) / d, (c + h) / d]; };
// Brigade cap: per (actor, outlet) at most 1 counted mention per 14 days and 3 per window.
export function capMentions(ms, days = 14, max = 3) {
  const last = new Map(), cnt = new Map(), out = [];
  for (const m of [...ms].sort((a, b) => a.posted_at.localeCompare(b.posted_at))) {
    const k = `${m.actor_id}|${m.source_id}`, t = Date.parse(m.posted_at);
    if ((cnt.get(k) || 0) >= max || t - (last.get(k) ?? -Infinity) < days * 864e5) continue;
    last.set(k, t); cnt.set(k, (cnt.get(k) || 0) + 1); out.push(m);
  }
  return out;
}
// Weights per community: min(1, sqrt(n_c/20)) / n_c per mention; then no community may exceed `cap` of total weight.
export function communityWeights(ms, cap = 0.25) {
  const n = {}; for (const m of ms) n[m.community_id] = (n[m.community_id] || 0) + 1;
  const W = Object.fromEntries(Object.entries(n).map(([c, k]) => [c, Math.min(1, Math.sqrt(k / 20)) * k]));
  const comms = Object.keys(W);
  if (comms.length * cap >= 1) for (let it = 0; it < 20; it++) {
    const tot = comms.reduce((a, c) => a + W[c], 0); let moved = false;
    for (const c of comms) if (W[c] > cap * tot + 1e-9) { const rest = tot - W[c]; W[c] = (cap * rest) / (1 - cap); moved = true; break; }
    if (!moved) break;
  }
  return ms.map((m) => W[m.community_id] / n[m.community_id]);
}
// Robust spike days: z = 0.6745 (x - median) / MAD > 4 (MAD floored at 1 so tiny counts don't flag).
export function spikeDays(byDay, z = 4) {
  const xs = Object.values(byDay); if (xs.length < 5) return [];
  const med = pct(xs, 0.5), mad = Math.max(1, pct(xs.map((x) => Math.abs(x - med)), 0.5));
  return Object.entries(byDay).filter(([, x]) => (0.6745 * (x - med)) / mad > z).map(([d]) => d);
}
export function talk(ms, minAuthors = 40, minComm = 3) {
  const capped = capMentions(ms), w = communityWeights(capped), lab = capped.filter((m) => m.stance);
  const agreed = lab.length, dist = {};
  for (const key of ['stance', 'lean_claim', 'quality_claim']) {
    const c = {}; lab.forEach((m) => { c[m[key]] = (c[m[key]] || 0) + 1; });
    dist[key] = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { n: v, share: v / agreed, ci: wilson(v, agreed) }]));
  }
  const byDay = {}; for (const m of ms) { const d = m.posted_at.slice(0, 10); byDay[d] = (byDay[d] || 0) + 1; }
  const authors = new Set(capped.map((m) => m.actor_id)).size, comm = new Set(capped.map((m) => m.community_id)).size;
  return { n_authors: authors, n_comm: comm, dist, spike_days: spikeDays(byDay), weight_total: w.reduce((a, b) => a + b, 0), enough: authors >= minAuthors && comm >= minComm };
}
const SYS = 'Classify one Finnish social-media post about the news outlet "OUTLET". Answer ONLY JSON: {"stance":"positive|negative|neutral","lean_claim":"left|right|none","quality_claim":"reliable|unreliable|none","evidence":"exact substring of the post"}. lean_claim = post says the outlet leans left/right; quality_claim = post says outlet is reliable/unreliable. Use none if not claimed.';
const ok = (j, t) => j && ['positive', 'negative', 'neutral'].includes(j.stance) && ['left', 'right', 'none'].includes(j.lean_claim) && ['reliable', 'unreliable', 'none'].includes(j.quality_claim)
  && typeof j.evidence === 'string' && j.evidence.length > 1 && t.toLowerCase().includes(j.evidence.toLowerCase());
// Two different models must agree on all three labels and the evidence must be in the post. -> {stance,..,models} | {flags:[..]}
export async function classify(llm, text, outlet) {
  const prompt = `${SYS.replace('OUTLET', outlet)}\n\nPOST: ${text}`;
  const a = await llm.ask(prompt, { json: true, maxTokens: 800 }); if (!a) return { flags: ['llm_unavailable'] };
  const b = await llm.ask(prompt, { json: true, maxTokens: 800, exclude: a.model }); if (!b) return { flags: ['single_model'] };
  if (!ok(a.json, text) || !ok(b.json, text)) return { flags: ['bad_json_or_evidence'], models: [a.model, b.model] };
  const same = ['stance', 'lean_claim', 'quality_claim'].every((k) => a.json[k] === b.json[k]);
  return same ? { stance: a.json.stance, lean_claim: a.json.lean_claim, quality_claim: a.json.quality_claim, models: [a.model, b.model] } : { flags: ['disagree'], models: [a.model, b.model], agree: false };
}

// ---- orchestration ----
export async function scoreAll({ shares, mentions, now = new Date() }) {
  const end = now.toISOString().slice(0, 10), from = new Date(now - 90 * 864e5).toISOString().slice(0, 10);
  const win = (r, k) => r[k].slice(0, 10) >= from;
  const bySrc = (rows) => rows.reduce((m, r) => ((m[r.source_id] ||= []).push(r), m), {});
  const S = bySrc(shares.filter((s) => win(s, 'shared_at'))), M = bySrc(mentions.filter((s) => win(s, 'posted_at')));
  const A = Object.fromEntries(Object.entries(S).map(([id, rows]) => [id, scoreA(rows, `${id}|${end}|${METHOD}`)]));
  const gate = gateA1(A), pass = gate.passed;
  const audience = Object.entries(A).map(([id, a]) => ({ id: `${id}|${end}|${METHOD}`, source_id: id, window_end: end, method_version: METHOD, n_placed: a.n_placed, n_anchor: a.n_anchor, a: a.a, ci_lo: a.ci_lo, ci_hi: a.ci_hi, sd: a.sd, placed_share: null, conf: a.conf, flags: ['anchors_only'], visible: pass && ['medium', 'high'].includes(a.conf) }));
  const talkRows = Object.entries(M).map(([id, rows]) => { const t = talk(rows); return { id: `${id}|${end}|${METHOD}`, source_id: id, window_end: end, method_version: METHOD, n_authors: t.n_authors, n_comm: t.n_comm, dist: t.dist, spike_days: t.spike_days, flags: t.spike_days.length ? ['spike'] : [], visible: pass && t.enough }; });
  return { audience, talk: talkRows, validation: [{ id: `G-A1|${end}`, ...gate, run_at: now.toISOString() }], A };
}
