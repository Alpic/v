// Tiny DB client: live = Postgres as role v_writer (V_DB_URL), no service key. V_DRY=1 -> JSON files in out/ (or $V_OUT) instead, so everything runs offline.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
const dry = () => process.env.V_DRY === '1';
const outDir = () => process.env.V_OUT || new URL('../out/', import.meta.url).pathname;
const file = (t) => `${outDir()}/${t}.json`;
const SEED = { sources: new URL('../data/sources.json', import.meta.url).pathname };

// Live mode: direct Postgres as the V-only role v_writer (secret V_DB_URL, Supabase pooler string). No service key, no PostgREST.
// Values travel as bind params or as one JSON text param cast server-side (jsonb_populate_record*), so column types are never guessed.
let _sql;
const sql = async () => (_sql ||= (await import('postgres')).default(process.env.V_DB_URL, { max: 4, prepare: false, idle_timeout: 20, connect_timeout: 30, onnotice: () => {} }));
const ID = /^[a-z_][a-z0-9_]*$/;
const id = (x) => { if (!ID.test(x)) throw new Error(`db bad identifier ${String(x).slice(0, 30)}`); return `"${x}"`; };
const run = async (text, params = []) => { try { return await (await sql()).unsafe(text, params); } catch (e) { throw new Error(`db ${String(e.message).slice(0, 200)}`); } };
const val = (v) => (v === 'true' ? true : v === 'false' ? false : v);
const OPS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };
const asJson = (q) => `select coalesce(jsonb_agg(to_jsonb(t)), '[]') as r from (${q}) t`; // rows as JSON: ISO dates, numeric ids (what PostgREST gave)

// PostgREST-style filter string (col=op.arg&..., select=, order=, limit=) -> SQL pieces; params get appended. pre = column qualifier.
function parts(query, params, pre = '') {
  const where = []; let cols = '*', order = '', limit = '';
  for (const [k, v] of new URLSearchParams(query)) {
    if (k === 'select') { cols = v.split(',').map(id).join(', '); continue; }
    if (k === 'order') { order = ' order by ' + v.split(',').map((o) => { const [c, d = 'asc'] = o.split('.'); return `${id(c)} ${d === 'desc' ? 'desc' : 'asc'}`; }).join(', '); continue; }
    if (k === 'limit') { limit = ` limit ${Math.max(0, parseInt(v, 10) || 0)}`; continue; }
    let [op, ...r] = v.split('.'), neg = false;
    if (op === 'not') { neg = true; [op, ...r] = r; }
    const arg = r.join('.'), col = pre + id(k);
    if (op === 'is') { const lit = { null: 'null', true: 'true', false: 'false' }[arg]; if (!lit) throw new Error('db bad is'); where.push(`${col} is ${neg ? 'not ' : ''}${lit}`); }
    else if (op === 'in') {
      const xs = arg.slice(1, -1).split(',').filter(Boolean); params.push(...xs.map(val));
      const c = xs.length ? `${col} in (${xs.map((_, i) => `$${params.length - xs.length + i + 1}`).join(',')})` : 'false';
      where.push(neg ? `not (${c})` : c);
    } else if (OPS[op] && !(neg && op !== 'eq')) { params.push(val(arg)); where.push(`${col} ${neg ? 'is distinct from' : OPS[op]} $${params.length}`); }
    else throw new Error(`db unsupported filter ${v.slice(0, 20)}`);
  }
  return { cols, where: where.length ? ' where ' + where.join(' and ') : '', order, limit };
}

const load = (t) => existsSync(file(t)) ? JSON.parse(readFileSync(file(t), 'utf8')) : SEED[t] ? JSON.parse(readFileSync(SEED[t], 'utf8')) : [];
const save = (t, rows) => { mkdirSync(outDir(), { recursive: true }); writeFileSync(file(t), JSON.stringify(rows, null, 1)); };
// Logical table names (sources, articles...) map to v_<name> in the shared Supabase project; dry-mode files keep the logical name.
const T = (t) => `v_${t}`;
const AUTO = new Set(['articles', 'stories', 'runs']);

// PostgREST filter subset for dry mode: col=eq.x, gte.x, in.(a,b), is.null/false, limit
function matches(row, q) {
  for (const [k, v] of new URLSearchParams(q)) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    const [op, ...r] = v.split('.'), arg = r.join('.'), x = row[k];
    if (op === 'eq' && String(x) !== arg) return false;
    if (op === 'gte' && !(x >= +arg)) return false;
    if (op === 'in' && !arg.slice(1, -1).split(',').includes(String(x))) return false;
    if (op === 'is' && String(x ?? null) !== arg) return false;
  }
  return true;
}

export async function select(table, query = '') {
  if (!dry()) { const p = [], q = parts(query, p); return (await run(asJson(`select ${q.cols} from ${id(T(table))}${q.where}${q.order}${q.limit}`), p))[0].r; }
  const lim = new URLSearchParams(query).get('limit');
  const rows = load(table).filter((r) => matches(r, query));
  return lim ? rows.slice(0, +lim) : rows;
}

// Returns the rows that were inserted (ignore=true) or written (merge), with ids.
export async function upsert(table, rows, onConflict, { ignore = false } = {}) {
  if (!rows.length) return [];
  if (!dry()) {
    const done = [], t = id(T(table)), cols = [...new Set(rows.flatMap(Object.keys))], cl = cols.map(id).join(', '), keys = (onConflict || '').split(',');
    const conf = onConflict ? ` on conflict (${keys.map(id).join(', ')}) ` + (ignore ? 'do nothing'
      : 'do update set ' + (cols.filter((c) => !keys.includes(c))[0] ? cols.filter((c) => !keys.includes(c)) : [cols[0]]).map((c) => `${id(c)} = excluded.${id(c)}`).join(', ')) : '';
    for (let i = 0; i < rows.length; i += 500) // jsonb_populate_recordset types JSON arrays/objects by column (real[], text[], jsonb)
      done.push(...(await run(`with i as (insert into ${t} (${cl}) select ${cl} from jsonb_populate_recordset(null::${t}, $1::text::jsonb)${conf} returning *) ${asJson('select * from i')}`, [JSON.stringify(rows.slice(i, i + 500))]))[0].r);
    return done;
  }
  const all = load(table), key = onConflict || 'id', byKey = new Map(all.map((r) => [r[key], r]));
  let next = Math.max(0, ...all.map((r) => r.id || 0)) + 1;
  const done = [];
  for (const r of rows) {
    const old = onConflict && byKey.get(r[key]);
    if (old) { if (!ignore) { Object.assign(old, r); done.push(old); } continue; }
    const n = { ...(AUTO.has(table) && !r.id ? { id: next++ } : {}), ...r };
    all.push(n); byKey.set(n[key], n); done.push(n);
  }
  save(table, all);
  return done;
}

// filter in PostgREST syntax, e.g. 'id=eq.yle'
export async function update(table, filter, patch) {
  if (!dry()) {
    const p = [JSON.stringify(patch)], q = parts(filter, p, 't.'), t = id(T(table)), set = Object.keys(patch).map((c) => `${id(c)} = r.${id(c)}`).join(', ');
    await run(`update ${t} as t set ${set} from jsonb_populate_record(null::${t}, $1::text::jsonb) r${q.where}`, p); return null;
  }
  const all = load(table);
  for (const r of all) if (matches(r, filter)) Object.assign(r, patch);
  save(table, all);
}

// name must already carry the v_ prefix (v_rank_update, v_retention, ...)
export async function rpc(name, args = {}) {
  if (dry()) return { dry: true };
  if (!/^v_[a-z_]+$/.test(name)) throw new Error('db rpc must be a v_ function');
  const ks = Object.keys(args);
  return (await run(`select ${name}(${ks.map((k, i) => `${id(k)} => $${i + 1}`).join(', ')}) as r`, ks.map((k) => args[k])))[0].r;
}
