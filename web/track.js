// Usage events for the hotness score. ONLY when consent.stats is true: otherwise nothing is queued, stored or sent, and no client id exists.
// The client id is 24 random chars (no account, no device data); events carry story ids only. Batched, sent through the v_event RPC (insert-only, validated server-side).
const AL = 'abcdefghijklmnopqrstuvwxyz0123456789', MIN_DWELL = 3000, MAX_DWELL = 18e5, PATH_GAP = 30 * 60e3, FB_GAP = 3 * 864e5;
const rndDefault = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

// io = { get(k), set(k, v), del(k) } (localStorage wrapper), send(cid, events), enabled() -> consent.stats && backend ready.
export function createTracker({ io, send, enabled, now = Date.now, rnd = rndDefault }) {
  let q = [], cur = null, last = null;
  const cid = () => { let c = io.get('v.cid'); if (!c || !/^[a-z0-9]{16,40}$/.test(c)) { c = Array.from({ length: 24 }, () => AL[Math.floor(rnd() * 36)]).join(''); io.set('v.cid', c); } return c; };
  const flush = () => { if (!enabled()) { q = []; return; } while (q.length) send(cid(), q.splice(0, 20)); };
  const push = e => { if (!enabled()) return; q.push(e); if (q.length >= 10) flush(); };
  const leave = () => { // closes the current story page: emits dwell = visible time only
    if (!cur) return;
    const t = now(); if (cur.since != null) cur.acc += t - cur.since;
    if (cur.acc >= MIN_DWELL) push({ k: 'dwell', s: cur.id, ms: Math.min(cur.acc, MAX_DWELL) });
    if (last) last.t = t; cur = null;
  };
  return {
    open(id, visible = true) {
      leave(); if (!enabled()) return;
      const t = now(); push({ k: 'open', s: id });
      if (last && last.id !== id && t - last.t < PATH_GAP) push({ k: 'path', s: last.id, s2: id }); // read A, then B within 30 min
      cur = { id, acc: 0, since: visible ? t : null }; last = { id, t };
    },
    leave, flush,
    click(id, src) { push({ k: 'click', s: id, src }); },
    fb(id, v) { push({ k: 'fb', s: id, v }); },
    setVisible(v) { if (!cur) return; const t = now(); if (!v && cur.since != null) { cur.acc += t - cur.since; cur.since = null; } else if (v && cur.since == null) cur.since = t; },
    off() { q = []; cur = null; last = null; io.del('v.cid'); }, // consent withdrawn: forget the id and anything unsent
  };
}

// Feedback prompt: one question, at most one per 3 days (shown counts, answered or dismissed), only with consent.stats and after the reader stayed.
// fb = {last, ans: {storyId: 1|-1}} stored locally so the reader can see what was answered.
export const readFb = raw => { try { const o = JSON.parse(raw); return o && typeof o === 'object' ? { last: +o.last || 0, ans: o.ans && typeof o.ans === 'object' ? o.ans : {} } : { last: 0, ans: {} }; } catch { return { last: 0, ans: {} }; } };
export const canAsk = (fb, now, stats, storyId) => !!stats && now - fb.last >= FB_GAP && !(storyId in fb.ans);
export function answerFb(fb, storyId, v, now) { // v: 1 | -1 | 0 (dismissed)
  const ans = { ...fb.ans }; if (v) ans[storyId] = v;
  const keys = Object.keys(ans); if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete ans[k];
  return { last: now, ans };
}
