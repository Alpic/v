# V - Meeting 1 audit: Ground News (GN)

Synthesis of 8 reports in `docs/meetings/01_audit/` (features, ratings, insights_plans, ux, pipeline, fi_sources, fi_bias_method, global_sources). Date of research 2026-11-02. [UNVERIFIED] = not confirmed on a primary page. V = this project: one user, no login, fi/en, free LLMs only, webapp + APK wrapper.

## 1. Ground News in one paragraph
GN (Snapwise Inc., Ontario; subscription-funded) is a news aggregator that ingests ~60k articles/day from 50k+ outlets, merges same-event articles into one "story", and overlays outlet-level metadata: political bias (average of AllSides, Ad Fontes, MBFC - GN rates nothing itself), factuality (Ad Fontes + MBFC), and hand-coded ownership (2,276 outlets). Its signature UI is the bias bar (L/C/R % of rated sources per story) and the Blindspot feed (stories covered mostly by one side). Free web/app plus paid tiers (Pro/Premium/Vantage, names and prices inconsistent). Moat = the overlay and source count, not a secret clustering method (pipeline.md s1). Ratings are US-centric and licensing of rater data is murky (s3).

## 2. Feature inventory
Tier = GN's tier as far as known ("?" = not confirmed). Verdict for V: MUST / NICE / SKIP.

| Feature | What it does | GN tier | V | Note |
|---|---|---|---|---|
| Story clustering | Merges same-event articles into one story | ? (core) | MUST | The core of V; method in s5 |
| Source count per story | N outlets covering | ? | MUST | Also drives "top story" ranking |
| Full coverage list | All articles of a story; sort Latest/Alpha, filter L/C/R | ? | MUST | Filter by ownership group / lean instead of US L/C/R |
| Bias bar | % of bias-rated sources by lean | ? (free-looking) | MUST | Needs a Finnish rating (s7); show only if >=2 rated outlets |
| Coverage split L/C/R | Headlines side by side per lean | ? | MUST | Merge with bias bar/breakdown |
| Bias comparison tab + summary | Per-side AI summary; gated on enough coverage from all sides | ? | NICE | Gate on coverage, like GN |
| AI "Ground Summary" | Short story summary | ? (existence conflict, s8) | MUST | Extract-then-cite, s5 |
| Blindspot feed | One-sided stories (mean/stdev of outlet bias in top-100) | Premium unlimited; limited below | MUST | Cheap once ratings exist; works on Finnish party/ownership axis too |
| Blindspot Report newsletter | Weekly digest | ? | SKIP | Show as a weekly view in-app |
| Factuality per outlet | 5 levels, publisher-level | Premium+ (paywalled) | NICE | Use JSN rulings (M1 in s7) |
| Factuality distribution per story | Mix across a story's sources | Premium | NICE | Free once outlet factuality exists |
| Ownership label | 8 categories, hand-coded | Vantage | MUST | Our Finnish table already has owner groups (s6); 1 person can code ~60 outlets |
| Ownership/funding transparency | Per story owners | Vantage | NICE | Derived from the same table |
| Bias Insights | Partisan-shaping-coverage analysis | Vantage | SKIP | Vague, no spec found |
| Source diversity indicator | Diversity of sources | ? | NICE | One number: distinct owners per story |
| Global coverage map | Map of where coverage comes from | Vantage | NICE | Country tag from GDELT `sourcecountry`; low cost list view first |
| Coverage timeline | Who reported first, over time | ? | NICE | First-seen timestamps already stored |
| Alternative media (beta) | Podcasts/YouTube per story | Vantage | SKIP | |
| Home / For You | Personalised by location, follows, usage | ? | NICE | No login: local prefs only; no usage tracking |
| Top Stories / In Focus | Daily major stories | ? | MUST | Score = distinct outlets x recency decay |
| Daily Briefing hero card | Stats line + summary of day | ? (name unverified) | NICE | One generated daily card |
| My Feed / follows (topics, places, people) | Unlimited on Premium | Premium | MUST | Stored in localStorage/export |
| Custom Feeds | Mini-feeds | "Pro+" [UNVERIFIED] | NICE | Same as saved topic filters |
| Local tab | Location-based news | ? | MUST | Regional Finnish papers (Keskisuomalainen etc.) |
| Edition (US/UK/CA/Intl) | Switches bias colours + content | ? | SKIP | V is fi + global; one fixed colour scheme |
| Search | Topic search | ? | MUST | Client-side over stored items |
| Show me less like this / topic mute | Down-weights topics | ? | NICE | Mute list in prefs |
| Interest pages | Tech, Science, Offbeat etc. | ? | NICE | Category tags |
| Hide read stories | Filter | Premium | NICE | Trivial with local read-state |
| Universal paywall filter | Hide paywalled | Premium | MUST | HS paywalled; small flag per outlet |
| Sort & filter (bias, factuality, location, paywall) | | basic ?; advanced Vantage | MUST | |
| Saved stories | Bookmarks | Vantage unlimited | NICE | Local |
| My News Bias dashboard | Own reading habit: bias/factuality/ownership of diet | Vantage (conflicting) | NICE | Local-only stats; it is the one feature that fits a single user. Chart types [UNVERIFIED] |
| Blindspot alerts / topic alerts | Push | ? | SKIP v1 | APK wrapper later; weekly digest enough |
| Newsletters (Burst Your Bubble, Daily Ground, US in brief) | Email | Premium/Vantage | SKIP | No accounts |
| Browser extension | Shows other coverage on any article | ? | SKIP | Worst-rated GN surface; privacy risk (s8) |
| Widgets | Home-screen | none confirmed | SKIP | |
| Dark mode | Web/app theme | ? | MUST | prefers-color-scheme |
| Bias edit / suggest source / feedback | Account prefs, support | free | SKIP | One user edits the source file |
| Group discount, gift, trial | Commercial | - | SKIP | |

Not found in any official source: free-tier limits, Pro tier contents, per-chart gating of My News Bias (features.md, insights_plans.md).

## 3. How GN rates (ratings.md)
- **Bias**: outlet-level (never per article), 7 labels Far Left..Far Right, mean of whichever of AllSides / Ad Fontes / MBFC rate the outlet (1-3 inputs, no weights, mapping to 7 labels unpublished). Unrated outlets are left out of the bar. "Center" is not "neutral". Scale is "in the context of the U.S. political system".
- **Factuality**: mean of Ad Fontes + MBFC only, 5 levels; mapping unpublished; mostly paywalled.
- **Ownership**: 8 categories (Conglomerate, Private Equity, Individual, Government, Telecom, Corporation, Independent, Other); hand-coded, sources unnamed; >5% stake = not Independent. Not fed into bias/factuality.
- **Blindspot**: each article gets its outlet's label; from the day's top 100 stories pick highest mean (one side) or highest stdev (fringes, no center). Not published: numeric label values, min sources per side, how daily rolls up to the weekly report.
- **Weaknesses**: (1) US-centric raters: MBFC itself says its method is "tailored to the political landscape of the United States"; (2) outlet-level only, wire reprints inherit the outlet label; (3) rater overlap is thin outside the US, so one rater often decides everything; (4) GN links stories without weighting source credibility (MBFC's own review: PJ Media, Sputnik, Newswars); (5) rater licensing disputed: AllSides says no formal permission, Ad Fontes says GN pays, MBFC says no agreement (CJR); (6) mixed evidence that Blindspot changes views; (7) Finnish coverage: HS shows "Lean Left", Iltalehti factuality unknown, other Finnish outlets unrated; Europe filter reportedly still US-heavy.

## 4. UX (ux.md) - evidence is text-only
**No screenshots, no computed CSS** (ground.news returned 403 to our headless browser; we did not bypass). Everything below is medium confidence.
Copy:
- Bias bar as "a starting point, not a verdict": explicit legend and a link to the method. Always say rater + date.
- Collapsible story page: summary, Full Coverage, Breakdown (spectrum bar, factuality donut, strip of source logos), feed-control actions at the bottom.
- Blindspot as a top-level destination, not hidden in a menu.
- Gate comparison/summary on enough coverage; otherwise show a plain summary.
- Dark mode, tab bar with few items.
Avoid:
- Region-dependent bias colours (US blue=left; reversed in UK/CA/Intl). Use one non-partisan palette plus an L/C/R key on every card.
- Duplicate hero + Top News card; five text layers per card; long customisable tab row; inconsistent names ("Home" on web vs "News" on mobile).
- Empty "?" placeholder modules for logged-out users (V has no login: show nothing or a real local-stats empty state).
- Unclear section names / filter config (App Store reviewer).
- Cancellation/billing complaints are irrelevant to V.
Ratings of GN itself: App Store US 4.7 (49K), Trustpilot 4.2 (232), Firefox extension ~3.25 [UNVERIFIED aggregator].

## 5. Pipeline (pipeline.md)
**GN**: public facts only: ~60k articles/day, 50k+ sources, merge by event, "AI to analyse content at speed and volume" with human oversight, top stories identical per edition, ranking formula unpublished. Ingestion method, clustering algorithm, summary model, language count: all unknown.

**Cheapest free stack for V v0**
1. Ingest: ~18 verified Finnish RSS (s6) + 60 global RSS (global_sources.md) + Google News RSS as fallback (Reuters) + GDELT DOC 2.0 for discovery (fi/en; live 429 seen, 1 req/5 s; URLs and metadata only, no text). Cron/GitHub Actions, no server.
2. Normalise: strip HTML, dedupe by URL, language tag. Store headline, URL, outlet, timestamp, short lead only (no full text - legal, pipeline.md s5).
3. Near-dupes: MinHash+LSH on title+lead (datasketch; thresholds [UNVERIFIED], start 0.8, tune on hand-labelled pairs).
4. Embeddings: **multilingual-e5-small, local CPU**, MIT, Finnish listed, 384-d [dim UNVERIFIED on official card], needs `query:`/`passage:` prefixes [UNVERIFIED]. Fallback: Gemini `gemini-embedding-001` free tier (free-tier content may be used by Google; ~$0.68/month if paid; quota [UNVERIFIED]). Local-only is the default.
5. Clustering: agglomerative, cosine threshold, 48 h window, plus shared-entity/keyword guard against false merges; incremental (join nearest cluster or open new). HDBSCAN as alternative. Cross-lingual fi/en merging relies on e5 being multilingual [UNVERIFIED quality].
6. Rank: distinct outlets x recency decay; "Top" at >=3 outlets; publish the formula in the UI.
7. Summaries (free LLM chain via ask.sh logic): (a) extract 3-8 central sentences per cluster with ids, no LLM; (b) LLM writes 2-3 sentences, each ending in `[a1]` citation tags, input <2k tokens; (c) programmatic checks: tag present, numbers/dates/proper nouns string-match the cited sentences, embedding similarity threshold; drop failing sentences; (d) log which model wrote it; show sources next to every summary. Support: extract-then-generate improves factual consistency (arXiv 2304.04193).
8. Bias overlay later, only once rating source is settled (s7).
Not usable: NewsAPI free tier (dev-only, 24 h delay, forbids production incl. internal use).

## 6. Sources
**Finnish** (`fi_sources.md`, 42 rows, probed with curl 2026-11-02): **18 working RSS** (2 are Swedish-language: HBL, Vasabladet), **18 not found/blocked** (incl. Kauppalehti, Talouselämä, Kaleva, Turun Sanomat, Svenska Yle, Uusi Suomi, Verkkouutiset (Cloudflare)), **6 unchecked** (rows 16-20, 36). "NO" means this URL failed, not that no feed exists. Working core: Yle, HS, IS, Iltalehti, MTV, Aamulehti, MT, 5 Keskisuomalainen titles, 3 party papers, MV-lehti.
Ownership groups: Yle (state 99.98%); Sanoma (HS, IS, Aamulehti, Satakunnan Kansa); Alma Media (Iltalehti, Kauppalehti, Talouselämä, Arvopaperi); Keskisuomalainen Oyj (~9 titles listed; "~80" is a 2019 figure); Kaleva Media (+ I-mediat 65%); MTV/Schibsted (closed 1.7.2025); MTK (MT); party-linked (Demokraatti-SDP, Suomenmaa-Keskusta, Kansan Uutiset-Vasemmistoliitto, Verkkouutiset-Kokoomus); Swedish-language (KSF/Konstsamfundet, Harry Schauman foundation); MV-lehti (disinformation per Wikipedia 2022; flag, never mix with reliable outlets). Owners mostly from English Wikipedia, many [UNVERIFIED]; paywall column almost all [UNVERIFIED]; "Oikea Media" not found.
**Global** (`global_sources.md`): 60 outlets (21 US, 9 UK, rest EU/Asia/ME/CA/AU/LatAm/Africa 1). ~58 direct RSS OK; Reuters only via Google News proxy; AP feed 403 [UNVERIFIED]. MBFC bias+factual read for 44 of 60; 16 missing (11 blocked 403, 2 no page, 1 no field, 2 unchecked). AllSides covers only 22 of 60 and is a 2019 snapshot (site 403). Free rating datasets are community scrapes with unclear licences: rbkhb MBFC scrape (1,066 rows, old), favstats AllSideR (547 rows, GPL-3.0, 2019), valurank (908, licence "other"); Ad Fontes scores are paid. Rating data is thin outside US/UK.

## 7. Finnish bias method options (fi_bias_method.md)
Finding: **no public per-outlet political-lean rating exists for Finnish outlets** in what we reviewed. DNR Finland: trust 67% (2nd of 48), "not politically polarised"; 2022 brand trust Yle 84, MTV 78 (HS not on page). Aktagon machine scores (Yle -0.52, HS -0.28, IS -0.15, Iltalehti -0.10) are unvalidated: do not use. MBFC: Yle Least Biased (conflicting summaries), HS Left-Center/High, IS Least Biased/High; Iltalehti not rated; MTV, Kauppalehti, Uusi Suomi, HBL not searched.

| Option | Gives | Pros | Cons | Data |
|---|---|---|---|---|
| M1 JSN rulings per outlet | Reliability/conduct, not lean | Countable, public, reproducible; 2008-2025 annual series (% langettava 19-63%) | Complaint-driven; tiny counts per outlet; needs scrape of jsn.fi/paatokset; per-outlet counts not in annual report; needs article volume to normalise | Yes (scrape; archive start year unknown) |
| M2 Audience lean (DNR-style 7-pt survey) | Audience position per brand | Objective, documented method | Needs own panel of 1-2k or Reuters data; Finland audience map existence [UNVERIFIED]; audience not content | Unconfirmed; ask Reuters Institute |
| M3 Content slant (Gentzkow-Shapiro phrase index vs. party speeches) | Editorial lean | Reproducible, no panel | Finnish lemmatisation; speech corpus licence [UNVERIFIED]; must hand-code 300 articles for validation | Corpus access unconfirmed |
| Think-tank citations | Lean | - | Contested, no Finnish think-tank scores | No |
| Party-mention sentiment / who is quoted | Tone per party | Intuitive | Needs validated Finnish sentiment model | Partly |
| AllSides-style panel / Ad Fontes analysts | Judgement | - | Opinion-based, labour-heavy | No |
| Cross-check: EVA 2024 poll (40% say Yle left-leaning; HS ~1/3 left) | Perception | Free, public | Perception only | Yes |

V-realistic short path (our synthesis, not in reports): v1 shows **ownership + party-tie + JSN reliability + MBFC value with rater/date** (no invented lean); lean score via M3 only after validation.

## 8. Contradictions and [UNVERIFIED] that matter
1. **Tiers/prices**: help center lists Premium+Vantage only; subscribe page sells Vantage $99.99/yr; Blindspot page and App Store list Pro $0.99/$9.99; Premium $29.99 vs $39.99 vs $49.99; checkout/pro shows Vantage content. Do not cite prices.
2. **AI Ground Summary**: features.md found no evidence; ux.md and pipeline.md report it exists (2024 app review, screensdesign walkthrough); model/vendor unknown.
3. **Blindspot window**: overview says "past week", method says "day's top 100". Also threshold "<10 left sources" is old marketing wording, not on GN's method page.
4. **Free vs paid Blindspot/factuality/My News Bias**: sources conflict (My News Bias Vantage vs "limited" on base; StationX "6 Blindspot/day" is affiliate, unsupported).
5. **"No algorithms" vs "algorithmically curated"** wording in GN's own pages: copy must claim neither as fact.
6. **Yle on MBFC**: Least Biased/Mostly Factual vs "-1.6" summary; need direct page read. Ground News in MBFC says "Mostly Factual 2.2" for GN itself, irrelevant but note rater conflict of interest.
7. **Ad Fontes free chart license** (non-commercial claim not on the fetched page); **AllSides license** (CC BY-NC claim from a third-party Firefox add-on) and AllSides site blocked. Rater data redistribution not cleared anywhere: do not ingest without permission (ratings.md s4).
8. **HS trust 45%** snippet is wrong (45% is AlfaTV).
9. **Seven-label bias scale**: ratings.md verified on GN's page; pipeline.md still lists it as unverified. Treat as verified.
10. Evidence gaps: no screenshots/CSS (ux), Reddit unreachable, GN AI blog 403, extension "sends every URL" claim unverified, widgets unknown, GDELT live API 429, e5 dimensions/prefixes unverified, MinHash thresholds unverified, Keskisuomalainen title count and most owners (Wikipedia, some years old), Finnish paywall flags.

## 9. Open questions for Meeting 2 (blueprint)
1. Rating policy: show MBFC (named + dated + linked) per outlet, build our own Finnish axis only, or both? Who approves the licence risk (MBFC asks attribution, forbids redistribution via RapidAPI)?
2. Finnish bias v1: ship without a lean score (ownership + party tie + JSN + MBFC) and add M3 later, or commit to M3 from day one (needs speech corpus licence + 300 hand-coded articles)?
3. Neutral colour/label scheme for lean and Blindspot in a fi/global context: which axis (left-right, or ownership/party-tie, or government vs independent)? Who decides what "one side" means for Finnish stories?
4. Scope of v1 sources: the 18 working Finnish feeds + ~20 core global ones, or all 60? Who fixes the 18 failed Finnish feeds (Kauppalehti, Kaleva, TS, Svenska Yle) and checks the 6 unchecked?
5. Include MV-lehti, party papers and disinformation outlets as ordinary sources, or in a flagged group?
6. Embeddings: local e5-small only, or allow Gemini free tier given the data-use clause? Where does clustering run (GitHub Actions cron vs. a small server) given APK wrapper and one user?
7. Cross-language clustering: merge fi and en coverage of the same event into one story, or keep per-language clusters first?
8. Summary policy: how many free-LLM sentences per story, what fail-rate is acceptable before falling back to extractive-only text; show model name in the UI?
9. Storage/legal: headline+URL+short lead only, or full text for better clustering/summaries? Retention window?
10. Personalisation without login: localStorage only (follows, mutes, read state, local "My News Bias") with export/import, or a tiny backend for cross-device sync (webapp + APK)?
