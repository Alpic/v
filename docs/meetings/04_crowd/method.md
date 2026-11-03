# 04 Crowd signals: method (Signal A "Jakajien suunta", Signal B "Miten medioista puhutaan")

Status: design v1, 2026-11-02. Extends BLUEPRINT §2 (lean scale -2..+2, `data/parties.yaml`, voice index "Äänen suunta", MBFC beside, never averaged). Nothing here is visible to users until its gate (§4) passes. Free LLMs only (`llm.mjs`), tiny tasks only.

## 0. Principles
1. Four instruments, four different questions, shown side by side, never merged: MBFC = a US rater's label; Äänen suunta = whose voice the outlet quotes; A = who shares the outlet; B = how people talk about the outlet.
2. A is an audience measure ("Robertson et al. call it partisan audience bias"), not a content-bias measure. Say so on the card. A mixed score means "mixed sharers", not "neutral".
3. B is never a rating. It is a distribution plus quotes. Perception is shaped by the hostile-media effect and by who bothers to post.
4. Source-agnostic: every platform is an adapter that emits the same three record types (§5). The method never mentions a platform.
5. Reproducible: windows, seeds, thresholds are in `data/config.json`; weekly snapshots of the aggregated tables go to git; any threshold change bumps `method_version` and old values are kept.

## 1. Literature that grounds the design (what we take, what we do not)
- Bakshy, Messing, Adamic (2015), Science 348(6239):1130-1132, doi 10.1126/science.aaa1160. Ideological alignment of a news domain = mean self-reported ideology of those who share it. Takeaway for A. Caveat: Facebook-internal, self-reported labels, US.
- Robertson, Jiang, Joseph, Friedland, Lazer, Wilson (2018), Auditing Partisan Audience Bias within Google Search, Proc. ACM HCI (CSCW) 2(CSCW):148, doi 10.1145/3274417. NOTE: the brief says ICWSM; it is CSCW. Domain partisan-audience scores from Twitter sharing by registered voters. Takeaway: audience score per domain, released as open scale; same naming "audience bias".
- Eady, Nagler, Guess, Zilinsky, Tucker (2019), How Many People Live in Political Bubbles on Social Media?, SAGE Open, doi 10.1177/2158244019832705. Linked survey + Twitter: news sharing is a noisy proxy for individuals; many people with skewed online diets are not skewed offline. Takeaway: report sharer dispersion, never claim "readers of X are Y".
- Wojcieszak, Casas, Yu, Nagler, Tucker (2022), Most users do not follow political elites on Twitter; those who do show overwhelming preferences for ideological congruity, Science Advances. 60% follow no elite; those who do follow ~90% in-group. Takeaway: anchored sharers are a small, more partisan slice, so A must be flagged "politically active sharers only" and propagation must be validated. (I could not find a paper literally titled "sharing-based slant" by Wojcieszak; not cited as such.)
- Barberá (2015), Birds of the same feather tweet together, Political Analysis 23(1):76-91, doi 10.1093/pan/mpu011. Latent ideology from who users follow, validated against legislators and parties. Takeaway: anchor-follow/anchor-interaction is the accepted way to place ordinary users; we use a simpler weighted mean, not the Bayesian model (free-tier compute, explainability).
- Golbeck and Hansen (2011), Computing political preference among Twitter followers, CHI 2011. Seed with legislators' scores, propagate to audience of media accounts. Takeaway: our anchor design (MP positions from parties.yaml).
- ICWSM paper "Scalable News Slant Measurement Using Twitter" (ojs.aaai.org/index.php/ICWSM/article/view/14957): article-level slant from sharing; agrees with crowd slant ratings. Takeaway: validate against an independent crowd benchmark, not only elites.
- Pennycook and Rand (2019), PNAS 116(7):2521-2526, doi 10.1073/pnas.1806781116. Politically balanced layperson trust ratings correlate r=0.90 with fact-checkers; excluding unfamiliar raters hurts. Takeaway for B: crowd quality judgement works only when raters are balanced and sampled by design; scraped mentions are neither, so B stays descriptive.
- AllSides: blind bias surveys (raters of all leanings, source hidden) are the robust method; open community votes are NOT used for ratings, only as a trigger for review, because they are not blind (allsides.com/media-bias/media-bias-rating-methods). Takeaway: B (non-blind, self-selected) may only trigger "review this outlet", never set a lean.
- Giglietto, Righetti, Rossi, Marino (2020), It takes a village to manipulate the media, Information, Communication and Society 23(6):867-891. Coordinated link sharing = same URL by several entities within an unusually short window, repeatedly. Takeaway: brigade rule in §2.4.
- Gap: web search found no published evaluation of LLM stance detection on Finnish political text (closest: Tweets2Stance, Gambini et al. 2024 Machine Learning, multilingual, Finnish not confirmed; FIN-bench-v2, arXiv 2512.13330, has Finnish sentiment only). So we validate our own Finnish labels (§4, gate G-B1) and do not claim transfer.

## 2. Signal A "Jakajien suunta" (sharing alignment)
### 2.1 Anchors
- Tier 1 anchors: sitting MPs and party accounts. Position p = `parties.yaml` p of their party (CHES 2024, -2..+2). Handles come from a hand-checked `anchors.csv` (MP list from `data/mps.json`; handle verified by the public profile linking the eduskunta page; unverified = not an anchor).
- Tier 2 anchors (optional, per adapter): politically identifiable communities with a documented lean (a party youth wing forum, a party-run group). Entry needs `lean_doc_url` + `checked_on`, position = that party's p. No inferred communities.
- Anchors are not sharers of last resort: anchor shares are reported separately as "puolueiden jakamat" (elite sharing), mass shares as "muut jakajat".
### 2.2 Sharer position
For a non-anchor sharer s: position x_s exists only if s has >= 3 public interactions (follow, retweet, reply, upvote, whatever the adapter exposes) with Tier 1/2 anchors in the last 180 days; x_s = mean p of those anchors weighted by interaction count, and s needs >= 2 distinct parties or >= 3 interactions with one. Otherwise s is unplaced and ignored (not guessed). Report "placed share" = placed / all sharers; below 20% the card says "vähän sijoitettuja jakajia".
### 2.3 Outlet score
Window 90 days rolling. For outlet o: sharers S_o = placed sharers who posted >= 1 link to a o-domain.
- Dedupe: one vote per sharer per outlet. Identity key = (adapter, actor_id); cross-platform merge only when the adapter declares a verified link.
- Weight w_s = 1 for each distinct sharer, times a repeat factor min(1, 1/sqrt(k_s)) where k_s = distinct URLs shared (cap of effective 4 URLs). Prevents one prolific poster dominating while still rewarding breadth.
- Exclude: accounts < 30 days old, accounts flagged by §2.4 coordination, o's own accounts and staff (listed in `sources.json`).
- A_o = sum(w_s x_s) / sum(w_s) on the same -2..+2 axis; buckets use the same cutpoints as the voice index (blueprint §2.3.4) so cards are comparable. Also report SD of x_s (audience spread) and share of sharers left/right of 0.
### 2.4 Confidence and CI
- Bootstrap: resample sharers with replacement, 1000 draws, seed = hash(source_id, window_end, method_version); CI = 2.5/97.5 percentiles.
- Confidence: none if n_placed < 30 (or n_anchor < 5 for Tier 1 only view); low = n >= 30; medium = n >= 100 and CI width <= 0.6; high = n >= 300 and CI width <= 0.4 and CI within one bucket. Only medium/high feed bars and rule B (blueprint §2.5).
- Coordination filter (Giglietto-style, adapter-agnostic): for each URL, find actor groups that share the same URL within a window t (t = 10th percentile of share-time gaps for that URL set, floored at 30 s, estimated per window) at least 3 times together; such groups count as one weighted vote total (1/sqrt(group size) each) and are listed in the run log. Any outlet with > 15% of its weight from coordinated groups gets `flag=coordinated`, confidence capped at low.
### 2.5 Propagation (off by default)
Label propagation over a co-sharing graph (sharers linked if they share >= 3 same URLs) to place unplaced sharers, 3 iterations, anchors clamped. Allowed to affect published scores only if gate G-A4 passes. Until then it is computed in shadow and compared.

## 3. Signal B "Miten medioista puhutaan" (perception)
### 3.1 Mention finding (no LLM)
Match outlet name variants and domains from `sources.json` (case-sensitive name tokens, inflection prefixes, URL domain). Ambiguity list (e.g. "Aamulehti" fine, "Uutiset", "Kansan" not alone). Keep text window of <= 280 chars around the match plus the post link. Exclude posts that are only a link share with the outlet's own headline (no opinion), and quotes of the outlet's own text.
### 3.2 Tiny LLM tasks (JSON, batches of 10 mentions, temperature 0)
Each mention gets, in one prompt: `stance` in {positive, negative, neutral, unclear}; `lean_claim` in {left, right, none} (does the author say the outlet leans left/right, quoting the words?); `quality_claim` in {clickbait, propaganda, reliable, none}; `evidence` = verbatim substring from the text supporting any non-neutral label.
- Two different free models run independently (llm.mjs picks distinct providers/models). Keep a label only if both agree AND evidence is a substring. Field-level: disagreement on one field discards that field only. Unclear/discarded mentions are counted and shown ("ei luokiteltu: N").
- Prompts are in Finnish and English, stored in `prompts/b_v1.txt`, hash in the run row. Self-contained, no outlet metadata (owner, MBFC) is given to the model, to avoid priming.
### 3.3 Aggregation per outlet and window (90 days)
- Per-author cap: an author contributes at most 1 counted mention per outlet per 14 days (majority label of theirs), max 3 per window.
- Per-community weighting: community = adapter-defined venue (forum board, subreddit-like space, hashtag-free feed). Outlet distribution = mean of per-community distributions, each community weighted min(1, sqrt(n_c/20)) and capped at 25% of total weight. A single loud venue cannot define the picture.
- Shown only if >= 40 counted authors from >= 3 communities; else "liian vähän puhetta".
- Output: share per label with Wilson 95% intervals; no scalar "score".
### 3.4 Spike and brigade detection
- Daily mention counts per outlet; robust z = (count - median28) / (1.4826 x MAD28); day with z > 4 is a spike. Spike-day mentions are down-weighted to the 28-day median volume (random, seeded sample) and the card shows "piikki: <date>, syy <headline cluster from stories table if any>". Real news events (scandal) are visible, not hidden.
- Brigade signals (any two => `flag=brigade`, window excluded from the distribution, shown as note): (a) >= 30% of window mentions from authors < 30 days old; (b) top-5 authors > 30% of mentions; (c) near-duplicate texts (shingle Jaccard >= 0.8) from >= 5 authors; (d) coordinated groups as in §2.4.
### 3.5 Display
Stacked bars per task + 3 example quotes per label. Quotes: seeded random sample from the counted set (not cherry-picked), <= 200 chars, link to the original, author shown as platform handle only if public figure, else "käyttäjä". Always shown with: n authors, n communities, window, model pair, "Tämä on puhetta, ei arvio." Lean claims shown as "N % kirjoittajista sanoo X:n olevan vasemmistolainen / oikeistolainen", never converted into v. Perception disagreeing with A or voice index is explained, not corrected ("Hostile-media effect": opposite sides both claim bias).

## 4. Combining on the outlet card
Rows, in this order, each with rater, date, method_version, n, confidence:
1. MBFC (US-kehys) as published. 2. Äänen suunta (whose voice). 3. Jakajien suunta (A) with CI whiskers, SD, placed share. 4. Miten medioista puhutaan (B) distribution.
Rules: no combined number. Agreement lifts confidence one step only between A, voice index and MBFC (|bucket diff| <= 1 for at least two of three, each already >= low). Disagreement >= 2 buckets between any pair shows "Mittarit eivät ole samaa mieltä", lists which, and keeps each value. B never alters confidence, never enters bars or rule B/D. B high negative stance plus A/voice agreement: nothing changes. B shows `lean_claim` split by A-bucket of the claimant when known (do left sharers call it right?) as context only.
Finnish `v` in lean bars stays "voice index only when visible" (blueprint §2.2); A becomes a second allowed source for `v` only after G-A1..G-A3 pass AND voice index gate passed; conflicts resolve by showing "ei arvioitu" in bars, never choosing.

## 5. Validation gates and fairness
Gates (all must pass; hand lists in `data/validation/*.csv`, tests in `pipeline/validate_crowd.mjs`, results in `runs`; flipping the flag needs Jesse's approval, as with the voice index):
- G-A1 Known order: papers with documented party/org ties from `sources.json` (tie field): Demokraatti (SDP) and Kansan Uutiset (left) must score strictly left of Verkkouutiset (Kok) and Suomen Uutiset (PS), with CIs not overlapping the midpoint pair; and Kendall tau >= 0.7 over >= 8 tie-labelled papers (add Maaseudun Tulevaisuus/Kesk, Kd-lehti, Uusi Suomi-type where data exists). Any pair reversed = fail.
- G-A2 Test-retest: scores from two disjoint 90-day windows >= 3 months apart: Spearman >= 0.8 across outlets with n >= 100, and >= 90% shift <= 1 bucket. Plus split-half (random sharer halves) r >= 0.85.
- G-A3 Robustness: inject 5% synthetic one-sided accounts, or a simulated brigade of 30 same-side accounts; score moves < 0.3 or the brigade is flagged.
- G-A4 Propagation: hide 20% of anchors, place them by propagation; r >= 0.7 with true p, and outlet scores change < 0.2 vs no-propagation, else stays shadow.
- G-A5 Triangulation: A vs voice index across outlets: Spearman >= 0.6 (low agreement is reported, not tuned away).
- G-B1 Finnish labels: 200 hand-labelled mentions (Jesse + one more person, kappa between humans reported). Each task per field: model-pair agreement >= 0.75 and accuracy of agreed labels >= 0.85 vs human; else that task is off. Rerun after any model change in the rotation (log the model ids per row).
- G-B2 Brigade/spike: replay of one known heavy-discussion period gives expected spike flags (manual check, documented).
Fairness disclosures (method page, plain Finnish; also in README):
- A = who shares, not what is true or who reads. Sharers are a political-active minority (Wojcieszak 2022; Eady 2019); platform user bases differ from the population; outlets with small sharing communities are low confidence or unrated, which favours big outlets in visibility.
- Anchor positions come from CHES expert survey left-right; this single axis mixes economic and cultural dimensions and may place PS and Kesk differently from voters' own view. Different axes would change A.
- Small parties and independent MPs without a CHES row are excluded (tv, mapped in parties.yaml note) and Liike Nyt rests on one MP.
- Outlets that are not political (sport, local) are unrated. Satire and tabloids are scored only as audience; no value judgment.
- Platform ToS: only public data via adapters allowed to be used; no redistribution of raw posts (only ids, hashes, aggregates, short quotes with links); handles of private people are hashed; delete-on-request. GDPR note: opinions are not stored per person; quotes stripped to <= 200 chars; check legal basis before any non-public venue.
- LLM caveat: free models can drift; the pair-agreement rule reduces but does not remove errors, so B counts are described as approximate.

## 6. Data model additions (SQL, prefix v_, RLS: anon SELECT on aggregates only)
```sql
create table v_communities(id serial primary key, adapter text, name text, kind text, party text, lean_doc_url text, checked_on date);
create table v_actors(id bigserial primary key, adapter text, ext_id_hash text, anchor_party text, p real, community_id int, first_seen date, flags text[], unique(adapter, ext_id_hash));
create table v_shares(actor_id bigint, source_id int, url_hash text, shared_at timestamptz, primary key(actor_id, url_hash));
create table v_mentions(id bigserial primary key, actor_id bigint, community_id int, source_id int, posted_at timestamptz, quote text, post_url text, text_hash text, stance text, lean_claim text, quality_claim text, models text[], flags text[]);
create table v_outlet_audience(source_id int, window_end date, method_version int, n_placed int, n_anchor int, a real, ci_lo real, ci_hi real, sd real, placed_share real, conf text, flags text[], visible boolean default false, primary key(source_id, window_end, method_version));
create table v_outlet_talk(source_id int, window_end date, method_version int, n_authors int, n_comm int, dist jsonb, spike_days date[], flags text[], visible boolean default false, primary key(source_id, window_end, method_version));
create table v_validation(id serial primary key, gate text, run_at timestamptz, value real, passed boolean, notes text);
```
Private tables (no anon policy): v_actors, v_shares, v_mentions (raw), retention 120 days. Public: v_communities, v_outlet_*, v_validation, plus a view of counted quotes (<= 3 per label per outlet).

## 7. Pipeline, schedule, cost
Adapters (plug-in, `pipeline/crowd/adapters/<name>.mjs`, interface `fetchShares(since)`, `fetchMentions(since)`, `fetchAnchorTies(since)`, returns {actor, venue, url|text, ts}); a parallel agent lists feasible sources.
Jobs (new workflow `crowd.yml`, separate from ingest so failures do not make feed runs red):
- daily 04:30 UTC: `crowd_ingest` (adapters, resolve short links, domain to source_id), `mentions_detect` (string match, cap 60 mentions/outlet/week), `classify_b` (batches of 10, two models).
- weekly (Sun): `anchors_refresh` (monthly effective), `score_a` (bootstrap, coordination filter), `aggregate_b` (caps, spikes, brigades), `validate_crowd` (gates, writes `v_validation`), snapshot export to `data/export/crowd/*.json`.
- Keepalive reuses the existing step; any adapter failure = run row `status=partial`, not silent.
LLM budget: B gets a reserve of 100 calls/day of the 300/day shared cap = 50 batches = 500 mentions double-judged per day (~3,500/week), enough for ~40 Finnish outlets at the 60/week cap. Summaries keep priority on their 40 calls/run; B yields when the rotation is cooling.
Storage: shares <= 300k rows (~45 MB), mentions <= 50k (~20 MB), aggregates tiny; Supabase free 500 MB OK; GitHub Actions public repo, weekly job ~10 min, daily ~5 min.
LOC estimate (JS, no new dependencies): adapters 3 x 80, resolve + anchors 140, score_a (placement, bootstrap, coordination, propagation) 260, mentions + classify_b + prompts 230, aggregate_b + spikes/brigades 170, validate_crowd + gate CSV loaders 220, card UI + method page 180, SQL + RLS 50, tests 250 = about 1,740 LOC. Build order: score_a on one adapter, then G-A1/A2; B last (needs G-B1 labelling effort by humans, the real bottleneck).
