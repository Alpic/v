# V - Blueprint, product view (Meeting 2)

Role: product lead. Inputs: PLAYBOOK, `docs/01_AUDIT.md` (cited as A§n). Binding founder decisions: fi/en UI, Finnish + global news, our own transparent rating for Finnish outlets, public ratings (MBFC etc.) OK for global, full text storage OK, free LLMs only (tiny tasks), no login, one user, webapp v.kuljento.fi + APK (WebView, updates via web), "10 lines beats 100".

## 1. Vision and jobs
Vision (3 lines):
- V shows each news story once, with who covers it, who owns them, and what is missing, so Jesse sees the whole picture in minutes.
- It never says what is true or "biased": it shows facts about outlets and honest, labelled estimates, each with method and date.
- It is a personal tool: no accounts, no tracking, fast, bilingual, one codebase on web + APK.

The 3 jobs:
1. **Catch up fast**: the day's top stories (fi + global), one summary each, with sources behind every sentence.
2. **See the frame**: for any story, who covers it (owner group, party tie, lean estimate) and who does not (Blindspot).
3. **Know my diet**: a local "My news bias" view of what Jesse actually reads (by owner, lean, country, paywall).

## 2. v1 scope
Decisions on A§2 MUST/NICE. Sources v1: the 18 working Finnish feeds + 25 global (MBFC-rated, direct RSS; A§6). Failed Finnish feeds are fixed after launch (backlog, not blocking).

### 2.1 In v1 (each with acceptance criteria, AC)
| # | Feature | AC (testable) |
|---|---|---|
| F1 | Ingest + store: RSS (+Google News proxy for Reuters), full text fetch, dedupe by URL, language tag | Cron run adds new items; re-run adds 0 duplicates; every item has outlet, url, lang, first_seen; failed feed is logged, run continues |
| F2 | Story clustering (per language; fi and en separate, cross-linked, §7 Q7) | On a hand-labelled set of 100 article pairs: precision >= 0.9 at the chosen threshold; a story page lists all member articles |
| F3 | Top stories feed (fi tab filter + global filter + all) | Sorted by `distinct_outlets x recency_decay`; formula text shown in About-method; story with <3 outlets not in Top |
| F4 | Story page: summary, full coverage list, bars, outlet chips | Opens in <1 s from cache; list filterable by owner group / lean bucket / language; sortable latest/alpha |
| F5 | Summary (extract-then-cite, A§5 step 7) | Each sentence ends with source tag; checker drops sentences failing string-match; if all fail, show extractive lead only and label "Ei tekoälytiivistelmää"; model name in tooltip |
| F6 | Bars per story: ownership bar, lean bar (§3.3) | Bar shown only if >=3 outlets with known value; unknown share drawn as grey segment with count; every bar has legend + link to method |
| F7 | Blindspot tab (§3.4) | Tab lists today's/week's qualifying stories; each card states the rule hit in one sentence; empty state explains thresholds |
| F8 | Outlet (source) page + card (§3.1) | Every outlet in sources.yaml has a page; fields with no data show "Ei tietoa", never a guess |
| F9 | Search | Client-side over title+lead of last 30 days; fi/en; result <300 ms for 10k items |
| F10 | My feed: follow topics/outlets, mute topics, hide read, paywall filter | Settings persist after reload and APK restart; paywalled outlets hidden with one toggle |
| F11 | My news bias (local) | Computed only from local read-clicks; shows share by owner group, lean bucket, country, language for last 30 days; empty state says "Lue muutama juttu" |
| F12 | Local tab: regional Finnish papers (Keskisuomalainen titles etc.) | Region filter lists regional outlets only; shows stories where >=1 regional outlet is a member |
| F13 | fi/en UI + dark mode | Language switch changes all chrome strings w/o reload; follows `prefers-color-scheme` with manual override |
| F14 | About-method page | Lists every formula, threshold, rater + data date, method version; generated from config so it cannot drift |
| F15 | Download-APK page `/apk` | Shows latest version + sha256 from `version.json`; install steps fi/en; works w/o JS |
| F16 | Backup/restore | Export/import JSON of prefs + read state in one tap each |
| F17 | Disinformation/"flagged" outlet group (MV-lehti etc.) | Flagged outlets appear only with toggle; never counted in bars or Blindspot; red "Merkitty" chip on every article |

NICE, only if v1 is otherwise done (in this order): factuality mix per story (free once outlet factuality exists), source-diversity number (distinct owners), coverage timeline (first-seen), Finnish-global crossover blindspot (§3.4 C), daily briefing card, saved stories, per-side AI comparison (gated on coverage), country list view.

### 2.2 NOT in v1
Push alerts, newsletters, browser extension, widgets, Edition switcher, Bias Insights, alternative media, accounts/sync, comments, sharing, per-article bias scores, a numeric "truth" score, AllSides/Ad Fontes data (licence, A§8.7), Gemini/paid embeddings, NewsAPI, social/video sources, translation of article text, any ad/analytics script.

## 3. Rating model

### 3.1 Outlet card (source page). One row per outlet in `sources.yaml` (hand-edited, versioned, each field has `source_url` + `checked_on`)
| Field | Content | Origin |
|---|---|---|
| Owner group + owner type | e.g. Sanoma / company; Yle / state; MTK / interest org; Konstsamfundet / foundation | hand-coded, A§6, Wikipedia + company pages |
| Party / org tie | none / party paper (SDP, Kesk, Vas, Kok) / interest org | hand-coded, fact only |
| Language, country, region | fi/sv/en, FI/US/..., regional tag | hand |
| Paywall | none / metered / hard | hand, `checked_on` |
| MBFC lean + factuality | label as published, e.g. "Left-Center, High", date retrieved, link to MBFC page | global: stored from MBFC page per outlet; Finnish: where MBFC rates it (Yle, HS, IS), always labelled "MBFC (US-kehys)" |
| JSN rulings | count of "langettava" in last 5 years, plus link; **not normalised** in v1 (no volume data) | scrape jsn.fi, M1 in A§7 |
| Our lean estimate | bucket + confidence + n + method version + date (§3.2), or "Ei arviota" | computed |
| Flags | `flagged` (disinformation), `wire-heavy` | hand |

Honest labelling rules: never "biased/unbiased"; "Center" is never called neutral; every number shows rater and date; our estimate carries the word "arvio" (estimate) and the confidence word next to it.

### 3.2 Finnish lean estimate: "Äänen suunta" (voice index), reproducible, no invented numbers
It measures **whose voice and which side an outlet gives space to**, not truth. Built from deterministic steps first, small LLM tasks second, each with validation. All code and the 90-day article snapshot per run are versioned so a score can be recomputed.

Pipeline per outlet, rolling 90 days, only political-topic articles (topic = keyword list match, no LLM):
1. **T1 Voice share (no LLM).** Match party names + MP/minister names (eduskunta open data list, string match on title+lead+text) -> per article a vector of parties that are quoted or named as actors. Outlet voice vector = share per party.
2. **T2 Position map.** Fixed public party-position table (left-right and gov/opposition status from Chapel Hill Expert Survey + current government; stored in `parties.yaml`, dated). Outlet axis score = weighted mean position of parties in its voice vector; second number = share of government parties vs opposition. Both computable by a 20-line script.
3. **T3 Stance check (small LLM, optional, one yes/no per call).** For a random sample of 100 political articles per outlet: "Does this sentence criticise the government? Return sentence id or none." Majority of 2 free models; disagreement = discard; evidence sentence id must exist in the text (string check). Result is a criticism-rate vs gov/opposition.
4. **Seed prior (facts):** party tie and MBFC value (if exists). They are shown beside the estimate, not averaged into it.
5. **Bucket:** score -> 5 buckets (vasen / vasemmisto-keskusta / keskusta / oikeisto-keskusta / oikea) via fixed cutpoints written in About-method.

Confidence (field `confidence`, computed, shown as word + n):
- **high**: n >= 200 political articles AND T2 and T3 agree within 1 bucket AND Jesse's own sanity label (ASK JESSE 1) within 1 bucket.
- **medium**: n >= 100 AND T2 within 1 bucket of seed prior (party tie or MBFC) or of T3.
- **low**: n >= 30; shown on card only, not used in bars.
- **none**: "Ei arviota". Party papers: seed prior is the tie itself; estimate still computed, disagreement flagged "estimate differs from tie".

Validation gate before showing anywhere: hand-label 100 articles (stance and party mention) once; require T1 recall >= 0.9 and T3 agreement with hand label >= 0.75, else T3 is switched off (T1+T2 only). Method version bump on any threshold change; old values kept with date. The UI badge says "Kokeellinen arvio v1" until Jesse removes it.

### 3.3 Per-story bars
- **Ownership bar** (works for fi and global): segments = owner groups of covering outlets (count of outlets, not articles); label "N omistajaryhmää". Wire reprints (flag `wire-heavy`) count once per owner group.
- **Lean bar**: Finnish outlets use our estimate (only confidence >= medium); global outlets use MBFC mapped to 5 buckets (Left, Left-Center, Least biased/Center, Right-Center, Right; mapping table in About-method). Grey segment = unrated count, always drawn. One neutral colour scale (blue-grey to amber, not red/blue), L/R key on every bar. Bar hidden if <3 rated outlets.
- Party-tie chip row: shows which covering outlets are party-tied (fact, no estimate).

### 3.4 Blindspot definitions (computable, constants in one config file)
Window: stories first seen within 48 h; weekly view = last 7 days. Pool = non-flagged outlets only. "Active group" = owner group with >= 10 items in window.

**A. Finnish owner blindspot ("Vain yksi talo")**: story has >= 3 member articles; all from <= 1 owner group; that group has >= 2 outlets in story (else it's an exclusive, not shown); >= 4 active groups exist. Card: "Vain Sanoma kirjoitti tästä".
**B. Finnish lean blindspot ("Toinen puoli puuttuu")**: >= 4 rated outlets (conf >= medium) from >= 2 owner groups; mean lean m on scale -2..+2 with |m| >= 1.0 AND >= 75% of rated outlets on that side; the opposite side has >= 2 active rated outlets that did not cover it. Card: "Oikeisto-keskusta kirjoitti, vasemmisto ei".
**C. Crossover (NICE)**: global story with >= 8 outlets and 0 Finnish ones; or Finnish story with 0 global outlets in 24 h. Card "Suomi ei kirjoittanut" / "Maailma ei kirjoittanut".
**D. Global lean blindspot (GN-like)**: >= 6 MBFC-rated outlets in >= 4 countries/groups; mean on -2..+2 with |m| >= 1.0 and >= 75% on one side. Also shows the same gap by country as text.
A story can only match one rule; order A, B, D, C. Each card says which rule fired + numbers, so Jesse can disagree with it. No rule fires -> empty state with thresholds, never padding.

## 4. Information architecture
Tabs (5, same on web and APK; names fi/en): **Päivä / Today**, **Sokeat pisteet / Blindspots**, **Haku / Search**, **Oma / Mine**, **Lisää / More**.

| Screen | Reached from | Content |
|---|---|---|
| Today (home/top) | tab 1 | filter chips Kaikki / Suomi / Maailma / Paikallinen; Top stories cards: headline, 1-line summary, outlet count, tiny ownership bar; no duplicate hero |
| Story | card | summary with cite tags, bars (§3.3), coverage list with outlet chips, "Global view" link to the cross-language twin, follow/mute topic at bottom |
| Blindspots | tab 2 | cards by rule A/B/C/D with the fired-rule sentence; Päivä / Viikko toggle |
| Source (outlet) page | outlet chip, More > Sources | card (§3.1) + last 20 articles + JSN link |
| Search | tab 3 | one box, fi/en, filters: language, owner group, paywall |
| My news bias | Oma tab, top | local stats of last 30 days, export button; follows/mutes/saved below |
| Settings | Lisää | language, theme, hide paywalled, hide read, show flagged, backup/restore |
| About-method | Lisää | generated rules, formulas, raters, dates, versions, known weaknesses (A§3), changelog |
| Sources list | Lisää | all outlets filtered by owner/lean/flag |
| Download APK | Lisää + `/apk` | version, sha256, steps; APK banner "uusi versio" from `version.json` |
Naming: same labels on web and mobile. No empty "?" modules; no login prompts.

## 5. Additional product rules
- UI language is chrome only; summaries are in the story's language (fi for Finnish clusters, en for global); no machine translation in v1.
- Every summary, bar and Blindspot card is one tap from its evidence (member articles, rule numbers).
- Data store holds headline, url, lead, full text (founder OK); retention: full text 90 days, story/outlet metadata kept indefinitely.
- Performance targets: Today screen < 2 s on mobile 4G after first load; JSON payload < 300 kB gzipped for the day feed.

## 6. Answers to audit §9
1. **Rating policy: both.** MBFC shown named+dated+linked on outlet card and used for global bars; our estimate for Finnish bars. Licence risk accepted by founder (personal use, MBFC attribution kept, no redistribution: the data store and webapp are private to Jesse, see ASK 2).
2. **Finnish bias v1: ship without a single "lean score" claim**: ship facts (owner, tie, JSN, MBFC) plus our voice index labelled experimental, gated by §3.2 confidence and validation. No speech-corpus licence needed (CHES + eduskunta open data are public); 100 hand-labelled articles are the validation.
3. **Axis:** primary left-right via party positions (§3.2), secondary government-opposition share; ownership bar is the third, always-available view. "One side" for Finnish stories = lean bucket side (B) or owner group (A). Colours neutral, never red/blue.
4. **Sources v1:** 18 Finnish + 25 global. Fixing the 18 failed Finnish feeds + 6 unchecked = backlog task for a Haiku research agent after F1 works; not blocking.
5. **Flagged group:** MV-lehti and disinformation outlets are stored, labelled "Merkitty", hidden by default, excluded from bars and Blindspot (F17). Party papers are ordinary sources with a visible tie chip.
6. **Embeddings:** local multilingual-e5-small only; no Gemini for content. Run location: Tech lead decides; product requirement = refresh every <= 60 min, no always-on server (GitHub Actions cron or equivalent).
7. **Cross-language:** cluster per language first; cross-link fi and en stories when centroid similarity exceeds a tuned threshold (shown as "Global view"). Single merged cluster is a later experiment.
8. **Summary policy:** 2-3 sentences, each cited; if the checker drops a sentence it is dropped, if all fail show the extractive lead; target fail rate < 25%, else tune prompt/model before launch. Model name shown in the tooltip.
9. **Storage:** headline + url + lead + full text (founder-approved), 90-day full-text retention, store private.
10. **Personalisation:** localStorage only + JSON export/import (F16); see ASK 3 for sync.

### ASK JESSE (batch, 4 questions; defaults apply if no answer)
- ASK JESSE 1: Can you give a gut-feel left-right label for about 20 Finnish outlets (15 min, from a list we prepare) as the sanity check that lifts the lean estimate to "high" confidence? Default: yes, skip "high" until done; estimate stays "medium" at best.
- ASK JESSE 2: Is a private data store fine, with the webapp reading it through our own API (so full texts are not public)? Default: yes, private store (e.g. Supabase free tier) and only headlines, links, short leads in the public JSON.
- ASK JESSE 3: Do you want read-state/follows synced between phone and desktop? Default: no in v1 (manual export/import); revisit if you use both daily.
- ASK JESSE 4: Do you want the experimental Finnish lean estimate visible from day one (labelled, with confidence) or hidden until validated on 100 articles? Default: hidden until the validation gate in §3.2 passes, then visible with the "Kokeellinen" badge.

## 6b. Risks to carry into the spec
- Clustering false merges hurt every screen: precision gate (F2) before building the UI on top.
- Voice index may be mistaken for "bias": wording and badge are product requirements, not polish.
- Thin MBFC coverage for global (44/60): grey segment is the honest default.
- Free-LLM drift: only yes/no and cite-tag tasks; all outputs string-validated; logs of model used.
