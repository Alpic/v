# V blueprint: risk and content check (Meeting 2)

Author: Haiku risk/content agent. Date of research: 2026-11-02. Sources are cited inline. [UNVERIFIED] = not confirmed on an official page.
Load assumptions: 80 sources, refresh every 30 min (48 runs/day), about 3,000 articles/day, one user, webapp + APK wrapper.

## 1. Free-tier limits that could break V
Official numbers were checked where a page exists. Several free limits are not published, so the plan must not depend on them.
| Service | What the official page says | Load for V | Verdict and mitigation |
|---|---|---|---|
| Gemini API free tier | Rate-limit page gives no numbers; points to AI Studio dashboard ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)). Embeddings: "Free of charge", no rate limit listed ([pricing](https://ai.google.dev/gemini-api/docs/pricing)). Free-tier content is used to improve products ("Yes", same page). | LLM summaries: keep under 300 calls/day. Embeddings: 3,000/day headline+lead texts, public data only. | Medium. Flash-Lite RPD is only in third-party blogs (about 1,000/day, [unverified blog](https://yingtu.ai/en/blog/google-gemini-api-free-tier-limits-2026)); quotas were cut in Dec 2025 (same source). Mitigation: check the AI Studio dashboard before launch; treat 429 as normal; ask.sh already falls through to the next key/model. Embeddings local first (e5-small), Gemini only as fallback. |
| OpenRouter `:free` models | Free-model cap is **50 requests/day** with fewer than 10 purchased credits, **1,000/day** after buying 10 credits ([FAQ](https://openrouter.ai/docs/faq)). | 300 calls/day needs the 1,000/day tier. | High without a purchase. Decision for founder: a one-time 10-credit purchase unlocks 1,000/day on free models. That conflicts with "free tiers only", so ask first. Until then, OpenRouter is only a backup. |
| Supabase free | Free projects with low activity **may be paused in a 7-day period**; no backups download on Free ([going into prod](https://supabase.com/docs/guides/platform/going-into-prod)). DB size and edge-function limits not on that page [UNVERIFIED, check supabase.com/pricing]. | Pipeline writes every 30 min, so activity should be constant. | High if the pipeline breaks silently (7 days of no writes = pause). Mitigation: keep the source of truth in git or a JSON file; use Supabase only as a cache; a dashboard check weekly; backups by the pipeline itself. Prefer no DB in v0 (see section 6). |
| Netlify free | **300 credits/month**; production deploy = **15 credits**; compute 10 credits/GB-hour; bandwidth 20 credits/GB; web requests 2 credits per 10k ([pricing](https://www.netlify.com/pricing/)). Scheduled functions are metered compute, 5 credits per GB-hour per [changelog](https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/); other blogs say 10 [unverified]. Reset-monthly not stated for Free. | Web traffic: one user, negligible. | **Critical if data refresh triggers deploys**: 48 deploys/day x 15 = 720 credits/day, which is 2x the monthly pool. Only 20 production deploys/month fit. Mitigation: data must be loaded at runtime from a non-deploy store; deploy only on code or copy change. Do not use Netlify scheduled functions. |
| GitHub Actions (private repo) | Free plan includes **$12/month** of compute, about 2,000 Linux 2-core minutes at $0.006/min; Windows and macOS cost more per minute ([billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). | 48 runs/day x 30 = 1,440 runs/month. At 1 min each = 1,440 min (fits). At 2 min each = 2,880 min (over). | Medium. Keep each run under about 1.3 min; avoid a second cron job. Schedules at :00 get delayed, so use an odd minute (e.g. :17, :47). Option: a public repo has no minute cap for standard runners [UNVERIFIED, check current docs], but then the code and any data must be licence-clean (section 3, rater data). |
| Cloudflare Workers free (cron) | 100,000 requests/day; **10 ms CPU per invocation**; **50 subrequests per invocation**; Cron Triggers available, **5 per account** ([limits](https://developers.cloudflare.com/workers/platform/limits/)). | 80 feeds in one invocation = 80 subrequests (over 50). XML parsing of 40+ feeds is far above 10 ms CPU. | Do not use Workers as the feed scheduler. Use Cloudflare for DNS (`v.kuljento.fi`) and, at most, a tiny ping. Feed polling stays on GitHub Actions. |

**Load check (V at 80 sources, 30 min, ~3,000 articles/day):**
- Feed GETs: 80 x 48 = 3,840/day. Fine for origin servers; use conditional GET (ETag / If-Modified-Since) to cut bandwidth.
- Articles to embed: only new ones, about 60 per run. Local e5-small on a GitHub runner is cheap, but must be benchmarked [UNVERIFIED runtime].
- Cluster summaries: regenerate only when a cluster gains 2+ articles and cap at Top-20 per run. Target 100 to 200 LLM calls/day.
- Net: the pipeline fits GitHub Actions and Gemini/OpenRouter only if summaries are cached and the Netlify deploy path is kept out of the 30-min loop.
## 2. Accuracy risks of free LLMs in Finnish

No benchmark for the free models (nemotron, gemma, qwen) in Finnish was found; treat quality as unknown until tested on 50 labelled clusters.

Risks:
1. Invented numbers, names or dates in summaries.
2. Wrong Finnish inflection of names (e.g. "Sanoma" vs "Sanomaa"), which looks like an error to native readers.
3. Silent language drift to English or Swedish on fi input.
4. Translation of headlines that changes the claim (esp. "may", "said to", quotes).
5. Summary of an article that is a headline only (no lead).
Guards (all in code, not in the prompt):
- Extract-then-cite: LLM may only write sentences ending in `[a1]`-style tags that point to extracted sentences. Missing tag = sentence dropped.
- String match: every number, date, and capitalised name in the output must appear in the cited source sentences. Fail = drop sentence.
- Language check: output must match the expected language (simple stopword ratio). Fail = use extractive text.
- Length cap: 2 to 3 sentences, max ~60 words; longer = truncate to extractive.
- No LLM when fewer than 2 sources or when the lead is under ~30 words; show the headline list only.
- Log `model` and `fail_rate` per day; if fail rate > 20% for a model, switch chain order. (The 20% figure is a proposal, not a measured value.)
- Show "Automaattinen yhteenveto" label + source links on every summary.
- Never use an LLM to decide lean, ownership, or factuality. Those come from the rating table, never from a model.
## 3. Fairness risks in our own Finnish lean estimate

The audit (s7) says no public per-outlet lean rating exists for Finnish outlets. Any estimate we make is our own judgement and can be biased in these ways:

1. **Selection bias in sources.** The 18 working Finnish feeds are not a random sample. The failed ones (Kauppalehti, Kaleva, Turun Sanomat, Svenska Yle, Uusi Suomi, Verkkouutiset) may differ in ideology or region. Dropping them tilts the picture silently.
2. **Owner-table bias.** Owners come mostly from English Wikipedia, some years old, coded by one person (audit s6). An owner group (e.g. Sanoma) says little about editorial lean.
3. **Party-tie bias.** "Party-linked" papers are easy to label, but the label implies a lean the paper may not show. Tie counts as an inference, not as a measurement.
4. **Vocabulary bias (M3).** A phrase index built from party speeches measures party vocabulary, not balance. Left-right words are unevenly used across topics (e.g. climate, migration).
5. **Perception data bias.** EVA 2024 (40% say Yle is left-leaning) measures perception, not content.
6. **Reader-side bias.** A "one-sided story" (Blindspot) depends on which axis we pick. Choosing the axis is itself a political choice.
7. **Our own team.** One founder codes all outlets. Mitigation: a second person codes 20; disagreements shown.

Rules to make labels honest:
- Show the basis for every label: which input, who made it, when. Never show a single bare "lean" score in v1.
- Show "Ei arvioitu" (not rated) rather than a neutral-looking middle value. "Center" is not "neutral" (audit s3).
- Use the same wording for every outlet; no adjective that implies quality.
- Show the method page link on every bar.
- Do not show a Finnish lean score until M3 is validated on 300 hand-coded articles.
- Below 2 rated sources: no bar, no Blindspot.
- Owner data: say "Omistaja (Wikipedia, tarkistettu 2.11.2026)" with the date; never imply editorial control.
Copy examples (Finnish / English):

| Context | Finnish | English |
|---|---|---|
| Lean bar, low confidence | Arvio, luottamus: matala | Estimate, confidence: low |
| Lean bar, no data | Ei arvioitu: liian vähän arvioituja lähteitä | Not rated: too few rated sources |
| Method link | Miten arvioimme suuntausta | How we estimate lean |
| Disclaimer under bar | Suuntaus on arvio, ei totuusarvio. | Lean is an estimate, not a verdict on truth. |
| Owner label | Omistaja: Sanoma (Wikipedia, 2.11.2026) | Owner: Sanoma (Wikipedia, 2 Nov 2026) |
| Summary label | Automaattinen yhteenveto. Tarkista lähteet. | Automatic summary. Check the sources. |
| Blindspot card | Yksipuoliset aiheet: näkyvät lähteet tulevat pääosin samasta suunnasta. | One-sided topics: visible sources mostly lean the same way. |
| Source flagged | Tämä lähde on arvioitu disinformaatioksi aiemmin. Näytetään erillään. | This outlet was previously flagged for disinformation. Shown separately. |

## 4. Android sideload risks

Facts checked:
- Google's developer verification: protections begin **30 Sept 2026** in Brazil, Indonesia, Singapore, Thailand; global in **2027**; "power user advanced flow" launched Aug 2026 ([Android developers](https://developer.android.com/developer-verification)). Finland is not in the first wave. Advanced-flow steps and any waiting period are not on that page; secondhand reports mention Developer Mode and a 24 h wait [unverified, see [BleepingComputer](https://www.bleepingcomputer.com/news/security/google-to-verify-all-android-devs-to-protect-users-from-malware/)].
- ADB install exemption: reported, not on the official page [UNVERIFIED].

Risks for V and fixes:
1. **Play Protect / "unknown developer" warning.** Expect a warning on every install of an unverified APK. Fix: publish SHA-256 and the signing-cert fingerprint next to the download; explain the warning in fi/en on the download page.
2. **"Install unknown apps" permission** must be granted by the user for the browser or file manager. Fix: a 3-step install page in Finnish with plain steps, no screenshots claimed until tested on a real device.
3. **Future block (2027).** Sideloading unverified apps may be blocked on certified devices. Fix: register as a developer now (free), and keep the APK a thin WebView wrapper so the real product is the webapp. If blocked, the webapp still works.
4. **Lost signing key** = no updates ever (new signature = uninstall). Fix: one keystore, encrypted backup in two places, never in git. Fingerprint recorded in docs.
5. **Update mechanism.** Do not build a native auto-updater. Fix: the wrapper loads the webapp URL, so content updates ship via Netlify without a new APK. Native update only for wrapper changes. A version check that shows "Päivitä sovellus" with a link to the new APK is enough (needs INTERNET only, no install-permission).
6. **Download trust.** Browsers warn on APK downloads. Fix: serve the APK from the same domain as the webapp, over HTTPS, with a SHA-256 on the page.
7. **Drift and permissions.** Yearly target-SDK check; wrapper asks for INTERNET only (fewer warnings).
## 5. Plain-Finnish copy check (15 terms)

| # | English | Finnish (proposed) | Reason |
|---|---|---|---|
| 1 | Coverage | Kattavuus | Plain and neutral; "uutisten kattavuus" when space allows. |
| 2 | Blindspot | Yksipuoliset aiheet | Says what it is; "Katvealue" is clear to some but reads as "uncovered area", the wrong direction. |
| 3 | Lean | Suuntaus | Neutral; avoids "puolueellisuus" (accusation). |
| 4 | Bias bar | Suuntauspalkki | Literal, matches term 3. |
| 5 | Story (event cluster) | Uutisaihe | "Tarina" sounds fictional; "aihe" is neutral. |
| 6 | Source count | Lähteitä (n) | Plain number, no judgement. |
| 7 | Factuality | Tarkkuus | Narrower than "luotettavuus", which implies a verdict. |
| 8 | Ownership | Omistus | Plain. |
| 9 | AI summary | Automaattinen yhteenveto | States it is machine-made. |
| 10 | Top stories | Eniten lähteitä | Names the measure instead of implying editorial importance. |
| 11 | Local | Alueelliset | Clearer than "Paikallinen" for a national list. |
| 12 | Full coverage | Kaikki artikkelit | Says what the list is. |
| 13 | Paywall | Maksumuuri | Established term, no translation needed. |
| 14 | My feed / follows | Seuratut aiheet | Says it is local and user-chosen. |
| 15 | Not rated | Ei arvioitu | Honest absence; not "neutraali" or "keskusta". |

"Keskusta" is a party name, so never use it for a middle lean. Test terms with 5 people before release (not done).

## 6. Recommendations and open items

1. No Netlify deploy per data refresh: runtime JSON store; deploy on code/copy change only. GitHub Actions runs the 30-min pipeline (under ~1.3 min, odd minute).
2. Supabase out of v0 unless a second writer appears; if used, weekly export to git.
3. Founder decisions: OpenRouter 10-credit purchase (yes/no); Gemini fallback only if AI Studio shows enough RPD.
4. Cap LLM calls at 300/day with caching; show model name per summary. Rater data stays out of the repo until licences are cleared (audit s8.7).
5. Before build: check Gemini RPD in AI Studio, Supabase limits on supabase.com/pricing, advanced-flow steps on the Android blog, and run a 50-cluster Finnish fail-rate test.

ask.sh calls: 1
