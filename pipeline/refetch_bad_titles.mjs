// Repair rows stored with U+FFFD (old non-UTF-8 feed decoding): re-fetch each affected feed, match items by url hash,
// update ONLY title/lead (and the story title when it equals the broken article title). Idempotent; `--dry-run` writes nothing.
// Usage: node pipeline/refetch_bad_titles.mjs [--dry-run]
import { parseFeed, hashUrl, pool } from './ingest.mjs';
import { readText, FEED_MAX } from './net.mjs';
const BAD = '�';
const UA = 'Mozilla/5.0 (compatible; VNewsBot/1.0; +https://v.kuljento.fi)';

export async function refetchBadTitles(db, { dryRun = false, fetchFn = fetch, log = () => {} } = {}) {
  const bad = (await db.select('articles', 'select=id,source_id,url_hash,title,lead,story_id&limit=50000')).filter((a) => a.title?.includes(BAD) || a.lead?.includes(BAD));
  const res = { bad: bad.length, fixed: 0, stories: 0, feeds_failed: 0, unmatched: 0 };
  if (!bad.length) return res;
  const sources = new Map((await db.select('sources')).map((s) => [s.id, s]));
  const bySource = new Map();
  for (const a of bad) (bySource.get(a.source_id) || bySource.set(a.source_id, []).get(a.source_id)).push(a);
  const storyTitles = new Map((await db.select('stories', 'select=id,title&limit=50000')).map((s) => [s.id, s.title]));
  await pool([...bySource], 4, async ([sid, arts]) => {
    const s = sources.get(sid);
    try {
      if (!s?.feed_url) throw new Error('no feed');
      const r = await fetchFn(s.feed_url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const items = new Map(parseFeed(await readText(r, FEED_MAX), { maxAgeH: Infinity }).map((it) => [hashUrl(it.url), it]));
      for (const a of arts) {
        const it = items.get(a.url_hash);
        if (!it || it.title.includes(BAD)) { res.unmatched++; continue; }
        const patch = { title: it.title };
        if (a.lead?.includes(BAD) && it.lead && !it.lead.includes(BAD)) patch.lead = it.lead;
        log(`${a.id}: ${a.title} -> ${it.title}`);
        if (!dryRun) {
          await db.update('articles', `id=eq.${a.id}`, patch);
          if (a.story_id && storyTitles.get(a.story_id) === a.title) { await db.update('stories', `id=eq.${a.story_id}`, { title: it.title }); storyTitles.set(a.story_id, it.title); res.stories++; }
        }
        res.fixed++;
      }
    } catch { res.feeds_failed++; res.unmatched += arts.length; }
  });
  return res;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const db = await import('./db.mjs');
  const dryRun = process.argv.includes('--dry-run');
  try { console.log(JSON.stringify({ dryRun, ...(await refetchBadTitles(db, { dryRun, log: (m) => console.error(m) })) })); }
  catch (e) { console.error('refetch failed:', e.message); process.exitCode = 1; }
}
