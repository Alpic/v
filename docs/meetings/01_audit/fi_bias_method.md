# Finnish media lean and reliability: existing data and objective methods

Meeting 1 (audit), project V. Researcher topic: existing research and data for rating Finnish outlets without opinion.
Status: research notes. Items marked [UNVERIFIED] were seen only in a search snippet or could not be fetched.
Note on sourcing: the WebFetch summaries were produced by a small model. Figures I quote were re-checked against the page text where marked "checked".

## 1. Bottom line

- No public, per-outlet **political lean** rating for Finnish brands exists in the sources reviewed. The Reuters Digital News Report (DNR) Finland pages contain no audience left-right score per brand.
- The usable existing data are: DNR brand trust (partial), the Finnish Press Council (JSN) ruling record (countable), the Media Pluralism Monitor (country level only), and a 2024 public perception poll (EVA).
- Recommendation: build the rating on **reliability** (JSN ruling rate) plus **audience lean** (DNR-style survey) plus **content slant** (text method with a published Finnish reference). Details in section 5.

## 2. Existing sources, checked

### 2.1 Reuters Institute Digital News Report (DNR)
- DNR 2025, Finland (data June 2025): overall trust 67%, down 2 points, 2nd of 48 markets. Finnish news media are "not politically polarised". No brand-level trust figures and no brand left-right positions on the page. https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/finland
- DNR 2022, Finland, checked against page text: brand trust Yle 84%, MTV 78%, AlfaTV 45% ("its brand trust is only 45% compared to 84% for Yle and 78% for MTV"). AlfaTV is described as having "a somewhat conservative slant". Helsingin Sanomat's trust is not given on this page. https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2022/finland (checked: scratchpad dnr2022.txt, lines 36)
  - **Correction:** a search snippet said HS had 45% brand trust. That is wrong. The 45% is AlfaTV's. HS's 2022 trust figure is not on the page. [checked]
- DNR 2024 Finland page: not retrieved (HTTP 503). [UNVERIFIED]
- DNR 2025 Finland: brand-level figures, if any, are likely in charts or the DNR survey data download, not in the page text. [UNVERIFIED: check the DNR data download]
- **Audience-lean method, documented in DNR 2017 "Polarisation in the News Media":** respondents place themselves on a 7-point scale from "very left wing" to "very right wing". The centre is the population average. Each brand's score is how far its weekly-reach audience sits from that centre. Country polarisation is the reach-weighted mean over the top 15 online brands. Respondents answering "don't know" are excluded. https://reutersinstitute.politics.ox.ac.uk/digital-news-report/archive/survey/2017/polarisation-in-the-news-media-2017/index.html (search snippet; the fetch returned 503)
  - Whether Finland has an audience map is **[UNVERIFIED]**. The 2017 audience maps in the search results are for Norway and Spain.
  - The DNR's 2022 summary says most outlets attract mixed or centrist audiences, so polarisation is generally low. https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2022/have-news-audiences-become-more-polarised-over-time (search snippet)

### 2.2 Media Pluralism Monitor (MPM), Finland
- MPM2026 Finland (data year 2025), checked: overall risk 34% (medium-low). Fundamental Protection 22%, Market Plurality 60% (medium-high), Political Independence 29%, Social Inclusiveness 24%. https://cmpf.eui.eu/country/finland-2026/
- Reported facts: Act 412/2025 revised the Yle Act. Act 408/2025 requires a national media ownership database, which "is not yet available". Keskisuomalainen Group owned 35% of News Media Finland member titles (autumn 2025). Same source.
- MPM2025 Finland (data 2024; Ylikoski and Ala-Fossi, June 2025): full PDF at https://cadmus.eui.eu/handle/1814/92916 [UNVERIFIED: not read]
- MPM is country-level only. It does not rate outlets.

### 2.3 Julkisen sanan neuvosto (JSN, Press Council)
- **Countable: yes.** The JSN publishes each ruling with outlet name and outcome label ("Langettava", "Vapauttava", "Puheenjohtajan langettava"). Listing page: https://jsn.fi/paatokset/ (checked via WebFetch). Search box with keyword field. No filter by medium, outlet or outcome is shown on the page. Archive start year is not stated. [checked]
- Annual report 2025, checked against extracted text (scratchpad jsn/jsn2025.txt, lines 134, 226-243):
  - 48 decisions covering 51 complaints in 2025.
  - Share of condemning (langettava) decisions: 37% in 2025, 43% in 2024, 63% in 2023.
  - Series 2008–2025 (% langettava): 2008 26, 2009 33, 2010 26, 2011 28, 2012 34, 2013 40, 2014 48, 2015 41, 2016 37, 2017 37, 2018 40, 2019 28, 2020 19, 2021 43, 2022 40, 2023 63, 2024 43, 2025 37.
  - Source: https://jsn.fi/wp-content/uploads/2026/04/2025-Toimintakertomus.pdf
- Per-outlet counts are **not** in the annual report (the reader found NOT FOUND for outlets and media types). Counts must be built from the ruling pages. Example outlets in news reports: Iltalehti, Helsingin Sanomat, Yle, Kaleva, Savon Sanomat, MTV, Aamulehti, Ilta-Sanomat. https://www.mtvuutiset.fi/artikkeli/hesarille-ja-iltalehdelle-langettavat-paatokset-julkisen-sanan-neuvostolta-mtv-lle-vapauttava/8792918 (search snippet)
- **Caveat:** JSN rules on journalistic ethics (Journalistin ohjeet). It does not measure partisan lean. Its ruling count is a reliability and conduct signal, and it is driven by who complains. Very small numbers per outlet per year.
- JSN is self-regulation. It has no fining power. State aid covers about one third of its costs. [search snippets, UNVERIFIED in detail]

### 2.4 Academic work on Finnish slant or endorsements
- Jyväskylä study on Finnish newspapers' election-period editorials (2011 election, published 2015): eight newspapers that had earlier party ties, including HS and Aamulehti, but not Ilta-Sanomat. Most papers did not clearly represent one party's ideology. https://jyx.jyu.fi/handle/123456789/45731 (search snippet, UNVERIFIED in full text)
- Tampere dissertation "Political Journalism Content in a New Era: The Case of Finnish Newspapers, 1995–2015": lead, not read. https://urn.fi/URN:NBN:fi:tuni-202203212642 [UNVERIFIED]
- Turku pro gradu (2021): visibility of non-parliamentary parties in Yle, HS, Ilta-Sanomat and Iltalehti at the 1999 and 2019 elections (content analysis, visibility not bias). [UNVERIFIED: search snippet only, no URL fetched]
- Koljonen, Isotalo, Ahonen and Mattila (2022), Party Politics 28(2): dataset of Finnish manifestos 2003–2019, compared with CHES and Manifesto Project estimates. https://www.sciencegate.app/document/10.1177/1354068820974609 (search snippet)
- No study was found that measures party-preference sentiment across Yle, HS, Ilta-Sanomat and Iltalehti.

### 2.5 Perception data (not a content measure)
- EVA survey, October 2024, about 2,000 respondents, margin 2–3 points. 40% say Yle emphasises left-wing views more than other media; 49% say neither. About one third see HS as left-wing and a quarter as right-wing; 29% neither. Left-wing perception of Yle is most common among National Coalition and Finns voters. No per-party percentages given. Overall trust: Yle 76%, STT 69%, MTV 65%, HS 61%. https://yle.fi/a/74-20151683 (checked)
- Use as a cross-check on audience and content measures, not as a rating input.

### 2.6 Automated bias scores (do not use without validation)
- Aktagon "Finnish news media is more centrist than you think": scores HS -0.28, Yle Uutiset -0.52, Iltalehti -0.10, Ilta-Sanomat -0.15 (-1 to +1). Method, training data and validation not verified (page fetch returned 404 and a search summary says the page does not explain the metric). The source itself notes a classifier blind spot that may affect the Yle result. https://aktagon.com/research/finnish-news-media-is-more-centrist-than-you-think/ [UNVERIFIED]

### 2.7 Other actors
- **Faktabaari:** fact-checking and media-literacy service (https://faktabaari.fi). No outlet bias or ownership rating was found. [UNVERIFIED: site not fetched]
- **Media ownership research:** a one-year Tampere University project (from March 2023, funded by the Prime Minister's Office) on how news ownership concentration affects content diversity. https://projects.tuni.fi/median-keskittyminen/in-english/ (search snippet). No public ownership database yet (see MPM2026).
- **Finnish Journalists' Association (Journalistiliitto):** involved in the Journalistin ohjeet, which JSN enforces (one source says the Association approves them; the sources do not clarify its exact role). No bias-rating role found. [UNVERIFIED]
- **Expert placement of parties:** CHES covers Finland (waves 1999–2019; trend file 1999–2019). It gives party positions on left-right, economic and GAL-TAN. Finnish party values were not retrieved. https://dss.princeton.edu/catalog/resource2259 and https://hal-sciencespo.archives-ouvertes.fr/hal-03449058 (search snippets). Manifesto Project Finland entries: not confirmed. https://manifesto-project.wzb.eu [UNVERIFIED]

## 3. Methods used abroad (opinion-minimising versions)

| Method | What it measures | Reference | Fit for Finland |
|---|---|---|---|
| Audience lean (survey) | Left-right self-placement of each brand's reach-weighted audience vs the population mean | DNR 2017 method (see 2.1) | High. Needs a survey sample per brand. Objective measure of the audience, not the content |
| Text slant, phrase index | Similarity of outlet language to partisan language | Gentzkow & Shapiro, working paper 2007 (Econometrica 2010): https://sites.socsci.uci.edu/~lpearl/courses/readings/GentzkowShapiro2007_MediaBias.pdf | Medium-high. Needs Finnish lemmatisation and a party-speech reference corpus |
| Think-tank citations | Ideology of think tanks cited by outlets, scored by MPs' citations | Groseclose & Milyo (2005): https://sites.socsci.uci.edu/~lpearl/courses/readings/GrosecloseMilyo2003_MediaBias.pdf | Low. Contested: critics say the think-tank scores are dubious (Media Matters, FAIR, per search summary). No Finnish think-tank scores exist |
| Party-mention sentiment | Tone of coverage toward each party, plus who gets quoted | Common in content analysis (no single reference used here) | Medium. Needs a validated Finnish sentiment model and inter-coder checks |
| Expert or citizen placement | Left-right and GAL-TAN of parties (external axis) | CHES; Manifesto Project | Use as the reference axis, not as an outlet score |
| Blind survey plus editorial panel | Opinion of a rater panel | AllSides: https://www.allsides.com/media-bias/media-bias-rating-methods (search snippet; fetch returned 403) | Not recommended. Judgment-based, panel-dependent |
| Multi-analyst content rating | Political position and reliability per article | Ad Fontes methodology paper: https://adfontesmedia.com/wp-content/uploads/2024/12/Content-Analysis-Methodology-Paper-1.pdf (search snippet) | Possible but labour-heavy and not reproducible without the rubric. Reliability component may be useful |

Note on MBFC: no methodology was retrieved. [UNVERIFIED]

## 4. What each source can and cannot give us

- DNR audience survey: can give audience lean per brand, if the Finland data include the 7-point question. Cannot give editorial lean.
- JSN rulings: can give a reproducible reliability count per outlet, normalised by output volume (we would need article counts). Cannot give lean.
- MPM: country-level context only.
- Text slant: can give editorial lean if the reference corpus is clean. Cannot be validated without hand-coded samples.
- EVA poll: perception only. Useful for calibration.

## 5. Recommended methods (three, objective, reproducible)

**M1. Reliability: JSN rulings per outlet**
- Data: every ruling on jsn.fi/paatokset (outlet, date, outcome). Build a table 2008–2026.
- Metric: langettava rulings per outlet per 1,000 published items, plus a 3-year rolling count. Report counts and CIs; small-number warning.
- Caveat: complaint-driven; not a lean measure.
- Action: scrape or manually list the ruling pages. Check the archive start year first.

**M2. Audience lean: DNR-style 7-point survey**
- Data: our own panel of about 1,000–2,000 adults, weighted to the Finnish population (age, sex, region, party vote). Ask the DNR 7-point self-placement and brand-use question.
- Metric: per brand, mean audience position minus population mean, with a 95% CI; reach-weighted country polarisation as a check.
- Action: first ask Reuters Institute whether Finland's brand-level audience data can be obtained. Otherwise, run our own panel. Note: the DNR method uses a self-placement scale, which is reproducible but not a content judgment.

**M3. Content slant: phrase-based index, validated**
- Data: (a) Finnish parliamentary speeches as partisan reference, labelled by party; (b) outlet political-news text for the same period; (c) CHES party positions as an external axis for checking.
- Metric: slant score per outlet = similarity of its political-news language to the left-party and right-party reference distributions (Gentzkow-Shapiro style), with the sign and a CI. Compare with M2.
- Validation: hand-code 300 articles (two coders, Krippendorff's alpha reported) before publishing any score.
- Action: confirm access to the Finnish speech corpus and outlet archive (both UNVERIFIED for licensing).

Cross-check for all three: the EVA perception data (section 2.5).

## 6. Gaps and next steps
1. Fetch DNR 2024 and 2025 Finland data (brand trust and audience lean) through the DNR data download. [not done: HTTP 503 on 2024 page]
2. Confirm JSN archive start year and whether ruling pages carry outlet tags for scraping.
3. Confirm MPM2025 Finland risk scores from the PDF (not read).
4. Ask the Jyväskylä and Tampere authors for the full texts of the endorsement studies.
5. Confirm licensing for Finnish parliamentary speech data.
6. Do not use the Aktagon scores until the method is documented.

ask.sh calls: 2
