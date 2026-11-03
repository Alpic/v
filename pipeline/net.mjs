// Response size caps (M4): streams the body and aborts past `max` bytes, so a hostile or broken server cannot exhaust memory.
export async function readCapped(r, max) {
  if (+r.headers?.get?.('content-length') > max) throw new Error('too large');
  if (!r.body?.getReader) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > max) throw new Error('too large'); return b; }
  const parts = []; let n = 0;
  for await (const c of r.body) { n += c.length; if (n > max) { try { await r.body.cancel(); } catch {} throw new Error('too large'); } parts.push(c); }
  return Buffer.concat(parts);
}
export const readText = async (r, max) => (await readCapped(r, max)).toString('utf8');
export const FEED_MAX = 5e6, PAGE_MAX = 2e6, GDELT_MAX = 2e8;
