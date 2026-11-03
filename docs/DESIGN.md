# Design System: V (a Kuljento project)

Source of truth for V's look. Mockups: `v/design/mockup.html`, shots in `v/design/shots/`. Change this file first, then the code.
All sample data in the mockup is fictional (lean, owner, JSN values are NOT real ratings).

## 1. Visual theme & atmosphere
A calm, serious reader. Think a printed paper's front page: white sheets on a warm off-white desk, hairline rules, one confident headline per story, almost no decoration. Not a SaaS dashboard: no KPI tiles with icons, no gradients, no glow, no glass.
Density 5 (daily-app balanced), variance 4 (mostly aligned, lead story larger), motion 2 (static, restrained). Brand shows in three places only: the orange bar under the "V" and under the active tab, the orange primary button, and the yellow marker on Blindspot labels. Everything else is ink and neutrals.

## 2. Tokens (CSS vars; **dark is the default** (founder), light only via manual setting `[data-theme=light]`; ignore `prefers-color-scheme`)
Brand: dark `#555964` (`--brand`), orange `#FD5E0D` (`--accent`), yellow `#ECFB18` (`--marker`). Orange as text fails contrast on white (3.1:1), so text/links use `--accent-ink`.
| Token | Light | Dark | Role |
|---|---|---|---|
| `--canvas` | #F4F4F1 | #141518 | page background (the "desk") |
| `--surface` | #FFFFFF | #1C1E22 | lists, story blocks, nav (L1) |
| `--raised` | #FFFFFF | #24262B | menus, sheets (L2) |
| `--sunken` | #ECECE8 | #101114 | skeletons, image placeholders, tracks |
| `--ink` / `--ink-2` / `--ink-3` | #1A1A1A / #5A5A5A / #767676 | #ECECE8 / #A6A9B0 / #8A8D94 | text primary / secondary / placeholder-only |
| `--line` / `--line-strong` | #E2E2DD / #C4C4C4 | white 9% / 22% | hairlines / control borders |
| `--accent` / `--on-accent` | #FD5E0D / #1A1A1A | #FD5E0D / #141518 | primary button, tab bar, focus ring |
| `--accent-ink` | #BF4308 (5.2:1) | #FF8A4F | links, citation numbers |
| `--marker` / `--on-marker` | #ECFB18 / #1A1A1A | same | Blindspot label only (max one per card) |
| `--ok --warn --err` | #2F6B3F #8A5A00 #A32A22 | #7CC38F #E3B04B #F0867E | status text, always with icon+words |
Contrast measured: ink-2 on white 6.9:1, on canvas 6.3:1; on-accent on orange 5.6:1; dark orange on #16171A 5.8:1.

### 2.1 Lean scale (politically neutral)
Five ordered positions plus "not rated". Violet to teal through neutral grey: neither US blue/red nor any Finnish party colour (no red, blue, green, yellow-blue). Orange/yellow are brand and never encode lean.
| Pos | Label fi / en | Light | Dark | Pattern (identity beyond colour) |
|---|---|---|---|---|
| 1 | Vasen / Left | #4F3D82 | #A895E6 | 45deg stripes, dense (2px/2px) |
| 2 | Keskivasen / Centre-left | #8E7DBF | #7867B3 | 45deg stripes, sparse (1.5px/5px) |
| 3 | Keski / Centre | #A9ABB2 | #7C7F88 | solid |
| 4 | Keskioikea / Centre-right | #5FA7A9 | #3F8F93 | -45deg stripes, sparse |
| 5 | Oikea / Right | #1B6A74 | #69CBD1 | -45deg stripes, dense |
| 0 | Ei arvioitu / Not rated | none | none | 1px outline `--line-strong`, empty fill |
Rule: stripes lean toward the side they belong to (`\\` left, `//` right), so grayscale and colour-blind readers still read direction. The dataviz validator (categorical mode) FAILS this palette on colour alone (Centre vs Centre-right protan dE 3.4), which is exactly why pattern + text label + count are mandatory, never optional. Text labels never use these colours; labels stay in ink.
Ownership uses a separate neutral ramp (`--own-1..4`, ink tints) plus glyph shapes, so it never competes with lean.

### 2.2 Type (Open Sauce Sans; fallback `Inter, system-ui, "Helvetica Neue", Arial, sans-serif`; self-host WOFF2, check licence)
One family, 3 weights: 400 body, 500 labels/buttons, 600 headings. No 700+. Tabular numerals on (`font-variant-numeric: tabular-nums`). Letter-spacing -0.02em only at 24px and up.
| Step | Size/line | Use |
|---|---|---|
| meta | 12/1.4 | timestamps, counts, notes, kicker (uppercase +0.06em, 600) |
| secondary | 14/1.5 | chips, legends, badges, table rows |
| body | 16/1.55 | summaries, headlines in lists (500), max 62ch |
| card | 18/1.28 | story card headline (600) |
| section | 20/1.2 | block titles |
| lead | 24/1.17 mobile, 32/1.12 desktop | lead story |
| story | 28/1.15 mobile, 40/1.1 desktop | story page H1 |
Headlines use `text-wrap: balance`; list headlines `pretty`. No text under 12px, and 12px is meta only.

### 2.3 Space, radius, shadow
Space (4px base): 4 8 12 16 20 24 32 40 56 72. Gutter 16 mobile, 24 tablet, 40 desktop. Block padding 20/16. Row gap in lists 16.
Radius: 3 bars/segments, 4 chips and badges, 6 monogram tiles, 8 buttons, cards, panels, inputs; 12 sheets. No pill shapes (chips are 8px rectangles).
Shadow: lists use border not shadow. `--shadow-1: 0 1px 2px rgba(26,26,26,.05)` (hover lift), `--shadow-2: 0 8px 24px rgba(26,26,26,.07)` (menus/sheets). Dark: no shadow, `inset 0 1px 0 rgba(255,255,255,.05)` top edge.
Surfaces: canvas ~60%, white lists ~30%, accent under 10% of any screenshot.

## 3. Components
**Story card** (list row, not a boxed card; rows on one white panel separated by hairlines). Order: kicker (section) / headline (card size, max 4 lines) / optional 84px thumbnail right (flat `--sunken` with line art, never stock photo) / coverage bar 10px / group counts "Vasen n Keski n Oikea n Ei arvioitu n" / facts line: "N lähdettä", "N omistajaa", age. Max 4 text layers. Whole row is one link, min height 88px. Lead story: 176px image, lead headline, 2-line summary, 10px bar.
**Coverage bar**: segments in lean order left to right, flex-grow = count, 2px gaps, 3px radius, min width 4px. Height 10 card, 16 story page. Always `role="img"` with an aria-label listing every count. Show only when 3+ rated sources; else the text "Liian vähän arvioituja lähteitä" instead. Legend (story page): swatch with the real pattern + label + count, 2 columns. Counts, never percentages, on stories; percentages only on "Oma uutisdieetti". Footnote on every bar block: "Suuntaus on lähteen arvio, ei jutun tuomio" + link to method.
**Ownership chip**: 24px high, 1px `--line-strong`, 4px radius, 10px glyph + name (12/500). Glyphs: circle public, square media group, triangle foundation/association, diamond party-affiliated, double bar international. Mix bar (8px) in neutral ramp with chips as legend. Never coloured by lean.
**Source badge**: 32px monogram tile (1px border, 600 initials in `--brand`, no logos, no trademark risk) + name 14/600 + sub line 12 (time + lean label). Lean marker is text, optionally the 5-notch scale on the source page with a caret under the current notch and confidence as 4 dots plus the word.
**Missing marker** ("Sivuutetut uutiset: ..."): `--marker` fill, 12/600, 4px radius, one per card; plus a dashed-outline "Puuttuu" tag and one sentence saying who is absent ("Vasemmalta 0 / 11 arvioitua lähdettä").
**Tabs (mobile)**: 5 items, 56px + safe-area, icon 24 (1.75 stroke) + 12px label, always labelled. Uutiset, Sivuutetut (full name "Sivuutetut uutiset" does not fit 78px at 12px; used as page title), Haku, Oma, Lisää. Active: ink + 600 + 3px orange bar on the top edge of the tab. Settings, method/about, APK download live under Lisää. Desktop >=1024: same 5 as left rail (232px), active shown by a 3px orange bar on the rail edge and `--canvas` fill.
**Buttons** (44px min): primary = orange fill, ink text, 600 (one per screen); secondary = 1px `--line-strong`, ink; ghost = `--accent-ink` text. Verb-first labels ("Yritä uudelleen", "Poista rajaukset"). Press: scale .98 plus 1px darken, 100ms. Focus: 2px `--accent` ring, 2px offset, never removed.
**Segmented / filter chips**: 8px radius rectangles, 36px (chips) or 32-40px (segments), selected = ink fill with surface text; no colour.
**Summary box** (story page): `--canvas` fill, 1px border, 3px `--brand` left rule, label "Tiivistelmä", citation numbers in `--accent-ink` linking to the source row, footnote "Kone tiivisti N lähteestä. Tarkista viitteet." Hidden when under 3 sources.
**Empty**: title (what belongs here), one sentence why it helps, one verb button; line icon 48px max, no cartoons. Filtered-empty adds "Poista rajaukset". Same footprint as populated content.
**Loading**: skeleton rows matching a real story row (kicker, 2 headline lines, bar, count line); shimmer 1.6s, static when reduced motion. No spinners; for refresh use a 2px top progress line in `--accent`.
**Error**: inline block with `--err` border and `--err-bg`, bold what failed, one line what still works, "Yritä uudelleen". Offline: banner "Ei verkkoyhteyttä. Näytetään tallennetut tarinat (N min vanhoja)." Never a blank screen.
**APK download page** (/lataa): one H1, version + size + date + SHA-256 (mono 12px), one primary button "Lataa APK", 3 numbered install steps, note that Android asks to allow installs from the browser. No store badges.

## 4. Layout per breakpoint
- **<640 phone** (design at 390): single column, 16px gutter, header (wordmark, FI|EN, date, chips) then lead then list; bottom tabs. Story page: stacked blocks (summary, bar, owners, headlines grouped by lean, timeline), each block a white band with hairlines and 12px canvas gap. Headlines grouped by lean group (three groups: Vasen+Keskivasen, Keski, Keskioikea+Oikea), each with swatch heading.
- **640-1023 tablet**: 24px gutter, feed in 2 columns, story page 2 columns for headlines (grouped by lean). Bottom tabs stay.
- **>=1024 desktop**: left rail 232, main column max 760, right rail 332 (Sivuutetut uutiset teaser, lean legend). Lead is split (text left, art right), feed in 2-column grid with hairline grid lines. Story page: main 720 + sticky side 340 (bar, owners, legend); headlines side by side in three columns by lean group (this is the only 3-column spot, and the columns are unequal in content).
- Max content width 1240. Full-height shells use `100dvh`; heroes `100svh`.

## 5. Motion
Calm. Purpose only: orient (page transition), confirm (press), wait (skeleton). Never decorative loops.
- Press 100ms ease-out, scale .98. Tab/segment change 150ms. Block expand 200ms, `cubic-bezier(.16,1,.3,1)`. Page push 240ms slide 16px + fade. Nothing above 300ms.
- Animate only `transform` and `opacity`. Lists do not cascade on mount; bars grow once (`scaleX` from 0, 300ms) on first view of a story only.
- `prefers-reduced-motion: reduce`: no slide, no grow, no shimmer; state changes are instant crossfades under 100ms or none.
- Hover styles only inside `@media (hover:hover) and (pointer:fine)`.

## 6. Mobile-native rules (webapp and APK wrapper)
`viewport-fit=cover`, `interactive-widget=resizes-content`; `theme-color` per scheme (#FFFFFF / #1C1E22 match the header); `env(safe-area-inset-*)` on tab bar and sheets; `-webkit-tap-highlight-color: transparent`; controls `touch-action: manipulation` + `user-select: none` (content stays selectable); inputs 16px; `overscroll-behavior: none` on root, `contain` on sheets; never disable zoom. Test on a real phone and in the APK WebView.

## 7. Copy tone (fi first, en parallel)
Factual, honest, first-person plural only for the method ("Miten arvioimme"). Short sentences, no hype, no exclamation marks, no emojis.
| Moment | fi | en |
|---|---|---|
| Bar caveat | Suuntaus on lähteen arvio, ei jutun tuomio. | Lean is a rating of the outlet, not a verdict on this story. |
| Few sources | Liian vähän arvioituja lähteitä. | Too few rated sources to show a split. |
| Blindspot | Sivuutetut uutiset: vasen. Vasemmalta 0 / 11 lähdettä. | Blindspot: left. 0 of 11 sources from the left. |
| Summary | Kone tiivisti kuudesta lähteestä. Tarkista viitteet. | Machine-summarised from 6 sources. Check the citations. |
| Privacy | Ei tiliä, ei seurantaa. Tiedot pysyvät tällä laitteella. | No account, no tracking. Data stays on this device. |
| Error | Syötteen haku epäonnistui. | Could not load the feed. |
Say rater and date wherever a rating is shown. Never write "puolueellinen", "luotettava" as a verdict; write the measured fact ("1 langettava JSN-päätös 2025"). Banned: Elevate, Seamless, Unleash, Next-gen, "paljastamme", "totuus".

## 8. Accessibility
- Contrast 4.5:1 for text, 3:1 for UI edges; `--ink-3` only for placeholders. Lean colours never carry text.
- No information by colour alone: every bar segment has pattern + legend text + count; owners have glyph + name; status has icon + word.
- Targets 44x44; visible focus ring; tab order = visual order; bar blocks have a text equivalent (aria-label and a "Näytä taulukkona" table of counts).
- Headings in order (one H1 per screen); landmarks (header, nav, main); `lang` on `html`, `lang="sv"/"en"` on foreign headlines.
- Dark and light must both pass; test grayscale and a CVD simulation before release.
- Respect text scaling to 200% (no fixed heights on text), `prefers-reduced-motion`, dark default with manual light override stored in localStorage (wrapped in try/catch).

## 9. Banned
Pure black and white text on canvas, gradients and glows, glass, pill buttons, stock photos, US blue/red, any party colour, colour-only encoding, percentages without counts, dual-axis charts, weights above 600, text under 12px, horizontal page scroll, custom cursors, filler UI ("Scroll to explore"), emojis, centred hero blocks, five text layers on a card, invented ratings shown as facts.
