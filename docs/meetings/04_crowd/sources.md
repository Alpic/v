# V: crowd-signal sources (sharing + perception), Finland first

Research date: 2026-11-02. Probes = real HTTP requests from the agent sandbox through the egress proxy (status codes and counts only, no content stored). `[UNVERIFIED]` = not checked by a request or only from a secondary source.

Signals: (1) SHARING: who links which outlet, to build audience lean per outlet (Bakshy et al. 2015 / Robertson et al. 2018 style). (2) PERCEPTION: what people say about outlets.

## Ranking (free + legal + large volume first)

| # | Source | Access, verified | Cost / limits | History | Finnish volume | ToS / legal | Signal | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | **Bluesky AppView** `api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=yle.fi` | **Verified.** 200, 25 posts + cursor. `app.bsky.actor.searchActors` 200. `public.api.bsky.app` returned 403 from proxy, `api.bsky.app` returned 200 (use the latter). | Free, no key. Rate limits [UNVERIFIED]. | Search index depth [UNVERIFIED]. Firehose (Jetstream) not probed. | Small. Bluesky has few Finnish users. Actor search for "kansanedustaja" returned 25 actors, several on party domains (e.g. vihreat.fi) [UNVERIFIED that these are MPs]. | Bluesky developer policy [UNVERIFIED terms read]. Public data. | SHARING (domain search) + PERCEPTION (post text) | Best for clean, open, legal link-sharing data. Volume too small alone. |
| 2 | **Mastodon public APIs** (`mastodon.social`, `suomi.social`) | **Verified.** `mastodon.social/api/v1/timelines/tag/suomi` 200. `mastodon.social/api/v2/search?type=statuses` 200. `suomi.social/api/v1/timelines/tag/uutiset` 200 (20 statuses). Account search "kansanedustaja" returned 2 accounts. | Free. Default Mastodon limit 300 req / 5 min per IP [UNVERIFIED for these instances]. | Per instance; public timelines are recent. | Small, but federated. `mementomori.social` ~977 users, Finnish-language [secondary: finnish-language listing]. `mstdn.fi`, `mastodon.fi`, `ruutu.social` returned 000 (unreachable). | Public API; respect each instance's rules. | SHARING + PERCEPTION | Good free path for Finnish politician and party accounts. Needs an instance list. |
| 3 | **Arctic Shift** (Reddit archive) `arctic-shift.photon-reddit.com/api/posts/search?subreddit=Suomi` | **Verified.** 200, 3 posts returned for r/Suomi. Earliest post `created_utc` 1220960622 (Sept 2008). | Free, community-run. Rate limits [UNVERIFIED]. | Back to 2008 (verified on one record). Gaps [UNVERIFIED]. | Large: r/Suomi, r/suomenpolitiikka [volume UNVERIFIED]. | Reddit content. Archive licence [UNVERIFIED]. Reddit's own terms are restrictive (see row 9). | PERCEPTION (opinions on outlets) + SHARING (domain links in posts) | Best free historical Reddit route. Confirm licence before publishing data. |
| 4 | **YouTube Data API v3** `commentThreads.list` | **Probe:** endpoint reachable, 400 without key (expected). Not sampled with a key. | Free with an API key. 1 quota unit per call, 10 000 units/day default per project [official Google quota table, via search: developers.google.com/youtube/v3/determine_quota_cost]. | Full channel history. | Medium-large: Yle, HS, IS, MTV channels' comments [UNVERIFIED volume]. | YouTube API Services Terms. No scraping. | PERCEPTION (comments on outlet videos) | Strong perception source, free, within quota. Comments are mostly about the video, so filter for outlet mentions. |
| 5 | **Suomi24 corpus** (Kielipankki / Language Bank of Finland) `kielipankki.fi/corpora/suomi24/` | **Verified:** page 200. Catalogue lists versions, incl. 2001–2023 VRT (release candidate). | Free, but academic login (ACA) for full text. Download via Kielipankki or CSC computing environment. CSC account needed. | 2001–2023 [secondary: kielipankki news]. | **Very large** (Finland's biggest forum corpus). Full text needs technical skill. | **CLARIN ACA+NC** (academic, non-commercial) for 2001–2020 [secondary, check resource page]. Some versions carry +PRIV (personal data) conditions. | PERCEPTION (forum discussion) + SHARING (links in posts) | Best volume for Finnish discourse, but **non-commercial, academic only**. Usable for research, not for a commercial V product without a licence. |
| 6 | **Telegram public channels** `t.me/s/<channel>` | **Probe:** 302 redirect to `t.me/yle_uutiset` (channel exists; not sampled). | Free. | Channel history. | Medium: Finnish news and politician channels [UNVERIFIED]. | Telegram ToS: web preview is public, scraping not allowed [UNVERIFIED terms read]. | SHARING (links posted by channels) + PERCEPTION (limited) | Usable for outlet-channel links. Pages are rate-sensitive, so verify before relying on it. |
| 7 | **Outlet comment sections** (Yle, HS, IS, MTV) | Not probed. | Scraping only; no public API found [UNVERIFIED]. | - | Large. | Outlet ToS usually bans scraping. | PERCEPTION | Avoid unless the outlet gives permission. |
| 8 | **Meta Content Library** (Facebook/Instagram public pages) | Docs reachable (301). Ads Library API 403 from proxy. | Free, but **eligibility**: academic institution only, annual recertification, application via Research Tools Manager [meta developer docs, search: developers.facebook.com/docs/content-library-and-api/get-access]. Sources conflict on global applicants. | Public posts, depth [UNVERIFIED]. | Large: Finnish party and MP pages [UNVERIFIED]. | Not available to a company without an academic affiliation. | SHARING + PERCEPTION | Not viable for V unless a university partner applies. |
| 9 | **Reddit official API / JSON** | **Probe:** `reddit.com/r/Suomi/new.json` 403; `oauth.reddit.com` 403; `old.reddit.com` 302 (not followed). Pushshift 307 (redirect, not followed). PullPush 522 (upstream down). | Official: free only for approved non-commercial use, 100 QPM per OAuth client [secondary]. Research beyond limits needs a separate agreement; Data API Terms (last revised July 2026) [secondary]. | Official: recent only. | r/Suomi, r/suomenpolitiikka: large. | Strict; Pushshift public access revoked May 2023 [secondary]. | - | Use Arctic Shift (row 3) instead. Official OAuth access needs approval. |
| 10 | **Hacker News / Algolia** | Not probed. | Free, public API. | - | Very low for Finnish. | Public. | - | Skip for Finnish scope. |
| 11 | **Google Custom Search JSON API** ("10 000 searches") | `googleapis.com/customsearch/v1` 403 without key (reachable). | Not free at scale. Free tier is about 100 queries/day; 10 000/day is paid [UNVERIFIED, from memory, check Google's pricing page]. | - | - | Google terms. | SHARING (search for outlet links) | Not free at 10 000 queries. Only for small one-off checks. |
| 12 | **X / Twitter API** | `api.x.com/2/tweets/search/recent` 401 without auth (reachable). | **Not free.** Free tier closed to new developers; pay-per-use since Feb 2026 [secondary, several vendor blogs]: about $0.005 per post read, $0.01 per post create [UNVERIFIED]. 7-day search depth on pay-per-use [single source]. | Full-archive search restricted [single source]. | Medium [UNVERIFIED]. | X developer terms. | SHARING + PERCEPTION | Excluded by "must be free". Verify on docs.x.com before any budget decision. |
| 13 | **Ylilauta** | `ylilauta.org` 301 to `ylilauta.org/`, which returned **410 Gone**. No API found. | - | - | Medium (archive?) [UNVERIFIED]. | - | - | Dead for now. Not usable. |

Excluded: Pushshift public access (revoked 2023 [secondary]), `mstdn.fi` (000), `mastodon.fi` (000), `ruutu.social` (000), `data.kielipankki.fi` (000), `mediapolitiikka.fi` (000).

## Finnish MPs' social accounts

- **Official list.** Eduskunta open data host `avoindata.eduskunta.fi` returned 200 (`/`), but `/api/v1/` and `/api/v1/mps` returned 404. The Eduskunta site returned 403 from proxy. A 2023 Eduskunta presentation describes MP data (2019–) as a separate search, and its open data as XML [secondary]. Endpoint paths are **[UNVERIFIED]**.
- **Third-party list.** OpenSanctions republishes the current MP list (names, parties, terms) citing avoindata.eduskunta.fi: `opensanctions.org/datasets/fi_eduskunta` [secondary, not fetched].
- **Wikidata.** Properties confirmed by label via SPARQL: P2002 (X username), P4033 (Mastodon address), P12361 (Bluesky handle). Parliament item Q643412 resolved. A position-based join returned 2 678 persons (includes former MPs), with 227 X handles, 2 Mastodon and 3 Bluesky. **These counts are not current-MP counts [UNVERIFIED].** The next step is to query current members only, e.g. with a position-held qualifier.
- **Bluesky.** No list of Finnish MPs' Bluesky accounts was found by search. Actor search returned party-domain handles, so a cross-check of Wikidata and party sites is needed.
- **Parties and MPs active on X/Mastodon:** not counted. Recommend a manual check of party sites and Wikidata with current-MP filter.

## Existing Finnish research

- Gronow & Malkamäki, "Political polarisation in turbulent times: tracking polarisation trends and partisan news link sharing on Finnish Twitter, 2015–2023", arXiv:2403.03842 (preprint, 2024). Uses partisan news-link sharing on Finnish Twitter, with ideological groups. Finds the Finns party outlet Suomen Uutiset mostly in the Conservative Right's sharing. Closest method match. https://arxiv.org/pdf/2403.03842
- arXiv:2608.13864 (2026), climate news polarisation, Finland's low media-party parallelism; argues biased assimilation may matter more than selective exposure. https://arxiv.org/pdf/2608.13864
- Xia et al., EPJ Data Science (2024), Finnish NATO debate on Twitter, depolarisation after 2022 invasion. https://link.springer.com/content/pdf/10.1140%2Fepjds%2Fs13688-023-00441-2.pdf
- Yle/HS audience studies: not searched in this run.

## Recommendations for next step

1. Start with Bluesky + Mastodon (rows 1–2, verified free) to prototype the SHARING pipeline on party and MP accounts.
2. Add Arctic Shift (row 3) for historical Reddit, after a licence check.
3. Add YouTube comments (row 4) for PERCEPTION, within the 10 000-unit quota.
4. Suomi24 (row 5) is the biggest Finnish corpus, but only for academic non-commercial work. Get a licence decision before using it in V.
5. Drop X (row 12), Meta (row 8) and Reddit official (row 9) for the free budget.
6. Run a current-MP Wikidata query before fixing the account list.

## Method notes

- Open questions: Bluesky and Mastodon rate limits, depth and real Finnish volume, Arctic Shift licence, the YouTube sample, and the Suomi24 licence on the resource page.
- No content was dumped or stored. Probe outputs were status codes and counts only.
- Two tool calls returned non-JSON or failed (Wikidata label search); the SPARQL route worked.

`ask.sh calls: 0` (all probe outputs were under 300 lines; no large file or log was read)
