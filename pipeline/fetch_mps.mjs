// Fetch current MPs (seating table: name, party code, minister flag) from eduskunta open data -> data/mps.json
import { writeFileSync } from 'node:fs';
const API = 'https://avoindata.eduskunta.fi/api/v1/tables/SeatingOfParliament/rows';
const out = [];
for (let page = 0; ; page++) {
  const r = await fetch(`${API}?perPage=100&page=${page}`, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`eduskunta API ${r.status}`);
  const d = await r.json();
  for (const [id, seat, last, first, party, minister] of d.rowData)
    out.push({ id, seat: +seat, name: `${first} ${last}`.trim(), party, minister: minister === 't' });
  if (!d.hasMore) break;
}
writeFileSync(new URL('../data/mps.json', import.meta.url), JSON.stringify({ fetched_on: new Date().toISOString().slice(0, 10), source: API, mps: out }, null, 1));
console.log(out.length, 'MPs');
