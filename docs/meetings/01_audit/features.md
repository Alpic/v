# Ground News: core feature audit (Meeting 1, topic: features)

Date of research: 2026-11-02. Method: official help center, subscribe/checkout pages, App Store listing, About page; third-party sites only where marked. Anything not confirmed on an official page is tagged [UNVERIFIED].

## Tiers and prices

| Tier | Price (stated) | Source | Confidence |
|---|---|---|---|
| Free | $0 | App Store: "Enjoy our free features" (https://apps.apple.com/gb/app/ground-news/id1324203419) | Official, contents unknown |
| Pro | $9.99/yr, $0.99/mo (mobile) | Third-party only | [UNVERIFIED] |
| Premium | $39.99/yr, billed as $3.33/mo | https://ground.news/checkout/premium | Official checkout |
| Vantage | $99.99/yr, billed as $8.33/mo | https://ground.news/subscribe, https://ground.news/checkout/pro | Official (but see conflict below) |

Conflicts to resolve before the meeting:
- `ground.news/checkout/pro` shows **Vantage** features and price, not Pro. Pro's own feature list is therefore not confirmed by any official page.
- Premium price: $29.99 on some App Store/third-party listings vs $39.99 on checkout (https://ground.news/checkout/premium).
- Mobile monthly prices (Pro $0.99, Premium $3.99, Vantage $9.99) appear only on third-party sites [UNVERIFIED]. The App Store listing confirms "Subscriptions renew monthly" but gives no amounts.
- A search summary mentions a "Premium+" tier (source article not identified) that does not match the 3-tier structure [UNVERIFIED]. The help article 950337 says "Pro+" for Custom Feeds, which is also unclear.

## Story page anatomy

| Feature | What it does | Tier | Source |
|---|---|---|---|
| Bias bar | Shows bias distribution of sources reporting a story, as percentages of bias-rated sources. Skewed bar = one side may be omitting the story. Colors: US blue=left, white=center, red=right (UK/CA/Intl reversed). | Not stated (free-looking) | https://help.ground.news/en/articles/245249 |
| Left / Center / Right coverage split | Headlines and summaries of each side side-by-side | Not stated | https://ground.news/subscribe ("Compare Left, Center & Right Coverage") |
| Coverage meter | % of reporting from left/center/right outlets | Not stated | https://ground.news/subscribe, search summary [UNVERIFIED wording] |
| Source count per story | Number of sources covering the story | [UNVERIFIED] | No official page confirmed |
| Factuality | Publisher-level score: credibility of sources, correction speed, context retention. Not per article. | Basic ratings free [UNVERIFIED]; "factuality ratings" Premium | https://ground.news/about ; https://help.ground.news/en/articles/648513 |
| Factuality distribution per story | Factuality mix across the sources of one story | Premium | https://ground.news/checkout/premium ("Factuality distribution for every story") |
| Ownership | Hand-coded ownership for 2,276+ outlets, categories developed in-house | Vantage | https://ground.news/about ; https://help.ground.news/en/articles/924865 |
| Ownership and funding transparency | Ownership and funding data for outlets covering a story | Vantage | https://ground.news/subscribe |
| Bias Insights | Insights into how partisan bias shapes coverage | Vantage | https://help.ground.news/en/articles/648513 |
| Source diversity indicators | Shows diversity of sources | Not stated | https://ground.news/subscribe |
| Headline comparison | Compare headlines across outlets | Premium | https://help.ground.news/en/articles/648513 ("headline comparison") |
| Full / unlimited article comparison | Compare articles across outlets | Premium ("Unlimited article comparison"); Pro ("Compare News Sources") [UNVERIFIED tier] | https://ground.news/checkout/premium ; https://ground.news/checkout/pro |
| Coverage comparison timelines | Timeline of coverage across outlets | Not stated | https://ground.news/subscribe. Older third-party text says "Local Coverage Analysis" timeline shows first reporter [UNVERIFIED, 2020] |
| Story clustering and related coverage | Groups coverage of one event; related stories | Not stated | https://ground.news/subscribe |
| Geographical context / global coverage map | Map of where coverage comes from | Vantage ("Global coverage map") | https://ground.news/subscribe |
| Alternative Media (Beta) | Podcasts, YouTube, etc. on story pages, each with bias, factuality, ownership labels, summary, timestamp, link | Vantage | https://help.ground.news/en/articles/7541441 |
| Ground Summary / AI summary | Not found in any source reviewed | Unknown | [UNVERIFIED: not confirmed to exist] |
| Compare coverage (button/mode) | Subscribe page: "Compare coverage instantly" as headline feature | Not stated | https://ground.news/subscribe |

## Feeds and navigation

| Feature | What it does | Tier | Source |
|---|---|---|---|
| Home / For You | Stories chosen from location, followed topics/sources, app usage | Not stated | https://help.ground.news/en/articles/950337 |
| My Feed | Personal feed; follow topics, places, people | Premium: unlimited follows. Pro: limited [UNVERIFIED] | https://ground.news/checkout/premium ; search summary |
| Top Stories | Widely reported news of the day | Not stated | https://ground.news/frequently-asked-questions |
| In Focus feed | Dedicated feed of today's major news events | Not stated | https://help.ground.news/en/categories/2272705 |
| Blindspot feed | Stories covered mainly by one side, under-reported by the other; weekly "Blindspot Report" newsletter | Premium (unlimited); Pro (limited, "Unlimited Blindspot Stories" on Vantage checkout page) | https://help.ground.news/en/articles/485057 ; https://help.ground.news/en/articles/648513 ; https://en.wikipedia.com/wiki/Ground_News [UNVERIFIED newsletter claim] |
| Custom Feeds | Mini-feeds for topics or locations | "Pro+" per help article (tier name unverified) | https://help.ground.news/en/articles/950337 |
| Show me less like this | Tells algorithm to show fewer stories on a topic | Not stated | https://help.ground.news/en/articles/950337 |
| Interest pages | Wholesome, Innovation, Science and Nature, Tech, Offbeat (weekly newsletter) | Not stated | https://help.ground.news/en/articles/950337 |
| Personal story recommendations | Recommendations that broaden perspective | Premium | https://help.ground.news/en/articles/648513 |
| Hide Read Stories filter | Removes stories already read from feed | Premium | https://help.ground.news/en/articles/648513 |
| Universal Paywall Filter | Filters paywalled articles across outlets | Premium | https://help.ground.news/en/articles/648513 |
| Sort & Filter | Sort/filter stories by bias, factuality, location, paywall | Basic not stated; "advanced sorting and filtering" Vantage | https://help.ground.news/en/articles/485057 ; https://help.ground.news/en/articles/7541441 |
| Top bar sections | Home, For You, Local, Blindspot | Not stated | https://ground.news/about |
| Search | Search for a topic | Not stated (search exists per App Store/subscribe "search for a topic you're following") | https://ground.news/subscribe [search feature detail UNVERIFIED] |
| Browser extension | Ground News access in browser | Not stated | https://ground.news/bias-bar (FAQ) |

## Topics, following, personalization

| Feature | What it does | Tier | Source |
|---|---|---|---|
| Follow topics/places/people | Feeds personalized to follows | Premium unlimited, Pro limited [UNVERIFIED] | checkout pages |
| Bias edit | Adjust the bias rating on your own account | Not stated | https://ground.news/bias-bar |
| Feedback / suggest source | In-app Settings > Support > Suggest News Source; Feedback | Free | https://ground.news/frequently-asked-questions |
| Edition setting | Settings > Preferences > Edition changes bias-bar color scheme | Not stated | https://ground.news/bias-bar |
| My News Bias | Personal dashboard: reading habits, blindspots, bias/factuality/ownership of your diet. Web-exclusive at last check; app "coming soon". | Vantage (Pro page also lists "limited" access [UNVERIFIED]) | https://help.ground.news/en/articles/7541441 |

## Local, international, editions

| Feature | What it does | Tier | Source |
|---|---|---|---|
| Local tab / local coverage | Local news section; location-based stories in For You | Not stated | https://ground.news/about ; https://help.ground.news/en/articles/950337 |
| Local news alerts | Alerts for local news | [UNVERIFIED] (marketing blog only) | search summary |
| Editions | US, UK, Canada, International editions with different bias colors | Not stated | https://help.ground.news/en/articles/245249 |
| Global sources | 50,000+ sources worldwide | Not stated | https://apps.apple.com/gb/app/ground-news/id1324203419 |

## Notifications, alerts, saving

| Feature | What it does | Tier | Source |
|---|---|---|---|
| Blindspot Alerts | Notifications when one-sided stories appear | Not stated (listed on subscribe page) | https://ground.news/subscribe |
| Topic/keyword alerts | Alerts for matching stories | [UNVERIFIED] | search summary only |
| Newsletters | Burst Your Bubble (Premium+Vantage); Blindspot Report; Offbeat (weekly) | Premium, Vantage | https://help.ground.news/en/articles/7541441 ; https://help.ground.news/en/articles/648513 |
| Saved stories | Save stories | Vantage: "Unlimited saved stories" (free limit not stated) | https://ground.news/subscribe |
| Daily Briefing | Daily briefing (App Store release notes, v4.22.0) | Not stated | search summary [UNVERIFIED tier] |
| Podcasts & Opinions | Podcasts and YouTube clips alongside coverage (App Store release notes) | Not stated | search summary [UNVERIFIED] |

## Other

- Free-plan limits (article count, which features) are NOT confirmed by any official source. A third-party blog says limited articles per month [UNVERIFIED].
- Premium/Vantage 7-day free trial: https://help.ground.news/en/articles/7541441
- Vantage "gives you all of the app's Premium features" on mobile; My News Bias web-exclusive at last check: https://help.ground.news/en/articles/7541441
- Ground's own description: "the largest news aggregator... over 50K news sources and 60K articles added daily" (App Store, https://apps.apple.com/gb/app/ground-news/id1324203419).

## Open questions for the meeting
1. Confirm Pro tier contents and price on a live logged-out page.
2. Confirm whether AI/Ground Summary exists (none found).
3. Confirm free tier contents.
4. Confirm story-page "source count" and timeline tier.
