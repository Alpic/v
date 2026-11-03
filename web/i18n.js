// All UI strings, fi first then en. Entry = key::fi::en. Entries split on newline or " ¦ ". "|" in a string = singular|plural (first arg is a number). {0},{1}.. = args.
const RAW = `
tab_news::Uutiset::News ¦ tab_blind::Sivuutetut::Blindspots ¦ tab_search::Haku::Search ¦ tab_mine::Oma::Mine ¦ tab_more::Lisää::More
nav::Päävalikko::Main menu ¦ skip::Siirry sisältöön::Skip to content ¦ loading::Ladataan::Loading ¦ back::Takaisin::Back ¦ filter::Rajaa::Filter
language::Kieli::Language ¦ theme::Teema::Theme ¦ dark::Tumma::Dark ¦ light::Vaalea::Light ¦ settings::Asetukset::Settings
c_all::Kaikki::All ¦ c_fi::Suomi::Finland ¦ c_world::Maailma::World ¦ c_local::Paikallinen::Local ¦ c_mine::Seuratut::Followed
k_fi::Suomi::Finland ¦ k_sv::Suomi · ruotsiksi::Finland · Swedish ¦ k_en::Maailma::World
lead_k::Päivän tarina::Story of the day ¦ next::Seuraavaksi::Next ¦ newest::Uusin ensin::Newest first ¦ updated::Päivitetty {0}::Updated {0}
n_stories::{0} tarina|{0} tarinaa::{0} story|{0} stories ¦ src::lähde|lähdettä::source|sources ¦ own::omistaja|omistajaa::owner|owners
first::Ensin {0} {1}::First: {0} {1} ¦ ago_m::{0} min sitten::{0} min ago ¦ ago_h::{0} h sitten::{0} h ago ¦ ago_d::{0} pv sitten::{0} d ago
l0::Ei arvioitu::Not rated ¦ l1::Vasen::Left ¦ l2::Keskivasen::Centre-left ¦ l3::Keski::Centre ¦ l4::Keskioikea::Centre-right ¦ l5::Oikea::Right
gL::Vasen ja keskivasen::Left and centre-left ¦ gC::Keski::Centre ¦ gR::Keskioikea ja oikea::Centre-right and right ¦ gU::Ei arvioitu::Not rated
bar_aria::Suuntajakauma::Lean split ¦ few::Liian vähän arvioituja lähteitä.::Too few rated sources to show a split.
bar_note::Suuntaus on lähteen arvio, ei jutun tuomio.::Lean is a rating of the outlet, not a verdict on this story.
whose::Kenen näkökulma kuuluu::Whose view is heard ¦ who_owns::Kuka omistaa::Who owns it ¦ side_by_side::Otsikot rinnakkain::Headlines side by side
own_note::Omistajaryhmiä {0}, lähteitä {1}.::{0} owner groups across {1} sources. ¦ as_table::Näytä taulukkona::Show as table ¦ method::Menetelmä::Method
twin::Sama tarina toisella kielellä →::Same story in another language → ¦ sum::Tiivistelmä::Summary ¦ sum_ext::Ei tekoälytiivistelmää::No AI summary
sum_note::Kone tiivisti {0} lähteestä. Tarkista viitteet.::Machine-summarised from {0} sources. Check the citations.
sum_ext_note::Otsikoista ja ingresseistä poimittu ote.::Extract from headlines and leads. ¦ cite::Viite {0}::Citation {0}
f_lean::Suunta::Lean ¦ f_lang::Kieli::Language ¦ f_owner::Omistaja::Owner ¦ sort::Järjestys::Sort ¦ s_new::Uusin::Latest ¦ s_az::A–Ö::A–Z
pw::Maksumuuri::Paywall ¦ pw_hidden::{0} maksumuurillista otsikkoa piilotettu.::{0} paywalled headlines hidden. ¦ flagged::Merkitty::Flagged
cb_tag::Otsikkotyyli {0} %::Headline style {0} % ¦ clear_filters::Poista rajaukset::Clear filters
e_filt_t::Ei osumia::Nothing matches ¦ e_filt_b::Mikään ei vastaa rajauksia. Poista rajaukset nähdäksesi kaikki.::Nothing matches the filters. Clear them to see everything.
e_news_t::Ei uutisia vielä::No stories yet ¦ go_more::Avaa asetukset::Open settings
e_news_b::Tarinat ilmestyvät, kun lähteet on luettu. Asetuksista voit näyttää myös yhden lähteen jutut.::Stories appear once feeds are read. In settings you can also show single-source stories.
nf_t::Tarinaa ei löytynyt::Story not found ¦ nf_b::Se on ehkä vanhentunut. Uutiset-näkymässä on tuoreet tarinat.::It may have expired. News has the latest stories. ¦ go_news::Siirry uutisiin::Go to news
bs_title::Sivuutetut uutiset::Blindspots ¦ period::Jakso::Period ¦ day::Päivä::Day ¦ week::Viikko::Week ¦ show_week::Näytä viikko::Show week
bs_def::Uutinen, josta toinen puoli kirjoittaa paljon, mutta toinen puoli lähes ei lainkaan.::A story one side covers a lot and the other side hardly at all.
bs_a::Sivuutetut uutiset: vain yksi talo::Blindspot: one house only ¦ bs_L::Sivuutetut uutiset: vasen::Blindspot: left ¦ bs_R::Sivuutetut uutiset: oikea::Blindspot: right
side_L::Vasemmalta ja keskivasemmalta::From the left and centre-left ¦ side_R::Keskioikealta ja oikealta::From centre-right and right
bs_a_txt::Vain {0} kirjoitti tästä. Muut {1} aktiivista omistajaryhmää eivät.::Only {0} wrote about this. The other {1} active owner groups did not.
bs_b_txt::{0} {1} / {2} arvioitua lähdettä.::{0}: {1} of {2} rated sources. ¦ bs_d_c::Lähteiden maat: {0}.::Source countries: {0}. ¦ missing::Puuttuu::Missing ¦ rule::Sääntö {0}::Rule {0}
bs_foot::Sivuutetut uutiset tarkoittaa: yksi ryhmä kertoo, toinen ei. Se ei kerro, kumpi on oikeassa.::Blindspots mean one group reports and the other does not. It does not say who is right.
e_bs_t::Ei sivuutettuja uutisia tällä jaksolla::No blindspots in this period
e_bs_b::Kortti syntyy, kun sääntö täyttyy (A: {0}+ juttua, {1}+ aktiivista ryhmää; D: {2}+ arvioitua lähdettä, {3}+ ryhmää; B: {4}+ arvioitua lähdettä, {5} % samalla puolella).::A card appears when a rule is met (A: {0}+ articles, {1}+ active groups; D: {2}+ rated outlets, {3}+ groups; B: {4}+ rated outlets, {5} % on one side).
see_all::Näytä kaikki::See all ¦ s_label::Hae uutisia::Search news ¦ s_ph::Hae otsikoista ja ingresseistä::Search headlines and leads
e_s_t::Hae uutisia::Search the news ¦ type_term::Kirjoita hakusana::Type a search term ¦ clear_search::Tyhjennä haku::Clear search
e_s_b::Haku käy läpi viimeisen 30 päivän otsikot ja ingressit.::Search covers headlines and leads from the last 30 days.
e_sr_t::Ei tuloksia haulle “{0}”::No results for “{0}” ¦ e_sr_b::Kokeile lyhyempää tai yleisempää sanaa.::Try a shorter or more general word.
err_search::Haku epäonnistui.::Search failed. ¦ err_feed::Syötteen haku epäonnistui.::Could not load the feed. ¦ retry::Yritä uudelleen::Try again
err_still::Aiemmin ladatut tarinat ovat yhä käytettävissä.::Stories loaded earlier are still available.
offline::Ei verkkoyhteyttä. Näytetään tallennetut tarinat ({0} min vanhoja).::No connection. Showing saved stories ({0} min old).
demo::Esimerkkidata: suuntaus-, omistaja- ja JSN-arvot ovat kuvitteellisia.::Sample data: lean, owner and JSN values are fictional.
upd::Uusi versio {0}::New version {0} ¦ upd_do::Asenna::Install ¦ source::Lähde::Source ¦ f_owner2::Omistaja::Owner ¦ f_tie::Yhteys::Tie ¦ f_funding::Rahoitus::Funding
f_where::Maa · kieli · alue::Country · language · region ¦ f_pay::Maksumuuri::Paywall ¦ f_est::V:n arvio::V estimate ¦ f_mbfc::MBFC (US-kehys)::MBFC (US frame)
f_jsn::JSN::JSN ¦ f_cb::Otsikkotyyli::Headline style ¦ f_flags::Merkit::Flags ¦ f_src::Lähdetieto::Fact source ¦ no_est::Ei arviota::No estimate ¦ noinfo::Ei tietoa::No data
rater_v::V:n arvio, {0}::V estimate, {0} ¦ rater_mbfc::MBFC, {0}::MBFC, {0} ¦ conf_high::Varmuus: korkea::Confidence: high ¦ conf_medium::Varmuus: kohtalainen::Confidence: medium
conf_low::Varmuus: matala::Confidence: low ¦ conf_mbfc::Julkaistu arvio::Published rating
ot_public::Julkinen yhtiö::Public company ¦ ot_company::Yritys::Company ¦ ot_foundation::Säätiö::Foundation ¦ ot_interest_org::Etujärjestö::Interest organisation ¦ ot_party::Puolue::Party ¦ ot_international::Kansainvälinen::International
pw_none::Ei maksumuuria::None ¦ pw_metered::Osittain maksumuurin takana::Metered ¦ pw_hard::Maksumuuri::Hard paywall ¦ jsn_yes::JSN:n jäsen::JSN member ¦ jsn_no::Ei JSN:n jäsen::Not a JSN member
jsn_n::{0} langettavaa päätöstä viimeisen 5 vuoden aikana.::{0} reprimands in the last 5 years. ¦ cb_of::otsikoista, n={0}, 30 pv::of headlines, n={0}, 30 d
follow::Seuraa::Follow ¦ mute::Mykistä::Mute ¦ un_follow::Lopeta seuraaminen::Unfollow ¦ un_mute::Poista mykistys::Unmute ¦ latest::Uusimmat jutut::Latest stories
e_src_t::Ei tuoreita juttuja::No recent stories ¦ e_src_b::Lähteeltä ei ole juttuja viimeiseltä viikolta.::No stories from this source in the last week.
diet::Oma uutisdieetti::My reading balance ¦ priv::Ei tiliä eikä seurantaa. Ilman synkronointia tiedot pysyvät tällä laitteella.::No account, no tracking. Without sync, your data stays on this device.
e_diet_t::Lue muutama juttu::Read a few stories ¦ e_diet_b::Dieetti lasketaan vain tällä laitteella avaamistasi jutuista.::The balance is computed only from stories you open on this device.
st_read::Luettua juttua::Stories read ¦ st_src::Lähdettä::Sources ¦ st_own::Omistajaryhmää::Owner groups ¦ diet_30::Viimeiset 30 päivää::Last 30 days
insight::{0} % lukemistasi jutuista tuli ryhmästä {1}.::{0} % of what you read came from {1}. ¦ by_owner::Omistajaryhmät::Owner groups ¦ by_lean::Suunta::Lean ¦ by_country::Maa::Country ¦ by_lang::Kieli::Language
follow_mute::Seuraa ja mykistä::Follow and mute ¦ keyword::Hakusana::Keyword ¦ remove::Poista {0}::Remove {0}
fm_hint::Sana tai lähde: seuratut saavat oman chipin, mykistetyt piilotetaan.::A word or an outlet: followed ones get their own chip, muted ones are hidden.
backup::Varmuuskopio::Backup ¦ export::Vie JSON::Export JSON ¦ import::Tuo JSON::Import JSON ¦ imp_ok::Tiedot tuotu.::Imported. ¦ imp_fail::Tiedosto ei kelvannut.::That file could not be imported.
sync::Synkronointi::Sync ¦ sync_new::Luo koodi::Create code ¦ sync_off::Lopeta synkronointi::Stop syncing ¦ code::Synkronointikoodi::Sync code ¦ pair::Liitä laite::Pair device
sync_hint::Yhdistä laitteet koodilla. Koodi toimii salasanana: älä jaa sitä. Synkronoinnin ollessa päällä lukuhistoriasi tallennetaan palvelimelle koodin alle.::Link devices with a code. The code works like a password: do not share it. While sync is on, your reading history is stored on the server under the code.
pair_warn::Tämä korvaa tämän laitteen tiedot ja jakaa lukuhistorian kaikille, joilla on koodi. Jatketaanko?::This replaces this device's data and shares your reading history with anyone who has the code. Continue? ¦ m_priv::Tietosuoja::Privacy ¦ m_priv_b::Sivu tulee GitHub Pagesista ja tiedot Supabasesta; molemmat voivat kirjata IP-osoitteesi lokeihinsa. Haku lähetetään palvelimelle, joten hakusanat näkyvät sen lokeissa. Ilman synkronointia lukuhistoria ei lähde laitteelta. Synkronoinnin ollessa päällä se tallennetaan palvelimelle ja jokainen koodin tuntija voi lukea sen; yli 180 päivää käyttämättömät tiedot poistetaan.::The site is served by GitHub Pages and the data comes from Supabase; both may log your IP address. Search is sent to the server, so search terms appear in its logs. Without sync, your reading history never leaves the device. With sync on, it is stored on the server and anyone who knows the code can read it; data unused for over 180 days is deleted. ¦ pair_ok::Laite liitetty.::Paired. ¦ pair_none::Koodilla ei löytynyt tietoja.::No data for that code. ¦ pair_fail::Yhteys epäonnistui.::Connection failed. ¦ qr::QR-koodi laitteen liittämiseen::QR code for pairing
copy_link::Kopioi linkki::Copy link ¦ copied::Kopioitu.::Copied. ¦ o_hidePaywall::Piilota maksumuurilliset::Hide paywalled ¦ o_hideRead::Piilota luetut::Hide read
o_showFlagged::Näytä merkityt lähteet::Show flagged sources ¦ o_single::Näytä yhden lähteen jutut::Show single-source stories ¦ sources::Lähteet::Sources ¦ no_feed::Ei luettavissa::Not read
get_app::Lataa Android-sovellus::Get the Android app ¦ get_app_b::APK ja asennusohjeet::APK and install steps
how::Miten arvioimme::How we rate ¦ m_rank::Järjestys::Ranking ¦ m_bars::Palkit::Bars ¦ m_voice::Suomalaisten lähteiden arvio::Finnish outlet estimate ¦ m_cb::Otsikkotyyli::Headline style
m_intro::Sivu syntyy asetustiedostosta (versio {0}), joten se ei voi poiketa laskennasta.::This page is generated from the config file (version {0}), so it cannot drift from the calculation.
m_rank_b::Tarinan pisteet puolittuvat {0} tunnissa. Etusivulle pääsee, kun lähteitä on vähintään {1}.::Story scores halve every {0} h. A story needs at least {1} outlets for the front page.
m_bars_b::Suuntapalkki näytetään, kun arvioituja lähteitä on vähintään {0}. Luvut ovat lähteiden määriä, ei prosentteja.::The lean bar shows with at least {0} rated outlets. Numbers are outlet counts, not percentages.
m_scale::Asteikko: vasen, keskivasen, keski, keskioikea, oikea. Keski ei tarkoita neutraalia.::Scale: left, centre-left, centre, centre-right, right. Centre does not mean neutral.
m_mbfc::Ulkomaiset arviot ovat MBFC:n (US-kehys) julkaisemia, viimeisin {0}.::Global ratings are as published by MBFC (US frame), latest {0}.
m_voice_b::Arvio mittaa, kenen ääntä lähde siteeraa, ei totuutta. Rajat: {0}; ikkuna {1} pv.::The estimate measures whose voice an outlet quotes, not truth. Cut points: {0}; window {1} d.
m_voice_on::Näkyvillä: {0}.::Visible: {0}. ¦ m_voice_off::Ei vielä näkyvillä: suomalaiset lähteet ovat palkeissa Ei arvioitu, kunnes tarkistus on läpäisty.::Not visible yet: Finnish outlets show as Not rated until the validation gate passes.
m_a::A: vähintään {0} juttua yhdestä omistajaryhmästä, jolla on {1}+ lähdettä jutussa, ja {2}+ aktiivista ryhmää.::A: at least {0} articles all from one owner group with {1}+ outlets in the story, and {2}+ active groups.
m_b::B: {0}+ arvioitua lähdettä {1} ryhmästä, {2} % samalla puolella, ja vastapuolen {3}+ aktiivista lähdettä puuttuu.::B: {0}+ rated outlets from {1} groups, {2} % on one side, and {3}+ active outlets on the other side are absent.
m_d::D: {0}+ MBFC-arvioitua lähdettä {1} ryhmästä, {2} % samalla puolella.::D: {0}+ MBFC-rated outlets from {1} groups, {2} % on one side.
m_win::Jakso {0} h (viikko {1} h). Aktiivinen ryhmä: vähintään {2} juttua jaksolla.::Window {0} h (week {1} h). Active group: at least {2} articles in the window.
m_cb_b::Lähteen otsikoista osuus, joissa on tyylipiirteitä, {1} pv ajalta; raja {0} %. Painot::Share of an outlet's headlines with style features over {1} d; threshold {0} %. Weights
m_sum::Tiivistelmä::Summary ¦ m_lim::Rajoitteet::Limits
m_sum_b::Kone kirjoittaa viitteelliset lauseet, kun lähteitä on vähintään {0}; enintään {1} sanaa, viitteen vastaavuus vähintään {2}. Jos tarkistus epäonnistuu, näytetään otteet.::A machine writes cited sentences with at least {0} outlets; max {1} words, citation match at least {2}. If checks fail, extracts are shown.
m_lim_b::Lähdevalikoima ei ole tyhjentävä ja valinta vaikuttaa tuloksiin. Omistajatiedot ovat Wikipediasta tai yhtiöiden sivuilta, päivämäärineen.::The source list is not exhaustive and the selection affects results. Owner data comes from Wikipedia or company pages, dated.
m_miss::Lukematta jääviä lähteitä: {0}.::Sources not read: {0}.
`;
const D = { fi: {}, en: {} };
RAW.split(/\n| ¦ /).forEach(l => { const [k, f, e] = l.trim().split('::'); if (k) { D.fi[k] = f; D.en[k] = e; } });
let cur = 'fi';
export const setLang = l => { cur = l === 'en' ? 'en' : 'fi'; };
export const L = () => cur;
export const t = (k, ...a) => {
  let s = D[cur][k] ?? k;
  if (s.includes('|') && typeof a[0] === 'number') s = s.split('|')[a[0] === 1 ? 0 : 1];
  return s.replace(/\{(\d)\}/g, (_, i) => a[i] ?? '');
};
