# V: global English-language sources (Meeting 1, audit)

Date: 2026-11-02. Scope: starter list, bulk rating datasets, global aggregation helpers. Research only, no code changed.

**Verification method.** Feeds: `curl -sL` returned HTTP 200 with RSS/Atom/RDF markup (most also had item entries). MBFC: the `Bias Rating` and `Factual Reporting` JSON-LD fields of `mediabiasfactcheck.com/<slug>/`, fetched today. AllSides: **the live site returned 403 to automated fetches**, so the AllSides column is the 2019 snapshot from the AllSideR CSV (see section 2). Owner types marked (listed) or (private) etc. are from general knowledge, not web-verified. `403 (not read)` = MBFC blocked the request, so no rating was read; these need a manual check.

## 1. Starter list (60 outlets)

| # | Outlet | Country | Owner (type) | Working RSS URL | MBFC bias / factual | AllSides (2019 snapshot) |
|---|---|---|---|---|---|---|
| 1 | Reuters | UK | Thomson Reuters (listed) | `https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en (proxy; reutersagency.com feed = 404)` | Least biased / Very High ([page](https://mediabiasfactcheck.com/reuters/)) | center ([page](https://www.allsides.com/news-source/reuters)) |
| 2 | Associated Press | US | nonprofit cooperative | `https://apnews.com/rss (403 to curl) [UNVERIFIED]` | Left-Center / High ([page](https://mediabiasfactcheck.com/associated-press/)) | center ([page](https://www.allsides.com/news-source/associated-press-media-bias)) |
| 3 | NPR | US | public media nonprofit | `https://feeds.npr.org/1001/rss.xml` | Left-Center / High ([page](https://mediabiasfactcheck.com/npr/)) | - |
| 4 | New York Times | US | NYT Co. (listed) | `https://rss.nytimes.com/services/xml/rss/nyt/World.xml` | Left-Center / High ([page](https://mediabiasfactcheck.com/new-york-times/)) | - |
| 5 | Wall Street Journal | US | Dow Jones / News Corp (listed) | `https://feeds.a.dj.com/rss/RSSWorldNews.xml` | Right-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/wall-street-journal/)) | - |
| 6 | The Hill | US | Nexstar Media (listed) | `https://thehill.com/feed/` | Least biased / Mostly Factual ([page](https://mediabiasfactcheck.com/the-hill/)) | center ([page](https://www.allsides.com/news-source/hill-media-bias)) |
| 7 | CNN | US | Warner Bros. Discovery (listed) | `http://rss.cnn.com/rss/edition_world.rss` | Left-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/cnn/)) | - |
| 8 | Vox | US | Vox Media (private) | `https://www.vox.com/rss/index.xml` | Left / High ([page](https://mediabiasfactcheck.com/vox/)) | left ([page](https://www.allsides.com/news-source/vox-news-media-bias)) |
| 9 | Slate | US | Graham Holdings (listed) | `https://slate.com/feeds/all.rss` | 403 (not read) ([page](https://mediabiasfactcheck.com/slate/)) | left ([page](https://www.allsides.com/news-source/slate)) |
| 10 | The Atlantic | US | Emerson Collective (private) | `https://www.theatlantic.com/feed/all/` | Left-Center / High ([page](https://mediabiasfactcheck.com/the-atlantic/)) | left-center ([page](https://www.allsides.com/news-source/atlantic)) |
| 11 | The Intercept | US | Intercept Media (nonprofit-owned) | `https://theintercept.com/feed/?rss` | Left / Mostly Factual ([page](https://mediabiasfactcheck.com/the-intercept/)) | left ([page](https://www.allsides.com/news-source/intercept)) |
| 12 | Mother Jones | US | nonprofit | `https://www.motherjones.com/feed/` | Left-Center / High ([page](https://mediabiasfactcheck.com/mother-jones/)) | left ([page](https://www.allsides.com/news-source/mother-jones-bias)) |
| 13 | The Nation | US | private (Nation Company) | `https://www.thenation.com/feed/` | Left / High ([page](https://mediabiasfactcheck.com/the-nation/)) | left ([page](https://www.allsides.com/news-source/nation)) |
| 14 | Jacobin | US | private, independent | `https://jacobin.com/feed` | Left / High ([page](https://mediabiasfactcheck.com/jacobin/)) | left ([page](https://www.allsides.com/news-source/jacobin-media-bias)) |
| 15 | Democracy Now! | US | nonprofit | `https://www.democracynow.org/democracynow.rss` | Left / factual NA ([page](https://mediabiasfactcheck.com/democracy-now/)) | left ([page](https://www.allsides.com/news-source/democracy-now)) |
| 16 | Reason | US | nonprofit (Reason Foundation) | `https://reason.com/feed/` | Right-Center / High ([page](https://mediabiasfactcheck.com/reason/)) | right-center ([page](https://www.allsides.com/news-source/reason)) |
| 17 | National Review | US | private | `https://www.nationalreview.com/feed/` | Right / Mostly Factual ([page](https://mediabiasfactcheck.com/national-review/)) | right ([page](https://www.allsides.com/news-source/national-review)) |
| 18 | Fox News | US | Fox Corp (listed) | `https://moxie.foxnews.com/google-publisher/world.xml` | Right / Low ([page](https://mediabiasfactcheck.com/fox-news/)) | - |
| 19 | Breitbart | US | private | `https://feeds.feedburner.com/breitbart` | Right / Mixed ([page](https://mediabiasfactcheck.com/breitbart/)) | - |
| 20 | The Federalist | US | private | `https://thefederalist.com/feed/` | Right / Mixed ([page](https://mediabiasfactcheck.com/the-federalist/)) | right ([page](https://www.allsides.com/news-source/federalist)) |
| 21 | The Daily Wire | US | private | `https://www.dailywire.com/feeds/rss.xml` | Right / Mixed ([page](https://mediabiasfactcheck.com/the-daily-wire/)) | right ([page](https://www.allsides.com/news-source/daily-wire)) |
| 22 | Newsweek | US | private | `https://www.newsweek.com/rss` | Right-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/newsweek/)) | left-center ([page](https://www.allsides.com/news-source/newsweek)) |
| 23 | BBC News (World) | UK | public broadcaster | `https://feeds.bbci.co.uk/news/world/rss.xml` | no rating field found ([page](https://mediabiasfactcheck.com/bbc-news/)) | - |
| 24 | The Guardian | UK | Scott Trust (trust-owned) | `https://www.theguardian.com/world/rss` | Left-Center / High ([page](https://mediabiasfactcheck.com/the-guardian/)) | left-center ([page](https://www.allsides.com/news-source/guardian)) |
| 25 | Financial Times | UK | Nikkei Inc. | `https://www.ft.com/world?format=rss` | Least biased / High ([page](https://mediabiasfactcheck.com/financial-times/)) | center ([page](https://www.allsides.com/news-source/financial-times-media-bias)) |
| 26 | The Economist | UK | Exor (family holding) | `https://www.economist.com/international/rss.xml` | Least biased / High ([page](https://mediabiasfactcheck.com/the-economist/)) | left-center ([page](https://www.allsides.com/news-source/economist)) |
| 27 | The Telegraph | UK | RedBird IMI (private) | `https://www.telegraph.co.uk/rss.xml` | 403 (not read) ([page](https://mediabiasfactcheck.com/the-telegraph/)) | - |
| 28 | Daily Mail | UK | DMG Media (private) | `https://www.dailymail.co.uk/articles.rss` | 403 (not read) ([page](https://mediabiasfactcheck.com/the-daily-mail/)) | right ([page](https://www.allsides.com/news-source/daily-mail)) |
| 29 | Sky News | UK | Comcast (Sky) | `https://feeds.skynews.com/feeds/rss/world.xml` | Least biased / High ([page](https://mediabiasfactcheck.com/sky-news/)) | - |
| 30 | UnHerd | UK | private | `https://unherd.com/feed/` | Right-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/unherd/)) | - |
| 31 | DW News | DE | public broadcaster | `https://rss.dw.com/rdf/rss-en-all` | 403 (not read) ([page](https://mediabiasfactcheck.com/deutsche-welle/)) | - |
| 32 | France 24 | FR | public broadcaster | `https://www.france24.com/en/rss` | Least biased / High ([page](https://mediabiasfactcheck.com/france24/)) | - |
| 33 | Euronews | EU (HQ Lyon) | private (Alpac Capital) | `https://www.euronews.com/rss` | Left-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/euronews/)) | - |
| 34 | Le Monde (English) | FR | private | `https://www.lemonde.fr/en/rss/une.xml` | Left-Center / High ([page](https://mediabiasfactcheck.com/le-monde/)) | - |
| 35 | Der Spiegel (International) | DE | private (Spiegel-Verlag) | `https://www.spiegel.de/international/index.rss` | Left-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/der-spiegel/)) | - |
| 36 | NZZ | CH | private (NZZ AG) | `https://www.nzz.ch/recent.rss` | Right-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/neue-zurcher-zeitung/)) | - |
| 37 | Meduza | LV (exile) | private, independent | `https://meduza.io/rss/en/all` | Left / High ([page](https://mediabiasfactcheck.com/meduza/)) | - |
| 38 | The Moscow Times | NL (exile) | private, independent | `https://www.themoscowtimes.com/rss/news` | 403 (not read) ([page](https://mediabiasfactcheck.com/the-moscow-times/)) | - |
| 39 | Euractiv | BE | private | `https://www.euractiv.com/feed/` | Left-Center / High ([page](https://mediabiasfactcheck.com/euractiv/)) | - |
| 40 | Helsingin Sanomat (English) | FI | Sanoma (listed) | `https://www.hs.fi/rss/english.xml` | Left-Center / High ([page](https://mediabiasfactcheck.com/helsingin-sanomat/)) | - |
| 41 | The Local Sweden | SE | private | `https://www.thelocal.se/feeds/rss.php` | not checked ([page](https://mediabiasfactcheck.com/the-local-sweden/)) | - |
| 42 | South China Morning Post | HK | private (Alibaba-linked owner) | `https://www.scmp.com/rss/91/feed` | Left-Center / Mixed ([page](https://mediabiasfactcheck.com/south-china-morning-post/)) | - |
| 43 | The Straits Times | SG | Singapore Press Holdings (listed) | `https://www.straitstimes.com/news/world/rss.xml` | Right-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/the-straits-times/)) | - |
| 44 | Times of India | IN | Bennett Coleman (private) | `https://timesofindia.indiatimes.com/rssfeedstopstories.cms` | Right-Center / Mixed ([page](https://mediabiasfactcheck.com/times-of-india/)) | - |
| 45 | The Hindu | IN | Kasturi & Sons (family) | `https://www.thehindu.com/news/international/feeder/default.rss` | Left-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/the-hindu/)) | - |
| 46 | Korea Herald | KR | Herald Corp (private) | `https://www.koreaherald.com/rss/020000000000` | 404 (no page) ([page](https://mediabiasfactcheck.com/korea-herald/)) | center ([page](https://www.allsides.com/news-source/korea-herald)) |
| 47 | Asia Times | HK | private | `https://asiatimes.com/feed/` | Least biased / Mostly Factual ([page](https://mediabiasfactcheck.com/asia-times/)) | - |
| 48 | Xinhua | CN | state news agency | `http://www.xinhuanet.com/english/rss/worldrss.xml` | Left / Mixed ([page](https://mediabiasfactcheck.com/xinhua-news-agency/)) | - |
| 49 | CGTN | CN | state broadcaster | `https://www.cgtn.com/subscribe/rss/section/world.xml` | 404 (no page) ([page](https://mediabiasfactcheck.com/cgtn/)) | - |
| 50 | Dawn | PK | Dawn Media (family) | `https://www.dawn.com/feeds/home` | Left-Center / Mostly Factual ([page](https://mediabiasfactcheck.com/dawn/)) | - |
| 51 | Rappler | PH | private | `https://www.rappler.com/feed/` | Left-Center / High ([page](https://mediabiasfactcheck.com/rappler/)) | - |
| 52 | Nikkei Asia | JP | Nikkei Inc. (listed) | `https://asia.nikkei.com/rss/feed/nar` | Right-Center / High ([page](https://mediabiasfactcheck.com/nikkei-asia/)) | - |
| 53 | Al Jazeera English | QA | state-funded (Qatar) | `https://www.aljazeera.com/xml/rss/all.xml` | 403 (not read) ([page](https://mediabiasfactcheck.com/al-jazeera/)) | - (AllSides has only Al Jazeera America, a different outlet) |
| 54 | Arab News | SA | SRMG (private) | `https://www.arabnews.com/rss.xml` | 403 (not read) ([page](https://mediabiasfactcheck.com/arab-news/)) | - |
| 55 | Jerusalem Post | IL | private | `https://www.jpost.com/rss/rssfeedsfrontpage.aspx` | 403 (not read) ([page](https://mediabiasfactcheck.com/the-jerusalem-post/)) | center ([page](https://www.allsides.com/news-source/jerusalem-post-media-bias)) |
| 56 | Africanews | FR (Africa desk) | Euronews-linked | `https://www.africanews.com/feed/rss` | 403 (not read) ([page](https://mediabiasfactcheck.com/africanews/)) | - |
| 57 | CBC News (World) | CA | public broadcaster | `https://www.cbc.ca/cmlink/rss-world` | 403 (not read) ([page](https://mediabiasfactcheck.com/cbc/)) | - |
| 58 | The Globe and Mail | CA | private | `https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/world/` | 403 (not read) ([page](https://mediabiasfactcheck.com/the-globe-and-mail/)) | - |
| 59 | ABC News (Australia) | AU | public broadcaster | `https://www.abc.net.au/news/feed/51120/rss.xml` | Left-Center / High ([page](https://mediabiasfactcheck.com/abc-news-australia/)) | - |
| 60 | MercoPress | UY | private | `https://en.mercopress.com/rss` | not checked ([page](https://mediabiasfactcheck.com/mercopress/)) | - |

Coverage: 21 US (incl. the AP wire), 9 UK (incl. Reuters, a UK wire), 9 EU/Europe, 2 Nordic-language English editions, 11 Asia, 3 Middle East, 1 Africa, 2 Canada, 1 Australia, 1 Latin America. Left/right balance is weak in the non-US rows because MBFC and AllSides rate few non-US outlets.

Dropped after failing checks (not in the list): Politico, Axios, Washington Post, Bloomberg, Forbes, USA Today, Christian Science Monitor (feeds 403/404/429/000); Independent, Haaretz, Middle East Eye (HTML, not RSS); El País, Kyiv Independent, Japan Times, Spiked (404). Their absence is a feed problem, not a rating.

## 2. Bulk rating datasets (for personal use)

No official bulk download exists for MBFC or AllSides. Community copies are below. Check each licence before any use beyond personal reading.

| Dataset | URL | Rows | Fields | Date / version | Licence | Notes |
|---|---|---|---|---|---|---|
| **MBFC (official)** | https://mediabiasfactcheck.com/mbfcs-data-api | n/a | source, domain, country, media type, bias, factual, credibility | live | paid for commercial use | No CSV. RapidAPI is for "limited request volume" and says it is "not intended for large-scale commercial use, resale, redistribution". Attribution to MBFC requested. Direct commercial access is quoted on request (editor@mediabiasfactcheck.com). |
| rbkhb/News-Media-Reliability (scrape of MBFC) | https://github.com/rbkhb/News-Media-Reliability (raw: `data/corpus.csv`) | **1,066** | `source_url`, `source_url_processed`, `URL`, `fact` (HIGH 542 / MIXED 268 / LOW 256), `bias` (7 levels: center 263, left-center 209, left 168, right 157, extreme-right 156, right-center 92, extreme-left 21) | README gives no scrape date; accompanies Baly et al., EMNLP 2018 | **not stated** | Row count from `csv` parse, counted locally. Old labels, so compare against current MBFC before use. |
| valurank/PoliticalBias_Sources (Hugging Face) | https://huggingface.co/datasets/valurank/PoliticalBias_Sources | **908** (datasets-server size API) | source name, bias, source type; search snippet says scraped from AllSides [UNVERIFIED field list] | not stated | HF metadata: `other` | Licence says `other`, so read the card before reuse. |
| favstats/AllSideR (`data/allsides_data.csv`) | https://github.com/favstats/AllSideR (raw: https://raw.githubusercontent.com/favstats/AllSideR/master/data/allsides_data.csv) | **547** (CSV parse) | 17 cols: `news_source`, `rating`, `rating_num`, `type`, `agree`, `disagree`, `perc_agree`, `url`, `editorial_review`, `blind_survey`, `third_party_analysis`, `independent_research`, `confidence_level`, `twitter`, `wiki`, `facebook`, `screen_name` | last data update 2019-10-18 | GPL-3.0 | Ratings: center 137, right 113, left-center 106, left 101, right-center 76, "allsides" 14. Best free AllSides snapshot, but 6+ years old. Used for the AllSides column above. |
| isspek/mbfc_sources | https://github.com/isspek/mbfc_sources | not verified | TSV | extracted 2020-07-29 (search snippet) | not stated | GitHub API blocked and file path not fetched. [UNVERIFIED] row count. |
| AllSides (own site) | https://www.allsides.com/media-bias/media-bias-ratings | n/a | n/a | ratings are "fluid" and change over time (AllSides) | n/a | Page returned 403 to curl and WebFetch. No bulk export found. Manual lookup only; check AllSides terms. |
| Ad Fontes Media | https://adfontesmedia.com/rankings-by-individual-news-source/ | page 1 of 8 lists 99 names | names and links only, no scores on the page | current | not stated | Scores need the paid interactive chart (membership). Data products are sold separately. Not usable as a free dataset. |

Not used: Zenodo record 7682915 ("Qbias") was fetched and its title describes a dataset on search queries, not AllSides headlines, so the claim in the search snippet is not confirmed.

## 3. Global aggregation helpers

**GDELT DOC 2.0 API.** Base URL `https://api.gdeltproject.org/api/v2/doc/doc` ([blog](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)). Modes: ArtList, ArtGallery, TimelineVol, TimelineTone, TimelineLang, TimelineSourceCountry and others. Params: `query` (accepts `sourcelang:` and `sourcecountry:` operators inside the query), `maxrecords` (default 75, max 250, ArtList only), `timespan` (min 15 min), `startdatetime`/`enddatetime` (YYYYMMDDHHMMSS), `format` (JSON, CSV, RSS, JSONFeed). Coverage: a rolling 3-month window per the blog; the search snippet claims data back to 2017 [UNVERIFIED]. No API key is mentioned on the blog. The GDELT site says the database is "100% free and open"; the blog page has no licence text. **Rate limit:** the live API returned HTTP 429 in this sandbox for every request, even at 7 s spacing, with a message asking for one request every 5 seconds or a contact for larger queries. Live response unverified. Plan for this limit.

**Google News RSS search.** `https://news.google.com/rss/search?q=<query>&hl=en-US&gl=US&ceid=US:en` returned HTTP 200 with items, including `site:reuters.com` (100 items). Free, no key, no documented SLA or ToS for this use [UNVERIFIED]. Item links are Google redirect URLs, so the true outlet domain must be read from the `<source>` tag or resolved. Good as a fallback for outlets with no working feed, such as Reuters.

**NewsAPI.** Developer (free) plan: 100 requests/day; articles up to one month old; results per request not stated. **Development and testing only; the terms say it cannot be used in a staging or production environment, including internally.** Paid: Business $449/month, Advanced $1,749/month, Enterprise by quote. Conclusion: NewsAPI free tier is not usable for a live V. Source: https://newsapi.org/pricing.

## 4. Open items and [UNVERIFIED]

- AP feed: `apnews.com/rss` gives 403 to curl. Needs a browser check, or drop AP from the feed list.
- MBFC pages returning 403 or 429 (not read): Slate, Telegraph, Daily Mail, DW, Moscow Times, Al Jazeera, Arab News, Jerusalem Post, Africanews, Globe and Mail, CBC. Read them by hand, or re-run later. Several 404s (Korea Herald, CGTN) likely use other slugs.
- AllSides current ratings: site blocked to automated fetch. The AllSides column is a 2019 snapshot; check current pages by hand before publishing any rating.
- GDELT: live API rate-limited (429) during this session; re-test with a key and a single request per 5 s.
- Owner types are general knowledge and must be checked before anything is published.
- Ratings are third-party opinions (MBFC, AllSides). Any copy in V should name the rater and the date, and must not state the rating as fact.

ask.sh calls: 0 (no large file was read into context; CSV and corpus files were parsed locally with Python for counts only).
