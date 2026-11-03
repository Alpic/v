import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
process.env.V_DRY = '1';
process.env.V_OUT = mkdtempSync(`${tmpdir()}/v-seed-`);
writeFileSync(`${process.env.V_OUT}/sources.json`, '[]'); // own fixture: never the real data/sources.json
const db = await import('../pipeline/db.mjs');
const { seed, rowsFrom } = await import('../pipeline/seed.mjs');
const { rankStories } = await import('../pipeline/rank.mjs');

test('seed: inserts new, keeps runtime status of existing, fills mbfc from ratings', async () => {
  const list = [{ id: 'x', name: 'X', domain: 'x.fi', status: 'ok', group: 'fi' }, { id: 'bbc', name: 'BBC', domain: 'bbc.com' }];
  assert.equal((await seed(db, list)).new, 2);
  await db.update('sources', 'id=eq.x', { status: 'dead', fail_count: 3 });
  assert.equal((await seed(db, list)).new, 0);
  const x = (await db.select('sources', 'id=eq.x'))[0];
  assert.equal(x.status, 'dead'); assert.equal(x.fail_count, 3); assert.ok(!('group' in x));
  assert.ok(rowsFrom(list)[1].mbfc_lean);
});

test('rank: stable ordering by score', () => {
  const r = rankStories([{ id: 1, last_at: new Date().toISOString(), n_articles: 3, outlets: 1 }, { id: 2, last_at: new Date().toISOString(), n_articles: 9, outlets: 4 }]);
  assert.equal(r[0].id, 2);
});
