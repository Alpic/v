// Daily crowd job: collect (Bluesky/Mastodon/Reddit) -> classify new B mentions -> score -> write v_* tables. V_DRY=1 works offline-ish (files in out/).
import { select, upsert } from '../db.mjs';
import { createLlm } from '../llm.mjs';
import { readJson, outletIndex, sha } from './lib.mjs';
import * as bsky from './bluesky.mjs';
import * as masto from './mastodon.mjs';
import * as reddit from './reddit_arctic.mjs';
import { scoreAll, classify } from './score.mjs';

const idx = outletIndex(readJson('data/sources.json'));
const anchors = readJson('data/anchors.json').anchors;
const cur = Object.fromEntries((await select('crowd_cursors')).map((c) => [c.id, c.cursor]));
const stat = {};
const actorRow = (adapter, id, party, p) => ({ id, adapter, ext_id_hash: id.split(':')[1], anchor_party: party ?? null, p: p ?? null });

for (const [name, mod] of [['bluesky', bsky], ['mastodon', masto]]) {
  const mine = anchors.filter((a) => a.platform === name);
  const { shares, cursors } = await mod.fetchAnchorShares(mine, idx, { cursors: JSON.parse(cur[name] || '{}') });
  await upsert('actors', [...new Map(shares.map((s) => [s.actor, actorRow(name, s.actor, s.anchor_party, s.p)])).values()], 'id', { ignore: true });
  await upsert('shares', shares.map((s) => ({ id: sha(`${s.actor}|${s.url_hash}`), actor_id: s.actor, source_id: s.source_id, url_hash: s.url_hash, shared_at: s.shared_at, p: s.p })), 'id', { ignore: true });
  await upsert('crowd_cursors', [{ id: name, cursor: JSON.stringify(cursors) }], 'id');
  stat[`shares_${name}`] = shares.length;
}
const mentions = [...(await bsky.fetchMentions(idx)), ...(await masto.fetchMentions(idx)), ...(await reddit.fetchMentions(idx))];
const known = new Set((await select('mentions')).map((m) => m.id));
const fresh = mentions.filter((m) => !known.has(`${m.adapter}:${m.post_id}:${m.source_id}`));
const llm = createLlm({ config: { calls_per_run: +(process.env.CROWD_LLM_CALLS || 100) } });
const names = Object.fromEntries(idx.map((o) => [o.id, o.name]));
const rows = [];
for (const m of fresh) {
  const c = await classify(llm, m.text, names[m.source_id]);
  rows.push({ id: `${m.adapter}:${m.post_id}:${m.source_id}`, actor_id: m.actor, community_id: `${m.adapter}:${m.community}`, source_id: m.source_id, posted_at: m.posted_at, quote: m.text, post_url: m.post_url, text_hash: sha(m.text), stance: c.stance ?? null, lean_claim: c.lean_claim ?? null, quality_claim: c.quality_claim ?? null, models: c.models ?? null, flags: c.flags ?? [] });
}
await upsert('actors', [...new Map(fresh.map((m) => [m.actor, actorRow(m.adapter, m.actor)])).values()], 'id', { ignore: true });
await upsert('communities', [...new Set(rows.map((r) => r.community_id))].map((id) => ({ id, adapter: id.split(':')[0], name: id.split(':')[1], kind: 'platform' })), 'id', { ignore: true });
await upsert('mentions', rows, 'id', { ignore: true });
const res = await scoreAll({ shares: await select('shares'), mentions: await select('mentions') });
await upsert('outlet_audience', res.audience, 'id'); await upsert('outlet_talk', res.talk, 'id'); await upsert('validation', res.validation, 'id');
console.log(JSON.stringify({ ...stat, mentions: fresh.length, gate: res.validation[0], llm: llm.stats() }));
