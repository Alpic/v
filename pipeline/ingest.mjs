// Fetch all ok feeds (conditional GET), parse RSS/Atom, dedupe by canonical URL hash, store new articles. One bad feed never fails the run.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { readText, FEED_MAX } from './net.mjs';
const CFG = JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url), 'utf8')).ingest;
const UA = 'Mozilla/5.0 (compatible; VNewsBot/1.0; +https://v.kuljento.fi)';
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true });
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const text = (v) => (v == null ? '' : typeof v === 'object' ? text(v['#text'] ?? '') : String(v));
const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", auml: 'ä', ouml: 'ö', aring: 'å', rsquo: '’', lsquo: '‘', ndash: '–', hellip: '…' };
const clean = (s) => text(s).replace(/\u00AD/g, '').replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m).replace(/\s+/g, ' ').trim();

export function canon(u) {
  const x = new URL(u);
  x.hash = '';
  for (const k of [...x.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|mc_)/i.test(k)) x.searchParams.delete(k);
  return x.toString();
}
export const hashUrl = (u) => createHash('sha1').update(canon(u)).digest('hex');

export async function pool(items, n, fn) {
  const q = [...items], out = [];
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { while (q.length) out.push(await fn(q.shift())); }));
  return out;
}

// -> [{title, url, lead, published_at}] for items newer than maxAgeH
export function parseFeed(body, { now = Date.now(), maxAgeH = CFG.max_item_age_h } = {}) {
  const d = xml.parse(body), raw = d.rss ? arr(d.rss.channel?.item) : d.feed ? arr(d.feed.entry) : arr(d['rdf:RDF']?.item);
  if (!d.rss && !d.feed && !d['rdf:RDF']) throw new Error('not a feed');
  const items = [];
  for (const e of raw) {
    const link = typeof e.link === 'object' ? arr(e.link).find((l) => !l['@_rel'] || l['@_rel'] === 'alternate')?.['@_href'] : e.link;
    const title = clean(e.title), url = text(link).trim();
    if (!title || !/^https?:/.test(url)) continue;
    const t = Date.parse(text(e.pubDate ?? e.published ?? e.updated ?? e['dc:date']));
    if (t && now - t > maxAgeH * 3600e3) continue;
    items.push({ title, url, lead: clean(e.description ?? e.summary ?? e['content:encoded'] ?? e.content).slice(0, 500) || null,
      published_at: new Date(t || now).toISOString() });
  }
  return items;
}

// enrich(row) -> row lets the caller add voice/cb before insert. Returns newly inserted rows (with ids).
export async function ingest(db, { sources, now = Date.now(), fetchFn = fetch, enrich = (r) => r } = {}) {
  sources ??= await db.select('sources', 'status=eq.ok');
  const iso = new Date(now).toISOString(), failed = [], rows = [], seen = new Set();
  let ok = 0, items = 0;
  await pool(sources.filter((s) => s.feed_url && (s.status ?? 'ok') === 'ok'), CFG.concurrency, async (s) => {
    try {
      const h = { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5' };
      if (s.etag) h['if-none-match'] = s.etag;
      if (s.last_modified) h['if-modified-since'] = s.last_modified;
      const r = await fetchFn(s.feed_url, { headers: h, signal: AbortSignal.timeout(CFG.timeout_s * 1000) });
      const found = r.status === 304 ? [] : r.ok ? parseFeed(await readText(r, FEED_MAX), { now }) : (() => { throw new Error(`http ${r.status}`); })();
      for (const it of found) {
        const url_hash = hashUrl(it.url);
        if (seen.has(url_hash)) continue;
        seen.add(url_hash); items++;
        rows.push(enrich({ source_id: s.id, url: canon(it.url), url_hash, title: it.title, lead: it.lead, lang: s.lang,
          published_at: it.published_at, fetched_at: iso }));
      }
      ok++;
      await db.update('sources', `id=eq.${s.id}`, { etag: r.headers?.get?.('etag') ?? s.etag ?? null,
        last_modified: r.headers?.get?.('last-modified') ?? s.last_modified ?? null, last_ok: iso, fail_count: 0, status: 'ok' });
    } catch (e) {
      const n = (s.fail_count || 0) + 1;
      failed.push({ id: s.id, err: String(e.message || e).slice(0, 120) });
      await db.update('sources', `id=eq.${s.id}`, { fail_count: n, status: n >= CFG.dead_after_failures ? 'dead' : 'ok' });
    }
  });
  const added = await db.upsert('articles', rows, 'url_hash', { ignore: true });
  return { articles: added, feeds_ok: ok, feeds_failed: failed.length, failed, items };
}
