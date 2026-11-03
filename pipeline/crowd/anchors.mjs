// Build data/anchors.json: current MPs (mps.json names) + party accounts with a Wikidata Bluesky (P12361) / Mastodon (P4033) handle,
// each verified to resolve. Usage: node pipeline/crowd/anchors.mjs   (NODE_USE_ENV_PROXY=1 behind a proxy)
import { writeFileSync, readFileSync } from 'node:fs';
import { readJson, getJson } from './lib.mjs';
import { checkHandle } from './bluesky.mjs';
import { lookup } from './mastodon.mjs';
const sparql = (q) => getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { gap: 1000 }).then((r) => r.results.bindings);
const MPS = `SELECT ?p ?l ?bsky ?masto WHERE { ?p wdt:P31 wd:Q5; p:P39 ?st. ?st ps:P39 wd:Q17592486. FILTER NOT EXISTS{?st pq:P582 ?e}
 OPTIONAL{?p wdt:P12361 ?bsky} OPTIONAL{?p wdt:P4033 ?masto} FILTER(BOUND(?bsky)||BOUND(?masto)) ?p rdfs:label ?l. FILTER(LANG(?l)="fi") }`;
const PARTIES = `SELECT ?p ?l ?bsky ?masto WHERE { ?p wdt:P31 wd:Q7278; wdt:P17 wd:Q33. OPTIONAL{?p wdt:P12361 ?bsky} OPTIONAL{?p wdt:P4033 ?masto}
 FILTER(BOUND(?bsky)||BOUND(?masto)) ?p rdfs:label ?l. FILTER(LANG(?l)="fi") }`;
const norm = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const partyOf = (label, parties) => parties.find((x) => [x.name, ...x.variants].some((v) => norm(label).includes(norm(v))))?.code;

export async function build() {
  const mps = readJson('data/mps.json').mps, byName = new Map(mps.map((m) => [norm(m.name), m]));
  const parties = parseParties();
  const pPos = Object.fromEntries(parties.map((x) => [x.code, x.p]));
  const out = [], seen = new Set();
  const add = async (kind, name, party, bsky, masto, via) => {
    if (!party) return;
    for (const [platform, h] of [['bluesky', bsky], ['mastodon', masto]]) {
      if (!h || seen.has(platform + h.toLowerCase())) continue;
      const ok = platform === 'bluesky' ? await checkHandle(h) : await lookup(h);
      if (!ok) continue;
      seen.add(platform + h.toLowerCase());
      out.push({ platform, handle: platform === 'bluesky' ? ok.handle : ok.handle, name, kind, party, p: pPos[party], verified: via, checked_on: new Date().toISOString().slice(0, 10) });
    }
  };
  for (const r of await sparql(MPS)) { const m = byName.get(norm(r.l.value)); if (m) await add('mp', m.name, m.party, r.bsky?.value, r.masto?.value, `wikidata:${r.p.value.split('/').pop()}+eduskunta:${m.id}`); }
  // Wikidata covers almost no sitting MPs, so also search Bluesky by name: accept only an exact display-name match whose bio says MP/eduskunta.
  const BIO = /kansanedustaja|eduskunta|riksdagsledamot|\bMP\b|member of (the )?(finnish )?parliament/i;
  for (const m of mps) {
    if (out.some((a) => a.name === m.name)) continue;
    const r = await getJson(`https://api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(m.name)}&limit=5`, { gap: 150 }).catch(() => null);
    const hit = r?.actors?.find((a) => norm(a.displayName || '') === norm(m.name) && BIO.test(a.description || ''));
    if (hit) await add('mp', m.name, m.party, hit.handle, null, `bluesky-bio:${hit.did}+eduskunta:${m.id}`);
  }
  // Hand-checked party accounts (Wikidata has none): handle is a domain the party controls (DNS-verified handle).
  await add('party', 'Vihreät', 'vihr', 'vihreat.fi', null, 'bluesky domain handle = party domain vihreat.fi');
  for (const r of await sparql(PARTIES)) await add('party', r.l.value, partyOf(r.l.value, parties), r.bsky?.value, r.masto?.value, `wikidata:${r.p.value.split('/').pop()}`);
  return out;
}
// parties.yaml is flat one-line records; a tiny parser avoids a yaml dependency.
export function parseParties(text = readFileSync(new URL('../../data/parties.yaml', import.meta.url), 'utf8')) {
  return text.split('\n').filter((l) => /^\s*- \{code:/.test(l)).map((l) => ({
    code: l.match(/code:\s*(\w+)/)[1], name: l.match(/name:\s*([^,]+),/)[1].trim(), p: +l.match(/\bp:\s*(-?[\d.]+)/)[1],
    variants: (l.match(/variants:\s*\[([^\]]*)\]/)?.[1] || '').split(',').map((s) => s.trim()).filter(Boolean) }));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const anchors = await build();
  const extra = JSON.parse(readFileSync(new URL('../../data/anchors.json', import.meta.url), 'utf8').toString() || '{}').manual || [];
  writeFileSync(new URL('../../data/anchors.json', import.meta.url), JSON.stringify({ built_on: new Date().toISOString().slice(0, 10), source: 'Wikidata P12361/P4033 x data/mps.json; handles verified via API', anchors, manual: extra }, null, 1));
  const c = {}; for (const a of anchors) c[`${a.platform}/${a.kind}`] = (c[`${a.platform}/${a.kind}`] || 0) + 1;
  console.log(c, 'total', anchors.length);
}
