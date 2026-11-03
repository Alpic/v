// Mastodon adapter (public endpoints, no auth). A: anchor statuses -> outlet links. B: Finnish tag timelines filtered by outlet.
import { getJson, extractLinks, mentionedOutlets, authorHash, sha, short } from './lib.mjs';
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const hrefs = (html) => [...html.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
const linksOf = (s) => [...hrefs(s.content || ''), ...(s.card?.url ? [s.card.url] : [])];

export async function lookup(acct) { // acct = user@instance
  const [user, inst] = acct.replace(/^@/, '').split('@');
  try { const a = await getJson(`https://${inst}/api/v1/accounts/lookup?acct=${user}`, { retries: 1, gap: 100 }); return { inst, id: a.id, handle: `${a.acct.split('@')[0]}@${inst}`, name: a.display_name }; } catch { return null; }
}
export async function fetchAnchorShares(anchors, idx, { cursors = {}, limit = 100 } = {}) {
  const shares = [], next = { ...cursors };
  for (const a of anchors) {
    const acc = await lookup(a.handle); if (!acc) continue;
    let max = cursors[a.handle], got = 0, newest = max;
    while (got < limit) {
      const r = await getJson(`https://${acc.inst}/api/v1/accounts/${acc.id}/statuses?exclude_replies=true&exclude_reblogs=true&limit=40${max ? `&since_id=${max}` : ''}`).catch(() => []);
      if (!r.length) break;
      got += r.length; newest = r.reduce((m, s) => (BigInt(s.id) > BigInt(m || 0) ? s.id : m), newest);
      for (const s of r) for (const l of extractLinks(linksOf(s), idx))
        shares.push({ adapter: 'mastodon', actor: authorHash('mastodon', a.handle), anchor_party: a.party, p: a.p, ...l, post_id: sha(s.uri), shared_at: s.created_at });
      break; // since_id paging returns newest-first pages; one page per run is enough for daily cron
    }
    next[a.handle] = newest;
  }
  return { shares, cursors: next };
}
export async function fetchMentions(idx, { tags = ['suomi', 'uutiset'], instances = ['mastodon.social', 'mastodontti.fi'], limit = 40 } = {}) {
  const out = [], seen = new Set();
  for (const inst of instances) for (const tag of tags) {
    const r = await getJson(`https://${inst}/api/v1/timelines/tag/${tag}?limit=${limit}`).catch(() => []);
    for (const s of r) {
      if (seen.has(s.uri)) continue; seen.add(s.uri);
      const text = strip(s.content || ''), links = linksOf(s);
      for (const sid of new Set([...mentionedOutlets(text, idx), ...extractLinks(links, idx).map((l) => l.source_id)]))
        out.push({ adapter: 'mastodon', actor: authorHash('mastodon', s.account.url), source_id: sid, post_url: s.url, post_id: sha(s.uri), posted_at: s.created_at, text: short(text), community: inst });
    }
  }
  return out;
}
