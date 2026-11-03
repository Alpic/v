// LLM rotation (port of tools/ask.sh): each GEMINI*KEY* x (flash-lite, flash) -> OpenRouter ":free" ids only.
// Cooling per (key,model) on 429/5xx/bad JSON; daily-quota 429 disables the slot for the run; per-run call budget.
import { readFileSync, writeFileSync } from 'node:fs';
const OR_DEFAULT = ['nvidia/nemotron-3-super-120b-a12b:free', 'nvidia/nemotron-3-ultra-550b-a55b:free', 'nvidia/nemotron-3.5-lightning:free', 'google/gemma-4-31b-it:free', 'qwen/qwen3.8-27b:free'];
const GEM = 'https://generativelanguage.googleapis.com/v1beta/models';
const parseJson = (t) => { try { return JSON.parse(String(t).replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')); } catch { return undefined; } };

// Pick the newest non-preview "gemini-<ver>-<kind>" id from a ListModels result; fall back to 2.5.
export function resolveGeminiModels(names, kinds) {
  return kinds.map((k) => {
    const re = new RegExp(`^gemini-(\\d+(?:\\.\\d+)?)-${k}$`);
    const best = names.map((n) => n.replace(/^models\//, '')).filter((n) => re.test(n)).sort((a, b) => parseFloat(b.match(re)[1]) - parseFloat(a.match(re)[1]))[0];
    return best || `gemini-2.5-${k}`;
  });
}

export function createLlm({ config = {}, env = process.env, fetch: f = globalThis.fetch, now = () => Date.now(), cachePath, orModels, timeoutMs = 60000 } = {}) {
  const cfg = { calls_per_run: 40, cool_s: 60, gemini_models: ['flash-lite', 'flash'], openrouter_suffix: ':free', ...(config.llm || config) };
  const stats = { calls: 0, failures: 0, by_model: {} };
  const cool = new Map(); // slot id -> until ms (Infinity = disabled for the run)
  let slots;
  async function buildSlots() {
    if (slots) return slots;
    const keys = Object.keys(env).filter((k) => /^GEMINI.*KEY/.test(k) && env[k]).sort();
    let models = cfg.gemini_models.map((k) => `gemini-2.5-${k}`);
    if (keys.length) {
      let names;
      try { names = JSON.parse(readFileSync(cachePath, 'utf8')).names; } catch {}
      if (!names) try {
        const r = await f(`${GEM}?pageSize=200`, { headers: { 'x-goog-api-key': env[keys[0]] }, signal: AbortSignal.timeout(15000) });
        names = JSON.parse(await r.text()).models.map((m) => m.name);
        if (cachePath) try { writeFileSync(cachePath, JSON.stringify({ at: new Date(now()).toISOString(), names })); } catch {}
      } catch {}
      if (names) models = resolveGeminiModels(names, cfg.gemini_models);
    }
    slots = [];
    for (const model of models) for (const k of keys) slots.push({ id: `${k}/${model}`, kind: 'gemini', key: env[k], model });
    const free = (orModels || OR_DEFAULT).filter((m) => m.endsWith(cfg.openrouter_suffix)); // refuse non-free
    if (env.OPENROUTER_API_KEY) for (const model of free) slots.push({ id: `or/${model}`, kind: 'or', key: env.OPENROUTER_API_KEY, model });
    return slots;
  }
  async function call(s, prompt, json, maxTokens) {
    const sig = AbortSignal.timeout(timeoutMs);
    if (s.kind === 'gemini') {
      const gc = { temperature: 0, ...(maxTokens && { maxOutputTokens: maxTokens }), ...(json && { responseMimeType: 'application/json' }) };
      const r = await f(`${GEM}/${s.model}:generateContent`, { method: 'POST', signal: sig, headers: { 'x-goog-api-key': s.key, 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: gc }) });
      return { r, text: async (b) => b?.candidates?.[0]?.content?.parts?.[0]?.text };
    }
    const r = await f('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', signal: sig, headers: { authorization: `Bearer ${s.key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: s.model, temperature: 0, ...(maxTokens && { max_tokens: maxTokens }), messages: [{ role: 'user', content: prompt }] }) });
    return { r, text: async (b) => b?.choices?.[0]?.message?.content };
  }
  // -> {text, model, json?} or null (budget spent / everything cooling).
  async function ask(prompt, { json = false, maxTokens, exclude } = {}) {
    for (const s of await buildSlots()) {
      if (stats.calls >= cfg.calls_per_run) return null;
      if (s.model === exclude || (cool.get(s.id) ?? 0) > now()) continue;
      stats.calls++;
      const fail = (ms = cfg.cool_s * 1000) => { stats.failures++; cool.set(s.id, ms === Infinity ? Infinity : now() + ms); };
      try {
        const { r, text } = await call(s, prompt, json, maxTokens);
        const raw = await r.text(); const body = parseJson(raw);
        if (r.status === 429) { fail(/per ?day|daily|PerDay/i.test(raw) ? Infinity : undefined); continue; }
        if (r.status >= 500 || !r.ok) { fail(); continue; }
        const t = await text(body);
        if (!t) { fail(); continue; }
        const parsed = json ? parseJson(t) : undefined;
        if (json && parsed === undefined) { fail(); continue; }
        stats.by_model[s.model] = (stats.by_model[s.model] || 0) + 1;
        return { text: t, model: s.model, ...(json && { json: parsed }) };
      } catch { fail(); }
    }
    return null;
  }
  return { ask, stats: () => ({ ...stats }) };
}
let dflt; // default instance for simple callers; config read lazily by the caller via init
export const initLlm = (opts) => (dflt = createLlm(opts));
export const ask = (prompt, o) => (dflt ||= createLlm()).ask(prompt, o);
export const llmStats = () => (dflt ||= createLlm()).stats();
