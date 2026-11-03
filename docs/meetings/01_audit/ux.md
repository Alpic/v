# Meeting 1 - Ground News UI/UX audit (researcher: UX)

Scope: observable UI facts about ground.news and its apps. Every claim has a source URL. Anything not found is marked **unverified**.

## 0. Evidence status (read first)

- **Screenshots: 0 taken.** A headless Playwright session to https://ground.news returned HTTP 403 ("ERROR: The request could not be satisfied") on both 1280px and 390px. I did not try to get around the block. `shots/` is empty.
- **Computed CSS: not available.** No hex codes, font families or dark-mode CSS could be read. Everything below in the colour and typography sections is from text sources.
- Rendered structure is taken from a WebFetch text extraction of https://ground.news (summarised by a small model, not a DOM dump). Treat it as medium confidence until a real screenshot is taken.

## 1. Navigation structure

| Surface | Observed items (in order) | Source |
|---|---|---|
| Web header (text extraction) | "Home", "For You", "Local", "Blindspot", "Subscribe", "Login", plus a "Search" control | https://ground.news (WebFetch, 2026-11-02) |
| Web header, edition | "US Edition" label, "Set Location" control, date line | same |
| Web, below header | "Trending Topics" row of links (e.g. "2026 Midterm Elections", "Democratic Party", "US Politics", "Republican Party", "United Kingdom") | same |
| Mobile bottom bar (text extraction) | "News", "For You", "Search", "Blindspot", "Local" | same. **Unverified visually** |
| App profile | "Profile" tab at bottom-right | https://help.ground.news/en/articles/1858561 (search snippet only) |
| App tabs customisable | Users can pin topics, sources, and feeds such as "Local News" and "Blindspot" to the tab bar | https://screensdesign.com/showcase/ground-news |
| App tabs reorderable | Tabs can be dragged to reorder (shown in the video, not named) | https://screensdesign.com/showcase/ground-news |

Observations:
- The web and app use two different labels for the same idea. The web says "Home" in the header and "News" in the bottom bar. Pick one name.
- "Blindspot" is a top-level item on both surfaces. It is a core feature, so it gets prime placement.
- Tabs are user-customisable. This adds density and a learning curve. A user reviewer said "the line of tabs at the top ... can get a little long" (Trustpilot, https://ca.trustpilot.com/review/ground.news?page=4).
- An App Store reviewer said the UI is "a bit flat and hard to understand where or how to navigate, what sections are what and how to configure filters/topics" (https://apps.apple.com/se/app/ground-news/id1324203419). Treat as one user's opinion.

## 2. Information density

- **Hero above the fold:** a "Daily Briefing" card with a stats line "8 stories • 969 articles • 8m read", a headline, a summary, and a "+" line of related topics. Text-extraction source: https://ground.news.
- **Stat-heavy cards.** Each story card shows a section label, a count line, a headline, a summary and related topics. That is about five text layers per card before the bias bar.
- **Cards repeat.** The same Daily Briefing card appears under "Top News" with the date "Nov 02, 2026". The Top News block duplicates the hero. Source: https://ground.news.
- **Empty state on the home page.** The "My News Bias" module shows "Linda B. (Sample user)", "0 Stories · 0 Articles", three "?" placeholders and "See the demo". A logged-out user sees an empty chart. Source: https://ground.news.
- **Footer weight.** Three link columns ("Company", "Help", "Tools"), social icons, "Gift", privacy and cookie links, and a copyright line. Source: https://ground.news.
- **Screensdesign's own warning:** the sheer number of sources and charts in one story "could overwhelm casual users", though "the layered UI helps" (https://screensdesign.com/showcase/ground-news).

## 3. Bias bar and colour

Sourced facts (no hex values found):
- **Segments:** blue, white and red. The product page says these "reflect the colors typically associated with political parties in the U.S." (https://ground.news/bias-bar)
- **Labels:** L, C, R on the segments, with a key "L= Left C = Center R = Right" (https://ground.news/bias-bar)
- **Percentages** are "calculated based on the number of bias-rated sources reporting on the story" and sit on the segments (https://ground.news/bias-bar)
- **Meaning:** a view of how outlets across the spectrum cover a story. It is not a rating of the story itself. "A skewed bar means most of the reporting comes from one side, which doesn't mean that the story is a left-leaning story." (https://help.ground.news/en/articles/245249)
- **Edition flip:** in the US edition, blue is left and red is right. In UK, Canada and International editions the colours are reversed, so red is left and blue is right. Users can switch scheme in account preferences (https://help.ground.news/en/articles/245249 and https://help.ground.news/en/articles/263425).
- **Ratings** are averaged from All Sides, Ad Fontes Media and Media Bias Fact Check (https://help.ground.news/en/articles/245249).

Not verified:
- Exact hex values, bar height, bar placement, and whether the bar is on the card or only on the story page. No CSS or DOM was readable.
- The reviewer complaint "My Bias Bar Colors Are Wrong" (https://help.ground.news/en/articles/263425) implies colour confusion is a real support issue. Its contents were not read.

UX read: the colour mapping depends on region and is reversed outside the US. Red and blue carry strong partisan meaning in the US. This is the main legibility risk. A small L/C/R key on every card would help.

## 4. Card layouts

- **Story card (structure reported in text):** image, section label, stats line, headline, summary, related-topics list (https://ground.news).
- **Story-page sections (screensdesign walkthrough):** collapsible sections "Ground Summary", "Full Coverage", "Breakdown". The Breakdown holds a left/centre/right bias spectrum, a factuality donut chart, and a horizontal scroll of source logos (https://screensdesign.com/showcase/ground-news).
- **Bias Comparison tab:** sits "just below the story headline" on both mobile app and web. The summary is per story and requires enough coverage from all three sides. For smaller stories a general summary is shown instead (https://help.ground.news/en/articles/3189505).
- Dimensions, grid columns and corner radius: **unverified** (no screenshot).

## 5. Story page: layout order, top to bottom

Reported order, medium confidence:
1. Story headline
2. Tab row, including "Bias Comparison" (https://help.ground.news/en/articles/3189505)
3. Summary: "Ground Summary" (https://screensdesign.com/showcase/ground-news)
4. "Full Coverage" section
5. "Breakdown": bias spectrum, factuality donut, source-logo strip (https://screensdesign.com/showcase/ground-news)
6. Feed-control actions such as "Show me less content like this" and topic mute (https://screensdesign.com/showcase/ground-news)

Not verified: whether the bias bar sits above or below the summary, and where the timeline sits.

## 6. Typography

- Text-extraction only. Heading hierarchy is visible: "Top News", "Daily Briefing", "Latest News Stories" (https://ground.news).
- Font family, sizes and weights: **unverified**.

## 7. Mobile app navigation

- A bottom bar is reported in the web text extraction (News, For You, Search, Blindspot, Local). The App Store text does not name tabs and describes "the tab bar" only in a release note (https://apps.apple.com/us/app/ground-news/id1324203419).
- A Profile tab sits bottom-right (https://help.ground.news/en/articles/1858561).
- The app listing describes features, not navigation: "AVOID MANIPULATIVE ALGORITHMS", "SPOT MEDIA BIAS", "DISCOVER BLINDSPOTS", "CHECK THE RELIABILITY OF SOURCES", "SEE WHO OWNS THE NEWS YOU CONSUME" (same App Store page).
- Mobile "Website Theme" is set from Website Settings (https://help.ground.news/en/articles/1858561).

## 8. Dark mode

- **Exists.** Ground News has a help article covering dark mode for the website, mobile website and mobile app (https://help.ground.news/en/articles/1858561).
- Website path: "Website Settings", then "Website Theme", then the dark option (same article, search snippet).
- App path and option name: **unverified** (the snippet cut off).
- Colours in dark mode: **unverified**.

## 9. Clutter vs. strengths

Strengths (sourced):
- Clear bias-bar legend and explicit method, with a published rating source list (https://help.ground.news/en/articles/245249).
- Bias bar described by its own help article as "a starting point", not a verdict (https://help.ground.news/en/articles/245249).
- Collapsible story sections; a clean "bias spectrum and factuality chart" presentation (https://screensdesign.com/showcase/ground-news).
- One reviewer praised the UI (search summary of Trustpilot and App Store reviews).

Clutter and friction (sourced, from users or the web text):
- Long, customisable tab row (https://ca.trustpilot.com/review/ground.news?page=4).
- Unclear section names and how to configure topics (https://apps.apple.com/se/app/ground-news/id1324203419).
- Double-tap loads a story twice on Mac (Mac App Store review, search summary).
- Duplicate hero and Top News card on the home page (https://ground.news).
- Logged-out bias module shows empty "?" placeholders (https://ground.news).
- Europe filter still shows mostly US news, per one reviewer (search summary).

## 10. Next steps for the audit

1. Take the screenshots from a real browser or device session: home, a story, Blindspot, a source page, at 390px and 1280px. Save into `shots/`. The 403 block needs a human or an allowed session.
2. Pull computed styles (bias-bar hex, font stack, card radius, dark mode tokens) from a session that can load the page.
3. Confirm the bottom-bar labels on a real phone.

Screenshots: none (see section 0). `shots/` is empty.

ask.sh calls: 0
