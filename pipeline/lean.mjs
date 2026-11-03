// Weekly voice index (blueprint 2.3). T1 vectors -> T2 score S = sum(share x p). Pure functions + thin main.
import { readFileSync } from 'node:fs';
export const bucket = (s, cuts = [-1.2, -0.4, 0.4, 1.2]) => cuts.filter((c) => s >= c).length - 2;
// voice: {party: mentions} per article; each article's vector is normalised, then averaged (articles with no party skipped).
export function outletScore(voices, parties) {
  const p = Object.fromEntries(parties.map((x) => [x.code, x])), share = {}; let n = 0;
  for (const v of voices) {
    const tot = Object.entries(v || {}).reduce((a, [k, c]) => a + (p[k] ? c : 0), 0); if (!tot) continue;
    n++; for (const [k, c] of Object.entries(v)) if (p[k]) share[k] = (share[k] || 0) + c / tot;
  }
  for (const k in share) share[k] /= n || 1;
  const S = Object.entries(share).reduce((a, [k, s]) => a + s * p[k].p, 0);
  const gov = Object.entries(share).reduce((a, [k, s]) => a + (p[k].gov ? s : 0), 0);
  return { n, S: +S.toFixed(3), gov_share: +gov.toFixed(3), share };
}
// refs: buckets (-2..2) of other estimates: {tie, mbfc, t3, sanity}. Returns 'high'|'medium'|'low'|'none'.
export function confidence(n, b, refs = {}, c = {}) {
  const w = c.within_buckets ?? 1, near = (x) => x != null && Math.abs(b - x) <= w;
  const others = [refs.tie, refs.mbfc, refs.t3].filter((x) => x != null);
  if (n >= (c.high_n ?? 200) && near(refs.t3 ?? refs.mbfc ?? refs.tie) && near(refs.sanity)) return 'high';
  if (n >= (c.medium_n ?? 100) && others.some(near)) return 'medium';
  return n >= (c.low_n ?? 30) ? 'low' : 'none';
}
// T3 (optional, default off): share of sampled articles judged "criticises government" -> bucket (proposal: more critical = further left of a right-leaning cabinet).
export const t3Bucket = (yes, total) => (total ? Math.max(-2, Math.min(2, Math.round((0.5 - yes / total) * 4))) : null);
export function computeLean(rows, parties, config, refsBySource = {}) {
  const v = config.voice || {}, by = {};
  for (const r of rows) (by[r.source_id] ||= []).push(r.voice);
  return Object.entries(by).map(([source_id, voices]) => {
    const o = outletScore(voices, parties), b = bucket(o.S, v.buckets), refs = refsBySource[source_id] || {};
    const flag = refs.tie != null && Math.abs(b - refs.tie) > 1;
    return { source_id, v: o.S, bucket: b, gov_share: o.gov_share, n: o.n, conf: confidence(o.n, b, refs, v.conf), differs_tie: flag, method_ver: config.version ?? 1, source: 'voice', visible: !!config.voice_visible, computed_at: new Date().toISOString() };
  });
}
export function loadParties(path) { // flow-style rows of parties.yaml, no YAML dependency
  return readFileSync(path, 'utf8').split('\n').filter((l) => /^\s+- \{code:/.test(l)).map((l) => ({ code: l.match(/code: (\w+)/)[1], p: +l.match(/\bp: (-?[\d.]+)/)[1], gov: /gov: true/.test(l) }));
}
if (import.meta.url === `file://${process.argv[1]}`) { // node pipeline/lean.mjs  (assumes db.mjs: select(table, postgrest-query) -> rows, upsert(table, rows, onConflict))
  const root = new URL('..', import.meta.url), db = await import('./db.mjs');
  const config = JSON.parse(readFileSync(new URL('data/config.json', root))), parties = loadParties(new URL('data/parties.yaml', root));
  const since = new Date(Date.now() - config.voice.window_days * 864e5).toISOString();
  const rows = (await db.select('articles', `select=source_id,voice&voice=not.is.null&published_at=gte.${since}`)) || [];
  const srcs = (await db.select('sources', 'select=id,mbfc_lean,tie')) || [], lm = config.lean_map;
  const refs = Object.fromEntries(srcs.map((s) => [s.id, { mbfc: lm[s.mbfc_lean] ?? null, tie: typeof lm[s.tie] === 'number' ? lm[s.tie] : null }]));
  const out = computeLean(rows, parties, config, refs).map(({ bucket: _b, gov_share: _g, differs_tie: _d, ...r }) => r);
  await db.upsert('outlet_lean', out, 'source_id');
  console.log(out.length, 'outlets, visible =', config.voice_visible);
}
