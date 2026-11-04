// Response size caps (M4): streams the body and aborts past `max` bytes, so a hostile or broken server cannot exhaust memory.
export async function readCapped(r, max) {
  if (+r.headers?.get?.('content-length') > max) throw new Error('too large');
  if (!r.body?.getReader) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > max) throw new Error('too large'); return b; }
  const parts = []; let n = 0;
  for await (const c of r.body) { n += c.length; if (n > max) { try { await r.body.cancel(); } catch {} throw new Error('too large'); } parts.push(c); }
  return Buffer.concat(parts);
}
// Charset-aware decode: BOM > HTTP Content-Type > XML prolog > <meta charset>. Unknown label, or UTF-8 that yields U+FFFD, falls back to windows-1252.
const label = (re, s) => s.match(re)?.[1]?.trim().toLowerCase();
export function decodeBody(buf, contentType = '') {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return new TextDecoder('utf-8').decode(buf.subarray(3));
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.subarray(2));
  const head = Buffer.from(buf.subarray(0, 2048)).toString('latin1');
  const lab = label(/charset=["']?([\w:.-]+)/i, contentType || '') || label(/^\s*<\?xml[^>]*?encoding=["']([\w:.-]+)["']/i, head) || label(/<meta[^>]+charset=["']?([\w:.-]+)/i, head);
  let dec; try { dec = lab ? new TextDecoder(lab) : null; } catch { dec = null; }
  if (dec) { const t = dec.decode(buf); if (!t.includes('�') || /^utf-?8$/i.test(lab) === false) return t; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch {}
  return new TextDecoder('windows-1252').decode(buf);
}
export const readText = async (r, max) => decodeBody(await readCapped(r, max), r.headers?.get?.('content-type') || '');
export const FEED_MAX = 5e6, PAGE_MAX = 2e6, GDELT_MAX = 2e8;
