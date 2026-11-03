# V - Final blueprint (Meeting 2 synthesis)

> UI terms: "Sivuutetut uutiset" in this doc is a placeholder; final Finnish terms come from `TERMS.md` once Jesse picks them.

Status: for founder approval. Inputs: product.md, tech.md, risks.md (meetings/02_blueprint), DESIGN.md, DECISIONS.md, A§9. Binding: DECISIONS.md plus coordinator rulings (Sivuutetut uutiset, licence non-issue, Supabase + weekly git export, thin WebView APK, voice index hidden until gate).

## 1. What V is and v1 scope
- V is Jesse's personal news reader (Finnish + global), like Ground News: each story once, with who covers it, who owns them, and who is missing.
- It never says what is true or "biased". It shows outlet facts and labelled estimates, each with rater, method and date.
- Three jobs: catch up fast (summaries with citations); see the frame (owner, tie, lean, Sivuutetut uutiset); know my diet (local "Oma uutisdieetti").
- One user, no login, no tracking, fi/en UI, dark theme by default (light optional). One codebase: webapp v.kuljento.fi + thin APK.
- Runs on free tiers only; no server of our own; data updates every 30 min without any deploy.

### 1.1 v1 features and acceptance criteria (AC)
| # | Feature | AC |
|---|---|---|
| F1 | Ingest: RSS/Atom, dedupe by canonical URL, lang tag, conditional GET | Re-run adds 0 duplicates; every article has source, url, lang, published_at; a failing feed is logged in `runs`, the run continues |
| F2 | Clustering into stories (per language) | On 100 hand-labelled pairs: precision >= 0.9 at shipped threshold; story page lists all members |
| F3 | Top stories (chips Kaikki / Suomi / Maailma / Paikallinen) | Order by rank formula (§2.4); story with <3 outlets not in Top; formula on method page |
| F4 | Story page: summary, bars, owners, headlines grouped by lean group | Cached open <1 s; list filter by owner group/lean/lang; sort latest/alpha |
| F5 | Summary (extract-then-cite, §5) | Every sentence has cite tags that pass checks; if all fail, show extractive lead labelled "Ei tekoälytiivistelmää"; model name in tooltip; fail rate <25% on 50 Finnish clusters before launch |
| F6 | Bars: lean bar + ownership bar | Lean bar only if >=3 rated outlets, else "Liian vähän arvioituja lähteitä"; grey "Ei arvioitu" segment always drawn; counts not %; pattern + legend |
| F7 | Sivuutetut uutiset tab (§2.5) | Cards state the rule hit + numbers in one sentence; Päivä/Viikko toggle; empty state shows thresholds |
| F8 | Outlet page (§2.1) | Every outlet in sources.json has a page; unknown field = "Ei tietoa" |
| F9 | Search | Title+lead of last 30 days via PostgREST `ilike`; fi/en; <500 ms |
| F10 | My feed: follow/mute topics, hide read, hide paywalled | Persist after reload and APK restart (localStorage, try/catch) |
| F11 | Oma uutisdieetti (local) | From local read-clicks only; shares by owner group, lean bucket, country, lang, last 30 days; empty state "Lue muutama juttu" |
| F12 | Local chip (regional papers) | Shows stories with >=1 regional outlet; region from sources.json |
| F13 | fi/en UI + dark theme default | Opens dark on every device; light only via Settings; switch w/o reload |
| F14 | Method page | Generated from `web/method.json` + config, so it cannot drift; lists formulas, thresholds, raters, dates, version |
| F15 | /lataa APK page (§7) | Version, size, date, sha256 from version.json; steps fi/en; works without JS |
| F16 | Backup/restore of prefs + read state | One tap export, one tap import JSON |
| F17 | Flagged group (MV-lehti etc.) | Hidden by default, toggle in settings; "Merkitty" chip; never in bars or Sivuutetut uutiset |
| F18 | Headline style ("clickbait") score per outlet | 10 binary headline features, 0-100 per headline, share >= 25 over 30 d on outlet card + story list; formula on method page; weights tuned on 300 hand-labelled headlines (meetings/02_blueprint/independent_and_clickbait.md) |
| F19 | JSN membership + funding model on outlet card | Fact fields `jsn_member`, `funding` with source_url; Yle: public company, Yle tax, parliament supervisory council |
| F20 | Device sync without login | Random sync code (cookie + localStorage), Supabase `sync(code_hash, prefs jsonb)` via RPC only; pair by QR/code; last-write-wins; works offline |

NICE (only if all above done, this order): factuality mix per story, owner-diversity number, first-seen timeline, crossover rule C, daily briefing card, saved stories.

### 1.2 NOT in v1
Push, newsletters, extension, widgets, accounts/sync, comments, sharing, per-article bias scores, any "truth" score, AllSides/Ad Fontes data, paid or Gemini embeddings, NewsAPI/GDELT, social/video, translation of article text, analytics/ads, auto JSN scraper, native updater beyond §7.

## 2. Rating and Sivuutetut uutiset rules (constants live in `data/config.json`; method page reads it)
### 2.1 Outlet card (hand-edited `sources.json`, each field has `source_url` + `checked_on`)
owner group + type (company/state/foundation/interest org/party) - party/org tie (fact) - lang, country, region - paywall (none/metered/hard) - MBFC lean + factuality as published, with date and link, label "MBFC (US-kehys)" - JSN count of "langettava" last 5 years, hand-filled, not normalised - our voice index (§2.3) or "Ei arviota" - flags: `flagged`, `wire-heavy`. Never "biased/unbiased"; "Keski" never called neutral; "Keskusta" never used as a lean word (party name); every number shows rater + date.
### 2.2 Lean scale
Value v in {-2..+2} = Left, Centre-left, Centre, Centre-right, Right (DESIGN §2.1 palette and patterns). Global outlets: MBFC label -> v: Left -2, Left-Center -1, Least Biased 0, Right-Center +1, Right +2. Pro-Science/Satire/Conspiracy-Pseudoscience/Questionable: no v ("Ei arvioitu"); Questionable candidates go to `flagged` by hand. No MBFC entry = unrated. Finnish outlets: v from voice index only when it is visible (§2.3), else unrated.
### 2.3 Finnish voice index "Äänen suunta" (measures whose voice an outlet quotes; never truth)
Rolling 90 days, only political articles (keyword list, no LLM).
1. T1 voice share: string-match party names + MP/minister names (eduskunta open data) in title+lead+body at ingest; store per-article party vector (small jsonb `voice`), so bodies can expire at 14 days.
2. T2 position: `data/parties.yaml` (CHES left-right position p in -2..+2, gov/opposition, dated). Outlet score S = sum(share_party x p_party). Second number: government share of voice.
3. T3 stance (optional): 100 political articles per outlet, yes/no "criticises the government? return sentence id or none"; 2 models must agree, evidence id must exist in text; else discard. Switched off if it fails the gate.
4. Bucket cutpoints (fixed, shown on method page): S < -1.2 -> -2; -1.2..-0.4 -> -1; -0.4..0.4 -> 0; 0.4..1.2 -> +1; > 1.2 -> +2. Tie and MBFC shown beside the estimate, not averaged in.
5. Confidence: high = n>=200 AND T2/T3 within 1 bucket AND Jesse's sanity label within 1 bucket; medium = n>=100 AND T2 within 1 bucket of tie/MBFC/T3; low = n>=30 (card only, not in bars); else none. Party papers: "estimate differs from tie" flag when >1 bucket apart.
6. **Gate (hidden by default)**: hand-label 100 articles; need T1 recall >= 0.9 and T3 agreement >= 0.75 (else T3 off). Until the gate passes the estimate is computed but `voice_visible=false`: Finnish outlets are unrated in bars, rule B inactive. After: visible with badge "Kokeellinen arvio v1". Version bump on any threshold change; old values kept.
### 2.4 Rank
`score = outlets * 0.5^(age_h/18) + 0.3 * ln(1 + articles)`; outlets = distinct sources (flagged excluded), age_h = hours since newest article. Top = outlets >= 3. Outlets = 1 only in "single source" filter.
### 2.5 Bars and Sivuutetut uutiset
Ownership bar: segments = owner groups (count of outlets; wire-heavy reprints count once per group), label "N omistajaryhmää". Lean bar: segments by v, counts, grey for unrated; hidden if < 3 rated. Window = stories first seen < 48 h (weekly view 7 d). Pool = non-flagged outlets. Active group = owner group with >= 10 articles in window. A story matches at most one rule, order A, B, D, (C).
- **A "Vain yksi talo"**: >= 3 member articles, all from one owner group, that group has >= 2 outlets in the story, and >= 4 active groups exist. Card: "Vain Sanoma kirjoitti tästä".
- **B "Toinen puoli puuttuu"** (Finnish, after gate): >= 4 rated outlets (conf >= medium) from >= 2 groups; mean v = m with |m| >= 1.0 and >= 75% of rated outlets strictly on that side; opposite side has >= 2 active rated outlets not in the story. Card: "Oikeisto-keskusta kirjoitti, vasemmisto ei".
- **D (global)**: >= 6 MBFC-rated outlets from >= 4 owner groups; |m| >= 1.0 and >= 75% on one side; also state countries on text.
- **C (NICE)**: global story >= 8 outlets and 0 Finnish; or Finnish story with 0 global in 24 h.
Each card prints the rule and numbers. Nothing matches -> empty state with thresholds, never padding.

## 3. Sources
- v1 list: 18 working Finnish feeds + ~14 verified independent/non-mainstream Finnish feeds (independent_and_clickbait.md) + 25 global MBFC-rated direct RSS feeds = 43 (A§6), plus flagged group (MV-lehti etc., stored, hidden). Target 80 later.
- Missing Finnish feeds (18 dead + 6 unchecked: Kauppalehti, Kaleva, Turun Sanomat, Svenska Yle, Uusi Suomi, Verkkouutiset ...): not blocking. After T2, a Haiku agent probes them; a still-dead one gets a Google News RSS `site:<domain>` URL as `feed_url` (titles + links only, `via='gnews'`, no lead so never summarised). Dead = 5 straight failures, weekly retry. Until fixed they are simply absent, and the method page lists them so the gap is not hidden.
- Selection bias is disclosed on the method page (risks §3). Owner data carries "Wikipedia/company page, checked_on".
- Wire/Reuters via Google News proxy; MBFC values for global outlets stored in sources.json (licence non-issue per founder).

## 4. Architecture
```
 43 RSS feeds (+gnews fallback)        Gemini free keys / OpenRouter :free
        |                                        ^ llm.mjs rotation
        v                                        |
 GitHub Actions cron */30 (PUBLIC repo kuljento/v, Node 22)
  ingest > dedupe > voice-tag > extract > embed(e5-small) > cluster > rank > summarize
        | service key (Actions secret)
        v
 Supabase Postgres (free) <-- anon key, RLS read-only, PostgREST -- browser / APK WebView
   sources articles bodies(private) stories summaries outlet_lean runs          ^
 weekly export.yml -> data/export/*.json in git (backup)                        |
 Netlify static site v.kuljento.fi (HTML + ES modules + Preact/htm, no build) --+
   /lataa page, /v.apk -> GitHub Release asset, /version.json (no-cache)
 Cloudflare DNS: CNAME v -> v-kuljento.netlify.app (proxy OFF)
 Android APK: one-Activity WebView -> https://v.kuljento.fi
```
| Part | Choice | Why free / simple |
|---|---|---|
| Compute | GitHub Actions, public repo | Unlimited minutes on public repos; private = 2000 min (cron */30 needs ~7000), fallback every 3 h |
| DB | Supabase free, no pgvector | 30-min writes prevent the 7-day pause; clustering uses 48 h of embeddings in memory; weekly JSON export of sources/outlets/ratings config to git covers backups (free plan has none) |
| Site | Plain HTML + Preact + htm, vendored, no build | ~10 list views; Netlify only serves files; deploys only for code/copy changes (15 credits each of 300/month) |
| Embeddings | `Xenova/multilingual-e5-small` q8 via transformers.js, cached | Local, free; if load fails the run skips clustering (no mixed vector spaces, no Gemini fallback) |
| LLM | Gemini free keys x models, then OpenRouter `:free` | Tiny tasks only (summary, T3 yes/no) |
| Personalisation | localStorage + JSON export | No login |
| APK | WebView wrapper | §7 |
### 4.1 Data model (RLS on; anon SELECT only; writes via service key)
`sources(id, name, domain, country, lang, region, feed_url, via, owner, owner_type, tie, paywall, kind, flags text[], mbfc_lean, mbfc_fact, mbfc_date, mbfc_url, jsn_count, etag, last_ok, fail_count, status)` - `articles(id, source_id, url, url_hash unique, title, lead, lang, published_at, fetched_at, story_id, emb real[] (3 d), emb_model, body_ok, voice jsonb)` - `bodies(article_id, body)` NO anon policy, 14 d - `stories(id, title, lang, first_at, last_at, n_articles, n_outlets, score, centroid, is_top, twin_id)` - `summaries(story_id, kind ai|extractive, model, sentences jsonb, n_articles_at)` - `outlet_lean(source_id, v real, conf, n, method_ver, source voice|mbfc|manual, visible bool, computed_at)` - `runs(id, at, stats jsonb)` - view `feed` (no emb, centroid, body). Retention at end of run: null emb 3 d, delete bodies 14 d, delete stories > 90 d. Size warning at 400 MB in `runs`. Public site shows headline + 300-char lead + link + own summary; full text stays private.
### 4.2 Repo layout (`v/`, pushed as repo root of kuljento/v)
`docs/` - `data/{sources.json,parties.yaml,config.json,export/}` - `supabase/schema.sql` - `pipeline/{run,ingest,extract,voice,embed,cluster,rank,summarize,lean,llm,db,export}.mjs` + `test/` (node:test, pairs.json, tune.mjs) - `web/{index.html,app.js,views.js,i18n.js,style.css,config.js,vendor/,version.json,netlify.toml}` - `android/` - `.github/workflows/{ingest,lean,export,android}.yml`.
### 4.3 LOC budget (hard cap 2500 total)
pipeline 750 + tests 200 - schema 90 - web JS 800 + CSS 300 + i18n 160 - android Kotlin 120 + gradle 60 - workflows 130. If a module passes +20% over budget, split or cut before merge.

## 5. Pipeline (`node run.mjs`, odd minute, each step try/catch per feed/story)
1. **Ingest**: fetch (10 s timeout, concurrency 8, ETag/If-Modified-Since), fast-xml-parser, ignore items > 72 h; canonical URL hash; same-source embedding cosine >= 0.97 = duplicate.
2. **Voice-tag**: party/MP string match for political articles (§2.3 T1); no LLM.
3. **Extract**: Readability + linkedom, only for stories >= 2 outlets, cap 20k chars; failure keeps lead, `body_ok=false`.
4. **Embed**: text = `"query: " + title + ". " + lead[:300]`; normalised 384-d.
5. **Cluster** (per language): join best open story (last < 48 h) if cos >= 0.86 and guard (>= 1 shared capitalised token/number or title Jaccard >= 0.12); else new story. Weekly merge at >= 0.90. Cross-language twin: centroid cos >= 0.84 + shared names/numbers -> `twin_id` ("Global view"). `tune.mjs` picks best F1 with precision >= 0.9 on `pairs.json`.
6. **Rank** §2.4.
7. **Summarize** (stories >= 3 outlets; >= 2 if top-30; skip if leads < 30 words). Chain: (a) extract, no LLM: per article first 2 sentences + top-2 by keyword overlap, <= 2k tokens, tagged `[a1..]`; (b) LLM writes 2-3 sentences in the dominant language as JSON `{sentences:[{t,cites}]}`, <= 60 words; (c) code checks per sentence: cites exist; every number/date/capitalised token appears in cited extracts; cosine(sentence, cited) >= 0.6; language stopword check; (d) failing sentences dropped; none left or JSON invalid after 2 tries -> extractive fallback (best 2 sentences with outlet names). Regenerate only if articles +30% or > 6 h and active. LLM never decides lean, ownership or factuality. Log model + daily fail rate; > 20% -> reorder chain.
8. **Voice index** (`lean.mjs`, weekly, own workflow): T2 score, optional T3, writes `outlet_lean` (`visible=false` until gate; the gate flips one config flag, by Jesse's approval).
9. **LLM rotation** (`llm.mjs`, port of `tools/ask.sh`): order = each `GEMINI*KEY*` x (flash-lite, flash), then OpenRouter ids ending `:free` (refuse others). On 429/5xx/bad JSON: cool (key,model) 60 s; daily-quota 429: rest of run. Budget 40 calls/run, <= 300/day, `llm_calls` in `runs`. All cooling -> stories stay extractive, next run retries. OpenRouter is backup only (50/day free cap).
10. **Observability**: `runs` row each run; ingest or DB failure = red run; footer shows "päivitetty" from `runs`. Keepalive step in workflow (60-day idle disable).

## 6. Web app (design: `docs/DESIGN.md`, shots `design/shots/*.png`, mockup `design/mockup.html`)
Tabs (mobile bottom, desktop left rail): Uutiset / News, Sivuutetut (page title "Sivuutetut uutiset") / Blindspot, Haku / Search, Oma / Mine, Lisää / More. Hash routing, same labels on web and APK.
| Screen | Shot | Notes |
|---|---|---|
| Uutiset (lead + list, chips) | 01_home, 07_home_dark, 10_desktop_home | story rows with bar, counts, facts line |
| Story | 02_story, 08_story_dark | summary box (>= 3 sources), bars + legend, owners, headlines grouped by lean, "Global view" twin link |
| Sivuutetut uutiset | 03_blindspot | cards by rule A/B/D, Päivä/Viikko |
| Outlet | 04_source | card §2.1, 20 latest, JSN link |
| Oma uutisdieetti | 05_bias, 09_bias_dark | local stats, export, follows |
| Loading/empty/error/offline | 06_states | per DESIGN §3 |
| Lisää | - | settings, method, sources list, /lataa; follows DESIGN tokens only |
Search is a tab; Settings holds language, theme, hide paywalled/read, show flagged, backup/restore. Shots re-rendered after the "Sivuutetut uutiset" rename (`design/render.js`).

## 7. Android APK
- Wrapper: one Activity, WebView (JS + DOM storage) loading https://v.kuljento.fi; same-host stays, other links open in the browser; offline retry page; pull-to-refresh; back button handled; permissions INTERNET + REQUEST_INSTALL_PACKAGES only. Exposes `window.VApp = {versionCode, installApk(url)}`. ~120 lines Kotlin, no deps beyond AndroidX.
- Build: GitHub Actions `android.yml` (copy of Hanslari's: temurin 17, setup-android, `./gradlew assembleRelease`), trigger on tag `app-v*` or dispatch; APK is a release asset `v.apk`; the job commits sha256 + versionCode to `web/version.json`.
- Signing: new keystore `v-release.jks` (RSA 4096, 30 y), never in git, base64 in secrets, offline copy in Jesse's password manager; not the Hanslari key. Losing it = reinstall.
- Self-update: `version.json` `{versionCode, versionName, apk:"/v.apk", sha256, notes}`; page JS compares with `VApp.versionCode` (absent in browser = hidden) and shows "Uusi versio"; tap -> `installApk` -> DownloadManager, sha256 check, installer intent (Android asks once for "install unknown apps"). APK changes only when native code changes.
- Download page `/lataa` (DESIGN §3): version, size, date, sha256 (and cert fingerprint), "Lataa APK", 3 steps fi/en incl. Play Protect warning. `/v.apk` = Netlify 200-proxy to the GitHub release.
- Android developer verification (global 2027): register when open; the webapp works without the APK.

## 8. Deploy runbook (Composio; Sonnet agent does, Haiku agent verifies)
1. GitHub: create public repo kuljento/v, push `v/`; Actions secrets set by Jesse.
2. Supabase: create project `v` (EU region), run `schema.sql`, read URL + anon + service keys, seed sources. Verify with anon key: select on `feed` works, insert denied, `bodies` empty.
3. Netlify via Composio deploy-site (fresh token every time; or repo-linked auto deploy): site `v-kuljento`, publish dir `web/`, custom domain v.kuljento.fi. `netlify.toml`: `no-cache` on version.json and index.html, `/v.apk` redirect.
4. Cloudflare via Composio: `CNAME v -> v-kuljento.netlify.app`, proxy OFF; provision TLS; `curl -I https://v.kuljento.fi` = 200.
5. Dispatch `ingest.yml`, check a `runs` row and feed in the browser, enable cron; tag `app-v1`, install via /lataa on a phone.
Secrets (names only): GitHub Actions `V_DB_URL` (pooler string of the V-only Postgres role `v_writer`; no service key, see docs/SECURITY.md H1), `GEMINI_KEY_1..N`, `OPENROUTER_API_KEY`, `V_KEYSTORE_B64`, `V_KEYSTORE_PASS`, `V_KEY_ALIAS`, `V_KEY_PASS`. Public in `web/config.js`: Supabase URL + anon key. Composio-side: Netlify, Cloudflare, Supabase, GitHub connections. Never in git: service key, LLM keys, keystore.

## 9. Top risks and mitigations
| # | Risk | Mitigation |
|---|---|---|
| 1 | False cluster merges poison every screen | Entity guard, precision gate >= 0.9 on 100 pairs before UI work, split-over-merge, weekly sample review |
| 2 | Free LLM hallucination / drift in Finnish | Extract-then-cite, code checks, extractive fallback, language check, fail-rate log, 50-cluster test before launch |
| 3 | Free LLM quotas cut (Gemini cut in Dec 2025; OpenRouter 50/day) | Rotation + cooling, 300 calls/day cap, cache, summaries optional (extractive works with 0 calls) |
| 4 | Voice index read as "bias" / unfair | Hidden until gate, badge "Kokeellinen", words "arvio" + confidence, method link on every bar, disclosed selection bias |
| 5 | Actions cron late/disabled, Supabase pause | Odd minute, keepalive, "päivitetty" footer, dispatch fallback, writes every run |
| 6 | Supabase 500 MB / no backups | Retention (emb 3 d, bodies 14 d), size warning, weekly JSON export to git |
| 7 | Netlify credits burnt by deploys | Data at runtime from Supabase, deploy only on code/copy change, no scheduled functions |
| 8 | APK sideload friction / lost key / 2027 verification | Thin wrapper, keystore double-stored, sha256 + steps on /lataa, webapp works alone |
Also: transformers.js/ONNX breakage (pin versions, cache model, skip clustering on failure); dead Finnish feeds (fail_count, gnews fallback).

## 10. Meeting 3 build plan (Sonnet tasks in worktrees; each ends with tests + <= 25-line report)
Order: T1 -> (T2, T4, T6 parallel) -> T3 -> T5 -> T7 -> T8 -> Fable gate.
| T | Task | Inputs | Outputs | Acceptance |
|---|---|---|---|---|
| T1 | Data + schema | fi/global source lists, A§6, this doc §2-4 | `data/sources.json` (43 + flagged), `parties.yaml`, `config.json`, `supabase/schema.sql`, rls test | JSON validates; anon select ok/insert denied/bodies hidden; every outlet has owner + source_url |
| T2 | Ingest, voice-tag, extract, db, run skeleton | T1, RSS fixtures | `ingest/extract/voice/db/run.mjs` + tests | re-run = 0 duplicates; a dead feed does not fail the run; voice tags parties on fixtures |
| T3 | Embed, cluster, rank, tune | T2 | `embed/cluster/rank.mjs`, `pairs.json`, `tune.mjs` | precision >= 0.9 on 100 pairs; report thresholds + recall; twin links work |
| T4 | LLM layer, summaries, voice index | T1 | `llm/summarize/lean.mjs` + mocked tests | rotation/cooling tested; checks drop bad sentences; fallback extractive; refuses non-`:free` |
| T5 | Workflows + first live run | T2-T4, Supabase | `ingest/lean/export.yml`, keepalive, model cache | live run writes `runs`, stories, summaries; run < 5 min; export JSON committed |
| T6 | Web app | DESIGN.md, shots, `feed` view contract | `web/*`, re-rendered shots | all F3-F17 ACs on fixture data; Lighthouse a11y >= 95; 390px and 1280px checked; dark mode |
| T7 | Android + release | T6 (`version.json`) | `android/`, `android.yml`, keystore how-to | CI builds signed APK; install + update banner on emulator; sha256 matches |
| T8 | Deploy | T5-T7, runbook §8 | live v.kuljento.fi, /lataa, /v.apk | Haiku smoke tests: 200, TLS, version.json no-cache, data < 3 min old |
Then **Fable GO/NO-GO (<= 15 lines)**: checks F1-F17 ACs, clustering precision, summary fail rate < 25%, no secrets in git, voice index hidden, Sivuutetut uutiset wording, every bar has method link. A NO-GO names the failing AC.
Side tasks: Haiku probes the 24 failed/unchecked Finnish feeds after T2; 100-article voice gate labelling (ASK 5) runs any time before the gate flips.

## 11. Resolved conflicts (smaller/simpler option picked)
1. Finnish lean: tech's 3-model AI lean vs product's voice index -> voice index (deterministic, LLM only for optional yes/no); `outlet_lean.source` = voice|mbfc|manual.
2. fi/en clustering: tech merged from day one vs product separate + link -> separate clusters, `twin_id` link at cos >= 0.84 + guard.
3. Bar minimum: product 3, DESIGN 2, risks 2 -> 3 rated outlets (DESIGN.md line edited to 3+).
4. Blindspot name: risks "Yksipuoliset aiheet", product "Sokeat pisteet", DESIGN "Katveet" -> "Sivuutetut uutiset" (tab "Sivuutetut"; DESIGN and mockup HTML updated).
5. Tab 1 name: product "Päivä" vs DESIGN "Uutiset" -> Uutiset.
6. APK page: `/apk` vs `/lataa` -> `/lataa` (DESIGN, matches Hanslari), file `/v.apk`.
7. APK update: risks link-only vs tech `installApk` -> `installApk` with sha256 (coordinator: self-update), no native auto-poller.
8. Search: client-side over 30 days (too large to ship) vs server -> PostgREST `ilike` on title/lead.
9. Body retention: product 90 d vs tech 14 d (500 MB) -> 14 d; voice vector stored per article so the 90-day index still works.
10. Storage: risks "no DB in v0" -> Supabase (coordinator) + weekly git export.
11. MinHash and Gemini embedding fallback -> both dropped; embeddings handle duplicates; failed model load skips clustering.
12. JSN: scraper vs hand field -> hand-filled `jsn_count`; scraper is NICE.
13. Rank: product "outlets x decay" vs tech formula -> tech's exact formula.
14. Summary threshold: tech >= 3 (>= 2 top-30) vs DESIGN hidden < 3 sources -> >= 3 outlets only (box hidden otherwise).
15. OpenRouter purchase (risks) -> no; stays free backup.
16. Rater data licence (risks: keep out of repo) -> stored in repo (coordinator: non-issue).
17. DECISIONS says "TWA/Capacitor" -> plain WebView wrapper per coordinator; note for DECISIONS log.

## 12. ASK JESSE (defaults apply if no answer)
1. Public GitHub repo `kuljento/v` (code, sources, MBFC values, exports; no secrets) so Actions are free? Default: yes. Otherwise cron every 3 h. Please also confirm the GitHub owner name.
2. Gut-feel left-right label for ~20 Finnish outlets (15 min, we prepare the list) to lift voice index to "high"? Default: later; estimate stays "medium" at best.
3. Summary language: the story's dominant language (default) or always the UI language?
4. Who labels the validation sets (100 pairs, 100 political articles)? Default: a Sonnet agent drafts, Jesse spot-checks 30 items (10 min); gate needs this before the voice index goes visible.
5. Sync read-state between phone and desktop? Default: no (manual export/import).
6. Register as Android developer when Google's verification opens to Finland (free, 2027)? Default: yes, when it opens.
