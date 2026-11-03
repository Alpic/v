// Shared helpers for crowd adapters (signals A/B). No persistence of raw author ids: only salted hashes.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url).pathname;
export const sha = (s, n = 16) => createHash('sha256').update(String(s)).digest('hex').slice(0, n);
export const authorHash = (adapter, id) => `${adapter}:${sha(`${process.env.CROWD_SALT || 'v'}|${adapter}|${id}`)}`;
export const readJson = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getJson(url, { retries = 2, gap = 250, headers = {} } = {}) {
  for (let i = 0; ; i++) {
    await sleep(gap); // polite spacing; Mastodon default is 300 req / 5 min per IP
    const r = await fetch(url, { headers: { 'user-agent': 'v-crowd/1.0 (jesse@kuljento.fi)', accept: 'application/json', ...headers }, signal: AbortSignal.timeout(20000) });
    if (r.ok) return r.json();
    if ((r.status === 429 || r.status >= 500) && i < retries) { await sleep(Number(r.headers.get('retry-after') || 5) * 1000 * (i + 1)); continue; }
    throw new Error(`${r.status} ${url.slice(0, 90)}`);
  }
}

// Outlet matching by host (own domains only; path-scoped entries like yle.fi/news are skipped). Longest suffix wins.
export function outletIndex(sources, country = 'FI') {
  return sources.filter((s) => (!country || s.country === country) && !s.domain.includes('/')).map((s) => ({ id: s.id, name: s.name, domain: s.domain }));
}
export function outletOfUrl(url, idx) {
  let h; try { h = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
  let best = null;
  for (const o of idx) if ((h === o.domain || h.endsWith('.' + o.domain)) && (!best || o.domain.length > best.domain.length)) best = o;
  return best?.id ?? null;
}
// All outlet links in a list of URLs -> [{url, url_hash, source_id}] (deduped; tracking query dropped for hashing).
export function extractLinks(urls, idx) {
  const seen = new Set(), out = [];
  for (const u of urls) {
    const sid = outletOfUrl(u, idx); if (!sid) continue;
    const c = new URL(u); c.search = ''; c.hash = '';
    const h = sha(c.href.replace(/\/$/, '')); if (seen.has(h)) continue; seen.add(h);
    out.push({ url: c.href, url_hash: h, source_id: sid });
  }
  return out;
}
// Which outlets does free text mention? By domain or by name (word boundary, case-insensitive; names <5 chars need domain).
export function mentionedOutlets(text, idx) {
  const t = text.toLowerCase(), res = new Set();
  for (const o of idx) {
    if (t.includes(o.domain)) res.add(o.id);
    else if (o.name.length >= 5 && new RegExp(`(^|[^\\p{L}])${o.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(t)) res.add(o.id);
  }
  return [...res];
}
export const short = (s) => String(s).replace(/\s+/g, ' ').trim().slice(0, 500);
export const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
