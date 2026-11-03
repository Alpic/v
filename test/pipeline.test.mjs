import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
process.env.V_DRY = '1';
process.env.V_OUT = mkdtempSync(`${tmpdir()}/v-test-`);
const db = await import('../pipeline/db.mjs');
const { ingest, canon } = await import('../pipeline/ingest.mjs');
const { tagVoice, voiceOf } = await import('../pipeline/voice.mjs');
const { cbScore } = await import('../pipeline/clickbait.mjs');

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const NOW = Date.parse('2026-11-02T12:00:00Z');
const sources = [{ id: 'a', feed_url: 'http://a/feed', lang: 'fi' }, { id: 'b', feed_url: 'http://b/feed', lang: 'fi' },
  { id: 'c', feed_url: 'http://c/feed', lang: 'sv' }, { id: 'dead', feed_url: 'http://dead/feed', lang: 'fi' }];
const bodies = { 'http://a/feed': fx('a.rss'), 'http://b/feed': fx('b.rss'), 'http://c/feed': fx('c.atom') };
const fetchFn = async (url) => { if (!bodies[url]) throw new Error('ECONNREFUSED'); return new Response(bodies[url], { headers: { etag: '"x"' } }); };
writeFileSync(`${process.env.V_OUT}/sources.json`, JSON.stringify(sources));

test('canonical URL strips utm and fragment', () => {
  assert.equal(canon('https://a.example/x?utm_source=r&id=7#top'), 'https://a.example/x?id=7');
});

test('ingest parses RSS+Atom, drops >72h, dedupes; re-run adds 0; dead feed does not fail', async () => {
  const r1 = await ingest(db, { sources: await db.select('sources'), now: NOW, fetchFn });
  assert.equal(r1.feeds_ok, 3);
  assert.equal(r1.feeds_failed, 1);
  assert.equal(r1.articles.length, 4); // a:2 (old dropped), b:2 minus 1 cross-feed duplicate of a/1 -> 1, c:1
  assert.ok(r1.articles.every((a) => a.source_id && a.url && a.lang && a.published_at && a.url_hash));
  assert.equal(r1.articles.find((a) => a.source_id === 'c').url, 'https://c.example/sv/3');
  const r2 = await ingest(db, { sources: await db.select('sources'), now: NOW, fetchFn });
  assert.equal(r2.articles.length, 0);
  assert.equal((await db.select('articles')).length, 4);
  assert.equal((await db.select('sources', 'id=eq.dead'))[0].fail_count, 2);
});

test('voice tags Finnish inflections', () => {
  assert.deepEqual(tagVoice('SDP:n mukaan'), { sd: 1 });
  assert.equal(tagVoice('Sdp:n johtaja').sd, 1);
  assert.equal(tagVoice('perussuomalaisten ja kokoomuksen linja').ps, 1);
  assert.equal(tagVoice('perussuomalaisten ja kokoomuksen linja').kok, 1);
  assert.equal(tagVoice('Orpon mukaan').kok, 1);
  assert.equal(tagVoice('Keskusta on keskellä').kesk, undefined); // ordinary word, no party context
  assert.equal(tagVoice('Keskustan puoluekokous').kesk, 1);
  const v = voiceOf({ title: 'Hallitus päätti: SDP:n mukaan huono', lead: 'Eduskunnassa perussuomalaisten ja Orpon linja' });
  assert.deepEqual(v, { sd: 1, ps: 1, kok: 1 });
  assert.equal(voiceOf({ title: 'Sää huomenna', lead: 'Kok kokki' }), null); // not political
});

test('clickbait scores obvious cases', () => {
  assert.ok(cbScore('Näin kävi: SHOKKI ja KOHU kuumentaa vaalit!') >= 25);
  assert.ok(cbScore('Et usko mitä tapahtui seuraavaksi?') >= 25);
  assert.ok(cbScore('10 syytä miksi kaikki puhuvat tästä – katso') >= 25);
  assert.ok(cbScore('Hallitus päätti budjetista') < 25);
  assert.equal(cbScore('Valtion velka kasvoi 2,1 miljardia euroa'), 0);
});
