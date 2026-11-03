# Meeting 1 - Ground News pipeline audit (researcher: pipeline)

Scope: how Ground News ingests, clusters, summarizes and ranks news, and what V can copy cheaply.
Marks: [UNVERIFIED] = not confirmed by a fetched primary source. Sources are URLs read in this session.
Where a fetch was blocked (Ground AI blog returned HTTP 403; AI Studio rate-limit page redirected to login) the item is marked [UNVERIFIED].

## 1. What Ground News publicly says

| Topic | Finding | Source |
|---|---|---|
| Scale | "Every day we process nearly 60,000 news articles from over 50,000 different news sources." | https://ground.news/about |
| Ownership data | Hand-coded ownership data for "2,276 news outlets and counting". | https://ground.news/about |
| Clustering | "Articles from different outlets covering the same event are merged into a single story." Method (embeddings, entities, etc.) not described. | https://ground.news/about |
| Ingestion (RSS / crawl / partners) | Not found in any fetched page. [UNVERIFIED] | - |
| Update frequency | Page says "every day" for processing; no hourly/real-time claim found. | https://ground.news/about |
| Top stories | FAQ: Top Stories are the same for everyone within an Edition (regional editions exist). Ranking criteria not published. "Without the influence of engagement-maximizing algorithms" is a claim, not a method. | https://ground.news/about, search snippet of Ground FAQ |
| Source selection per story | "Sources are selected for each story to show a full and balanced set of coverage"; criteria not given. | Ground FAQ (search snippet) |
| Languages / countries | Not stated as a count. Ownership data covers outlets "around the world". | https://ground.news/about |
| Bias ratings | Ground says it does NOT rate outlets itself. The shown rating is the average of up to 3 third-party ratings (3, 2 or 1 components). Named raters: Media Bias/Fact Check, AllSides, Ad Fontes Media. | https://about.ground.news/about-bias-ratings |
| Bias scale | Labels seen: Center, Lean Left, Right (page examples). Seven-step scale reported by a third-party review only. [UNVERIFIED] | https://about.ground.news/about-bias-ratings |
| Bias comparison gating | Shown only with "enough distinct coverage across the political spectrum"; otherwise a "general summary". | https://help.ground.news/en/articles/3189505 |
| AI use | "We use AI to help us analyze content at the speed and volume that our readers expect." Human-in-the-loop oversight claimed; users can report bad summaries to support. Exact tasks are not listed. | https://help.ground.news/en/articles/3189505 |
| "Ground Summary" | Exists as an AI feature (reported in a 2024-era app review). Model/vendor NOT public. [UNVERIFIED] | https://www.tapsmart.com/?p=34261 (search snippet only) |
| Source list UI | Full Coverage list can be sorted (Latest, Alphabetical) and filtered to Left / Center / Right. | https://help.ground.news/en/articles/6049857 |

Unknowns to ask Ground directly (or accept as unknown): ingestion method, clustering algorithm, summary model, language count, top-story ranking formula. Ground's AI blog (https://groundnews.lakegeneva.lib.wi.us is a third-party mirror, not Ground) was not readable; the official blog returned 403 to our fetcher.

Takeaway: the product's moat is the bias overlay and the source count, not a secret clustering method. The rating layer depends on third parties whose terms V has not checked [UNVERIFIED licensing].

## 2. Free / cheap building blocks for V

### 2.1 Global source: GDELT (free)
- "The entire GDELT database is 100% free and open." Event DB and GKG; three streams update every 15 min; event DB in BigQuery updates daily. Source: https://www.gdeltproject.org/
- Machine translation: 65 languages realtime, of 100+ monitored. Finnish coverage level [UNVERIFIED] - check the source list for Finnish domains.
- DOC 2.0 API (full-text search, timeline, tone, source filters `sourcecountry:`, `sourcelang:`, `domain:`), rolling window of about 3 months, TIMESPAN min 15 min. No rate limit published; default 75 results, max 250. Source: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/ (post dated 2017; may be outdated).
- GDELT gives URLs and metadata, not full text. V must fetch article text itself (respect robots/terms).

### 2.2 Finnish sources
- Yle RSS: `https://feeds.yle.fi/uutiset/v1/majorHeadlines/YLE_UUTISET.rss` and `https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET`. Terms (per search snippet): RSS may be used in own apps; headings may be displayed. [UNVERIFIED - not fetched directly]. Source: https://rss.feedspot.com/yle_rss_feeds/ (listing).
- No confirmed public Yle API. [UNVERIFIED]
- Other Finnish outlets (HS, IS, MTV, STT): not checked in this session. Each needs its own RSS/terms check.

### 2.3 Commercial news APIs (not recommended as the core)
- NewsAPI.org free Developer plan: about 100 requests/day, 24 h article delay, development use only; not for production. Secondary sources only: https://freetier.co/directory/products/news-api and https://dev.to/hassann/top-10-free-news-apis-for-developers-5fg8. Verify at newsapi.org/pricing [UNVERIFIED current terms].
- Verdict: not usable for a live personal feed, because the 24 h delay and dev-only terms conflict with the goal.

### 2.4 Embeddings

**Option A - local: multilingual-e5-small**
- MIT license; Finnish (`fi`) is in the language list. Source: https://huggingface.co/intfloat/multilingual-e5-small/raw/main/README.md
- Dimension 384 (mirror sites only; search snippet from ai-nexus / metarank mirrors). [UNVERIFIED on official card]
- Language count: HF metadata shows 94 languages (search snippet). [UNVERIFIED]
- Required input prefixes `query: ` / `passage: ` and pooling mean - from memory, NOT verified in the fetched card (fetch truncated). [UNVERIFIED]
- Runs on CPU for a few thousand headlines per day; no API limits, no data leaves the machine. Recommended default.

**Option B - Gemini embeddings (free tier exists, data-use caveat)**
- `gemini-embedding-001` (text): free of charge in the free tier; paid $0.15 per 1M input tokens (batch $0.075). Source: https://ai.google.dev/gemini-api/docs/pricing
- `gemini-embedding-2` (multimodal): free tier listed; paid text $0.20 per 1M. Same source.
- Free-tier content "may be used to improve Google's products" (per pricing page). Do not send private material to the free tier.
- Free-tier RPM/RPD: NOT on the official rate-limit page (https://ai.google.dev/gemini-api/docs/rate-limits); AI Studio page needs login. A forum post reports 100 RPM / 1k RPD / 30k TPM for gemini-embedding-001 - undated, self-reported. [UNVERIFIED] Source: https://discuss.ai.google.dev/t/gemini-embedding-free-tier-documentation/112553
- Cost estimate: 500 articles/day x 300 tokens = 150k tokens/day = about 4.5M tokens/month = about $0.68/month at the paid standard rate ($0.15 per 1M), about $0.34 at batch. Cost is small; the free-tier quota and data-use terms are the real constraints.

### 2.5 Clustering
- Step 1, exact/near duplicates: MinHash + LSH (datasketch). Example config used by a 2023 walkthrough: Jaccard threshold 0.6, 96 permutations, 4-char shingles, no precision/recall reported. Source: https://yorko.github.io/2023/practical-near-dup-detection. Start at 0.8 for wire copy, tune on hand-labeled pairs. [UNVERIFIED thresholds]
- Step 2, topical clusters: embed title + lead; agglomerative clustering with cosine distance threshold inside a time window (e.g. 48 h); this is simple and deterministic.
- Alternative: HDBSCAN (scikit-learn). Default `min_cluster_size=5`; points not in a cluster are noise (good: most articles are single-source). Source: https://scikit-learn.org/stable/modules/generated/sklearn.cluster.HDBSCAN.html. Cosine metric for embeddings is the usual choice; confirm in the docs before use [UNVERIFIED].
- Guard: require shared named entities or keywords before merging two clusters (cuts false merges between unrelated same-topic stories).
- Story key = cluster id + first-seen timestamp. Re-cluster incrementally (new article joins nearest cluster above threshold, else starts a new one).

### 2.6 Ranking "top stories" (V's version)
- Score = distinct outlets in cluster x recency decay. Mark a story "Top" when it has at least N distinct outlets (N = 3 suggested). Publish the formula in the UI; Ground does not.

## 3. Summaries without hallucination (free LLM friendly)

1. Extract first: per cluster, pick the 3-8 most central sentences (embedding centrality), each keeping its article id and URL. No LLM here.
2. Small generative task: ask the free model to write 2-3 sentences where every sentence ends with citation tags `[a1]`, `[b2]` that point to the extracted sentences only. One task per cluster; short context (under about 2k tokens).
3. Programmatic checks, reject or drop a sentence if it fails:
   - it has no citation tag;
   - each number, date and proper noun in it appears in the cited sentences (string match);
   - embedding similarity between the sentence and the cited sentences is below a threshold (tune on a sample).
4. Support: extract-then-generate with ChatGPT improved factual consistency across four datasets, without hurting quality. Source: https://arxiv.org/pdf/2304.04193. Extractiveness trades against abstraction; keep the summary close to the extracted text.
5. Evaluation: Vectara's hallucination leaderboard measures summary hallucination (HHEM detector, commercial). Open-model current ranks were not verified. Source: https://github.com/vectara/hallucination-leaderboard/ [UNVERIFIED current scores].
6. Show the source list next to every summary; a bias or "coverage" label is shown only when at least 2 outlets are present (mirrors Ground's gating).

## 4. Free LLM route (ask.sh chain)
- Use free models only for: summary of one cluster (small input), classify outlet/topic, translate Finnish headline if needed. Never for clustering math.
- Keep each call under 2k tokens; reject and retry with the next model in the chain on rate limit.
- Log which model wrote each summary (for audit).

## 5. Legal and rights notes (for founder decision)
- Store headline, URL, source name, timestamp, and short lead only; do not republish full article text.
- Bias labels from MBFC / AllSides / Ad Fontes: licensing and attribution NOT checked. [UNVERIFIED] Safer: V shows its own labelled criteria (e.g. ownership, funding type) or cites the raters with links.
- Do not claim "unbiased" or "all sources" in copy unless it is true (workflow rule).

## 6. Proposed V pipeline (v0, personal)
1. Ingest: Yle RSS + 3-5 Finnish RSS feeds (check each) + GDELT DOC 2.0 queries (fi/en, 15-min polling, one query per topic).
2. Normalize: strip HTML, dedupe by URL, language tag.
3. Dedupe: MinHash LSH on title+lead.
4. Embed: multilingual-e5-small locally (default), Gemini embedding as optional fallback.
5. Cluster: agglomerative, cosine threshold, 48 h window; entity overlap guard.
6. Rank: distinct outlets x recency.
7. Summarize: extract-then-cite with free LLM; programmatic checks; drop failures.
8. Show: story card = headline, 2-3 cited sentences, source list, coverage counts. Bias overlay later, once licensing is settled.

Open decisions for founder: (a) which Finnish outlets; (b) bias overlay source and licence; (c) accept Gemini free-tier data-use terms or local-only embeddings; (d) store full article text or not.

## Verification log
- Fetched OK: ground.news/about; about.ground.news/about-bias-ratings; help.ground.news/en/articles/3189505 and 6049857; gdeltproject.org; GDELT DOC 2.0 post; ai.google.dev pricing; ai.google.dev rate-limits; HF multilingual-e5-small README (partial).
- Blocked: Ground AI blog (403); AI Studio rate-limit page (login redirect, not followed); HF card body truncated.
- Search-only (not fetched): Yle feed URLs; NewsAPI limits; datasketch threshold; Vectara scores; tapsmart Ground Summary note; HDBSCAN cosine usage.
