// V web screens (Preact + htm). Data model comes from app.js `derive`; all strings from i18n.js.
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import htm from 'htm';
import { t, L } from './i18n.js';
export const html = htm.bind(h);
const gname = g => g.startsWith('?') ? t('noinfo') : g.split(' (')[0];

// ---- small pieces ----
const IC = { home: 'M4 11l8-6.5L20 11v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z', blind: 'M2.5 12S6 5.5 12 5.5s9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM5 20L19 4',
  search: 'M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM15 15l5 5', mine: 'M5 20v-8M12 20V5M19 20v-5', more: 'M4 7h16M4 12h16M4 17h10', back: 'M15 5l-7 7 7 7' };
export const Ic = ({ n }) => html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d=${IC[n]}/></svg>`;
const ART = [() => html`<path d="M0 70h100M20 70V30h22v40M52 70V16h26v54" fill="none" stroke="var(--brand)" stroke-width="3"/>`,
  () => html`<circle cx="50" cy="50" r="28" fill="none" stroke="var(--brand)" stroke-width="3"/><path d="M22 50h56M50 22c-14 16-14 40 0 56M50 22c14 16 14 40 0 56" fill="none" stroke="var(--brand)" stroke-width="2"/>`,
  () => html`<path d="M10 78l24-30 18 16 20-34 18 22" fill="none" stroke="var(--brand)" stroke-width="3"/>`,
  () => html`<circle cx="50" cy="50" r="22" fill="var(--line-strong)"/><path d="M20 50h60" stroke="var(--brand)" stroke-width="3"/>`];
const Art = ({ id }) => html`<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect width="100" height="100" fill="var(--sunken)"/>${ART[id % 4]()}</svg>`;
const ago = iso => { const m = Math.max(1, Math.round((Date.now() - new Date(iso)) / 6e4)); return m < 60 ? t('ago_m', m) : m < 1440 ? t('ago_h', Math.round(m / 60)) : t('ago_d', Math.round(m / 1440)); };
const hm = iso => new Date(iso).toLocaleTimeString(L(), { hour: '2-digit', minute: '2-digit' });
const dt = iso => new Date(iso).toLocaleDateString(L(), { day: 'numeric', month: 'numeric', year: 'numeric' });
const leanTxt = s => t('l' + (s.lean == null ? 0 : s.lean + 3)).toLowerCase();
const initials = n => n.replace(/[^\p{L}\d ]/gu, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const Mono = ({ s }) => html`<span class="mono" aria-hidden="true">${initials(s.name)}</span>`;
const GL = { public: html`<circle cx="5" cy="5" r="4.5"/>`, company: html`<rect x=".5" y=".5" width="9" height="9"/>`, foundation: html`<path d="M5 .5l4.5 9h-9z"/>`, interest_org: html`<path d="M5 .5l4.5 9h-9z"/>`, party: html`<path d="M5 .5l4.5 4.5-4.5 4.5L.5 5z"/>`, international: html`<path d="M1 1h3v8H1zM6 1h3v8H6z"/>` };
const Own = ({ s, n }) => html`<span class="own"><svg viewBox="0 0 10 10" aria-hidden="true">${GL[s.owner_type] || GL.company}</svg>${gname(s.group)}${n ? ' ' + n : ''}</span>`;
const kick = s => t('k_' + s.lang) + (s.local && s.outs.length <= 5 ? ' · ' + (s.arts.find(a => a.s.region)?.s.region || '') : '');
const pay = s => s.paywall && s.paywall !== 'none';
const cbTag = (s, D) => s.cb && s.cb.share >= D.cfg.clickbait.threshold ? html`<span class="tag warn">${t('cb_tag', Math.round(s.cb.share))}</span>` : null;
const LEANS = [1, 2, 3, 4, 5, 0];
export const Cov = ({ cnt, lg, grow }) => html`<div class=${'cov' + (lg ? ' lg' : '') + (grow ? ' grow' : '')} role="img" aria-label=${t('bar_aria') + ': ' + LEANS.map(i => t('l' + i) + ' ' + cnt[i]).join(', ')}>${LEANS.map(i => cnt[i] > 0 && html`<i class=${'l' + i} style=${'flex:' + cnt[i]}></i>`)}</div>`;
const CovTxt = ({ cnt }) => html`<div class="covtxt" aria-hidden="true"><span>${t('l1')} <b>${cnt[1] + cnt[2]}</b></span><span>${t('l3')} <b>${cnt[3]}</b></span><span>${t('l5')} <b>${cnt[4] + cnt[5]}</b></span><span>${t('l0')} <b>${cnt[0]}</b></span></div>`;
const CovBlock = ({ st, D, lg, grow }) => st.rated >= D.cfg.bars.min_rated ? html`<${Cov} cnt=${st.cnt} lg=${lg} grow=${grow}/><${CovTxt} cnt=${st.cnt}/>` : html`<p class="t-meta">${t('few')}</p>`;
const Facts = ({ st, extra }) => html`<div class="facts"><span><b>${st.outs.length}</b> ${t('src', st.outs.length)}</span><span>${Object.keys(st.groups).length} ${t('own', Object.keys(st.groups).length)}</span>${extra}<span>${ago(st.last_at)}</span></div>`;
export const Empty = ({ icon = 'search', title, body, cta, onCta, cta2, onCta2 }) => html`<section class="empty"><${Ic} n=${icon}/><h2>${title}</h2><p>${body}</p>${cta && html`<button class="btn pri" onClick=${onCta}>${cta}</button>`}${cta2 && html`<button class="btn ghost" onClick=${onCta2}>${cta2}</button>`}</section>`;
export const Err = ({ title, body, onRetry }) => html`<div class="err" role="alert"><b>${title}</b><p>${body}</p><button class="btn sec" onClick=${onRetry}>${t('retry')}</button></div>`;
export const Skel = ({ n = 4 }) => html`<div class="panel skl" role="status" aria-busy="true" aria-label=${t('loading')}>${Array.from({ length: n }, () => html`<div class="story" aria-hidden="true"><div class="sk" style="height:12px;width:80px"></div><div class="sk" style="height:18px;margin:10px 0 6px"></div><div class="sk" style="height:18px;width:70%;margin-bottom:12px"></div><div class="sk" style="height:10px"></div><div class="sk" style="height:12px;width:60%;margin-top:10px"></div></div>`)}</div>`;
const Seg = ({ opts, val, on, label, cls = '' }) => html`<div class=${'seg ' + cls} role="group" aria-label=${label}>${opts.map(([k, txt]) => html`<button aria-pressed=${val === k} onClick=${() => on(k)}>${txt}</button>`)}</div>`;
const AppBar = ({ title }) => html`<div class="appbar"><button class="ib back" aria-label=${t('back')} onClick=${() => history.length > 1 ? history.back() : (location.hash = '#/')}><${Ic} n="back"/></button><span class="t-meta" style="font-weight:600">${title}</span><span style="width:44px"></span></div>`;
const NF = () => html`<${Empty} icon="home" title=${t('nf_t')} body=${t('nf_b')} cta=${t('go_news')} onCta=${() => { location.hash = '#/'; }}/>`;
const safe = u => /^https?:\/\//i.test(u || '') ? u : '#'; // DB URLs: never javascript: (L8)
const Row = ({ s, D, lead }) => lead ? html`<a class="lead split" href=${'#/s/' + s.id}><div class="art"><${Art} id=${s.id}/></div><div><div class="kick">${t('lead_k')} · ${kick(s)}</div><h2 class="h-lead">${s.title}</h2>
  <p class="t-sec" style="color:var(--ink);max-width:58ch;margin-bottom:14px">${s.sum ? s.sum.sentences.map(x => x.t).join(' ') : s.arts[0].lead}</p><${CovBlock} st=${s} D=${D} lg/>
  <${Facts} st=${s} extra=${html`<span>${t('first', s.arts[0].s.name, hm(s.arts[0].published_at))}</span>`}/></div></a>` :
  html`<a class="story" href=${'#/s/' + s.id}><div class="row"><div><div class="kick">${kick(s)}</div><h3 class="h-card">${s.title}</h3></div><div class="thumb"><${Art} id=${s.id}/></div></div><${CovBlock} st=${s} D=${D}/><${Facts} st=${s}/></a>`;
const shown = (s, P) => P.hidePaywall ? s.arts.filter(a => !pay(a.s)) : s.arts;
const same = (s, k) => k.startsWith('src:') ? s.outs.includes(k.slice(4)) : s.title.toLowerCase().includes(k.toLowerCase());
const visible = (s, D, P) => (P.single || s.outs.length >= D.cfg.rank.top_min_outlets) && !P.mute.some(k => same(s, k)) && !(P.hideRead && P.read[s.id]) && shown(s, P).length > 0;

// ---- Uutiset ----
export function Home({ D, P, chip, setChip, A }) {
  const F = { all: () => true, fi: s => s.lang !== 'en', world: s => s.lang === 'en', local: s => s.local, mine: s => P.follow.some(k => same(s, k)) };
  const base = D.stories.filter(s => visible(s, D, P)), list = base.filter(F[chip] || F.all);
  const lead = [...list].sort((a, b) => b.score - a.score)[0], rest = list.filter(s => s !== lead).sort((a, b) => a.last_at < b.last_at ? 1 : -1).slice(0, 40);
  const chips = [['all', t('c_all')], ['fi', t('c_fi')], ['world', t('c_world')], ['local', t('c_local')], ...(P.follow.length ? [['mine', t('c_mine')]] : [])];
  const date = new Date().toLocaleDateString(L(), { weekday: 'long', day: 'numeric', month: 'numeric' });
  return html`<header class="top"><div class="top-row"><div class="mark"><b>V</b><span class="t-meta">Kuljento</span></div>
      <${Seg} cls="sm" label=${t('language')} val=${P.lang} on=${v => A.upd({ lang: v })} opts=${[['fi', 'FI'], ['en', 'EN']]}/></div>
    <div class="dateline"><h1 class="h-sec">${date[0].toUpperCase() + date.slice(1)}</h1><span class="t-meta">${t('n_stories', base.length)}${D.run ? ' · ' + t('updated', hm(D.run)) : ''}</span></div>
    <div class="chips" role="group" aria-label=${t('filter')}>${chips.map(([k, x]) => html`<button class="chip" aria-pressed=${chip === k} onClick=${() => setChip(k)}>${x}</button>`)}</div></header>
    ${!lead ? html`<${Empty} title=${chip === 'all' ? t('e_news_t') : t('e_filt_t')} body=${chip === 'all' ? t('e_news_b') : t('e_filt_b')} cta=${chip === 'all' ? t('go_more') : t('clear_filters')}
        onCta=${() => chip === 'all' ? (location.hash = '#/lisaa') : setChip('all')}/>` : html`
    <div class="panel" style="border-top:0"><${Row} s=${lead} D=${D} lead/></div>
    <div class="sec-h"><h2 class="h-sec">${t('next')}</h2><span class="t-meta">${t('newest')}</span></div>
    <div class="panel feed2">${rest.map(s => html`<${Row} s=${s} D=${D}/>`)}</div>`}`;
}
export function Right({ D }) {
  const c = D.blind(D.cfg.sivuutetut.window_h).slice(0, 2);
  return html`<div class="panel" style="border-radius:8px;border:1px solid var(--line)"><h2 class="h-sec" style="padding:16px 16px 0">${t('bs_title')}</h2>
    ${c.length ? c.map(x => html`<a class="bs" href=${'#/s/' + x.st.id}><span class="marker">${x.mark}</span><h3 class="h-card" style="font-size:16px">${x.st.title}</h3></a>`) : html`<p class="t-sec pad">${t('e_bs_t')}</p>`}
    <a class="lnk pad" style="display:block" href="#/sivuutetut">${t('see_all')}</a></div>`;
}

// ---- Tarina ----
const GR = [['L', [1, 2], 'l1'], ['C', [3], 'l3'], ['R', [4, 5], 'l5'], ['U', [0], 'l0']];
function Summary({ st, D }) {
  if (st.outs.length < D.cfg.summary.min_outlets || !st.sum) return null;
  const ord = [], num = id => { let i = ord.indexOf(id); if (i < 0) i = ord.push(id) - 1; return i + 1; }, ai = st.sum.kind === 'ai';
  return html`<div class="summary"><div class="kick">${ai ? t('sum') : t('sum_ext')}</div><p>${st.sum.sentences.map(x => html`${x.t}${(x.cites || []).map(c => html`<button class="cite" aria-label=${t('cite', num(c))} onClick=${() => document.getElementById('a' + c)?.scrollIntoView({ block: 'center' })}>[${num(c)}]</button>`)} `)}</p>
    <p class="note" title=${st.sum.model || ''}>${ai ? t('sum_note', st.outs.length) : t('sum_ext_note')}</p></div>`;
}
export function StoryV({ D, P, A, id }) {
  const st = D.byId[id], [f, setF] = useState({ lean: '', lang: '', owner: '', sort: 'new' });
  useEffect(() => { if (st) A.markRead(id); }, [id]);
  if (!st) return html`<${NF}/>`;
  const gs = Object.entries(st.groups).sort((a, b) => b[1].length - a[1].length), twin = D.byId[st.twin_id];
  let list = shown(st, P).concat(P.showFlagged ? st.all.filter(a => a.flagged) : []);
  const hid = st.arts.length - shown(st, P).length, li = a => a.s.lean == null ? 0 : a.s.lean + 3;
  list = list.filter(a => (!f.lean || GR.find(g => g[0] === f.lean)[1].includes(li(a))) && (!f.lang || a.lang === f.lang) && (!f.owner || a.group === f.owner))
    .sort((a, b) => f.sort === 'new' ? (a.published_at < b.published_at ? 1 : -1) : a.s.name.localeCompare(b.s.name));
  const first = st.arts[0], rampC = i => `var(--own-${Math.min(i + 1, 4)})`;
  const sel = (k, opts, label) => html`<label class="sr" for=${'f' + k}>${label}</label><select id=${'f' + k} value=${f[k]} onChange=${e => setF({ ...f, [k]: e.target.value })}><option value="">${label}</option>${opts.map(([v, x]) => html`<option value=${v}>${x}</option>`)}</select>`;
  return html`<${AppBar} title=${kick(st)}/>
  <div class="sp"><div class="kick">${kick(st)}</div><h1 class="h-story">${st.title}</h1>
    <${Facts} st=${st} extra=${html`<span>${t('first', first.s.name, hm(first.published_at))}</span>`}/>
    ${twin && html`<p style="margin-top:10px"><a class="lnk" href=${'#/s/' + twin.id}>${t('twin')}</a></p>`}<${Summary} st=${st} D=${D}/></div>
  <section class="blk" aria-labelledby="h-bar"><h2 class="h-sec" id="h-bar">${t('whose')}</h2>
    ${st.rated >= D.cfg.bars.min_rated ? html`<${Cov} cnt=${st.cnt} lg grow/><div class="legend">${LEANS.map(i => html`<div><span class=${'sw l' + i}></span>${t('l' + i)}<b>${st.cnt[i]}</b></div>`)}</div>
      <details><summary>${t('as_table')}</summary><table class="tbl"><tbody>${LEANS.map(i => html`<tr><th scope="row">${t('l' + i)}</th><td>${st.cnt[i]}</td></tr>`)}</tbody></table></details>` : html`<p class="t-sec">${t('few')}</p>`}
    <p class="note">${t('bar_note')} <a class="lnk" href="#/lisaa/menetelma">${t('method')}</a></p></section>
  <section class="blk" aria-labelledby="h-own"><h2 class="h-sec" id="h-own">${t('who_owns')}</h2>
    <div class="mix" role="img" aria-label=${gs.map(([g, o]) => gname(g) + ' ' + o.length).join(', ')}>${gs.map(([g, o], i) => html`<i style=${'flex:' + o.length + ';background:' + rampC(i)}></i>`)}</div>
    <div class="chiprow">${gs.map(([g, o]) => html`<${Own} s=${D.S[o[0]]} n=${o.length}/>`)}</div>
    <p class="note">${t('own_note', gs.length, st.outs.length)}</p></section>
  <section class="blk" aria-labelledby="h-hl"><h2 class="h-sec" id="h-hl">${t('side_by_side')}</h2>
    <div class="filters">${sel('lean', GR.map(g => [g[0], t('g' + g[0])]), t('f_lean'))}${sel('lang', [...new Set(st.arts.map(a => a.lang))].map(x => [x, x.toUpperCase()]), t('f_lang'))}${sel('owner', gs.map(([g]) => [g, gname(g)]), t('f_owner'))}
      <${Seg} cls="sm" label=${t('sort')} val=${f.sort} on=${v => setF({ ...f, sort: v })} opts=${[['new', t('s_new')], ['az', t('s_az')]]}/></div>
    ${hid > 0 && html`<p class="note">${t('pw_hidden', hid)}</p>`}
    ${list.length === 0 ? html`<${Empty} title=${t('e_filt_t')} body=${t('e_filt_b')} cta=${t('clear_filters')} onCta=${() => setF({ lean: '', lang: '', owner: '', sort: f.sort })}/>` :
      html`<div class="hlg">${GR.map(([k, idx, cls]) => { const xs = list.filter(a => idx.includes(li(a))); return xs.length ? html`<div class="grp"><div class="grp-h"><span class=${'sw ' + cls}></span>${t('g' + k)} · ${xs.length}</div>${xs.map(a => html`<div class="hl" id=${'a' + a.id}>
        <div class="badge"><${Mono} s=${a.s}/><div><a class="nm" href=${'#/l/' + a.s.id}>${a.s.name}</a><small>${hm(a.published_at)} · ${leanTxt(a.s)}</small></div></div>
        <p lang=${a.lang}><a href=${safe(a.url)} target="_blank" rel="noopener noreferrer" onClick=${() => A.click(a)}>${a.title}</a></p>
        <div class="chiprow"><${Own} s=${a.s}/>${a.flagged && html`<span class="tag warn">${t('flagged')}</span>`}${pay(a.s) && html`<span class="tag">${t('pw')}</span>`}${cbTag(a.s, D)}</div></div>`)}</div>` : null; })}</div>`}
  </section>`;
}

// ---- Sivuutetut uutiset ----
export function Blind({ D }) {
  const [w, setW] = useState('day'), c = D.cfg.sivuutetut, cards = D.blind(w === 'day' ? c.window_h : c.week_window_h);
  return html`<div class="pg-h"><h1 class="h-story" style="font-size:28px">${t('bs_title')}</h1><p class="t-sec">${t('bs_def')}</p>
    <div class="seg3" role="group" aria-label=${t('period')}><button aria-pressed=${w === 'day'} onClick=${() => setW('day')}>${t('day')}</button><button aria-pressed=${w === 'week'} onClick=${() => setW('week')}>${t('week')}</button></div></div>
    ${cards.length === 0 ? html`<${Empty} icon="blind" title=${t('e_bs_t')} body=${t('e_bs_b', c.A.min_articles, c.A.min_active_groups, c.D.min_rated, c.D.min_groups, c.B.min_rated, Math.round(c.B.side_share_min * 100))} cta=${w === 'day' ? t('show_week') : null} onCta=${() => setW('week')}/>` :
      html`<div class="panel" style="border-top:0">${cards.map(x => html`<a class="bs" href=${'#/s/' + x.st.id}><span class="marker">${x.mark}</span><h2 class="h-card">${x.st.title}</h2>
        ${x.rule === 'A' ? html`<${Own} s=${D.S[x.st.groups[x.own][0]]} n=${x.st.groups[x.own].length}/>` : html`<${Cov} cnt=${x.st.cnt}/><${CovTxt} cnt=${x.st.cnt}/>`}
        <div class="gap"><span class="miss">${t('missing')}</span><span>${x.text}</span></div><p class="t-meta" style="margin-top:8px">${t('rule', x.rule)}</p></a>`)}</div>`}
    <p class="foot">${t('bs_foot')} <a class="lnk" href="#/lisaa/menetelma">${t('method')}</a></p>`;
}

// ---- Haku ----
const ResRow = ({ a, D, st }) => html`<a class="story" href=${st ? '#/s/' + st.id : safe(a.url)} target=${st ? null : '_blank'} rel="noopener noreferrer"><div class="kick">${a.source_name} · ${ago(a.published_at)}</div><h3 class="h-card">${a.title}</h3><p class="t-sec" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${a.lead}</p></a>`;
export function Search({ D, A }) {
  const [q, setQ] = useState(''), [res, setRes] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState(false), inp = useRef();
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); setErr(false); return; }
    const id = setTimeout(() => { setBusy(true); A.search(q).then(r => { setRes(r); setErr(false); }).catch(() => setErr(true)).finally(() => setBusy(false)); }, 300);
    return () => clearTimeout(id);
  }, [q]);
  return html`<div class="pg-h"><h1 class="h-story" style="font-size:28px">${t('tab_search')}</h1>
    <form role="search" onSubmit=${e => e.preventDefault()} style="margin-top:14px"><label class="sr" for="q">${t('s_label')}</label>
    <input id="q" ref=${inp} class="field" style="width:100%" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder=${t('s_ph')} value=${q} onInput=${e => setQ(e.target.value)}/></form></div>
    ${err ? html`<${Err} title=${t('err_search')} body=${t('err_still')} onRetry=${() => setQ(q + ' ')}/>` : busy && !res ? html`<${Skel} n=${3}/>` :
      res === null ? html`<${Empty} title=${t('e_s_t')} body=${t('e_s_b')} cta=${t('type_term')} onCta=${() => inp.current?.focus()}/>` :
      res.length === 0 ? html`<${Empty} title=${t('e_sr_t', q.trim())} body=${t('e_sr_b')} cta=${t('clear_search')} onCta=${() => { setQ(''); inp.current?.focus(); }}/>` :
      html`<div class="panel" style="border-top:0" aria-live="polite">${res.map(a => html`<${ResRow} a=${a} D=${D} st=${D.byId[a.story_id]}/>`)}</div>`}`;
}

// ---- Lähde ----
const Conf = ({ c }) => html`<span class="dots" aria-hidden="true">${[1, 2, 3, 4].map(i => html`<i class=${i <= ({ high: 4, medium: 3, low: 2 }[c] || 0) ? 'on' : ''}></i>`)}</span>`;
export function SourceV({ D, P, A, id }) {
  const s = D.S[id];
  if (!s) return html`<${NF}/>`;
  const e = s.est, v = e && e.src !== 'mbfc' ? e : null, arts = D.arts.filter(a => a.source_id === id).slice(0, 20), key = 'src:' + id, row = (k, x) => html`<div class="r"><dt>${t(k)}</dt><dd>${x ?? t('noinfo')}</dd></div>`;
  const tog = (name, k) => html`<button class="btn sec" aria-pressed=${P[name].includes(k)} onClick=${() => A.upd(p => ({ [name]: p[name].includes(k) ? p[name].filter(x => x !== k) : [...p[name], k] }))}>${P[name].includes(k) ? t('un_' + name) : t(name)}</button>`;
  const scale = x => html`<div class="scale" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => html`<i class=${'l' + i + (x && x.v + 3 === i ? ' cur' : '')}></i>`)}</div>`;
  return html`<${AppBar} title=${t('source')}/><div class="src-h"><${Mono} s=${s}/><div><h1 class="h-story" style="font-size:24px">${s.name}</h1><p class="t-meta">${s.domain}</p></div></div>
  <dl class="dl">
    ${row('f_owner2', s.owner ? html`<${Own} s=${s}/> ${t('ot_' + (s.owner_type || 'company'))}` : null)}${row('f_tie', s.tie)}${row('f_funding', s.funding)}
    ${row('f_where', [s.country, s.lang, s.region].filter(Boolean).join(' · ') || null)}${row('f_pay', s.paywall ? t('pw_' + s.paywall) : null)}
    ${row('f_est', html`${v ? html`${scale(v)}<b>${t('l' + (v.v + 3))}</b><${Conf} c=${v.conf}/>${t('conf_' + v.conf)}<br/><span class="t-meta">${t('rater_v', v.at ? dt(v.at) : '')} · ${D.cfg.voice.badge}</span>` : t('no_est')}`)}
    ${row('f_mbfc', s.mbfc_lean ? html`${scale(typeof D.cfg.lean_map[s.mbfc_lean] === 'number' ? { v: D.cfg.lean_map[s.mbfc_lean] } : null)}<b>${s.mbfc_lean}</b>${s.mbfc_fact ? ' · ' + s.mbfc_fact : ''}<br/><span class="t-meta">${t('rater_mbfc', s.mbfc_date ? dt(s.mbfc_date) : '')}</span> ${s.mbfc_url && html`<a class="lnk" href=${s.mbfc_url} target="_blank" rel="noopener noreferrer">MBFC</a>`}` : null)}
    ${row('f_jsn', s.jsn_member == null && s.jsn_count == null ? null : html`${s.jsn_member ? t('jsn_yes') : t('jsn_no')}${s.jsn_count != null ? html`<br/>${t('jsn_n', s.jsn_count)}` : ''} <a class="lnk" href="https://www.jsn.fi/" target="_blank" rel="noopener noreferrer">JSN</a>`)}
    ${row('f_cb', s.cb ? html`<b>${Math.round(s.cb.share)} %</b> ${t('cb_of', s.cb.n)} ${cbTag(s, D)} <a class="lnk" href="#/lisaa/menetelma">${t('method')}</a>` : null)}
    ${s.flags.length > 0 && row('f_flags', html`<span class="chiprow">${s.flags.map(x => html`<span class="tag">${x}</span>`)}</span>`)}
    ${row('f_src', s.source_url ? html`<a class="lnk" href=${safe(s.source_url)} target="_blank" rel="noopener noreferrer">${s.source_url.replace(/^https?:\/\//, '').slice(0, 40)}</a> · ${s.checked_on ? dt(s.checked_on) : ''}` : null)}
  </dl>
  <div class="pad chiprow">${tog('follow', key)}${tog('mute', key)}</div>
  <div class="sec-h"><h2 class="h-sec">${t('latest')}</h2></div>
  ${arts.length ? html`<div class="panel">${arts.map(a => html`<a class="story" href=${D.byId[a.story_id] ? '#/s/' + a.story_id : safe(a.url)}><div class="kick">${ago(a.published_at)}</div><h3 class="h-card" style="font-size:16px">${a.title}</h3></a>`)}</div>` : html`<${Empty} title=${t('e_src_t')} body=${t('e_src_b')} cta=${t('go_news')} onCta=${() => { location.hash = '#/'; }}/>`}`;
}

// ---- Oma ----
const HBars = ({ title, rows, total }) => html`<div style="margin-top:18px"><h3 class="h-card" style="font-size:16px;margin-bottom:6px">${title}</h3>${rows.map(([k, n]) => html`<div class="hbar"><span>${k}</span><span class="tr"><i style=${'width:' + Math.round(n / total * 100) + '%'}></i></span><span>${n} · ${Math.round(n / total * 100)} %</span></div>`)}</div>`;
export function Mine({ D, P, A, q }) {
  const ck = P.clicks.filter(c => c[0] > Date.now() - 30 * 864e5), [kw, setKw] = useState(''), [msg, setMsg] = useState(''), [code, setCode] = useState(q.code || ''), file = useRef();
  const tally = fn => { const m = {}; ck.forEach(([, id]) => { const s = D.S[id]; if (s) { const k = fn(s); m[k] = (m[k] || 0) + 1; } }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6); };
  const own = tally(s => gname(s.group)), n = ck.length, link = location.origin + location.pathname + '#/oma?code=' + P.code;
  let qr = ''; try { if (P.code && window.qrcode) { const g = window.qrcode(0, 'M'); g.addData(link); g.make(); qr = g.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } } catch {}
  const add = name => { const k = kw.trim(); if (k) { A.upd(p => ({ [name]: [...new Set([...p[name], k])] })); setKw(''); } };
  const item = (name, k) => html`<span class="own" style="height:32px">${k.startsWith('src:') ? (D.S[k.slice(4)]?.name || k) : k}<button aria-label=${t('remove', k)} style="min-width:32px;min-height:32px" onClick=${() => A.upd(p => ({ [name]: p[name].filter(x => x !== k) }))}>×</button></span>`;
  return html`<div class="pg-h"><h1 class="h-story" style="font-size:28px">${t('diet')}</h1><p class="t-sec">${t('priv')}</p></div>
  ${n === 0 ? html`<${Empty} icon="mine" title=${t('e_diet_t')} body=${t('e_diet_b')} cta=${t('go_news')} onCta=${() => { location.hash = '#/'; }}/>` : html`
    <div class="stat"><div><b>${n}</b><span class="t-meta">${t('st_read')}</span></div><div><b>${new Set(ck.map(c => c[1])).size}</b><span class="t-meta">${t('st_src')}</span></div><div><b>${own.length}</b><span class="t-meta">${t('st_own')}</span></div></div>
    <section class="blk" style="margin-top:0"><h2 class="h-sec" style="margin-bottom:8px">${t('diet_30')}</h2><p class="insight">${t('insight', Math.round(own[0][1] / n * 100), own[0][0])}</p>
      <${HBars} title=${t('by_owner')} rows=${own} total=${n}/><${HBars} title=${t('by_lean')} rows=${tally(s => t('l' + (s.lean == null ? 0 : s.lean + 3)))} total=${n}/>
      <${HBars} title=${t('by_country')} rows=${tally(s => s.country || t('noinfo'))} total=${n}/><${HBars} title=${t('by_lang')} rows=${tally(s => (s.lang || '?').toUpperCase())} total=${n}/></section>`}
  <section class="blk" aria-labelledby="h-fm"><h2 class="h-sec" id="h-fm">${t('follow_mute')}</h2><p class="t-sec" style="margin-bottom:10px">${t('fm_hint')}</p>
    <div class="filters"><label class="sr" for="kw">${t('keyword')}</label><input id="kw" class="field" value=${kw} placeholder=${t('keyword')} autocapitalize="none" autocorrect="off" onInput=${e => setKw(e.target.value)}/>
      <button class="btn sec" onClick=${() => add('follow')}>${t('follow')}</button><button class="btn sec" onClick=${() => add('mute')}>${t('mute')}</button></div>
    <div class="chiprow">${P.follow.map(k => item('follow', k))}</div><div class="chiprow" style="margin-top:6px">${P.mute.map(k => item('mute', k))}</div></section>
  <section class="blk" aria-labelledby="h-bk"><h2 class="h-sec" id="h-bk">${t('backup')}</h2><div class="chiprow"><button class="btn sec" onClick=${A.exportJson}>${t('export')}</button>
    <button class="btn sec" onClick=${() => file.current.click()}>${t('import')}</button><input ref=${file} type="file" accept="application/json,.json" class="sr" tabindex="-1" aria-label=${t('import')} onChange=${async e => { const f = e.target.files[0]; if (f) setMsg(A.importJson(await f.text()) ? t('imp_ok') : t('imp_fail')); e.target.value = ''; }}/></div></section>
  <section class="blk" aria-labelledby="h-sy"><h2 class="h-sec" id="h-sy">${t('sync')}</h2><p class="t-sec">${t('sync_hint')}</p>
    ${P.code ? html`<div class="stack"><span class="mono12">${P.code}</span>${qr && html`<div class="qr" role="img" aria-label=${t('qr')} dangerouslySetInnerHTML=${{ __html: qr }}></div>`}
      <div class="chiprow"><button class="btn sec" onClick=${() => { try { navigator.clipboard.writeText(link); setMsg(t('copied')); } catch {} }}>${t('copy_link')}</button><button class="btn ghost" onClick=${() => A.upd({ code: null })}>${t('sync_off')}</button></div></div>` :
      html`<div class="stack"><button class="btn pri" onClick=${A.newCode}>${t('sync_new')}</button><div class="filters"><label class="sr" for="cd">${t('code')}</label><input id="cd" class="field mono12" value=${code} placeholder=${t('code')} autocapitalize="none" autocorrect="off" onInput=${e => setCode(e.target.value)}/>
        <button class="btn sec" onClick=${async () => { if (confirm(t('pair_warn'))) setMsg(t('pair_' + await A.pair(code))); }}>${t('pair')}</button></div></div>`}
    <p class="note" role="status">${msg}</p></section>`;
}

// ---- Lisää, menetelmä, lähteet ----
const Tg = ({ k, P, A }) => html`<label class="tg"><span>${t('o_' + k)}</span><input type="checkbox" checked=${P[k]} onChange=${e => A.upd({ [k]: e.target.checked })}/></label>`;
export function More({ D, P, A }) {
  return html`<div class="pg-h"><h1 class="h-story" style="font-size:28px">${t('tab_more')}</h1></div>
  <section class="blk" style="margin-top:12px" aria-labelledby="h-set"><h2 class="h-sec" id="h-set">${t('settings')}</h2>
    <div class="filters"><${Seg} label=${t('language')} val=${P.lang} on=${v => A.upd({ lang: v })} opts=${[['fi', 'Suomi'], ['en', 'English']]}/><${Seg} label=${t('theme')} val=${P.theme} on=${v => A.upd({ theme: v })} opts=${[['dark', t('dark')], ['light', t('light')]]}/></div></section>
  <div class="panel" style="margin-top:12px">${['hidePaywall', 'hideRead', 'showFlagged', 'single'].map(k => html`<${Tg} k=${k} P=${P} A=${A}/>`)}</div>
  <div class="panel" style="margin-top:12px"><a class="lrow" href="#/lisaa/menetelma"><div><div class="nm">${t('method')}</div></div></a><a class="lrow" href="#/lisaa/lahteet"><div><div class="nm">${t('sources')}</div><span class="t-meta">${D.sources.filter(s => !s.flagged).length}</span></div></a>
    <a class="lrow" href="lataa.html"><div><div class="nm">${t('get_app')}</div><span class="t-meta">${t('get_app_b')}</span></div></a></div>
  <p class="foot">${t('priv')}${D.run ? ' ' + t('updated', dt(D.run) + ' ' + hm(D.run)) : ''}</p>`;
}
export function Method({ D }) {
  const c = D.cfg, sv = c.sivuutetut, mb = D.sources.map(s => s.mbfc_date).filter(Boolean).sort().pop(), W = Object.entries(c.clickbait.weights);
  return html`<${AppBar} title=${t('method')}/><div class="pg-h"><h1 class="h-story" style="font-size:28px">${t('how')}</h1><p class="t-sec">${t('m_intro', c.version)}</p></div>
  <div class="prose"><h2>${t('m_rank')}</h2><p><code>${c.rank.formula}</code></p><p>${t('m_rank_b', c.rank.half_life_h, c.rank.top_min_outlets)}</p>
    <h2>${t('m_bars')}</h2><p>${t('m_bars_b', c.bars.min_rated)}</p><p>${t('m_scale')}</p><p>${t('m_mbfc', mb ? dt(mb) : '')}</p>
    <h2>${t('m_voice')}</h2><p>${t('m_voice_b', c.voice.buckets.join(' / '), c.voice.window_days)}</p><p>${c.voice_visible ? t('m_voice_on', c.voice.badge) : t('m_voice_off')}</p>
    <h2>${t('bs_title')}</h2><ul><li>${t('m_a', sv.A.min_articles, sv.A.min_outlets_in_group, sv.A.min_active_groups)}</li><li>${t('m_b', sv.B.min_rated, sv.B.min_groups, Math.round(sv.B.side_share_min * 100), sv.B.opposite_active_min)}</li><li>${t('m_d', sv.D.min_rated, sv.D.min_groups, Math.round(sv.D.side_share_min * 100))}</li></ul><p>${t('m_win', sv.window_h, sv.week_window_h, sv.active_group_min_articles)}</p>
    <h2>${t('m_cb')}</h2><p>${t('m_cb_b', c.clickbait.threshold, c.clickbait.window_days)}</p><p>${W.map(([k, w]) => k.split('_').slice(1).join(' ') + ' ' + w).join(' · ')}</p><p class="t-meta">${c.clickbait.calibration}</p>
    <h2>${t('m_sum')}</h2><p>${t('m_sum_b', c.summary.min_outlets, c.summary.max_words, c.summary.cite_cos_min)}</p>
    <h2>${t('m_priv')}</h2><p>${t('m_priv_b')}</p>
    <h2>${t('m_lim')}</h2><p>${t('m_lim_b')}</p><p>${t('m_miss', D.sources.filter(s => s.status && s.status !== 'ok').length)}</p></div>`;
}
export function Sources({ D, P }) {
  const grp = [['FI', D.sources.filter(s => s.country === 'FI')], ['', D.sources.filter(s => s.country !== 'FI')]];
  return html`<${AppBar} title=${t('sources')}/><div class="pg-h"><h1 class="h-story" style="font-size:28px">${t('sources')}</h1></div>${grp.map(([k, xs]) => html`<div class="sec-h"><h2 class="h-sec">${k ? t('c_fi') : t('c_world')}</h2></div><div class="panel">${xs.filter(s => P.showFlagged || !s.flagged).map(s => html`<a class="lrow" href=${'#/l/' + s.id}><${Mono} s=${s}/><div><div class="nm">${s.name}</div><span class="t-meta">${s.owner ? gname(s.group) : t('noinfo')} · ${leanTxt(s)}</span></div>${s.status && s.status !== 'ok' && html`<span class="tag warn">${t('no_feed')}</span>`}</a>`)}</div>`)}`;
}
