// Public discussion volume per story (hotness signal "talk"). Probed 2026-11-04 from a datacentre IP, unauthenticated: Bluesky api.bsky.app searchPosts 200 (public.api.bsky.app 403), HN Algolia 200,
// Reddit search.json 403 (blocked) but search.rss 200/429 (flaky, counts posts only), Mastodon /api/v2/search 200 but ALWAYS EMPTY without a token (so it runs only when V_MASTODON_TOKEN is set).
// X/Twitter: no free public search API (paid tier), so fetchX is a documented stub behind config discussion.x.enabled (false).
// Budget: at most cfg.max_requests HTTP requests per run (cache hits cost none), timeout per request, politeness delay, ONE failure never stops the run.
// Cache: .cache/discuss.json (or $V_CACHE_DIR), key = sha256 of the query, TTL cfg.cache_ttl_h. Only counts leave this module: no post text is kept.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readCapped } from './net.mjs';

const DEFAULT_CACHE = process.env.V_CACHE_DIR ? `${process.env.V_CACHE_DIR}/discuss.json` : new URL('../.cache/discuss.json', import.meta.url).pathname;
const readCache = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; } };
const writeCache = (p, c) => { try { mkdirSync(p.replace(/\/[^/]*$/, ''), { recursive: true }); writeFileSync(p, JSON.stringify(c)); } catch {} };
const UA = 'V-news-reader/1.0 (internal research tool; no scraping of content, counts only)';
const STOP = new Set('this that with from have will would could their about after before which while where there these those into over under than then they them what when your been were also just said says more most very some such only other another still'.split(' ')
  .concat('että joka jotka mutta sekä tämä nämä sitä siitä koska kuin vain myös ollut oli ovat olla tulee jälkeen ennen kanssa mukaan uusi uuden'.split(' ')));

// 2-3 distinctive words from a headline: capitalised words (names) first, then longer words. Short or stop words are dropped. '' = not searchable.
export function keywords(title, n = 3) {
  const toks = (String(title || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).map((w, i) => ({ w, i, cap: i > 0 && /^\p{Lu}/u.test(w) }));
  const ok = toks.filter((x) => x.w.length >= 4 && !STOP.has(x.w.toLowerCase()));
  const pick = [...ok].sort((a, b) => (b.cap - a.cap) || (b.w.length - a.w.length)).slice(0, n).sort((a, b) => a.i - b.i);
  return pick.map((x) => x.w).join(' ');
}

const get = async (fetchImpl, url, { timeout, max, headers = {}, accept = 'application/json' }) => {
  const r = await fetchImpl(url, { headers: { 'user-agent': UA, accept, ...headers }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(`http ${r.status}`);
  return (await readCapped(r, max)).toString('utf8');
};
const getJson = async (f, url, o) => JSON.parse(await get(f, url, o));
const sum = (xs, f) => xs.reduce((a, x) => a + (+f(x) || 0), 0);

// Every adapter returns { n: posts, c: comments/replies } within the window, or throws. since = ms epoch.
export const ADAPTERS = {
  async bluesky(q, since, o) { // works unauthenticated on api.bsky.app, any language (Finnish too)
    const j = await getJson(o.fetch, `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&sort=latest&limit=50&since=${encodeURIComponent(new Date(since).toISOString())}`, o);
    const xs = j?.posts || [];
    return { n: xs.length, c: sum(xs, (p) => (p.replyCount || 0) + (p.quoteCount || 0)) };
  },
  async hn(q, since, o) {
    const j = await getJson(o.fetch, `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story&numericFilters=${encodeURIComponent('created_at_i>' + Math.floor(since / 1000))}&hitsPerPage=20`, o);
    const xs = j?.hits || [];
    return { n: Math.min(+j?.nbHits || xs.length, 1000), c: sum(xs, (h) => h.num_comments) };
  },
  async reddit(q, since, o) { // search.json is 403 for datacentre IPs; the Atom feed still answers (sometimes 429). No comment counts in RSS: posts only.
    const x = await get(o.fetch, `https://www.reddit.com/search.rss?q=${encodeURIComponent(q)}&sort=new&t=week&limit=25`, { ...o, accept: 'application/atom+xml' });
    const n = [...x.matchAll(/<entry>[\s\S]*?<(?:updated|published)>([^<]+)</g)].filter((m) => Date.parse(m[1]) >= since).length;
    return { n, c: 0 };
  },
  async mastodon(q, since, o) { // status search needs a token on essentially every instance (empty 200 otherwise): only used when the token env var is set
    const tok = process.env[o.cfg.mastodon.token_env || 'V_MASTODON_TOKEN'];
    const j = await getJson(o.fetch, `${o.cfg.mastodon.instance}/api/v2/search?q=${encodeURIComponent(q)}&type=statuses&resolve=false&limit=20`, { ...o, headers: { authorization: `Bearer ${tok}` } });
    const xs = (j?.statuses || []).filter((s) => Date.parse(s.created_at) >= since);
    return { n: xs.length, c: sum(xs, (s) => s.replies_count) };
  },
};
const usable = (nm, cfg) => cfg[nm]?.enabled && (nm !== 'mastodon' || process.env[cfg.mastodon.token_env || 'V_MASTODON_TOKEN']);
// X / Twitter: intentionally not implemented (paid API only). Keep returning null; wire a paid client here if the founder ever buys access.
export const fetchX = async () => null;

// stories: [{id, title, title_en?}] already ordered by priority. Returns { byId: Map(id -> {talk, parts, q}), requests, errors, cached, skipped, src: {name: {req, ok, hits}} }.
// Two passes so a small budget spreads over many stories: pass 1 = first source (Bluesky) for every story, pass 2 = the rest while budget remains.
// A source with cfg.breaker consecutive errors is switched off for the rest of the run (dead source costs no more requests).
export async function discuss(stories, cfg, { fetch: fetchImpl = globalThis.fetch, now = Date.now(), cachePath = DEFAULT_CACHE, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const cache = readCache(cachePath); cache.items ||= {};
  for (const [k, v] of Object.entries(cache.items)) if (now - v.t > 24 * 3600e3) delete cache.items[k]; // drop old entries so the file stays small
  const since = now - cfg.window_h * 3600e3, ttl = cfg.cache_ttl_h * 3600e3, res = { byId: new Map(), requests: 0, errors: 0, cached: 0, skipped: 0, src: {} };
  const names = Object.keys(ADAPTERS).filter((k) => usable(k, cfg)), fails = {}, breaker = cfg.breaker || 3;
  const work = [];
  for (const st of stories.slice(0, cfg.max_stories)) {
    const q = keywords(st.title_en || st.title);
    if (!q || !names.length) { res.skipped++; continue; }
    const key = createHash('sha256').update(q.toLowerCase()).digest('hex').slice(0, 24), hit = cache.items[key];
    const parts = hit && now - hit.t < ttl ? { ...hit.parts } : {}; // fresh cache: sources already answered are not asked again
    work.push({ st, q, key, parts, fresh: Object.keys(parts).length > 0, asked: false });
  }
  for (const pass of [names.slice(0, 1), names.slice(1)]) for (const w of work) for (const nm of pass) {
    if (w.parts[nm] || fails[nm] >= breaker || res.requests >= cfg.max_requests) continue;
    const s = (res.src[nm] ||= { req: 0, ok: 0, hits: 0 }); res.requests++; s.req++; w.asked = true;
    try { w.parts[nm] = await ADAPTERS[nm](w.q, since, { fetch: fetchImpl, timeout: cfg.timeout_s * 1000, max: cfg.max_bytes, cfg }); s.ok++; fails[nm] = 0; if (w.parts[nm].n + w.parts[nm].c > 0) s.hits++; }
    catch { res.errors++; fails[nm] = (fails[nm] || 0) + 1; }
    if (cfg.delay_ms) await sleep(cfg.delay_ms);
  }
  for (const w of work) {
    if (!w.asked && w.fresh) res.cached++;
    if (!Object.keys(w.parts).length) { if (!w.asked) res.skipped++; continue; } // every source failed or was skipped: no data, no cache, previous value stays
    const talk = Math.round(sum(Object.values(w.parts), (p) => Math.min(cfg.per_source_cap, p.n + p.c)));
    if (w.asked) cache.items[w.key] = { t: now, talk, parts: w.parts };
    res.byId.set(w.st.id, { talk, parts: w.parts, q: w.q });
  }
  writeCache(cachePath, cache);
  return res;
}
