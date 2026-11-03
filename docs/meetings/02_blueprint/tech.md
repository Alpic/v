# V - tech blueprint (Meeting 2, tech lead)

Decisions are binding for Meeting 3 unless the founder overrides. Free-tier numbers marked (~) are from memory/limited search: the agent doing the task must re-verify them. Full text storage is allowed (founder), but see the "bodies" rule in section 3.

## 1. Architecture

```
 ~80 RSS feeds + Google News fallback          Gemini free keys / OpenRouter :free
        |                                                 ^
        v                                                 | (llm.mjs rotation)
 GitHub Actions cron (every 30 min, PUBLIC repo, Node 22)
   ingest -> extract -> dedupe -> embed(e5-small, onnx) -> cluster -> rank -> summarize
        |   (service_role key, in Actions secrets)
        v
 Supabase Postgres (free)  <----- anon key, RLS read-only, PostgREST ----- Browser / APK WebView
   sources, articles, bodies(private), stories, summaries, outlet_lean         ^
                                                                               |
 Netlify static site v.kuljento.fi  (index.html + ES modules + Preact/htm) ----+
   /v.apk -> redirect to GitHub Release asset ; /version.json -> APK update check
 Cloudflare: CNAME v -> <site>.netlify.app (DNS only, grey cloud)
 Android APK: one-Activity WebView loading https://v.kuljento.fi (+ download/install of new APK)
```

Everything runs on free tiers with no server of our own:

| Piece | Choice | Why free / why not the others |
|---|---|---|
| Scheduler + compute | GitHub Actions in a **public** repo (code only, no secrets in git) | Public repos have unlimited minutes. A private repo has 2000 min/month (~): a 5-min run every 30 min needs ~7000. Needs the founder's OK to make the code public (Q1). Fallback if private: every 3 h (~1500 min). Cron repos get disabled after 60 days without commits: workflow ends with a keepalive step (`gh workflow enable`), and the job writes to Supabase every run, which also prevents the 7-day Supabase pause (~). |
| Cloudflare Worker cron | rejected | Free plan: 10 ms CPU, 50 subrequests per run (~). Cannot fetch 80 feeds + run ONNX. |
| Netlify scheduled functions | rejected | ~30 s limit; background functions are paid. |
| Supabase pg_cron + Edge Function | rejected for the pipeline | Edge CPU limit ~2 s, no ONNX runtime, Deno. Kept as a possible tiny "dispatch workflow" trigger if Actions cron proves unreliable. |
| Storage | Supabase Postgres, **no pgvector** | Clustering needs only the last 48 h of embeddings (~3-5k x 384 floats): loaded in memory by the job, brute-force cosine is milliseconds. Embeddings kept as `real[]` for 3 days, then nulled. One less extension, no index tuning. 500 MB cap (~): bodies expire after 14 days, see sizing in section 3. |
| Static JSON instead of DB | rejected | Needs a redeploy per run (Netlify tokens through Composio each time); DB + anon REST gives live data with zero deploys. |
| Frontend | Plain HTML + ES modules + Preact + htm from vendored files, **no build step** | The UI is ~10 views of lists. Next.js would add a build, a runtime and an adapter for ~zero gain. Preact+htm (~5 KB) gives components without bundler. Netlify just serves files. |
| Personalisation | localStorage (follows, mutes, read state), JSON export/import | Founder: no login. Audit Q10 answered: no sync. |
| APK | plain WebView wrapper (section 5) | See comparison there. |

## 2. Pipeline (all in `pipeline/`, Node 22, ES modules, ~6 npm deps)

Run = `node run.mjs` : every step is a function taking/returning rows, failures isolated per feed/story.

1. **Fetch** (`ingest.mjs`): `fetch` with 10 s timeout, concurrency 8, `If-None-Match`/`If-Modified-Since` (etag stored on `sources`). Parse with `fast-xml-parser` (RSS + Atom, one normaliser, ~40 lines). Per-source `fail_count`; after 5 straight failures set `status='dead'` and skip until a weekly retry. Items older than 72 h ignored. GDELT is out of v1.
2. **Normalise + dedupe**: canonical URL (strip utm/fbclid, fragment, trailing slash), `url_hash` unique index -> `on conflict do nothing`. Title hash catches same-outlet re-posts. Same-outlet near duplicates: embedding cosine >= 0.97 within the same source -> drop. (MinHash from the audit is dropped: embeddings already cover it, one mechanism instead of two.)
3. **Full text** (`extract.mjs`): `@mozilla/readability` + `linkedom` (much lighter than jsdom). Fetched only for articles in clusters with >= 2 outlets (saves time and bandwidth); other articles keep the RSS lead. Cap 20k chars. Paywalled/failed -> keep lead, flag `body_ok=false`.
4. **Embed** (`embed.mjs`): `@huggingface/transformers` (transformers.js, onnxruntime-node) with `Xenova/multilingual-e5-small`, q8, 384-d, mean-pooled + normalised. Text = `"query: " + title + ". " + lead[:300]` on both sides (symmetric similarity). Model cached via `actions/cache` (~120 MB), CPU runtime ~20-40 articles/s (~), fine for <=300 new articles per run. Fallback if model load fails: Gemini `text-embedding` free endpoint (different vector space, so never mix: store `emb_model`, and cluster only same-model rows; on fallback skip clustering that run rather than mix).
5. **Cluster** (`cluster.mjs`, incremental, ~80 lines): for each new article, compare with centroids of open stories (last article < 48 h). Join the best story if `cos >= 0.86` **and** guard passes (>= 1 shared "anchor" token: capitalised word/number/proper noun from title, or title token Jaccard >= 0.12). Else open a new story. Cross-language (fi<->en) allowed at `cos >= 0.84` + guard on numbers/names only (Q7: merged from day one, flagged by language chips). Centroid = running mean, renormalised. Weekly merge pass: stories with centroid cos >= 0.90 merged. **Thresholds are starting points**: Task 3 builds a 100-pair hand-labelled set (`pipeline/test/pairs.json`) and a `tune.mjs` that prints precision/recall per threshold; ship the best F1 with precision >= 0.9 (false merges are worse than splits).
6. **Rank** (`rank.mjs`): `score = outlets * 0.5^(age_h / 18) + 0.3 * ln(1 + articles)` where `outlets` = distinct sources, `age_h` = hours since the story's newest article. "Top" badge at `outlets >= 3` (audit). Formula shown in the UI "About" page. Stories with `outlets = 1` are shown only in a "single source" filter.
7. **Summary chain** (`summarize.mjs`) for stories with `outlets >= 3` (and >= 2 if top-30): (a) *extract*, no LLM: per article first 2 sentences + top-2 sentences by keyword overlap with story title, <= 2k tokens total, each tagged `[a1]..[an]`; (b) *generate*: free LLM, prompt = "write 2-3 sentences in the dominant language, every sentence ends with citation tags, use only the given text, output JSON `{sentences:[{t, cites:[..]}]}`"; (c) *programmatic checks* per sentence: cites exist, every number/date/capitalised token in the sentence occurs in a cited extract, embedding cosine(sentence, cited extracts) >= 0.6; (d) drop failing sentences; if none remain or JSON invalid after 2 model tries -> **extractive fallback** = the best 2 extracted sentences shown with outlet names and `kind='extractive'`. Regenerate only when article count grew >= 30% or > 6 h passed and story still active. UI shows kind (AI / extractive) and model name (Q8: yes).
8. **Lean estimate** (`lean.mjs`, runs weekly, own workflow): for each source, input = outlet name, domain, country, owner (from `sources.owner`, hand-written), 15 recent headlines; 3 models (distinct providers if possible) each return `{lean: -2..2, confidence 0-1}` (JSON, temperature 0); result = median lean, `agree = (max-min)<=1`; stored in `outlet_lean` with `models`, `computed_at`; recomputed every 90 days. UI labels it "AI estimate, not a rating" and shows the bias bar only when >= 2 rated outlets (audit). MBFC/own Finnish axis (Q1/Q2) is a content decision for Meeting 3: `outlet_lean.source` column allows `ai|manual`, manual wins.
9. **LLM rotation** (`llm.mjs`, ~60 lines, port of `tools/ask.sh`): ordered list [every `GEMINI*KEY*` key x (`gemini-3.5-flash-lite`, `gemini-3.5-flash`), then OpenRouter `:free` ids]. Per call: on 429/5xx/invalid JSON mark (key,model) cooling for 60 s (429 with daily quota: for the rest of the run) and go to the next. Hard budget per run (e.g. 40 calls) and a `llm_calls` counter in `runs`. Refuses model ids not ending in `:free` for OpenRouter. If everything is cooling: stories stay extractive, next run retries. Free quotas (~1000 req/day/key for flash-lite) are ample for ~300-500 summary calls/day.
10. **Errors/observability**: every run inserts a `runs` row (counts, failed sources, llm calls, duration). Per-step try/catch; the run fails (red) only if ingest or DB write fails. Footer of the web app shows "last updated" from `runs`.

## 3. Data model (Supabase, RLS ON everywhere)

```sql
create table sources(id text primary key, name text, domain text, country text, lang text,
  feed_url text, owner text, kind text,            -- kind: mainstream|public|party|tabloid|wire...
  etag text, last_ok timestamptz, fail_count int default 0, status text default 'ok');
create table articles(id bigserial primary key, source_id text references sources, url text, url_hash text unique,
  title text, lead text, lang text, published_at timestamptz, fetched_at timestamptz default now(),
  story_id bigint references stories, emb real[], emb_model text, body_ok bool);
create index on articles(story_id); create index on articles(published_at desc);
create table bodies(article_id bigint primary key references articles, body text);  -- NO anon policy
create table stories(id bigserial primary key, title text, lang text, first_at timestamptz, last_at timestamptz,
  n_articles int, n_outlets int, score real, centroid real[], is_top bool, langs text[]);
create index on stories(score desc);
create table summaries(story_id bigint primary key references stories, kind text, -- ai|extractive
  model text, sentences jsonb, n_articles_at int, created_at timestamptz default now());
create table outlet_lean(source_id text primary key references sources, lean real, agree bool,
  models text[], source text default 'ai', computed_at timestamptz);
create table runs(id bigserial primary key, at timestamptz default now(), stats jsonb);
-- read-only public view for the web app (no emb, no centroid, no body):
create view feed as select s.id, s.title, s.lang, s.last_at, s.n_outlets, s.n_articles, s.score, s.is_top, s.langs,
  (select sentences from summaries m where m.story_id=s.id) summary, ... from stories s;
-- policies: anon SELECT on sources, articles(no emb via view), stories, summaries, outlet_lean, runs; no anon writes.
-- writes only via service_role (Actions). Retention job (end of run): null bodies/emb after 14/3 days, delete stories > 90 days.
```

- **bodies rule**: full text lives in `bodies`, never exposed through anon policies. The public site shows headline + 300-char lead + link out; this keeps a public website from republishing articles while the pipeline (and summaries) still get full text.
- Sizing (~): ~2000 articles/day x (1 KB meta + 384 floats 3 days ~ 4 KB + body 8 KB for ~40%) = ~10 MB/day -> 14 days ~ 150 MB + 90 days of metadata ~ 90 MB. Under 500 MB; a `runs` check warns at 400 MB.

## 4. Repo layout (`/home/user/playground/v/`, one repo; push to public repo `kuljento/v` for Actions)

```
docs/                 meeting docs, DECISIONS
data/sources.json     ~80 sources: id, name, feed_url, lang, country, owner, kind (from fi_sources.md / global_sources.md)
supabase/schema.sql   the section 3 SQL + RLS policies + feed view (applied via Composio)
pipeline/             Node: run.mjs ingest.mjs extract.mjs embed.mjs cluster.mjs rank.mjs summarize.mjs lean.mjs llm.mjs db.mjs
pipeline/test/        node:test unit tests + pairs.json + tune.mjs
web/                  index.html, app.js (Preact+htm), style.css, i18n.js (fi/en), config.js (public URL+anon key), vendor/, sw.js? (no), version.json, netlify.toml
android/              app/ (one Activity), gradle files, scripts/release.sh
.github/workflows/    ingest.yml (cron */30 + dispatch), lean.yml (weekly), android.yml (build + release on tag)
```

Estimated size (lines): pipeline ~650 (+150 tests), schema ~80, web ~700 JS + 250 CSS + i18n ~150, android Kotlin ~90 + gradle ~60, workflows ~120. **Total ~2300.** Single dependency list: fast-xml-parser, @mozilla/readability, linkedom, @huggingface/transformers, @supabase/supabase-js (or plain `fetch` to PostgREST: prefer fetch, ~25 lines, drop the dep). No TypeScript, no ORM.

## 5. Android APK

**Decision: plain WebView, one Activity.** Comparison:
- *TWA (Bubblewrap)*: needs Chrome, Digital Asset Links (`assetlinks.json` with the signing-key SHA-256), and falls back to a visible URL bar if verification fails; no hook for an in-app APK update check except via the web page. Build needs Bubblewrap/npm.
- *Capacitor `server.url`*: pulls in node + plugin tooling for what is one URL; its APK self-update still needs a custom plugin.
- *Plain WebView (chosen)*: ~90 lines Kotlin, no deps beyond AndroidX, full control (back button, external links, offline page, pull-to-refresh, download listener). Web changes ship instantly; the APK changes only when native code changes.

Behaviour: `WebView` (JS + DOM storage on) loads `https://v.kuljento.fi`; same-host navigation stays in view, other links go to the browser (`ACTION_VIEW`); `onReceivedError` shows a local "offline - retry" page; exposes `window.VApp = {versionCode, installApk(url)}` via `addJavascriptInterface`.

**Self-update**: `web/version.json` = `{"versionCode":N,"versionName":"..","apk":"/v.apk","sha256":"..","notes":".."}`. The page's JS reads `VApp.versionCode` (absent in a normal browser -> feature hidden) and if `json.versionCode > VApp.versionCode` shows a "New app version" banner. Tap -> `VApp.installApk('/v.apk')` -> DownloadManager (verifies sha256) -> `ACTION_VIEW` on a FileProvider URI with `REQUEST_INSTALL_PACKAGES` (user grants "install unknown apps" once). Because the key stays the same, it installs as an update. Native code is meant to change rarely; all UI/features update via Netlify.
`/v.apk` is a Netlify redirect (`200` proxy) to `https://github.com/<owner>/v/releases/latest/download/v.apk`, so an APK release never needs a web deploy except bumping `version.json`.

**Build**: GitHub Actions `android.yml` copied from `/home/user/a3dkroeu1/.github/workflows/android.yml` (temurin 17 + `android-actions/setup-android@v3` + `gradle/actions/setup-gradle@v4`, `./gradlew assembleRelease --no-daemon`), trigger `workflow_dispatch` + tag `app-v*`; no unit tests needed beyond a lint. Public repo = free minutes. Gradle can also build in this container only if the Android SDK is present: not assumed, CI is the path. Upload APK as release asset `v.apk`, then update `version.json` (sha256 + versionCode) in the same job via commit.
**Signing**: new keystore `v-release.jks` generated once (`keytool`, RSA 4096, validity 30 years), **never committed**; stored base64 in GitHub Actions secrets (`V_KEYSTORE_B64`, `V_KEYSTORE_PASS`, `V_KEY_ALIAS`, `V_KEY_PASS`) plus an offline copy in the founder's password manager. The release job decodes it to `$RUNNER_TEMP`. Losing it means a reinstall: say so in the runbook. Do not reuse the a3dkroeu1/Hanslari key.

## 6. Deploy runbook (Composio; each step by a Sonnet agent, a Haiku agent checks)

1. GitHub: create public repo `<owner>/v`, push `v/` as repo root (Actions secrets set by the founder or via API; names below).
2. Supabase (Composio): create project `v` (region eu-north/eu-central), run `supabase/schema.sql`, read back the project URL + anon key + service_role key; seed `sources` from `data/sources.json`. Verify with anon key: `select` works on `feed`, `insert` is denied, `bodies` returns empty/401.
3. Netlify (Composio; the direct Netlify MCP currently needs auth): create site `v-kuljento`, publish dir `web/` (deploy through Composio deploy-site with a fresh token every time, as in WORKFLOW.md; if the repo is linked, a push to main deploys automatically and is preferred). Add custom domain `v.kuljento.fi` on the site.
4. Cloudflare (Composio): `CNAME v -> v-kuljento.netlify.app`, **proxy OFF** (DNS only) so Netlify issues the Let's Encrypt certificate; then provision TLS in Netlify; check `curl -I https://v.kuljento.fi` returns 200 and `/version.json` is not cached (`Cache-Control: no-cache` in `netlify.toml`).
5. Run `ingest.yml` via dispatch, check `runs` row + feed in browser; then enable the cron. Run `android.yml` on tag `app-v1`; install the APK on a phone via `https://v.kuljento.fi/v.apk`.

Secrets (names only): GitHub Actions: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_KEY_1..N` (matches `GEMINI*KEY*`), `OPENROUTER_API_KEY`, `V_KEYSTORE_B64`, `V_KEYSTORE_PASS`, `V_KEY_ALIAS`, `V_KEY_PASS`. Public (in `web/config.js`, by design): Supabase URL + anon key. Composio-side: Netlify, Cloudflare, Supabase connections (no values in repo). Never in git: service key, LLM keys, keystore.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Actions cron late/skipped, disabled after 60 days idle | Keepalive step; "last updated" in UI; `workflow_dispatch` fallback; optional Supabase pg_cron -> dispatch API |
| Free LLM rate limits/quality drift | Rotation + cooling, budget per run, programmatic checks, extractive fallback; model names shown |
| Hallucinated summaries | Citation tags + string/embedding checks; drop sentences; extractive fallback; "AI" label |
| Wrong clusters (false merges) | Entity guard, high thresholds, labelled set + `tune.mjs`, weekly review of a sample, split-over-merge bias |
| Supabase 500 MB / 7-day pause | Retention job, nulling emb/body, size warning in `runs`; run every 30 min keeps it active |
| Public repo exposes code | No secrets in git; hand-written ownership/lean data is ours to publish; Q1 for the founder |
| Public site republishing copyrighted text | Bodies private; only headline + short lead + link + our own summary shown |
| Dead/blocked feeds (18 Finnish feeds failed in audit) | fail_count + dead status + weekly retry; Google News RSS fallback; list kept in `sources.json` |
| Transformers.js/ONNX breaks in Actions | Pinned versions, model cached, Gemini embedding fallback skips clustering rather than mixing spaces |
| APK sideload friction / lost keystore | One-time "unknown apps" prompt; keystore double-stored; web works without APK anyway |
| Legal for lean/MBFC data | Our own AI estimate labelled as such; any MBFC use named, dated, linked (Meeting 3 content task) |

## 8. Build plan for Meeting 3 (8 non-overlapping agent tasks)

Order: T1 -> (T2, T4, T6 in parallel) -> T3 -> T5 -> T7 -> T8.
1. **T1 Data + schema** (`data/sources.json`, `supabase/schema.sql`, RLS tests): turn the two source lists into JSON; schema as section 3; anon-vs-service test script. Needs founder go for the Supabase project.
2. **T2 Ingest + extract + dedupe** (`pipeline/ingest.mjs extract.mjs db.mjs run.mjs` skeleton, tests with saved RSS fixtures).
3. **T3 Embed + cluster + rank + tune** (`embed.mjs cluster.mjs rank.mjs`, `pairs.json`, `tune.mjs`): after T2; report chosen thresholds with precision/recall.
4. **T4 LLM layer + summaries + lean** (`llm.mjs summarize.mjs lean.mjs`, unit tests with mocked responses for checks and fallback).
5. **T5 Workflows + first live run** (`ingest.yml`, `lean.yml`, secrets checklist, model cache, keepalive); runs the pipeline end to end against the real Supabase.
6. **T6 Web app** (`web/*`: story list, story page with outlets/bias bar/summary, fi/en i18n, localStorage follow/mute/read, mobile-first per `docs/` UX meeting; design file first).
7. **T7 Android + release** (`android/`, `android.yml`, keystore generation instructions, `version.json` + update banner hook in `web/app.js` limited to one function).
8. **T8 Deploy** (Netlify site, Cloudflare CNAME, TLS, redirects, smoke tests, runbook section 6 executed) then a Fable GO/NO-GO.

Open questions for the founder (one batch): Q1 public repo OK (else cron every 3 h)? Q2 who approves a summary-language rule (dominant language vs always UI language)? Q3 Finnish lean: ship AI estimate + ownership first (recommended) or wait for a manual axis?
