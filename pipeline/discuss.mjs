// Public discussion volume per story (hotness signal "talk"): Reddit search JSON, Hacker News (Algolia), Mastodon search. No keys needed except an optional Mastodon token.
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

const getJson = async (fetchImpl, url, { timeout, max, headers = {} }) => {
  const r = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'application/json', ...headers }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(`http ${r.status}`);
  return JSON.parse((await readCapped(r, max)).toString('utf8'));
};
const sum = (xs, f) => xs.reduce((a, x) => a + (+f(x) || 0), 0);

// Every adapter returns { n: posts, c: comments } within the window, or throws. since = ms epoch.
export const ADAPTERS = {
  async reddit(q, since, o) {
    const j = await getJson(o.fetch, `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=new&t=week&limit=25&raw_json=1`, o);
    const xs = (j?.data?.children || []).map((c) => c.data).filter((d) => d && d.created_utc * 1000 >= since);
    return { n: xs.length, c: sum(xs, (d) => d.num_comments) };
  },
  async hn(q, since, o) {
    const j = await getJson(o.fetch, `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story&numericFilters=${encodeURIComponent('created_at_i>' + Math.floor(since / 1000))}&hitsPerPage=20`, o);
    const xs = j?.hits || [];
    return { n: Math.min(+j?.nbHits || xs.length, 1000), c: sum(xs, (h) => h.num_comments) };
  },
  async mastodon(q, since, o) { // many instances require a token for status search: without V_MASTODON_TOKEN a 401/422 is just a counted error
    const tok = process.env[o.cfg.mastodon.token_env || 'V_MASTODON_TOKEN'];
    const j = await getJson(o.fetch, `${o.cfg.mastodon.instance}/api/v2/search?q=${encodeURIComponent(q)}&type=statuses&resolve=false&limit=20`, { ...o, headers: tok ? { authorization: `Bearer ${tok}` } : {} });
    const xs = (j?.statuses || []).filter((s) => Date.parse(s.created_at) >= since);
    return { n: xs.length, c: sum(xs, (s) => s.replies_count) };
  },
};
// X / Twitter: intentionally not implemented (paid API only). Keep returning null; wire a paid client here if the founder ever buys access.
export const fetchX = async () => null;

// stories: [{id, title, title_en?}] already ordered by priority. Returns { byId: Map(id -> {talk, parts, q}), requests, errors, cached, skipped }.
export async function discuss(stories, cfg, { fetch: fetchImpl = globalThis.fetch, now = Date.now(), cachePath = DEFAULT_CACHE, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const cache = readCache(cachePath); cache.items ||= {};
  for (const [k, v] of Object.entries(cache.items)) if (now - v.t > 24 * 3600e3) delete cache.items[k]; // drop old entries so the file stays small
  const since = now - cfg.window_h * 3600e3, ttl = cfg.cache_ttl_h * 3600e3, res = { byId: new Map(), requests: 0, errors: 0, cached: 0, skipped: 0 };
  const names = Object.keys(ADAPTERS).filter((k) => cfg[k]?.enabled);
  for (const st of stories.slice(0, cfg.max_stories)) {
    const q = keywords(st.title_en || st.title);
    if (!q || !names.length) { res.skipped++; continue; }
    const key = createHash('sha256').update(q.toLowerCase()).digest('hex').slice(0, 24), hit = cache.items[key];
    if (hit && now - hit.t < ttl) { res.byId.set(st.id, { talk: hit.talk, parts: hit.parts, q }); res.cached++; continue; }
    const parts = {}; let tried = 0;
    for (const nm of names) {
      if (res.requests >= cfg.max_requests) break;
      res.requests++; tried++;
      try { parts[nm] = await ADAPTERS[nm](q, since, { fetch: fetchImpl, timeout: cfg.timeout_s * 1000, max: cfg.max_bytes, cfg }); }
      catch { res.errors++; }
      if (cfg.delay_ms) await sleep(cfg.delay_ms);
    }
    if (!tried) { res.skipped++; continue; }
    if (!Object.keys(parts).length) continue; // every source failed: no data, no cache, previous value stays
    const talk = Math.round(sum(Object.values(parts), (p) => Math.min(cfg.per_source_cap, p.n + p.c)));
    cache.items[key] = { t: now, talk, parts };
    res.byId.set(st.id, { talk, parts, q });
  }
  writeCache(cachePath, cache);
  return res;
}
