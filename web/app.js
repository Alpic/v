// V web app: data loading, derived model, prefs, sync, hash routing, shell. Screens live in views.js.
import { render } from 'preact';
import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { html, Ic, Consent, Home, StoryV, Blind, Search, Mine, More, Method, Sources, SourceV, Right, Skel, Err, Empty } from './views.js';
import { t, setLang } from './i18n.js';
import { initState, onFetched, apply, pendingNew, shouldPoll, needsReload } from './refresh.js';
import { createTracker, readFb, canAsk, answerFb } from './track.js';

const FIX = window.V_FIXTURE, CF = window.V_CONFIG;
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const DEF = { lang: 'fi', theme: 'dark', hidePaywall: true, hideRead: false, showFlagged: false, single: false, follow: [], topics: [], mute: [], read: {}, clicks: [], code: null, ts: 0 };
const loadPrefs = () => { try { return { ...DEF, ...JSON.parse(ls.get('v.prefs') || '{}') }; } catch { return { ...DEF }; } };
const readConsent = () => { try { const c = JSON.parse(ls.get('consent')); return c && c.v === 1 ? c : null; } catch { return null; } };
const days = d => encodeURIComponent(new Date(Date.now() - d * 864e5).toISOString());

// ---- backend (PostgREST, anon key, read-only; sync via RPC only) ----
const hdr = () => ({ apikey: CF.ANON_KEY, Authorization: 'Bearer ' + CF.ANON_KEY, 'Content-Type': 'application/json' });
const rest = async (path, off = 0) => { // every request is bounded (M3): explicit limit, offset only from all()
  const r = await fetch(CF.SUPABASE_URL + '/rest/v1/' + path + (/[?&]limit=/.test(path) ? '' : '&limit=1000') + (off ? '&offset=' + off : ''), { headers: hdr() });
  if (!r.ok) throw new Error(r.status);
  return r.json();
};
const all = async path => { let out = [], p; do { p = await rest(path, out.length); out = out.concat(p); } while (p.length === 1000 && out.length < 3000); return out; };
const rpc = async (fn, body) => {
  if (FIX) { // offline simulation of v_sync_get / v_sync_put
    if (fn === 'v_event') { try { ls.set('v.fixevents', JSON.stringify([...JSON.parse(ls.get('v.fixevents') || '[]'), ...body.evs.map(e => ({ ...e, cid: body.cid }))])); } catch {} return body.evs.length; } // offline stand-in for v_event
    if (fn === 'v_sync_put') { ls.set('v.fixsync.' + body.code, JSON.stringify(body.prefs)); return null; }
    return JSON.parse(ls.get('v.fixsync.' + body.code) || 'null');
  }
  const r = await fetch(CF.SUPABASE_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: hdr(), body: JSON.stringify(body), keepalive: fn === 'v_event' });
  if (!r.ok) throw new Error(r.status);
  return r.status === 204 ? null : r.json();
};
let fixN = 0;
async function fetchAll() {
  if (FIX) {
    const j = await (await fetch('fixtures/feed.json')).json(), d = Date.now() - new Date(j.generated_at); // keep sample data fresh
    const sh = o => new Date(+new Date(o) + d).toISOString();
    j.stories.forEach(s => { s.first_at = sh(s.first_at); s.last_at = sh(s.last_at); });
    j.feed.forEach(a => { a.published_at = sh(a.published_at); a.fetched_at = sh(a.fetched_at); });
    j.runs.forEach(r => { r.at = sh(r.at); });
    if (new URLSearchParams(location.search).has('fixnew') && ++fixN > 1) for (let i = 1; i < fixN; i++) j.stories.push({ ...j.stories[0], id: 900 + i, title: 'Uusi testitarina ' + i, last_at: new Date().toISOString(), hot: 0, reads: 0 }), j.feed.filter(a => a.story_id === 1).forEach(a => j.feed.push({ ...a, id: a.id + 1e5 * i, story_id: 900 + i, published_at: new Date().toISOString() }));
    return j;
  }
  const [sources, outlet_lean, stories, feed, summaries, runs] = await Promise.all([
    rest('v_sources?select=*'), rest('v_outlet_lean?select=*'), rest('v_stories?select=id,title,lang,first_at,last_at,n_articles,n_outlets,score,is_top,twin_id' + (CF.TRANSLATIONS ? ',title_fi,title_en,topic' : '') + (CF.HOT ? ',hot,reads,talk,hot_why' : '') + '&order=last_at.desc&limit=300&last_at=gte.' + days(7)),
    all('v_feed?select=*&order=published_at.desc&limit=1000&published_at=gte.' + days(7)), rest('v_summaries?select=*'), rest('v_runs?select=at,stats&order=at.desc&limit=1')]);
  return { sources, outlet_lean, stories, feed, summaries, runs };
}
const searchApi = (raw, q) => {
  const w = q.replace(/[,()*%\\]/g, ' ').trim().toLowerCase();
  if (FIX) return Promise.resolve(raw.feed.filter(a => (a.title + ' ' + (a.lead || '')).toLowerCase().includes(w)).slice(0, 50));
  return rpc('v_search', { q: w.slice(0, 64), d: raw.cfg.search.window_days }); // POST: the term stays out of URLs and access logs
};

// ---- derived model: outlets with lean, stories with counts, Vaietut rules A/B/D ----
export const gname = g => g.startsWith('?') ? t('noinfo') : g.split(' (')[0];
function derive(raw, METHOD) {
  const cfg = { ...METHOD, ...(raw.config_override || {}) }, lean = Object.fromEntries(raw.outlet_lean.map(r => [r.source_id, r]));
  const cb = raw.runs?.[0]?.stats?.clickbait || {}, S = {};
  for (const s of raw.sources) {
    const r = lean[s.id], fl = s.flags || [];
    let est = null;
    if (r && r.visible && r.v != null && (r.source !== 'voice' || cfg.voice_visible)) est = { v: Math.round(r.v), conf: r.conf, src: r.source, at: r.computed_at };
    else if (s.country !== 'FI' && typeof cfg.lean_map[s.mbfc_lean] === 'number') est = { v: cfg.lean_map[s.mbfc_lean], conf: 'mbfc', src: 'mbfc' };
    S[s.id] = { ...s, flags: fl, est, lean: est && est.conf !== 'low' ? est.v : null, group: s.owner || '?' + s.id, flagged: fl.includes('flagged'), cb: cb[s.id] };
  }
  const arts = raw.feed.filter(a => S[a.source_id]).map(a => ({ ...a, s: S[a.source_id], group: S[a.source_id].group, flagged: S[a.source_id].flagged }));
  const by = {}; arts.forEach(a => (by[a.story_id] ??= []).push(a));
  const sums = Object.fromEntries(raw.summaries.map(x => [x.story_id, x]));
  const stories = raw.stories.map(st => {
    const allA = (by[st.id] || []).sort((a, b) => a.published_at < b.published_at ? -1 : 1), a = allA.filter(x => !x.flagged);
    const outs = [...new Set(a.map(x => x.source_id))], cnt = [0, 0, 0, 0, 0, 0], groups = {};
    outs.forEach(id => { const l = S[id].lean; cnt[l == null ? 0 : l + 3]++; (groups[S[id].group] ??= []).push(id); });
    return { ...st, all: allA, arts: a, outs, cnt, groups, rated: outs.length - cnt[0], sum: sums[st.id], local: outs.some(id => S[id].region), dom: outs.some(id => S[id].country === 'FI') };
  }).filter(s => s.arts.length);
  const byId = Object.fromEntries(stories.map(s => [s.id, s]));
  const side = v => Math.sign(v), cB = cfg.sivuutetut;
  function blind(H) {
    const now = Date.now(), inW = x => now - new Date(x) < H * 36e5, gc = {};
    arts.filter(a => !a.flagged && inW(a.published_at)).forEach(a => { gc[a.group] = (gc[a.group] || 0) + 1; });
    const active = new Set(Object.keys(gc).filter(g => gc[g] >= cB.active_group_min_articles)), out = [];
    for (const st of stories) {
      if (!inW(st.first_at)) continue;
      const gs = Object.keys(st.groups), rated = st.outs.filter(id => S[id].lean != null), vs = rated.map(id => S[id].lean);
      const m = vs.reduce((x, y) => x + y, 0) / (vs.length || 1), sd = side(m), share = vs.filter(v => side(v) === sd).length / (vs.length || 1);
      const fi = st.lang !== 'en', c = { st };
      if (st.arts.length >= cB.A.min_articles && gs.length === 1 && st.groups[gs[0]].length >= cB.A.min_outlets_in_group && active.size >= cB.A.min_active_groups) {
        Object.assign(c, { rule: 'A', mark: t('bs_a'), text: t('bs_a_txt', gname(gs[0]), active.size - (active.has(gs[0]) ? 1 : 0)), own: gs[0] });
      } else if (fi && cfg.voice_visible) {
        const rs = rated.filter(id => S[id].est?.src === 'voice' && ['medium', 'high'].includes(S[id].est.conf));
        const opp = Object.values(S).filter(s => s.lean != null && s.est?.src === 'voice' && side(s.lean) === -sd && active.has(s.group) && !st.outs.includes(s.id)).length;
        const vv = rs.map(id => S[id].lean), mm = vv.reduce((x, y) => x + y, 0) / (vv.length || 1), sh = vv.filter(v => side(v) === side(mm)).length / (vv.length || 1);
        if (rs.length >= cB.B.min_rated && new Set(rs.map(id => S[id].group)).size >= cB.B.min_groups && Math.abs(mm) >= cB.B.abs_mean_min && sh >= cB.B.side_share_min && opp >= cB.B.opposite_active_min) {
          const k = vv.filter(v => side(v) === -side(mm)).length, w = mm < 0 ? 'R' : 'L';
          Object.assign(c, { rule: 'B', mark: t('bs_' + w), text: t('bs_b_txt', t('side_' + w), k, rs.length) });
        }
      } else if (!fi) {
        const rs = rated.filter(id => S[id].est?.src === 'mbfc');
        const vv = rs.map(id => S[id].lean), mm = vv.reduce((x, y) => x + y, 0) / (vv.length || 1), sh = vv.filter(v => side(v) === side(mm)).length / (vv.length || 1);
        if (rs.length >= cB.D.min_rated && new Set(rs.map(id => S[id].group)).size >= cB.D.min_groups && Math.abs(mm) >= cB.D.abs_mean_min && sh >= cB.D.side_share_min) {
          const w = mm < 0 ? 'R' : 'L', k = vv.filter(v => side(v) === -side(mm)).length;
          Object.assign(c, { rule: 'D', mark: t('bs_' + w), text: t('bs_b_txt', t('side_' + w), k, rs.length) + ' ' + t('bs_d_c', [...new Set(st.arts.map(x => x.country))].join(', ')) });
        }
      }
      if (c.rule) out.push(c);
    }
    return out.sort((a, b) => b.st.outs.length - a.st.outs.length);
  }
  return { cfg, S, arts, stories, byId, blind, run: raw.runs?.[0]?.at, sources: raw.sources.map(s => S[s.id]), fix: FIX };
}

// ---- router ----
const parse = () => { const [p, q] = location.hash.slice(1).split('?'); return { seg: p.split('/').filter(Boolean), q: Object.fromEntries(new URLSearchParams(q || '')) }; };
const TABS = [['', 'news', 'home'], ['sivuutetut', 'blind', 'blind'], ['haku', 'search', 'search'], ['oma', 'mine', 'mine'], ['lisaa', 'more', 'more']];
const tabOf = seg => ({ sivuutetut: 'blind', haku: 'search', oma: 'mine', lisaa: 'more' }[seg[0]] || 'news');

function App() {
  const [P, setP] = useState(loadPrefs), [R, setR] = useState(parse), [raw, setRaw] = useState(() => { if (FIX) return null; try { const c = JSON.parse(ls.get('v.cache')); return c?.d || null; } catch { return null; } });
  const [METHOD, setM] = useState(null), [busy, setBusy] = useState(true), [err, setErr] = useState(null), [off, setOff] = useState(null), [upd, setUpd] = useState(null), [chip, setChip] = useState('all'), [cons, setCons] = useState(() => readConsent() || { v: 1, stats: false, notify: false, at: 0 }), [sheet, setSheet] = useState(() => !readConsent());
  const pushT = useRef(0), rs = useRef(initState(raw)), [pend, setPend] = useState(0), [chk, setChk] = useState(0), lastPoll = useRef(Date.now()), polling = useRef(false), hiddenAt = useRef(0), ver = useRef(null), curVer = useRef(null), consRef = useRef(cons), trk = useRef(null);
  consRef.current = cons;
  trk.current ||= createTracker({ io: { get: ls.get, set: ls.set, del: k => { try { localStorage.removeItem(k); } catch {} } }, send: (cid, evs) => rpc('v_event', { cid, evs }).catch(() => {}), enabled: () => !!consRef.current.stats && (FIX || !!CF.HOT) }); // usage events only with consent.stats
  setLang(P.lang);
  const save = n => { ls.set('v.prefs', JSON.stringify(n)); return n; };
  const A = useMemo(() => ({
    upd: patch => setP(p => { const x = typeof patch === 'function' ? patch(p) : patch; return x ? save({ ...p, ...x, ts: Date.now() }) : p; }),
    markRead: id => A.upd(p => p.read[id] ? null : { read: { ...p.read, [id]: Date.now() } }),
    click: a => { trk.current.click(a.story_id, a.source_id); A.upd(p => ({ ...(cons.stats ? { clicks: [...p.clicks, [Date.now(), a.source_id]].slice(-1000) } : {}), read: { ...p.read, [a.story_id]: Date.now() } })); }, // usage counter only with consent
    tr: trk.current,
    fbCan: id => canAsk(readFb(ls.get('v.fb')), Date.now(), cons.stats, id),
    fbAnswer: (id, v) => { ls.set('v.fb', JSON.stringify(answerFb(readFb(ls.get('v.fb')), id, v, Date.now()))); if (v) trk.current.fb(id, v); },
    cons, openConsent: () => setSheet(true),
    setConsent: (stats, notify) => { const c = { v: 1, stats, notify, at: Date.now() }; ls.set('consent', JSON.stringify(c)); setCons(c); setSheet(false); if (!stats) trk.current.off(); },
    newCode: () => A.upd({ code: Array.from(crypto.getRandomValues(new Uint8Array(20)), b => 'abcdefghjkmnpqrstvwxyz23456789'[b % 30]).join('') }),
    pair: async code => { code = code.trim().toLowerCase(); try { const r = await rpc('v_sync_get', { code }); if (!r) return 'none'; setP(p => save({ ...DEF, ...r, code, ts: Date.now() })); return 'ok'; } catch { return 'fail'; } },
    exportJson: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 1)], { type: 'application/json' })); a.download = 'v-varmuuskopio.json'; a.click(); },
    importJson: txt => { try { const o = JSON.parse(txt); if (typeof o !== 'object' || !o) throw 0; setP(p => save({ ...DEF, ...o, code: p.code, ts: Date.now() })); return true; } catch { return false; } },
    search: q => searchApi({ ...raw, cfg: METHOD }, q),
  }), [P, raw, METHOD, cons]);
  const load = async () => {
    setBusy(true);
    try { const j = await fetchAll(); rs.current = { shown: j, pending: null, checked: Date.now() }; setRaw(j); setPend(0); setChk(Date.now()); setErr(null); setOff(null); if (!FIX) ls.set('v.cache', JSON.stringify({ t: Date.now(), d: j })); }
    catch (e) { setErr(e); try { const c = JSON.parse(ls.get('v.cache')); if (c) setOff(Math.round((Date.now() - c.t) / 6e4)); } catch {} }
    setBusy(false);
  };
  // Safe moments (navigation, tab return, pill tap): apply the waiting feed, or reload for a new web deploy. Never while the reader is mid-list.
  const safe = () => {
    if (needsReload(ver.current, curVer.current)) { location.reload(); return; }
    if (rs.current.pending) { rs.current = apply(rs.current); setRaw(rs.current.shown); setPend(0); }
  };
  const poll = async () => { // background refresh: fetched data waits in rs.current.pending, the list on screen does not move
    if (polling.current) return; polling.current = true; lastPoll.current = Date.now();
    try { const j = await fetchAll(), now = Date.now(); rs.current = onFetched(rs.current, j, now); if (!FIX) ls.set('v.cache', JSON.stringify({ t: now, d: j })); if (!rs.current.pending) setRaw(rs.current.shown); setPend(pendingNew(rs.current)); setChk(now); setOff(null); setErr(null); } catch {}
    try { const v = await (await fetch('version.json', { cache: 'no-store' })).json(); curVer.current = v.web ?? 0; ver.current ??= curVer.current; } catch {}
    polling.current = false;
  };
  useEffect(() => {
    fetch('method.json').then(r => r.json()).then(setM); load();
    fetch('version.json', { cache: 'no-store' }).then(r => r.json()).then(v => { ver.current = curVer.current = v.web ?? 0; }).catch(() => {});
    const f = () => { safe(); setR(parse()); scrollTo(0, 0); }; addEventListener('hashchange', f);
    const vc = window.VApp?.versionCode;
    if (vc != null) fetch('version.json', { cache: 'no-store' }).then(r => r.json()).then(v => { if (vc < v.versionCode) setUpd(v); }).catch(() => {});
    if (P.code) rpc('v_sync_get', { code: P.code }).then(r => { if (r && r.ts > P.ts) setP(p => save({ ...DEF, ...r, code: p.code })); }).catch(() => {});
    return () => removeEventListener('hashchange', f);
  }, []);
  useEffect(() => { // live refresh: poll while the tab is visible, pause when hidden, flush usage events when leaving
    const fx = FIX && +new URLSearchParams(location.search).get('refresh'), every = fx ? fx * 1000 : (METHOD?.hot?.refresh_s ?? 180) * 1000, T = trk.current;
    const tick = () => { if (shouldPoll({ now: Date.now(), last: lastPoll.current, every, visible: !document.hidden, busy: polling.current })) poll(); };
    const vis = () => { T.setVisible(!document.hidden); if (document.hidden) { hiddenAt.current = Date.now(); T.flush(); } else { if (hiddenAt.current && Date.now() - hiddenAt.current > 60000) safe(); tick(); } };
    const bye = () => { T.leave(); T.flush(); }, id = setInterval(tick, Math.min(15000, every)), fl = setInterval(() => T.flush(), 20000);
    addEventListener('visibilitychange', vis); addEventListener('pagehide', bye);
    return () => { clearInterval(id); clearInterval(fl); removeEventListener('visibilitychange', vis); removeEventListener('pagehide', bye); };
  }, [METHOD]);
  useEffect(() => { // theme + language + status bar colour
    document.documentElement.dataset.theme = P.theme; document.documentElement.lang = P.lang;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', P.theme === 'light' ? '#FFFFFF' : '#1C1E22');
  }, [P.theme, P.lang]);
  useEffect(() => { // device sync: push after changes, last write wins
    if (!P.code || !P.ts || P.ts === pushT.current) return;
    const id = setTimeout(() => { pushT.current = P.ts; const { code, ...pr } = P, put = n => rpc('v_sync_put', { code, prefs: pr }).catch(() => { if (n < 3) setTimeout(() => put(n + 1), 11000); }); put(1); }, 1500); // server allows one write per code per 10 s
    return () => clearTimeout(id);
  }, [P.ts, P.code]);

  const D = useMemo(() => raw && METHOD ? derive(raw, METHOD) : null, [raw, METHOD]);
  const cur = tabOf(R.seg), s0 = R.seg[0];
  let body;
  if (!D) body = err ? html`<${Err} title=${t('err_feed')} body=${t('err_still')} onRetry=${load}/>` : html`<${Skel} n=${5}/>`;
  else if (s0 === 's') body = html`<${StoryV} D=${D} P=${P} A=${A} id=${+R.seg[1]}/>`;
  else if (s0 === 'l') body = html`<${SourceV} D=${D} P=${P} A=${A} id=${R.seg[1]}/>`;
  else if (s0 === 'sivuutetut') body = html`<${Blind} D=${D} P=${P}/>`;
  else if (s0 === 'haku') body = html`<${Search} D=${D} A=${A}/>`;
  else if (s0 === 'oma') body = html`<${Mine} D=${D} P=${P} A=${A} q=${R.q}/>`;
  else if (s0 === 'lisaa' && R.seg[1] === 'menetelma') body = html`<${Method} D=${D}/>`;
  else if (s0 === 'lisaa' && R.seg[1] === 'lahteet') body = html`<${Sources} D=${D} P=${P}/>`;
  else if (s0 === 'lisaa') body = html`<${More} D=${D} P=${P} A=${A}/>`;
  else body = html`<${Home} D=${D} P=${P} chip=${chip} setChip=${setChip} A=${A} chk=${chk}/>`;
  const names = { news: t('tab_news'), blind: t('tab_blind'), search: t('tab_search'), mine: t('tab_mine'), more: t('tab_more') };
  const nav = (cls, ic) => TABS.map(([h, k, i]) => html`<a class=${cls} href=${'#/' + h} aria-current=${cur === k ? 'page' : null}><${Ic} n=${i}/>${names[k]}</a>`);
  return html`<div class="shell">
    <a class="skip" href="#main" onClick=${e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>${t('skip')}</a>
    <nav class="rail" aria-label=${t('nav')}><div class="mark"><b>V</b><span class="t-meta">Kuljento</span></div>${nav('rl')}</nav>
    <div class="main-r"><main id="main" tabindex="-1">
      ${busy && html`<div class="prog" role="progressbar" aria-label=${t('loading')}></div>`}
      ${D?.fix && html`<div class="demo">${t('demo')}</div>`}
      ${pend > 0 && cur === 'news' && !s0 && html`<button class="btn pri newpill" onClick=${() => { safe(); scrollTo(0, 0); }}>${t('new_n', pend)}</button>`}
      ${upd && html`<div class="banner upd"><span>${t('upd', upd.versionName)}</span><button onClick=${() => window.VApp.installApk(upd.apk)}>${t('upd_do')}</button></div>`}
      ${off != null && html`<div class="banner" role="status">${t('offline', off)}</div>`}
      ${body}
    </main>${D && !s0 && html`<aside class="right" aria-label=${t('tab_blind')}><${Right} D=${D}/></aside>`}</div>
    <nav class="tabs" aria-label=${t('nav')}>${nav('tab')}</nav>${sheet && html`<${Consent} cons=${cons} first=${!readConsent()} A=${A} onClose=${() => setSheet(false)}/>`}</div>`;
}
render(html`<${App}/>`, document.getElementById('app'));
