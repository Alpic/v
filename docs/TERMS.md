# V – Finnish terminology (fi/en UI)

Status: research draft 2026-11-02. Web search for Finnish media-research usage was thin (no Finnish source translates Ground News' "Blindspot"). Every claim has a URL or is marked [UNVERIFIED]. Verify the final picks with a native editor / Kotus before release.

## Key finding
Finnish journalism teaching describes the underlying mechanism with "uutisten valinta", "uutisagenda" and events that "jätetään uutisten ulkopuolelle" (left outside the news). The research term for the mechanism is agenda-cutting, which has no established Finnish equivalent [UNVERIFIED]. So a UI label must be built from plain Finnish verbs, not borrowed from research jargon.
- OPH Median maailma, "Uutinen": https://www.oph.fi/fi/oppimateriaali/median-maailma/tulkintojen-avaruus/mediaesitysten-tulkintaa/uutinen
  (quotes: "Näin media määrittelee jotkin asiat toisia tärkeämmiksi ja muodostuu uutisagenda"; "Tapahtumat, joiden ei uskota kiinnostavan lukijaa, jätetään uutisten ulkopuolelle"; "Jo uutisaiheen valitseminen on vallankäyttöä")
- Agenda-cutting (EN, Buchmeier 2020): https://dijtokyo.org/2020/08/13/journal-article-on-agenda-cutting-as-a-neglected-media-phenomenon
- Gatekeeping = "portinvartijuus / portinvartijateoria" (Jyväskylä, Salonen): https://www.jyu.fi/fi/uutinen/median-jaetut-portit-uutismediat-eivat-ole-enaa-ainoita-portinvartijoita-salonen
- Framing = "kehystäminen / mediakehys": https://jyx.jyu.fi/handle/123456789/76803

## 1. Blindspot (story covered by one side, ignored by the other)
Ground News definition (EN): https://about.ground.news/blindspot

| Term | Literal | Finnish usage | Fits <=10 chars | Verdict |
|---|---|---|---|---|
| Sivuutetut | "passed over" | Verb sivuuttaa is plain Finnish; as a media-research term not found [UNVERIFIED] | Yes (10) | RECOMMENDED tab label |
| Sivuutetut uutiset | passed-over news | same [UNVERIFIED] | No (18) | RECOMMENDED main term |
| Uutisaukko | news gap | Coinage, not found in Finnish media texts [UNVERIFIED] | Yes (10) | Fallback, but a coinage |
| Vaiettu | hushed up | "vaiettu aihe" is common speech; implies deliberate silencing, which overclaims (see WORKFLOW rule on absolute claims) [UNVERIFIED] | Yes (7) | Reject: accusatory |
| Toinen puoli | the other side | Plain, but ambiguous (which side?) [UNVERIFIED] | No (11) | Reject as label; fine in explanatory text |
| Valikoiva uutisointi | selective reporting | Established critic phrase; judgmental, describes a charge not a data fact [UNVERIFIED] | No | Reject |
| Jäi uutisten ulkopuolelle | left outside the news | Matches OPH wording exactly (URL above) | No | Use as sentence-form explanation, not as label |
| Katvealue / Katveet / Sokeat pisteet / Yksipuoliset aiheet / Kuollut kulma | | Already rejected by founder | | Rejected |

Recommendation:
- Main term: **Sivuutetut uutiset**
- Short tab label: **Sivuutetut**
- UI definition (fi): "Uutinen, josta toinen puoli kirjoittaa paljon, mutta toinen puoli lähes ei lainkaan."
- Note: V's data only shows who did not cover a story, never why. Label must stay neutral ("sivuutettu" = not covered, not "salattu"). Avoid "vaiettu".
- EN: **Blindspots** (tab) / "Stories one side ignores" (definition).

## 2. Other terms

| Concept | Recommended fi | Alternatives (and why not) | Source / note | EN UI |
|---|---|---|---|---|
| Bias / lean (outlet political orientation) | **Poliittinen suuntautuminen** (short: "Suunta") | "Puolueellisuus" (implies unfairness; Kaleva uses it for Yle criticism: https://www.kaleva.fi/minkalaista-on-puolueellisuus-tai-puolueettomuus-m/11291891); "vinouma" (loaded) [UNVERIFIED]; "kallistuma" [UNVERIFIED] | OPH uses "puolueettomuus" for impartiality (OPH URL). "Suuntautuminen" for outlet lean is my pick [UNVERIFIED] | Political lean |
| Coverage | **Uutisointi** (count: "N lähdettä uutisoi") | "Kattavuus" (means completeness, wrong sense) | Common usage; OPH URL | Coverage |
| Coverage distribution bar | **Uutisoinnin jakauma** (label: "Vasen / Keskusta / Oikea") | "Jakautuminen" | [UNVERIFIED] | Coverage split |
| Ownership | **Omistus** / "Omistaja" | "Mediaomistus" in policy texts: https://api.hankeikkuna.fi/asiakirjat/1fda5325-7c0b-4035-90dc-f6440dde4fc3/9047422b-30d6-4569-9af9-a3085dfb0a39/LAUSUNTO_20250216143431.PDF ("omistuksen keskittyminen" is the policy term [UNVERIFIED wording, source is a PDF summary]); OPH teaches "konserni" links (https://www.oph.fi/fi/oppimateriaali/median-maailma/tuotannon-taustoja/tehtavia-tuotannon-taustoista) | Plain, neutral | Ownership |
| Factuality / reliability | **Luotettavuus** (UI) / "Paikkansapitävyys" (in detail text only) | "Faktuaalisuus" (anglicism, no support found); "Totuudenmukaisuus" (too absolute) | Luottamus/luotettavuus used by Finnish media research: https://jyx.jyu.fi/handle/123456789/112358 ; source-evaluation guide uses "paikkansapitävä": https://peda.net/id/0293cf344:file/download/d682db573c01d3ba1baf25dad0f736a51fd44918/Internet%20tiedon%20arviointi.pdf. CAUTION: DNR "luottamus" measures audience trust, not outlet accuracy; keep V's rating labelled as V's estimate | Reliability |
| "My news bias" (personal diet) | **Lukemani uutiset** (card: "Lukemasi lähteet") / "Uutisdieettisi" | "Kupla / suodatinkupla" (judgmental, contested concept, no Finnish research source found); "mediadieetti" [UNVERIFIED] | Filter bubble background EN: https://www.wikipedia.org/wiki/Filter_bubble | My reading balance |
| Source / outlet | **Lähde** (user-facing) / "Media" for the outlet itself | "Julkaisija" (fine in detail); "Uutislähde" | Peda.net guide above | Source |
| Story (cluster of articles) | **Uutinen** or **Juttu**; cluster: "Aihe" | "Tapahtuma" (event, narrower); "Uutisaihe" | OPH uses "uutinen", "uutisaihe". "Aihe" is my pick [UNVERIFIED] | Story |
| Sensationalism / clickbait | **Klikkiotsikko** (headline) / **Sensaatiohakuisuus** (outlet trait) | "Raflaava" (colloquial; Yle uses "raflaavat otsikot": https://yle.fi/a/3-7885770 ) | Metropolia deck on sensational headlines: https://wiki2.metropolia.fi/download/attachments/83699964/rautalankavisu.pdf?api=v2 | Clickbait |
| Independent / non-mainstream media | **Riippumaton media** (neutral) | "Vaihtoehtomedia" (Wikipedia lists it, together with "vastamedia", "riippumattomat julkaisijat": https://fi.wikipedia.org/wiki/Vaihtoehtomedia ; carries a political/anti-mainstream connotation); "valtamedia" is loaded in debate | Avoid "valtamedia" in UI; use "Suuret mediat" or the owner's name | Independent media |
| "Unrated" | **Ei arvioitu** | "Luokittelematon" (stiffer); "Tuntematon" (wrong: not unknown, not yet rated) | Plain Finnish [UNVERIFIED] | Not rated |
| Estimate / confidence | **Arvio** + "Varmuus: matala / kohtalainen / korkea" | "Todennäköisyys" (statistical, wrong); "Luottamustaso" (stats jargon) | Plain Finnish [UNVERIFIED]. Mark all V ratings as "V:n arvio" so they do not read as fact | Estimate / Confidence |

## 3. English UI summary
Blindspots | Political lean | Coverage | Coverage split | Ownership | Reliability | My reading balance | Source | Story | Clickbait | Independent media | Not rated | Estimate / Confidence

## 4. Open items for the founder
1. Sivuutetut vs Uutisaukko: pick after showing both on a real tab bar. Sivuutetut is plainer; Uutisaukko is more compact but a coinage.
2. No Finnish source translates Ground News Blindspot; consider a 5-person native-speaker check.
3. Avoid "kupla", "valtamedia", "vaiettu", "puolueellinen" in UI copy: each reads as an accusation and breaks the neutrality positioning.
4. News-avoidance research ("uutisten välttely") is a separate concept from V's blindspots, so do not borrow that term: https://www.jyu.fi/fi/uutinen/tarvitsevatko-ihmiset-taukoa-uutisista-tutkimus-kertoo-mista-uutisten-valttelyssa-on-kysymys
