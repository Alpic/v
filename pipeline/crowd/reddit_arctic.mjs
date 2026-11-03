// Reddit via Arctic Shift (community-run archive). Signal B only: no subreddit has a documented lean, so no Tier 2 anchors.
import { getJson, extractLinks, mentionedOutlets, authorHash, sha, short } from './lib.mjs';
const AS = 'https://arctic-shift.photon-reddit.com/api';
export async function fetchMentions(idx, { subs = ['Suomi', 'Finland'], after, limit = 100 } = {}) {
  const out = [];
  for (const sub of subs) {
    const r = await getJson(`${AS}/posts/search?subreddit=${sub}&limit=${limit}&sort=desc${after ? `&after=${after}` : ''}`).catch(() => ({ data: [] }));
    for (const p of r.data || []) {
      const text = `${p.title || ''} ${p.selftext || ''}`, urls = [p.url].filter(Boolean);
      const hit = new Set([...mentionedOutlets(text, idx), ...extractLinks(urls, idx).map((l) => l.source_id)]);
      for (const sid of hit) out.push({ adapter: 'reddit', actor: authorHash('reddit', p.author), source_id: sid, post_url: `https://reddit.com${p.permalink}`, post_id: sha(p.id), posted_at: new Date(p.created_utc * 1000).toISOString(), text: short(text), community: `r/${sub}` });
    }
  }
  return out;
}
