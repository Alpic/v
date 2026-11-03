// Sweeps join_cos (same-language pairs) and twin_cos (cross-language pairs) on test/pairs.json, prints P/R/F1, picks best F1 with
// precision >= pairs_precision_min and writes ONLY cluster keys into data/config.json (node pipeline/tune.mjs [--no-write]).
import { readFileSync, writeFileSync } from 'node:fs';
import { embedTexts, textOf } from './embed.mjs';
import { CFG, pairSame } from './cluster.mjs';
const cfgPath = new URL('../data/config.json', import.meta.url), pairs = JSON.parse(readFileSync(new URL('../test/pairs.json', import.meta.url), 'utf8'));

export function metrics(rows) { // rows: [{pred, same}]
  const tp = rows.filter((r) => r.pred && r.same).length, fp = rows.filter((r) => r.pred && !r.same).length, fn = rows.filter((r) => !r.pred && r.same).length;
  const p = tp + fp ? tp / (tp + fp) : 1, r = tp + fn ? tp / (tp + fn) : 0;
  return { tp, fp, fn, p, r, f1: p + r ? (2 * p * r) / (p + r) : 0 };
}
const fmt = (m) => `P=${m.p.toFixed(3)} R=${m.r.toFixed(3)} F1=${m.f1.toFixed(3)} (tp${m.tp} fp${m.fp} fn${m.fn})`;

// best F1 with precision >= min; ties go to the higher (safer) threshold; falls back to the highest precision if none qualifies
export function pick(grid, min) {
  const ok = grid.filter((g) => g.m.p >= min), pool = ok.length ? ok : grid;
  return pool.reduce((b, g) => (ok.length ? g.m.f1 >= b.m.f1 : g.m.p > b.m.p || (g.m.p === b.m.p && g.m.f1 > b.m.f1)) ? g : b);
}

const t0 = Date.now(), texts = pairs.flatMap((p) => [textOf(p.a), textOf(p.b)]);
const vecs = await embedTexts(texts);
const P = pairs.map((p, i) => ({ ...p, A: { ...p.a, emb: vecs[2 * i] }, B: { ...p.b, emb: vecs[2 * i + 1] } }));
const sweep = (group, key) => {
  const grid = [];
  for (let t = 0.7; t <= 0.995; t += 0.005) {
    const cfg = { ...CFG, [key]: +t.toFixed(3) };
    grid.push({ t: +t.toFixed(3), m: metrics(group.map((p) => ({ same: p.same, pred: pairSame(p.A, p.B, cfg) }))) });
  }
  return grid;
};
const mono = P.filter((p) => !p.cross_lang), cross = P.filter((p) => p.cross_lang);
const gj = sweep(mono, 'join_cos'), gt = sweep(cross, 'twin_cos');
for (const [name, g] of [['join_cos (same-language)', gj], ['twin_cos (cross-language)', gt]]) {
  console.log(`\n${name}: ${g[0].m.tp + g[0].m.fn} positives`);
  for (const x of g.filter((_, i) => i % 2 === 0)) console.log(`  ${x.t.toFixed(2)} ${fmt(x.m)}`);
}
const bj = pick(gj, CFG.pairs_precision_min), bt = pick(gt, Math.min(1, CFG.pairs_precision_min + 0.05)); // twin test runs on every member pair of two stories, so ask for more margin
const cfgNew = { ...CFG, join_cos: bj.t, twin_cos: bt.t };
const all = metrics(P.map((p) => ({ same: p.same, pred: pairSame(p.A, p.B, cfgNew) })));
console.log(`\nchosen join_cos=${bj.t} ${fmt(bj.m)}\nchosen twin_cos=${bt.t} ${fmt(bt.m)}\nall 100 pairs at chosen: ${fmt(all)}`);
for (const p of P) if (pairSame(p.A, p.B, cfgNew) !== p.same) console.log(`  ${p.same ? 'FN' : 'FP'} #${p.id} ${p.reason}`);
console.log(`tune runtime ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (!process.argv.includes('--no-write')) {
  const merge = Math.max(CFG.merge_cos, Math.min(0.99, +(bj.t + 0.03).toFixed(2))); // merge must stay stricter than join
  const txt = readFileSync(cfgPath, 'utf8'), at = txt.indexOf('"cluster"'), end = txt.indexOf('}', at); // works for one-line or pretty-printed json
  let blk = txt.slice(at, end + 1);
  const before = blk;
  for (const [k, v] of Object.entries({ join_cos: bj.t, twin_cos: bt.t, merge_cos: merge })) blk = blk.replace(new RegExp(`("${k}":\\s*)[\\d.]+`), `$1${v}`);
  if (blk !== before) { writeFileSync(cfgPath, txt.slice(0, at) + blk + txt.slice(end + 1)); console.log(`config.json cluster keys changed:\n- ${before.replace(/\s+/g, ' ')}\n+ ${blk.replace(/\s+/g, ' ')}`); } else console.log('config.json unchanged');
}
