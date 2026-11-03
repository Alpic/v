// Clustering / rank tests on tiny synthetic data with fake 2-d "embeddings" (cos of the angle difference). No model needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clusterArticles, linkTwins, mergeCandidates, refresh, entities, CFG, pairSame, run as clusterRun } from '../pipeline/cluster.mjs';
import { rankStories, score, run as rankRun } from '../pipeline/rank.mjs';

const H = 3600e3, T0 = Date.parse('2026-11-02T12:00:00Z');
const emb = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
let n = 0;
const art = (source_id, title, deg, o = {}) => ({ id: ++n, source_id, lang: 'fi', title, lead: '', emb: emb(deg), t: T0 - (o.ageH ?? 1) * H, ...o });

test('articles on the same event join one story, unrelated ones start new stories', () => {
  const arts = [art('yle', 'Trump tapasi Putinin Alaskassa', 0), art('hs', 'Putin ja Trump tapasivat Alaskassa', 10), art('is', 'Uusi silta avattiin Oulussa', 120)];
  const { created } = clusterArticles(arts, []);
  assert.equal(created.length, 2);
  const s = created.find((c) => c.members.length === 2);
  assert.equal(s.n_outlets, 2);
  assert.equal(s.n_articles, 2);
  assert.match(s.title, /Alaskassa/);
});

test('entity guard blocks a false merge even when cos is above the threshold', () => {
  const a = art('yle', 'kaupunki avasi uuden sillan', 0), b = art('hs', 'hallitus esitti pienempää budjettia', 5);
  assert.ok(Math.cos(Math.PI * 5 / 180) > CFG.join_cos);
  assert.equal(pairSame(a, b), false);
  assert.equal(clusterArticles([a, b], []).created.length, 2);
  const c = art('is', 'Hallitus esitti pienempää budjettia Helsingissä', 5), d = art('mt', 'budjettia pienennetään Helsingissä', 0);
  assert.equal(clusterArticles([c, d], []).created.length, 1); // shared name Helsingissä
});

test('same-source near duplicate is attached but not counted', () => {
  const arts = [art('yle', 'Pörssisähkö nousi 50 senttiin', 0), art('yle', 'Pörssisähkö nousi yli 50 senttiin', 3), art('hs', 'Pörssisähkö yli 50 senttiä maanantaina', 8)];
  const { created, dups } = clusterArticles(arts, []);
  assert.equal(created.length, 1);
  assert.equal(created[0].members.length, 3);
  assert.equal(created[0].n_articles, 2);
  assert.equal(created[0].n_outlets, 2);
  assert.deepEqual(dups, [arts[1].id]);
});

test('open window: an article does not join a story older than 48 h', () => {
  const old = refresh({ id: 1, lang: 'fi', title: 'x', members: [art('yle', 'Trump tapasi Putinin', 0, { ageH: 60 })] });
  const { created } = clusterArticles([art('hs', 'Trump tapasi Putinin', 2, { ageH: 1 })], [old]);
  assert.equal(created.length, 1);
});

test('a mixed story cannot chain-drift: far-away items do not join through a mean centroid', () => {
  const arts = [0, 14, 28, 42, 56, 70].map((d, i) => art('s' + i, 'Trump uutinen ' + i, d));
  const { created } = clusterArticles(arts, []);
  assert.ok(created.length >= 2);
});

test('different languages never join; twin link needs cos + shared name/number', () => {
  const fi = art('yle', 'Antonelli voitti F1-mestaruuden', 0), en = art('bbc', 'Antonelli wins F1 title', 4, { lang: 'en' }), other = art('cnn', 'Quiet day for Lisbon', 4, { lang: 'en' });
  const stories = [];
  const { created, touched } = clusterArticles([fi, en, other], stories);
  assert.equal(created.length, 3);
  assert.equal(linkTwins(stories, touched), 2);
  const sFi = created.find((s) => s.lang === 'fi');
  assert.equal(sFi.twin.members[0].source_id, 'bbc');
  assert.equal(created.find((s) => s.members[0].source_id === 'cnn').twin, undefined);
});

test('weekly merge pairs same-language stories above merge_cos with shared names', () => {
  const a = refresh({ id: 1, lang: 'fi', title: 'a', members: [art('yle', 'Turku jääkiekko MM-kisat', 0)] });
  const b = refresh({ id: 2, lang: 'fi', title: 'b', members: [art('hs', 'MM-kisat Turku luopuu', 5), art('is', 'Turku MM-kisat Venäjä', 6)] });
  const c = refresh({ id: 3, lang: 'fi', title: 'c', members: [art('mt', 'Turku jääkiekko', 40)] });
  const m = mergeCandidates([a, b, c]);
  assert.equal(m.length, 1);
  assert.equal(m[0].keep, b); // larger story is kept
  assert.equal(m[0].drop, a);
});

test('entities: capitalised tokens and numbers, years ignored, Finnish inflection stems match', () => {
  const e = entities('Putinin tapaaminen 2026 maksoi 450 miljoonaa');
  assert.ok(e.has('putin') && e.has('450') && !e.has('2026'));
  assert.ok(entities('Putin tapasi').has('putin'));
});

test('rank: formula, ordering and top threshold', () => {
  assert.ok(Math.abs(score(3, 5, 0) - (3 + 0.3 * Math.log(6))) < 1e-9);
  assert.ok(Math.abs(score(2, 1, 18) - (1 + 0.3 * Math.log(2))) < 1e-9); // one half-life
  const iso = (h) => new Date(T0 - h * H).toISOString();
  const r = rankStories([{ id: 1, last_at: iso(1), n_articles: 3, outlets: 3 }, { id: 2, last_at: iso(40), n_articles: 20, outlets: 5 }, { id: 3, last_at: iso(1), n_articles: 1, outlets: 1 }, { id: 4, last_at: iso(2), n_articles: 8, outlets: 2 }], T0);
  assert.deepEqual(r.map((x) => x.id), [1, 4, 2, 3]);
  assert.deepEqual(r.map((x) => x.is_top), [true, false, true, false]);
});

test('db dry mode: cluster.run + rank.run persist stories, twins; flagged sources do not count as outlets', async () => {
  process.env.V_DRY = '1'; process.env.V_OUT = mkdtempSync(join(tmpdir(), 'vcl-'));
  const db = await import('../pipeline/db.mjs');
  await db.upsert('sources', [{ id: 'yle', flags: [] }, { id: 'hs', flags: [] }, { id: 'is', flags: [] }, { id: 'bad', flags: ['satire'] }, { id: 'bbc', flags: [] }], 'id');
  const iso = new Date(T0 - H).toISOString();
  const mk = (source_id, title, deg, lang = 'fi') => ({ source_id, url: `u/${source_id}/${title}`, url_hash: source_id + title, title, lead: '', lang, published_at: iso, emb: emb(deg) });
  const rows = await db.upsert('articles', [mk('yle', 'Kimi Antonelli voitti F1-mestaruuden', 0), mk('hs', 'Antonelli voitti F1-mestaruuden', 5), mk('bad', 'Antonelli voitti mestaruuden F1', 6),
    mk('bbc', 'Antonelli wins the F1 title', 8, 'en'), mk('is', 'Sää huomenna', 90)], 'url_hash');
  const ctx = { articles: rows };
  const st = await clusterRun(db, ctx, T0);
  assert.equal(st.new_stories, 3);
  assert.equal(st.twins, 2);
  assert.ok(rows.every((a) => a.story_id));
  const rk = await rankRun(db, ctx, T0);
  assert.equal(rk.ranked, 3);
  const stories = await db.select('stories');
  const fi = stories.find((s) => s.lang === 'fi' && s.n_articles === 3);
  assert.equal(fi.n_outlets, 3);
  assert.ok(fi.twin_id && stories.find((s) => s.id === fi.twin_id).twin_id === fi.id);
  assert.equal(fi.is_top, false); // 'bad' is flagged: only 2 counted outlets, below top_min_outlets
  assert.ok(fi.score > 0);
  assert.equal((await clusterRun(db, { articles: [] }, T0)).skipped, 'no_articles');
  assert.equal((await clusterRun(db, { articles: [{ id: 99 }] }, T0)).skipped, 'no_embeddings');
});
