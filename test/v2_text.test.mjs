import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { decodeBody, readText } from '../pipeline/net.mjs';
import { parseFeed } from '../pipeline/ingest.mjs';
import { refetchBadTitles } from '../pipeline/refetch_bad_titles.mjs';
import { topicOf } from '../pipeline/topic.mjs';
import { run as translate } from '../pipeline/translate.mjs';

const PT = 'Eleição na Virgínia';
const feed = (enc, title, prolog = true) => `${prolog ? `<?xml version="1.0" encoding="${enc}"?>` : ''}<rss version="2.0"><channel><item><title>${title}</title><link>https://ex.pt/a</link><description>Notícia São João</description></item></channel></rss>`;

test('decode: ISO-8859-1 feed via XML prolog and via HTTP header', () => {
  const b = Buffer.from(feed('ISO-8859-1', PT), 'latin1');
  assert.ok(decodeBody(b).includes(PT));
  assert.ok(decodeBody(Buffer.from(feed('x', PT, false), 'latin1'), 'application/rss+xml; charset=iso-8859-1').includes(PT));
  assert.equal(parseFeed(decodeBody(b))[0].title, PT);
});
test('decode: windows-1252 specials, unlabeled legacy bytes fall back to 1252', () => {
  const b = Buffer.from('<rss><t>“quote” – €</t></rss>', 'latin1'); // placeholder, rebuilt below with 1252 bytes
  const w = Buffer.concat([Buffer.from('<rss><t>'), Buffer.from([0x93]), Buffer.from('quote'), Buffer.from([0x94, 0x20, 0x96, 0x20, 0x80]), Buffer.from('</t></rss>')]);
  assert.ok(b.length > 0);
  assert.ok(decodeBody(w, 'text/xml; charset=windows-1252').includes('“quote” – €'));
  assert.ok(decodeBody(w).includes('“quote” – €')); // no label, invalid UTF-8 -> 1252
});
test('decode: UTF-8 BOM stripped, plain UTF-8 untouched, wrong utf-8 label falls back, unknown label falls back', () => {
  const u = Buffer.from('﻿<rss>Ääkköset ✓</rss>');
  assert.equal(decodeBody(u), '<rss>Ääkköset ✓</rss>');
  assert.equal(decodeBody(Buffer.from('Ääkköset'), 'text/html; charset=utf-8'), 'Ääkköset');
  assert.ok(!decodeBody(Buffer.from('Eleição', 'latin1'), 'text/xml; charset=utf-8').includes('�'));
  assert.equal(decodeBody(Buffer.from('Eleição', 'latin1'), 'text/xml; charset=bogus-9'), 'Eleição');
});
test('decode: <meta charset> in HTML; readText uses Content-Type', async () => {
  const h = Buffer.from('<html><head><meta charset="windows-1252"></head><body>Virgínia</body></html>', 'latin1');
  assert.ok(decodeBody(h).includes('Virgínia'));
  const r = new Response(Buffer.from(PT, 'latin1'), { headers: { 'content-type': 'text/plain; charset=ISO-8859-1' } });
  assert.equal(await readText(r, 1000), PT);
});

test('refetch_bad_titles: repairs title/lead, dry-run writes nothing, idempotent', async () => {
  const body = Buffer.from(feed('ISO-8859-1', PT), 'latin1');
  const mk = () => {
    const calls = [];
    const db = {
      calls,
      select: async (t) => ({
        articles: [{ id: 1, source_id: 'pt', url_hash: '', title: 'Elei��o na Virg�nia', lead: 'x', story_id: 7 }, { id: 2, source_id: 'pt', url_hash: 'zz', title: 'fine', lead: null, story_id: null }],
        sources: [{ id: 'pt', feed_url: 'https://ex.pt/feed' }], stories: [{ id: 7, title: 'Elei��o na Virg�nia' }],
      }[t]),
      update: async (t, f, p) => { calls.push([t, f, p]); },
    };
    return db;
  };
  const { hashUrl } = await import('../pipeline/ingest.mjs');
  const fetchFn = async () => new Response(body, { headers: { 'content-type': 'application/rss+xml' } });
  let db = mk(); const sel = db.select;
  db.select = async (t, q) => (t === 'articles' ? (await sel(t, q)).map((a) => (a.id === 1 ? { ...a, url_hash: hashUrl('https://ex.pt/a') } : a)) : sel(t, q));
  const dry = await refetchBadTitles(db, { dryRun: true, fetchFn });
  assert.deepEqual([dry.bad, dry.fixed, db.calls.length], [1, 1, 0]);
  const real = await refetchBadTitles(db, { fetchFn });
  assert.equal(real.fixed, 1); assert.equal(real.stories, 1);
  assert.deepEqual(db.calls[0], ['articles', 'id=eq.1', { title: PT }]);
  assert.deepEqual(db.calls[1], ['stories', 'id=eq.7', { title: PT }]);
  const clean = { select: async (t) => (t === 'articles' ? [{ id: 1, title: PT, lead: 'x', source_id: 'pt' }] : []), update: async () => assert.fail('no write') };
  assert.equal((await refetchBadTitles(clean, { fetchFn })).bad, 0);
});

test('topicOf: rules for fi/en, ties and no-hit give null', () => {
  assert.equal(topicOf('Eduskunta hyväksyi lakiesityksen'), 'politiikka');
  assert.equal(topicOf('HIFK voitti jääkiekko-ottelun'), 'urheilu');
  assert.equal(topicOf('Police arrest suspect after shooting'), 'rikos');
  assert.equal(topicOf('OpenAI releases new software'), 'teknologia');
  assert.equal(topicOf('Kissa istui matolla'), null);
  assert.equal(topicOf(null, ''), null);
});

const fakeLlm = (outs) => { const l = { prompts: [], ask: async (p) => { l.prompts.push(p); const o = outs.shift(); return o === undefined ? null : o; } }; return l; };
const memDb = (stories, arts = []) => {
  const patches = [];
  return { patches, select: async (t, q) => (t === 'stories' ? stories : arts.filter(() => true)), update: async () => {}, upsert: async (t, rows) => { patches.push(...rows); return rows; } };
};
const NOW = Date.parse('2026-11-04T12:00:00Z'), RECENT = '2026-11-04T10:00:00Z';
const tmp = () => `${mkdtempSync(`${tmpdir()}/trl-`)}/translate.json`;
process.env.V_DRY = '1';

test('translate: foreign story translated once (cache), fi copied, no number invention', async () => {
  const st = [{ id: 1, title: 'Eleição na Virgínia: 3 mortos', lang: 'pt', n_outlets: 2, is_top: false, last_at: RECENT, score: 5 },
    { id: 2, title: 'Eduskunta hyväksyi lakiesityksen', lang: 'fi', n_outlets: 3, is_top: true, last_at: RECENT, score: 9 }];
  const llm = fakeLlm([{ model: 'm', json: { title_en: 'Parliament passed the bill in 99 votes' } }, // story 2 first (higher score)
    { model: 'm', json: { title_fi: 'Vaalit Virginiassa: 3 kuollutta', title_en: 'Election in Virginia: 3 dead' } }]);
  const cachePath = tmp(), db = memDb(JSON.parse(JSON.stringify(st)));
  const r = await translate(db, {}, { llm, now: NOW, cachePath });
  const p1 = db.patches.find((x) => x.id === 1), p2 = db.patches.find((x) => x.id === 2);
  assert.equal(p1.title_fi, 'Vaalit Virginiassa: 3 kuollutta'); assert.equal(p1.title_en, 'Election in Virginia: 3 dead'); assert.equal(p1.translated_from, 'pt');
  assert.equal(p2.title_fi, 'Eduskunta hyväksyi lakiesityksen'); assert.equal(p2.title_en, undefined); assert.equal(p2.topic, 'politiikka'); // invented "99" rejected
  assert.equal(r.calls, 2);
  // second run: story 1 served from cache, no LLM call for it
  const llm2 = fakeLlm([]), db2 = memDb(JSON.parse(JSON.stringify(st)));
  const r2 = await translate(db2, {}, { llm: llm2, now: NOW, cachePath });
  assert.equal(db2.patches.find((x) => x.id === 1).title_en, 'Election in Virginia: 3 dead'); assert.equal(r2.cached, 1);
  assert.equal(llm2.prompts.length, 1); // only story 2 retried (failure not cached)
});
test('translate: LLM failure leaves fields unset; caps respected; ambiguous top story gets LLM topic', async () => {
  const mk = (id, title, extra = {}) => ({ id, title, lang: 'de', n_outlets: 2, is_top: false, last_at: RECENT, score: 10 - id, ...extra });
  const llm = fakeLlm([null, { model: 'm', json: { title_fi: 'Otsikko', title_en: 'Headline', topic: 'muu' } }]);
  const db = memDb([mk(1, 'Schlagzeile eins'), mk(2, 'Schlagzeile zwei', { is_top: true }), mk(3, 'Schlagzeile drei')]);
  const r = await translate(db, {}, { llm, now: NOW, cachePath: tmp(), max: 2 });
  assert.equal(db.patches.find((x) => x.id === 1), undefined); // failed -> nothing invented
  const p2 = db.patches.find((x) => x.id === 2);
  assert.deepEqual([p2.title_fi, p2.title_en, p2.topic, p2.translated_from], ['Otsikko', 'Headline', 'muu', 'de']);
  assert.equal(r.calls, 2); assert.equal(r.capped, 1); assert.equal(r.failed, 1);
  assert.match(llm.prompts[1], /exactly one of: politiikka/);
  // daily cap
  const llm3 = fakeLlm([{ json: { title_fi: 'a b c', title_en: 'a b c' } }]);
  const r3 = await translate(memDb([mk(9, 'Neun')]), {}, { llm: llm3, now: NOW, cachePath: tmp(), perDay: 0 });
  assert.equal(r3.calls, 0); assert.equal(llm3.prompts.length, 0);
});
