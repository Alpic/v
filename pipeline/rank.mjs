// score = outlets * 0.5^(age_h/half_life) + article_weight * ln(1 + articles); flagged sources are excluded from outlets;
// is_top = outlets >= top_min_outlets. Ranks only stories touched in the last RANK_H (72) hours and clears is_top on older ones; real mode = ONE rpc (v_rank_update).
import { readFileSync } from 'node:fs';
import { patchRows } from './cluster.mjs';
const CFG = JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url), 'utf8'));
const H = 3600e3, RANK_H = 72;

export const score = (outlets, articles, ageH, r = CFG.rank) => outlets * r.outlet_weight * 0.5 ** (ageH / r.half_life_h) + r.article_weight * Math.log(1 + articles);
// stories: [{id, last_at, n_articles, outlets}] -> same plus score, is_top
export function rankStories(stories, now = Date.now(), r = CFG.rank) {
  return stories.map((s) => ({ ...s, score: +score(s.outlets, s.n_articles, Math.max(0, now - Date.parse(s.last_at)) / H, r).toFixed(4), is_top: s.outlets >= r.top_min_outlets }))
    .sort((a, b) => b.score - a.score);
}

export async function run(db, ctx, now = Date.now()) {
  const flagged = new Set((await db.select('sources', 'select=id,flags')).filter((s) => CFG.flagged.in_rank === false && s.flags?.length).map((s) => s.id));
  const cut = now - RANK_H * H;
  const dry = process.env.V_DRY === '1';
  const live = (await db.select('stories', dry ? '' : `last_at=gte.${new Date(cut).toISOString()}&select=id,last_at,n_articles,score,is_top&limit=5000`)).filter((s) => Date.parse(s.last_at) >= cut && s.n_articles > 0);
  const outlets = new Map(live.map((s) => [s.id, new Set()])), ids = [...outlets.keys()];
  for (let i = 0; i < ids.length; i += 150) {
    for (const a of await db.select('articles', `story_id=in.(${ids.slice(i, i + 150).join(',')})&select=story_id,source_id`)) if (!flagged.has(a.source_id)) outlets.get(a.story_id)?.add(a.source_id);
  }
  const ranked = rankStories(live.map((s) => ({ id: s.id, last_at: s.last_at, n_articles: s.n_articles, outlets: outlets.get(s.id).size })), now);
  const changed = new Map(live.map((s) => [s.id, s]));
  const rows = ranked.filter((r) => { const o = changed.get(r.id); return Math.abs((o.score ?? 0) - r.score) > 0.005 || !!o.is_top !== r.is_top; }).map((r) => ({ id: r.id, score: r.score, is_top: r.is_top }));
  const stale = (await db.select('stories', 'is_top=eq.true&select=id,last_at,n_articles')).filter((s) => Date.parse(s.last_at) < cut || !(s.n_articles > 0)).map((s) => ({ id: s.id, is_top: false }));
  const all = [...rows, ...stale];
  if (dry) await patchRows(db, 'stories', all);
  else if (all.length) await db.rpc('v_rank_update', { rows: all });
  return { ranked: ranked.length, top: ranked.filter((r) => r.is_top).length, patched: rows.length + stale.length };
}
