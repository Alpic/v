// Incremental clustering per language: join best open story if cos >= join_cos AND entity guard, else new story.
// Same-source near-dups (cos >= dup_cos_same_source) stay attached but are not counted. Cross-language twins at centroid cos >= twin_cos
// + shared names/numbers. weeklyMerge() merges story pairs at cos >= merge_cos (run: `node pipeline/cluster.mjs merge`).
import { readFileSync } from 'node:fs';
export const CFG = JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url), 'utf8')).cluster;
const AVG_MARGIN = 0.04, H = 3600e3, dry = () => process.env.V_DRY === '1';

// ---- vectors (embeddings are unit length; centroids are means, so normalise before cos)
export const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
export const unit = (v) => { const n = Math.sqrt(dot(v, v)) || 1; return v.map((x) => x / n); };
const mean = (vs) => vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0) / vs.length);

// ---- entity guard: capitalised tokens and numbers (stemmed to 5 letters for Finnish inflection) + title word overlap
const stem = (w) => w.toLowerCase().slice(0, 5);
export function entities(text) {
  const out = new Set();
  for (const w of text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []) {
    if (/^\p{Lu}/u.test(w) && (w.length >= 3 || w === w.toUpperCase()) && w.length >= 2) out.add(stem(w));
    else if (/^\d[\d.,]*$/.test(w) && w.replace(/\D/g, '').length >= 2 && !/^(19|20)\d\d$/.test(w)) out.add(w);
  }
  return out;
}
export const words = (t) => new Set((t.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).map((w) => w.slice(0, 5)));
export const feat = (a) => (a.f ??= { ent: entities(`${a.title}. ${(a.lead || '').slice(0, CFG.lead_chars)}`), words: words(a.title) });
const jac = (x, y) => { let n = 0; for (const w of x) if (y.has(w)) n++; return n / (x.size + y.size - n || 1); };
const shared = (x, y) => { let n = 0; for (const w of x) if (y.has(w)) n++; return n; };
// guard of article a against a list of member articles bs (same language)
export function guardOk(a, bs, cfg = CFG) {
  const fa = feat(a);
  return bs.some((b) => shared(fa.ent, feat(b).ent) >= cfg.guard_min_shared_tokens || jac(fa.words, feat(b).words) >= cfg.guard_jaccard);
}
// article pair verdict (used by tune.mjs): same-language needs join_cos + guard, cross-language twin_cos + shared names
export function pairSame(a, b, cfg = CFG) {
  const c = dot(a.emb, b.emb);
  return a.lang === b.lang ? c >= cfg.join_cos && guardOk(a, [b], cfg) : c >= cfg.twin_cos && shared(feat(a).ent, feat(b).ent) >= 1;
}

// ---- story model: {id, lang, title, first, last (ms), members:[{id,source_id,title,lead,t,emb}], twin, twin_id}
export function refresh(s, cfg = CFG) {
  s.members.sort((x, y) => x.t - y.t);
  s.uniq = [];
  for (const m of s.members) {
    delete m.dup_of;
    const d = m.emb && s.uniq.find((u) => u.source_id === m.source_id && u.emb && dot(u.emb, m.emb) >= cfg.dup_cos_same_source);
    if (d) m.dup_of = d.id; else s.uniq.push(m);
  }
  const embs = s.uniq.filter((m) => m.emb).map((m) => m.emb);
  if (embs.length) {
    s.centroid = mean(embs); s.cn = unit(s.centroid);
    const withEmb = s.uniq.filter((m) => m.emb), curated = withEmb.filter((m) => !/^g-/.test(m.source_id)); // headline only from curated outlets (M2); GDELT ids start with g-
    s.title = (curated.length ? curated : withEmb).reduce((b, m) => (dot(m.emb, s.cn) > b.c ? { c: dot(m.emb, s.cn), t: m.title } : b), { c: -2 }).t;
  } else s.title ||= s.members[0]?.title;
  s.first = Math.min(...s.members.map((m) => m.t)); s.last = Math.max(...s.members.map((m) => m.t));
  s.n_articles = s.uniq.length; s.n_outlets = new Set(s.uniq.map((m) => m.source_id)).size;
  s.ent = new Set(s.uniq.flatMap((m) => [...feat(m).ent]));
  return s;
}

// Pure core. arts need {id, source_id, lang, title, lead, t, emb}; stories = open stories (mutated, new ones pushed). -> {touched, created, dups}
export function clusterArticles(arts, stories, cfg = CFG) {
  const touched = new Set(), created = [], dups = [];
  for (const a of [...arts].sort((x, y) => x.t - y.t)) {
    // e5 cosines are compressed (unrelated news ~0.8), so a mean-vector centroid of a mixed story matches everything. Join on the
    // nearest member (the same test tune.mjs measures on pairs, plus the guard against the members that pass) and require
    // the mean cos to all members to stay within AVG_MARGIN of join_cos so stories cannot chain-drift into blobs.
    const cands = [];
    for (const s of stories) {
      if (s.lang !== a.lang || s.last < a.t - cfg.open_window_h * H) continue;
      const ms = s.uniq.filter((m) => m.emb), cs = ms.map((m) => dot(a.emb, m.emb));
      if (Math.max(...cs, -1) < cfg.join_cos || cs.reduce((x, y) => x + y, 0) / cs.length < cfg.join_cos - AVG_MARGIN) continue;
      if (guardOk(a, ms.filter((_, i) => cs[i] >= cfg.join_cos), cfg)) cands.push({ s, c: Math.max(...cs) });
    }
    let st = cands.sort((x, y) => y.c - x.c)[0]?.s;
    if (st) st.members.push(a);
    else { st = { id: null, lang: a.lang, title: a.title, members: [a], isNew: true }; stories.push(st); created.push(st); }
    refresh(st, cfg); touched.add(st);
    if (a.dup_of) dups.push(a.id);
    a.story = st;
  }
  return { touched, created, dups };
}

// best other-language story per touched story: centroid cos >= twin_cos, and some member pair passes the tuned pair test (cos >= twin_cos + shared name/number)
export function linkTwins(stories, touched, cfg = CFG) {
  let n = 0;
  for (const s of touched) {
    if (!s.cn) continue;
    let best = null;
    for (const t of stories) {
      if (t.lang === s.lang || !t.cn || Math.abs(t.last - s.last) > cfg.open_window_h * H || !shared(s.ent, t.ent)) continue;
      const c = dot(s.cn, t.cn);
      if (c >= cfg.twin_cos && (!best || c > best.c) && s.uniq.some((x) => x.emb && t.uniq.some((y) => y.emb && pairSame(x, y, cfg)))) best = { t, c };
    }
    if (best) { s.twin = best.t; s.twinC = best.c; if (!best.t.twin || best.t.twinC < best.c) { best.t.twin = s; best.t.twinC = best.c; touched.add(best.t); } n++; }
  }
  return n;
}

// pairs to merge: same language, centroid cos >= merge_cos + guard on entities; greedy, larger story is kept
export function mergeCandidates(stories, cfg = CFG) {
  const ps = [];
  for (let i = 0; i < stories.length; i++) for (let j = i + 1; j < stories.length; j++) {
    const a = stories[i], b = stories[j];
    if (a.lang !== b.lang || !a.cn || !b.cn || !shared(a.ent, b.ent)) continue;
    const c = dot(a.cn, b.cn);
    if (c >= cfg.merge_cos) ps.push({ a, b, c });
  }
  const used = new Set(), out = [];
  for (const p of ps.sort((x, y) => y.c - x.c)) {
    if (used.has(p.a) || used.has(p.b)) continue;
    used.add(p.a); used.add(p.b);
    out.push(p.a.n_articles >= p.b.n_articles ? { keep: p.a, drop: p.b, cos: p.c } : { keep: p.b, drop: p.a, cos: p.c });
  }
  return out;
}

// ---- DB glue. patchRows: dry mode upserts by id; real mode sends ONE rpc per <=200 rows (v_articles_update / v_stories_update; ids are GENERATED ALWAYS so no id upserts).
const RPC = { articles: 'v_articles_update', stories: 'v_stories_update' };
export async function patchRows(db, table, rows) {
  if (!rows.length) return;
  if (dry()) return db.upsert(table, rows, 'id');
  for (let i = 0; i < rows.length; i += 200) await db.rpc(RPC[table], { rows: rows.slice(i, i + 200) });
}
const r5 = (v) => v.map((x) => Math.round(x * 1e5) / 1e5), iso = (ms) => new Date(ms).toISOString();
const toMember = (r) => ({ id: r.id, source_id: r.source_id, lang: r.lang, title: r.title, lead: r.lead, emb: r.emb, t: Date.parse(r.published_at) || Date.now() });

export async function loadOpen(db, now, hours) {
  const cut = now - hours * H;
  const rows = (await db.select('stories', dry() ? '' : `last_at=gte.${iso(cut)}&limit=5000`)).filter((s) => Date.parse(s.last_at) >= cut);
  const byId = new Map(rows.map((r) => [r.id, { id: r.id, lang: r.lang, title: r.title, twin_id: r.twin_id, members: [] }]));
  const ids = [...byId.keys()];
  for (let i = 0; i < ids.length; i += 150) {
    const ms = await db.select('articles', `story_id=in.(${ids.slice(i, i + 150).join(',')})&select=id,story_id,source_id,title,lead,lang,published_at,emb`);
    for (const m of ms) byId.get(m.story_id)?.members.push(toMember(m));
  }
  return [...byId.values()].filter((s) => s.members.length).map((s) => refresh(s));
}

const storyRow = (s) => ({ id: s.id, title: s.title, first_at: iso(s.first), last_at: iso(s.last), n_articles: s.n_articles, n_outlets: s.n_outlets,
  centroid: s.centroid && r5(s.centroid), twin_id: s.twin?.id ?? s.twin_id ?? null });

export async function run(db, ctx, now = Date.now()) {
  const all = ctx.articles || [], arts = all.filter((a) => a.emb && a.id).map((a) => Object.assign(a, toMember(a)));
  if (!arts.length) return { skipped: all.length ? 'no_embeddings' : 'no_articles' };
  const stories = await loadOpen(db, now, CFG.open_window_h);
  const { touched, created, dups } = clusterArticles(arts, stories);
  const twins = linkTwins(stories, touched);
  if (created.length) {
    const ins = await db.upsert('stories', created.map((s) => { const { id, ...row } = storyRow({ ...s, twin: null, twin_id: null }); return { ...row, lang: s.lang }; }));
    created.forEach((s, i) => { s.id = ins[i].id; });
  }
  for (const a of arts) a.story_id = a.story.id;
  await patchRows(db, 'articles', arts.map((a) => ({ id: a.id, story_id: a.story_id })));
  await patchRows(db, 'stories', [...touched].filter((s) => !s.isNew || s.twin).map((s) => (s.isNew ? { id: s.id, twin_id: s.twin.id } : storyRow(s))));
  for (const a of arts) { delete a.story; delete a.f; delete a.t; }
  return { clustered: arts.length, new_stories: created.length, joined: arts.length - created.length, touched: touched.size, dups: dups.length, twins, open: stories.length };
}

// Weekly: merge duplicate stories of the last 7 days. The dropped story is emptied (n_articles = 0), the db helper has no delete; rank skips it.
export async function weeklyMerge(db, now = Date.now()) {
  const stories = await loadOpen(db, now, 168), ms = mergeCandidates(stories);
  for (const { keep, drop } of ms) {
    const moved = drop.members.map((m) => ({ id: m.id, story_id: keep.id }));
    keep.members.push(...drop.members);
    refresh(keep);
    await patchRows(db, 'articles', moved);
    await patchRows(db, 'stories', [storyRow(keep), { id: drop.id, n_articles: 0, n_outlets: 0, score: 0, is_top: false }]);
  }
  return { merged: ms.length, pairs: ms.map((m) => [m.keep.id, m.drop.id, +m.cos.toFixed(3)]) };
}

if (process.argv[1]?.endsWith('cluster.mjs') && process.argv[2] === 'merge') console.log(await weeklyMerge(await import('./db.mjs')));
