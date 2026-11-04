// Background refresh without reshuffling the list. Fetched data waits in `pending`; what the reader sees (`shown`) changes only at a safe moment:
// tapping the "N uutta" pill, navigating, or returning to the tab after being away. Pure functions (no DOM) so node tests can run them.
export const initState = shown => ({ shown: shown || null, pending: null, checked: 0 });
export const newCount = (cur, next) => { const have = new Set(cur.stories.map(s => s.id)); return next.stories.filter(s => !have.has(s.id)).length; };
const sameFeed = (a, b) => a.stories.length === b.stories.length && b.stories.every((s, i) => s.id === a.stories[i].id && s.n_articles === a.stories[i].n_articles && s.hot === a.stories[i].hot && s.reads === a.stories[i].reads);
// A fetch result never replaces `shown` once something is shown. Identical data (same story ids, article counts, hot, reads) is dropped.
export function onFetched(st, data, now = Date.now()) {
  if (!st.shown) return { shown: data, pending: null, checked: now };
  return { ...st, pending: sameFeed(st.shown, data) ? null : data, checked: now };
}
export const apply = st => st.pending ? { ...st, shown: st.pending, pending: null } : st;
export const pendingNew = st => st.shown && st.pending ? newCount(st.shown, st.pending) : 0;
// Poll only while the tab is visible, at most once per `every` ms, never while a request is running.
export const shouldPoll = ({ now, last, every, visible, busy = false }) => visible && !busy && now - last >= every;
// A new web deploy (version.json "web" changed since this page loaded) reloads at the next safe moment.
export const needsReload = (loaded, cur) => loaded != null && cur != null && loaded !== cur;
