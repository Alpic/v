// Upserts data/sources.json into v_sources (+ mbfc fields from data/ratings.json where empty). New rows are inserted with all fields
// (incl. status); existing rows get static fields only, so etag/last_ok/fail_count/status keep their runtime values.
// run.mjs calls seedIfChanged() every run; it only writes when the file hash differs from the last run's stats.sources_hash.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { lookup } from './ratings.mjs';
const FILE = new URL('../data/sources.json', import.meta.url);
const COLS = ['id', 'name', 'domain', 'country', 'lang', 'region', 'feed_url', 'via', 'owner', 'owner_type', 'tie', 'paywall', 'kind', 'flags', 'funding',
  'mbfc_lean', 'mbfc_fact', 'mbfc_date', 'mbfc_url', 'jsn_member', 'jsn_count', 'source_url', 'checked_on'];
const RUNTIME = ['status'];

export const rowsFrom = (list) => list.map((s) => {
  const r = Object.fromEntries([...COLS, ...RUNTIME].map((k) => [k, s[k] ?? (k === 'flags' ? [] : k === 'via' ? 'rss' : k === 'status' ? 'ok' : null)]));
  if (!r.mbfc_lean || !r.mbfc_fact) {
    const k = lookup(r.domain);
    if (k) { r.mbfc_lean ||= k.mbfc_lean ?? null; r.mbfc_fact ||= k.mbfc_fact ?? null; r.mbfc_date ||= k.dataset_date ?? null; }
  }
  return r;
});

export async function seed(db, list = JSON.parse(readFileSync(FILE, 'utf8'))) {
  const rows = rowsFrom(list);
  const added = await db.upsert('sources', rows, 'id', { ignore: true });
  await db.upsert('sources', rows.map(({ status, ...r }) => r), 'id'); // merge static fields only
  return { seeded: rows.length, new: added.length };
}

export const sourcesHash = () => createHash('sha1').update(readFileSync(FILE)).digest('hex').slice(0, 16);

// -> {hash, seeded?, new?}. Dry mode always seeds (no runs history to compare).
export async function seedIfChanged(db) {
  const hash = sourcesHash(), last = process.env.V_DRY === '1' ? [] : await db.select('runs', 'select=stats&order=at.desc&limit=1');
  if (last[0]?.stats?.sources_hash === hash) return { hash };
  return { hash, ...(await seed(db)) };
}
if (process.argv[1]?.endsWith('seed.mjs')) console.log(await seed(await import('./db.mjs')));
