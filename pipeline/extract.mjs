// Readability body extraction for given articles [{id, url}] (caller picks stories with >= 2 outlets). Success -> body_ok=true; failure -> body_ok=null (tried once, never retried: run.mjs only selects body_ok=false).
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import { pool } from './ingest.mjs';
import { readText, PAGE_MAX } from './net.mjs';

// Public http(s) URLs only (no IP literals, localhost or internal names): limits SSRF from feed-supplied links.
const publicUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) && !/^(\[|\d+\.\d+\.\d+\.\d+$)|^localhost$|\.(local|internal|lan)$|^[^.]+$/i.test(x.hostname); } catch { return false; } };

export async function extractBodies(db, articles, { fetchFn = fetch, cap = 20000, timeout = 10000 } = {}) {
  let ok = 0, bad = 0;
  await pool(articles, 4, async (a) => {
    let body = null;
    try {
      if (!publicUrl(a.url)) throw new Error('blocked url');
      const r = await fetchFn(a.url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; VNewsBot/1.0)' }, signal: AbortSignal.timeout(timeout) });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const { document } = parseHTML(await readText(r, PAGE_MAX));
      body = (new Readability(document).parse()?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, cap);
      if (body.length < 200) body = null;
    } catch { body = null; }
    if (body) { await db.upsert('bodies', [{ article_id: a.id, body }], 'article_id'); ok++; } else bad++;
    await db.update('articles', `id=eq.${a.id}`, { body_ok: body ? true : null });
  });
  return { ok, failed: bad };
}
