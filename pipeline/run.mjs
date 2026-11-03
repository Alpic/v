// Orchestrator: ingest -> voice+clickbait -> embed/cluster/rank -> extract -> summarize -> runs row -> retention.
// Optional steps are imported if the module exists. Exit 1 only on DB failure or 0 feeds ok.
import { existsSync } from 'node:fs';
import * as db from './db.mjs';
import { ingest } from './ingest.mjs';
import { voiceOf } from './voice.mjs';
import { cbScore } from './clickbait.mjs';
import { extractBodies } from './extract.mjs';
import { seedIfChanged } from './seed.mjs';
import { readFileSync } from 'node:fs';
const CFG = JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url), 'utf8'));

const t0 = Date.now(), stats = {};
async function hook(name, ctx) {
  const f = new URL(`./${name}.mjs`, import.meta.url);
  if (!existsSync(f)) return;
  try { const m = await import(f); const fn = m.run ?? m.default; if (fn) stats[name] = await fn(db, ctx); } catch (e) { stats[`${name}_error`] = String(e.message || e).slice(0, 200); }
}

// runs.stats.clickbait[source_id] = {share: % of headlines with cb >= threshold, n}, window_days, outlets with >= min_headlines only (web reads it).
async function clickbaitStats() {
  const c = CFG.clickbait;
  if (process.env.V_DRY !== '1') { stats.clickbait = await db.rpc('v_cb_stats', { d: c.window_days, threshold: c.threshold, min_n: c.min_headlines }); return; }
  const since = Date.now() - c.window_days * 864e5, by = {};
  for (const a of await db.select('articles')) if (a.cb != null && Date.parse(a.published_at) >= since) { const o = (by[a.source_id] ||= { n: 0, hi: 0 }); o.n++; if (a.cb >= c.threshold) o.hi++; }
  stats.clickbait = Object.fromEntries(Object.entries(by).filter(([, o]) => o.n >= c.min_headlines).map(([k, o]) => [k, { share: +(100 * o.hi / o.n).toFixed(1), n: o.n }]));
}

try {
  const sd = await seedIfChanged(db);
  stats.sources_hash = sd.hash; if (sd.seeded) stats.seeded = sd.seeded;
  const r = await ingest(db, { enrich: (a) => ({ ...a, voice: voiceOf(a), cb: cbScore(a.title) }) });
  Object.assign(stats, { feeds_ok: r.feeds_ok, feeds_failed: r.feeds_failed, failed: r.failed.slice(0, 20), items: r.items, new_articles: r.articles.length,
    voice_tagged: r.articles.filter((a) => a.voice).length });
  const ctx = { articles: r.articles, stats };
  await hook('gdelt', ctx);
  await hook('embed', ctx);
  await hook('cluster', ctx);
  await hook('rank', ctx);
  try { // stories with >= 2 outlets, bodies still missing
    const st = await db.select('stories', 'n_outlets=gte.2&select=id&limit=300');
    if (st.length) {
      const todo = (await db.select('articles', `story_id=in.(${st.map((s) => s.id).join(',')})&body_ok=eq.false&select=id,url,source_id&limit=200`)).filter((a) => !a.source_id.startsWith('g-')); // never fetch arbitrary GDELT domains (M4)
      stats.extract = await extractBodies(db, todo);
    }
  } catch (e) { if (/^db /.test(e.message)) throw e; stats.extract_error = e.message; }
  await hook('summarize', ctx);
  await clickbaitStats();
  if (process.env.V_DRY !== '1') stats.retention = await db.rpc('v_retention', { gdelt_h: CFG.gdelt.unmatched_retention_h });
  stats.runtime_s = +((Date.now() - t0) / 1000).toFixed(1);
  const debug = {}; // raw errors and failed feeds stay out of the anon-readable stats column (L9)
  for (const k of Object.keys(stats)) if (k === 'failed' || k.endsWith('_error')) { debug[k] = stats[k]; delete stats[k]; }
  await db.upsert('runs', [{ stats, debug }]);
  console.log(JSON.stringify({ ...stats, ...debug, failed: debug.failed?.length }));
  if (!r.feeds_ok) { console.error('0 feeds ok'); process.exitCode = 1; }
} catch (e) { console.error('run failed:', e.message); process.exitCode = 1; }
