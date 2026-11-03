// Embeds new articles with multilingual-e5-small (q8, transformers.js). Throws if the model cannot load,
// so run.mjs records embed_error and cluster.mjs skips (no mixed vector spaces, no fallback model).
import { readFileSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { patchRows } from './cluster.mjs';
const CFG = JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url), 'utf8')).cluster;
export const MODEL = CFG.embed_model;
export const textOf = (a) => `query: ${a.title}. ${(a.lead || '').slice(0, CFG.lead_chars)}`;

// transformers.js loads the file itself, so the check runs right after load: a swapped model is rejected before any vector is used or stored.
const walk = (d) => readdirSync(d).flatMap((n) => { const p = `${d}/${n}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
async function verifyModel(dir) {
  const f = walk(dir).find((p) => p.endsWith('/onnx/model_quantized.onnx') && p.includes('multilingual-e5-small'));
  if (!f) throw new Error('model file not found for hash check');
  const h = createHash('sha256'); for await (const c of createReadStream(f)) h.update(c);
  if (h.digest('hex') !== CFG.embed_sha256) { extractor = null; throw new Error('embedding model hash mismatch'); }
}

let extractor;
async function load() {
  if (extractor) return extractor;
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = process.env.V_MODEL_CACHE || './.cache';
  extractor = await pipeline('feature-extraction', MODEL, { dtype: 'q8', revision: CFG.embed_revision }); // immutable HF commit (M5)
  await verifyModel(env.cacheDir);
  return extractor;
}

// texts -> array of normalised 384-d number arrays (5 decimals)
export async function embedTexts(texts, batch = 32) {
  const ex = await load(), out = [];
  for (let i = 0; i < texts.length; i += batch) {
    const t = await ex(texts.slice(i, i + batch), { pooling: 'mean', normalize: true });
    for (const row of t.tolist()) out.push(row.map((x) => Math.round(x * 1e5) / 1e5));
  }
  return out;
}

// ctx.articles get .emb / .emb_model in place and are persisted.
export async function run(db, ctx) {
  const arts = (ctx.articles || []).filter((a) => !a.emb);
  const t0 = Date.now();
  if (!arts.length) return { embedded: 0, ms: 0 };
  const vecs = await embedTexts(arts.map(textOf));
  arts.forEach((a, i) => { a.emb = vecs[i]; a.emb_model = MODEL; });
  await patchRows(db, 'articles', arts.map((a) => ({ id: a.id, emb: a.emb, emb_model: MODEL })));
  return { embedded: arts.length, ms: Date.now() - t0 };
}
