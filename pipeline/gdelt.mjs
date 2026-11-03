// Global discovery layer: GDELT 2.0 15-minute GKG files (free, no rate limit, no key). Each row = one article from ~100k outlets.
// run(db, ctx) is a run.mjs hook: inserts new articles (source_id of known domain, else an auto-created 'gdelt' source) and pushes them to ctx.articles.
// Config (data/config.json, optional): gdelt.max_per_run (2000), gdelt.files (3 newest 15-min files per stream), gdelt.min_title_chars (15).
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { readCapped, GDELT_MAX } from './net.mjs';
import { canon, hashUrl } from './ingest.mjs';
import { cbScore } from './clickbait.mjs';
import { normDomain, lookup } from './ratings.mjs';

const CFG = (() => { try { return JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url), 'utf8')).gdelt ?? {}; } catch { return {}; } })();
export const MAX = CFG.max_per_run ?? 2000, FILES = CFG.files ?? 3, MIN_TITLE = CFG.min_title_chars ?? 15;
const BASE = 'https://data.gdeltproject.org/gdeltv2/';
const L3 = { eng: 'en', fin: 'fi', swe: 'sv', deu: 'de', fra: 'fr', spa: 'es', rus: 'ru', ukr: 'uk', nor: 'no', dan: 'da', est: 'et', pol: 'pl', ita: 'it', por: 'pt', nld: 'nl', zho: 'zh', jpn: 'ja', ara: 'ar', tur: 'tr', heb: 'he', hin: 'hi', kor: 'ko' };
const TLD = { fi: 'FI', se: 'SE', no: 'NO', dk: 'DK', ee: 'EE', is: 'IS', uk: 'GB', ie: 'IE', de: 'DE', fr: 'FR', es: 'ES', it: 'IT', nl: 'NL', pl: 'PL', ru: 'RU', ua: 'UA', in: 'IN', au: 'AU', nz: 'NZ', ca: 'CA', jp: 'JP', cn: 'CN', za: 'ZA', br: 'BR', tr: 'TR', il: 'IL', ch: 'CH', at: 'AT', be: 'BE' };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const unent = (s) => s.replace(/&#(x?)([0-9a-f]+);/gi, (_, x, n) => String.fromCodePoint(parseInt(n, x ? 16 : 10))).replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const JUNK = /^(just a moment|access denied|403|404|attention required|page not found|error|home|untitled|login|sign in|cloudflare)/i;

// Minimal single-entry zip reader (GDELT files are one deflated CSV): local header -> raw deflate.
export function unzip(buf) {
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error('not a zip');
  const start = 30 + buf.readUInt16LE(26) + buf.readUInt16LE(28);
  return buf.readUInt16LE(8) === 0 ? buf.subarray(start) : inflateRawSync(buf.subarray(start), { maxOutputLength: 5e8 });
}

export const countryOf = (domain) => TLD[domain.split('.').pop()] ?? null;
const ts = (s) => /^\d{14}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12)}Z` : null;

// GKG 2.1 TSV text -> [{url,url_hash,title,domain,lang,published_at,country,via:'gdelt'}]. Cols: 1 date, 3 source name, 4 url, 25 translation info, 26 extras.
export function parseGkg(text, { now = Date.now(), maxAgeH = 48 } = {}) {
  const rows = [], seen = new Set();
  for (const line of text.split('\n')) {
    const c = line.split('\t');
    if (c.length < 27 || !/^https?:\/\//.test(c[4])) continue;
    const title = unent((c[26].match(/<PAGE_TITLE>(.*?)<\/PAGE_TITLE>/s)?.[1] ?? '')).replace(/\s+/g, ' ').trim();
    if (title.length < MIN_TITLE || JUNK.test(title)) continue;
    let url, url_hash;
    try { url = canon(c[4]); url_hash = hashUrl(c[4]); } catch { continue; }
    if (seen.has(url_hash)) continue;
    seen.add(url_hash);
    const domain = normDomain(c[3] || new URL(url).hostname);
    const pub = ts(c[26].match(/<PAGE_PRECISEPUBTIMESTAMP>(\d{14})/)?.[1]) ?? ts(c[1]);
    if (!pub || now - Date.parse(pub) > maxAgeH * 3600e3) continue;
    const src = c[25].match(/srclc:([a-z]{3})/)?.[1];
    rows.push({ url, url_hash, title, domain, lang: src ? (L3[src] ?? src) : 'en', published_at: pub, country: countryOf(domain), via: 'gdelt' });
  }
  return rows;
}

// Pick up to `max` rows, rated outlets first (stable), at most 5% of the cap per unrated domain so one content farm cannot flood.
export function cap(rows, max = MAX) {
  const per = new Map(), perCap = Math.max(5, Math.ceil(max * 0.05));
  const keep = (r) => lookup(r.domain) || (per.set(r.domain, (per.get(r.domain) ?? 0) + 1), per.get(r.domain) <= perCap);
  const rated = rows.filter((r) => lookup(r.domain)), rest = rows.filter((r) => !lookup(r.domain) && keep(r));
  return [...rated, ...rest].slice(0, max);
}

// Candidate file URLs per stream (English GKG, translation GKG), newest first, from the lastupdate manifests. The translation stream
// lags and its newest files are often still 404, so we list 3x the wanted count and pull() takes the first `n` that exist.
export async function fileUrls(n = FILES, fetchFn = fetch) {
  const out = [];
  for (const m of ['lastupdate.txt', 'lastupdate-translation.txt']) {
    const t = await (await fetchFn(BASE + m, { signal: AbortSignal.timeout(30e3) })).text();
    const u = t.split('\n').map((l) => l.trim().split(/\s+/)[2]).find((x) => /gkg\.csv\.zip$/i.test(x ?? ''));
    if (!u) continue;
    const [, stamp, tail] = u.match(/(\d{14})\.(.+)$/);
    out.push(Array.from({ length: n * 3 }, (_, i) => BASE + new Date(Date.parse(ts(stamp)) - i * 900e3).toISOString().replace(/\D/g, '').slice(0, 14) + '.' + tail));
  }
  return out;
}

export async function pull({ fetchFn = fetch, now = Date.now(), files = FILES } = {}) {
  const streams = await fileUrls(files, fetchFn), rows = new Map(); let ok = 0, tried = 0;
  for (const urls of streams) {
    let got = 0;
    for (const u of urls) {
      if (got >= files) break;
      tried++;
      try {
        const r = await fetchFn(u, { signal: AbortSignal.timeout(90e3) });
        if (!r.ok) continue;
        for (const x of parseGkg(unzip(await readCapped(r, GDELT_MAX)).toString('utf8'), { now })) rows.set(x.url_hash, x);
        got++; ok++;
      } catch { /* one bad file never fails the run */ }
    }
  }
  return { files_ok: ok, files: tried, rows: [...rows.values()] };
}

const sid = (d) => 'g-' + d.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function run(db, ctx = {}, { fetchFn = fetch, now = Date.now(), files } = {}) {
  const p = await pull({ fetchFn, now, files }), picked = cap(p.rows);
  const known = (await db.select('sources', 'status=eq.ok&select=id,domain')).filter((s) => s.domain);
  const byDomain = new Map(known.map((s) => [normDomain(s.domain), s.id]));
  const idFor = (d) => { const parts = d.split('.'); for (let i = 0; i < parts.length - 1; i++) { const id = byDomain.get(parts.slice(i).join('.')); if (id) return id; } return null; };
  const fresh = new Map();
  for (const r of picked) if (!idFor(r.domain) && !fresh.has(r.domain)) {
    const k = lookup(r.domain);
    fresh.set(r.domain, { id: sid(r.domain), name: r.domain, domain: r.domain, country: r.country, lang: r.lang, via: 'gdelt', status: 'gdelt', flags: [],
      mbfc_lean: k?.mbfc_lean ?? null, mbfc_fact: k?.mbfc_fact ?? null, mbfc_date: k?.dataset_date ?? null });
  }
  await db.upsert('sources', [...fresh.values()], 'id', { ignore: true });
  const iso = new Date(now).toISOString();
  const arts = picked.map(({ domain, country, via, ...a }) => ({ ...a, source_id: idFor(domain) ?? sid(domain), fetched_at: iso, cb: cbScore(a.title) }));
  const added = await db.upsert('articles', arts, 'url_hash', { ignore: true });
  ctx.articles?.push(...added);
  const ds = new Set(picked.map((r) => r.domain)), rated = [...ds].filter((d) => lookup(d)).length;
  return { files_ok: p.files_ok, files: p.files, parsed: p.rows.length, kept: picked.length, new_articles: added.length, new_sources: fresh.size,
    domains: ds.size, rated_pct: ds.size ? +(100 * rated / ds.size).toFixed(1) : 0 };
}
export default run;
