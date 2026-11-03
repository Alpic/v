import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { deflateRawSync } from 'node:zlib';
process.env.V_DRY = '1';
process.env.V_OUT = mkdtempSync(`${tmpdir()}/v-gdelt-`);
const db = await import('../pipeline/db.mjs');
const { parseGkg, unzip, cap, run, countryOf } = await import('../pipeline/gdelt.mjs');
const { lookup, normDomain, coverage, setTable } = await import('../pipeline/ratings.mjs');

const fx = readFileSync(new URL('./fixtures/gkg.tsv', import.meta.url), 'utf8');
const NOW = Date.parse('2026-11-02T16:10:00Z');
const zipOf = (buf) => { const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(8, 8); return Buffer.concat([h, deflateRawSync(buf)]); };

test('parseGkg: titles, entities, lang from srclc, dedupe, pub time', () => {
  const rows = parseGkg(fx, { now: NOW });
  assert.ok(rows.length >= 30);
  assert.ok(rows.every((r) => r.via === 'gdelt' && r.url_hash && r.title && r.domain && r.published_at && /^https?:/.test(r.url)));
  assert.equal(new Set(rows.map((r) => r.url_hash)).size, rows.length);
  assert.deepEqual([...new Set(rows.map((r) => r.lang))].sort(), ['de', 'en', 'fi', 'sv']);
  assert.match(rows.find((r) => r.domain === 'finanznachrichten.de').title, /Konzession erteilt, Bau läuft/); // &#xE4; decoded
  assert.equal(parseGkg(fx, { now: NOW + 100 * 3600e3 }).length, 0); // all older than 48 h
});

test('parseGkg rejects junk rows', () => {
  const row = (t, u = 'https://x.example/a?utm_source=z') => ['id', '20261102160000', '1', 'www.X.example', u, ...Array(20).fill(''), '', `<PAGE_TITLE>${t}</PAGE_TITLE>`].join('\t');
  const r = parseGkg([row('Just a moment...'), row('short'), row('A proper headline about things'), row('A proper headline about things', 'bad-url'), 'garbage'].join('\n'), { now: NOW });
  assert.equal(r.length, 1);
  assert.equal(r[0].url, 'https://x.example/a');
  assert.equal(r[0].domain, 'x.example');
});

test('unzip reads a single deflated entry', () => {
  assert.equal(unzip(zipOf(Buffer.from('hello\tworld\n'))).toString(), 'hello\tworld\n');
  assert.throws(() => unzip(Buffer.from('nope nope nope nope nope nope nope nope')));
});

test('domain normalisation and rating lookup (www., subdomains, unknown)', () => {
  assert.equal(normDomain('https://WWW.Yle.fi:443/uutiset?x=1'), 'yle.fi');
  assert.equal(normDomain('m.foo.co.uk.'), 'm.foo.co.uk');
  setTable({ 'bbc.co.uk': { mbfc_lean: 'Left-Center', mbfc_fact: 'High' }, 'rt.com': { mbfc_lean: 'Questionable', mbfc_fact: 'Low' } });
  assert.equal(lookup('www.bbc.co.uk').v, -1);
  assert.equal(lookup('news.bbc.co.uk').domain, 'bbc.co.uk');
  assert.equal(lookup('rt.com').v, null); // Questionable: no lean value
  assert.equal(lookup('co.uk'), null);
  assert.equal(lookup('example.org'), null);
  assert.deepEqual(coverage(['bbc.co.uk', 'www.bbc.co.uk', 'x.org']), { n: 2, rated: 1, pct: 50 });
  assert.equal(countryOf('yle.fi'), 'FI');
});

test('shipped ratings.json: sane size and known outlets', () => {
  const t = JSON.parse(readFileSync(new URL('../data/ratings.json', import.meta.url), 'utf8'));
  assert.ok(Object.keys(t).length > 3000);
  assert.ok(Object.values(t).every((r) => r.mbfc_lean && r.source && r.dataset_date));
  setTable(t);
  assert.equal(lookup('www.reuters.com').mbfc_lean, 'Least Biased');
});

test('cap prefers rated domains and limits any one unrated domain', () => {
  setTable({ 'good.com': { mbfc_lean: 'Left' } });
  const mk = (d, i) => ({ domain: d, url_hash: d + i });
  const rows = [...Array.from({ length: 30 }, (_, i) => mk('farm.biz', i)), ...Array.from({ length: 3 }, (_, i) => mk('good.com', i))];
  const out = cap(rows, 100);
  assert.equal(out.filter((r) => r.domain === 'farm.biz').length, 5);
  assert.equal(out[0].domain, 'good.com');
  assert.equal(cap(rows, 4).length, 4);
});

test('run hook: creates gdelt sources, maps known domains, pushes to ctx.articles, idempotent', async () => {
  setTable({});
  const dom = normDomain(fx.split('\n')[0].split('\t')[3]), zip = zipOf(Buffer.from(fx));
  const fetchFn = async (u) => /lastupdate/.test(u)
    ? new Response(`1 x http://data.gdeltproject.org/gdeltv2/20261102160000.${/translation/.test(u) ? 'translation.' : ''}gkg.csv.zip\n`)
    : /translation/.test(u) ? new Response('', { status: 404 }) : new Response(zip);
  await db.upsert('sources', [{ id: 'curated', domain: dom, status: 'ok', via: 'rss', lang: 'en' }], 'id');
  const ctx = { articles: [] };
  const s = await run(db, ctx, { fetchFn, now: NOW, files: 1 });
  assert.ok(s.kept > 30 && s.files_ok === 1 && s.new_sources > 5);
  assert.equal(ctx.articles.length, s.new_articles);
  const srcs = await db.select('sources'), arts = await db.select('articles');
  assert.ok(!srcs.some((x) => x.id === 'g-' + dom.replace(/\./g, '-')));
  assert.ok(arts.some((a) => a.source_id === 'curated'));
  assert.ok(srcs.filter((x) => x.via === 'gdelt').every((x) => x.status === 'gdelt' && x.id.startsWith('g-')));
  assert.ok(arts.every((a) => !('via' in a) && a.cb != null));
  assert.equal((await run(db, { articles: [] }, { fetchFn, now: NOW, files: 1 })).new_articles, 0);
});
