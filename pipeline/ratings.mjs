// Bulk outlet ratings by domain (data/ratings.json: {domain: {mbfc_lean, mbfc_fact, source, dataset_date}}).
// Built offline by merging public MBFC-derived HF datasets, newest wins: zainmujahid/mbfc-media-outlets (2025-10-13, 3577 rows) over
// sergioburdisso/news_media_bias_and_factuality (2024-10-28, 3920 rows). mbfc_lean uses the MBFC labels of config.lean_map.
import { readFileSync } from 'node:fs';

export const LEAN_V = { Left: -2, 'Left-Center': -1, 'Least Biased': 0, 'Right-Center': 1, Right: 2 }; // blueprint §2.2; other labels -> no v
let R = null;
const table = () => R ??= JSON.parse(readFileSync(new URL('../data/ratings.json', import.meta.url), 'utf8'));
export const setTable = (t) => { R = t; }; // tests

// "https://WWW.Foo.co.uk:80/x" -> "foo.co.uk"
export function normDomain(s) {
  s = String(s ?? '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/^[^@]*@/, '').replace(/:\d+$/, '').replace(/\.$/, '');
  return s.replace(/^www\d?\./, '');
}

// Exact match first, then strip leading labels (m.foo.com, edition.cnn.com -> cnn.com). -> {domain, mbfc_lean, mbfc_fact, v, source, dataset_date} | null
export function lookup(domain) {
  const t = table(), parts = normDomain(domain).split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const d = parts.slice(i).join('.'), r = t[d];
    if (r) return { domain: d, ...r, v: LEAN_V[r.mbfc_lean] ?? null };
  }
  return null;
}

// coverage of a list of domains: {n, rated, pct}
export function coverage(domains) {
  const ds = [...new Set(domains.map(normDomain))], rated = ds.filter((d) => lookup(d)).length;
  return { n: ds.length, rated, pct: ds.length ? +(100 * rated / ds.length).toFixed(1) : 0 };
}
