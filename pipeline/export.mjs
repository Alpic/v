// Weekly public dump: data/export/sources.json + outlet_lean.json (from v_sources / v_outlet_lean). Run with the service key.
import { writeFileSync, mkdirSync } from 'node:fs';
import * as db from './db.mjs';
const dir = new URL('../data/export/', import.meta.url);
mkdirSync(dir, { recursive: true });
const SRC = 'id,name,domain,country,lang,region,via,owner,owner_type,tie,paywall,kind,funding,flags,mbfc_lean,mbfc_fact,mbfc_date,mbfc_url,jsn_member,jsn_count,source_url,checked_on,status';
for (const [t, q, f] of [['sources', `select=${SRC}&order=id`, 'sources'], ['outlet_lean', 'select=*&order=source_id', 'outlet_lean']]) {
  const rows = await db.select(t, q);
  writeFileSync(new URL(`${f}.json`, dir), JSON.stringify(rows, null, 1) + '\n');
  console.log(f, rows.length);
}
