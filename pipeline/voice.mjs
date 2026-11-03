// Voice tagging (blueprint 2.3 T1): political-article gate + party/MP string match -> {party: count}. No LLM.
import { readFileSync } from 'node:fs';
const D = (f) => readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const list = (l, k) => (l.match(new RegExp(`${k}:\\s*\\[([^\\]]*)\\]`))?.[1] || '').split(',').map((s) => s.trim()).filter(Boolean);
const AMBIG = new Set(['kesk', 'vihr']); // ordinary words: need capital letter + party context

const parties = D('parties.yaml').split('\n').filter((l) => /^\s*- \{code:/.test(l)).map((l) => ({
  code: l.match(/code:\s*(\w+)/)[1], seat: l.match(/seat_code:\s*(\w+)/)[1], variants: list(l, 'variants'), abbr: list(l, 'abbr') }));
const seatToCode = Object.fromEntries(parties.map((p) => [p.seat, p.code]));

const titleCase = (a) => (a.length >= 3 && a === a.toUpperCase() ? [a, a[0] + a.slice(1).toLowerCase()] : [a]); // SDP, Sdp
const stems = (v) => [v, ...(v.endsWith('us') ? [v.slice(0, -2) + 'uks'] : [])]; // kokoomus -> kokoomuksen
const rules = parties.map((p) => {
  const amb = AMBIG.has(p.code);
  const words = p.variants.flatMap(stems).map((v) => (amb ? v[0].toUpperCase() + v.slice(1) : v));
  return { code: p.code, amb,
    word: words.length ? new RegExp(`(?<![\\p{L}])(${words.map(esc).join('|')})`, amb ? 'gu' : 'giu') : null,
    abbr: p.abbr.length ? new RegExp(`(?<![\\p{L}\\d])(${p.abbr.flatMap(titleCase).map(esc).join('|')})(?![\\p{L}\\d])`, 'gu') : null };
});
// MPs: full name; ministers also by surname alone (Orpo, Orpon). Case-sensitive word-start for inflection.
const mpRules = [];
for (const m of JSON.parse(D('mps.json')).mps) {
  const code = seatToCode[m.party]; if (!code) continue;
  const parts = m.name.split(/\s+/), last = parts.at(-1);
  mpRules.push({ code, re: new RegExp(`(?<![\\p{L}])${esc(m.minister && last.length >= 4 ? last : m.name)}`, 'gu') });
}
const POLITICAL = /(?<![\p{L}])(hallitu|eduskun|kansanedustaj|ministeri|valtiovarain|valtioneuvost|puolue|vaali|äänest|oppositio|lakiesit|lakialoit|budjett|presidentti|puoluejohtaj|politiik|poliitt|verotu|riksdag|regering|politik|parliament|government|minister|election|senate|congress)/iu;
const CONTEXT = /puolue|eduskuntaryhm|kansanedustaj|puheenjohtaj|ministeri|vaali|riksdag|party/i;

export const isPolitical = (text) => POLITICAL.test(text);

export function tagVoice(text) {
  const out = {}, add = (c, n) => n && (out[c] = (out[c] || 0) + n), ctx = CONTEXT.test(text);
  for (const r of rules) {
    if (r.word && (!r.amb || ctx)) add(r.code, (text.match(r.word) || []).length);
    if (r.abbr) add(r.code, (text.match(r.abbr) || []).length);
  }
  for (const m of mpRules) add(m.code, (text.match(m.re) || []).length);
  return out;
}

// Returns {party: count} for political articles with at least one match, else null.
export function voiceOf({ title = '', lead = '', body = '' }) {
  const text = `${title}. ${lead} ${body}`;
  if (!isPolitical(text)) return null;
  const v = tagVoice(text);
  return Object.keys(v).length ? v : null;
}
