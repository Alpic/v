// Bluesky adapter. Signal A: anchors' own posts -> outlet links. Signal B: mention search per outlet.
import { getJson, extractLinks, mentionedOutlets, authorHash, sha, short } from './lib.mjs';
const API = 'https://api.bsky.app/xrpc';
const linksOf = (post) => {
  const rec = post.record || {}, u = [];
  for (const f of rec.facets || []) for (const x of f.features || []) if (x.uri) u.push(x.uri);
  if (post.embed?.external?.uri) u.push(post.embed.external.uri);
  return u;
};
const postUrl = (p) => `https://bsky.app/profile/${p.author.handle}/post/${p.uri.split('/').pop()}`;

// anchors: [{handle, party, p}]; cursors: {handle: lastSeenISO}. Returns {shares, cursors}.
export async function fetchAnchorShares(anchors, idx, { cursors = {}, limit = 100 } = {}) {
  const shares = [], next = { ...cursors };
  for (const a of anchors) {
    const since = cursors[a.handle] || '';
    let cursor, got = 0, newest = since;
    do {
      const r = await getJson(`${API}/app.bsky.feed.getAuthorFeed?actor=${a.handle}&filter=posts_no_replies&limit=${Math.min(100, limit - got)}${cursor ? `&cursor=${cursor}` : ''}`).catch(() => null);
      if (!r) break;
      for (const it of r.feed) {
        got++;
        if (it.reason || it.post.author.handle !== a.handle) continue; // reposts are not the anchor's own link
        const at = it.post.record?.createdAt || it.post.indexedAt;
        if (at <= since) continue;
        if (at > newest) newest = at;
        for (const l of extractLinks(linksOf(it.post), idx))
          shares.push({ adapter: 'bluesky', actor: authorHash('bluesky', it.post.author.did), anchor_party: a.party, p: a.p, ...l, post_id: sha(it.post.uri), shared_at: at });
      }
      cursor = r.cursor;
    } while (cursor && got < limit);
    next[a.handle] = newest;
  }
  return { shares, cursors: next };
}

// B candidates: search by domain and by name. Returns mention rows (short text only).
export async function fetchMentions(idx, { limit = 25, since } = {}) {
  const out = [], seen = new Set();
  for (const o of idx) {
    for (const q of [`domain=${o.domain}&q=${encodeURIComponent(o.name)}`, `q=${encodeURIComponent(`"${o.name}"`)}`]) {
      const r = await getJson(`${API}/app.bsky.feed.searchPosts?${q}&lang=fi&sort=latest&limit=${limit}${since ? `&since=${since}` : ''}`).catch(() => null);
      for (const p of r?.posts || []) {
        if (seen.has(p.uri)) continue; seen.add(p.uri);
        const text = p.record?.text || '';
        if (!mentionedOutlets(text, [o]).length && !extractLinks(linksOf(p), [o]).length) continue;
        out.push({ adapter: 'bluesky', actor: authorHash('bluesky', p.author.did), source_id: o.id, post_url: postUrl(p), post_id: sha(p.uri), posted_at: p.record?.createdAt || p.indexedAt, text: short(text), community: 'bluesky' });
      }
    }
  }
  return out;
}
export async function checkHandle(handle) {
  try { const p = await getJson(`${API}/app.bsky.actor.getProfile?actor=${handle}`, { retries: 1, gap: 100 }); return { did: p.did, handle: p.handle, name: p.displayName || '' }; } catch { return null; }
}
