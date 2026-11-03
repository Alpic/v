# V: Suomen uutislähteet (Meeting 1, topic: Finnish news sources)

Päivitetty: 2026-11-02. Tutkija: Haiku-agentti (WebSearch/WebFetch + curl).

## Menetelmä ja rajat

- RSS-URL:t tarkistettiin `curl -sL -m 10` -pyynnöllä (Mozilla User-Agent). Hyväksytty vain, jos vastauksen alusta löytyy `<?xml`, `<rss` tai `<feed`. Kanavan otsikko ja uusin `pubDate` tarkistettiin ✔-riveille.
- "✔" = palauttaa XML:n 2.11.2026. "NO" = HTML-sivu, 404, tyhjä vastaus tai Cloudflare-haaste. NO ei tarkoita, että lehdellä ei ole syötettä, vaan että tätä URL-osoitetta ei löytynyt.
- Omistajatiedot perustuvat pääosin englanninkielisiin Wikipedia-sivuihin (URL:t alla). Ne voivat olla vanhentuneita. Jokainen omistajatieto, jota ei saatu lähteestä, on merkitty [UNVERIFIED].
- Paywall-sarake on pääosin [UNVERIFIED]. Lähteet antoivat sen vain HS:lle (tilausmalli) ja Yle-lähetykselle (ei mainoksia, verorahoitus).
- Yksikään lähde ei ole poistanut tai muuttanut mitään tässä; rivit ovat tilannekuva, ei lopullinen.

## Taulukko

| # | Lehti | Omistaja / ryhmä | Kieli | Tyyppi | RSS (2.11.2026) | Paywall | Poliittinen tausta / huomio |
|---|---|---|---|---|---|---|---|
| 1 | Yle Uutiset | Yle, 99.98 % valtion omistama | fi | Julkisen palvelun yleisradio | ✔ https://feeds.yle.fi/uutiset/v1/majorHeadlines/YLE_UUTISET.rss | ei [UNVERIFIED] | Rahoitus verolla, ei mainoksia |
| 2 | Svenska Yle | Yle | sv | Julkisen palvelun yleisradio | NO (YLE_SVENSKA.rss = Not Found) | [UNVERIFIED] | Yle-yksikkö, ruotsinkielinen toimitus |
| 3 | Helsingin Sanomat | Sanoma Media Finland (Sanoma) | fi | Valtakunnallinen päivälehti | ✔ https://www.hs.fi/rss/tuoreimmat.xml | kyllä (tilausmalli) | Riippumaton 1932 alkaen; infobox: liberalismi |
| 4 | Ilta-Sanomat | Sanoma | fi | Iltapäivälehti (tabloid) | ✔ https://www.is.fi/rss/tuoreimmat.xml | [UNVERIFIED] | Riippumaton poliittinen linja |
| 5 | Iltalehti | Alma Media (Alma Consumer) | fi | Tabloid | ✔ https://www.iltalehti.fi/rss/uutiset.xml | [UNVERIFIED] | Ei puoluesidettä löydetty |
| 6 | Kauppalehti | Alma Media (Alma Talent) | fi | Talouslehti | NO (HTML) | [UNVERIFIED] | |
| 7 | Talouselämä | Alma Media (Alma Talent) | fi | Talouslehti | NO (HTML) | [UNVERIFIED] | |
| 8 | Taloussanomat | [UNVERIFIED] | fi | Talouslehti | NO (HTML) | [UNVERIFIED] | Omistajaa ei varmistettu |
| 9 | Arvopaperi | Alma Media (Alma Talent) | fi | Talous/sijoitus | NO (HTML) | [UNVERIFIED] | |
| 10 | Aamulehti | Sanoma (ostettu Alma Mediasta 2020) | fi | Alueellinen (Tampere) | ✔ https://www.aamulehti.fi/rss/tuoreimmat.xml | [UNVERIFIED] | Pirkanmaa |
| 11 | Satakunnan Kansa | Sanoma (ostettu Alma Mediasta 2020) | fi | Alueellinen (Pori) | NO (HTML) | [UNVERIFIED] | |
| 12 | Keskisuomalainen | Keskisuomalainen Oyj | fi | Alueellinen (Jyväskylä) | ✔ https://www.ksml.fi/rss | [UNVERIFIED] | Ryhmä omistaa ~80 lehteä (2019) |
| 13 | Savon Sanomat | Keskisuomalainen Oyj (Savon Mediat, 2001) | fi | Alueellinen (Kuopio) | ✔ https://www.savonsanomat.fi/rss | [UNVERIFIED] | |
| 14 | Länsi-Savo | Keskisuomalainen Oyj (2019) | fi | Alueellinen (Mikkeli) | ✔ https://www.lansi-savo.fi/rss | [UNVERIFIED] | |
| 15 | Etelä-Saimaa | Keskisuomalainen Oyj (2019) | fi | Alueellinen (Lappeenranta) | NO (esa.fi/rss = 404/HTML) | [UNVERIFIED] | |
| 16 | Etelä-Suomen Sanomat | Keskisuomalainen Oyj (Mediatalo ESA, 2016) | fi | Alueellinen (Lahti) | not checked | [UNVERIFIED] | |
| 17 | Kymen Sanomat | Keskisuomalainen Oyj (2019) | fi | Alueellinen (Kotka) | not checked | [UNVERIFIED] | |
| 18 | Kouvolan Sanomat | Keskisuomalainen Oyj (2019) | fi | Alueellinen (Kouvola) | not checked | [UNVERIFIED] | |
| 19 | Itä-Savo | Keskisuomalainen Oyj (2019) | fi | Alueellinen (Savonlinna) | not checked | [UNVERIFIED] | |
| 20 | Aamuposti | Keskisuomalainen Oyj (Suomen Lehtiyhtymä, 2013) | fi | Alueellinen (Riihimäki) | not checked | [UNVERIFIED] | |
| 21 | Kaleva | Kaleva Media | fi | Alueellinen (Oulu) | NO (HTML) | [UNVERIFIED] | |
| 22 | Lapin Kansa | Kaleva Media (Kaleva Median vuosikertomus 2024) | fi | Alueellinen (Rovaniemi) | NO (HTML) | [UNVERIFIED] | Wikipedia näyttää vanhan omistajan (Alma) |
| 23 | Ilkka-Pohjalainen | I-mediat: Kaleva 65 %, Ilkka-ryhmä 35 % (vuosi [UNVERIFIED]) | fi | Alueellinen (Seinäjoki) | NO (HTML) | [UNVERIFIED] | |
| 24 | Turun Sanomat | Turun Sanomat Oy [UNVERIFIED] | fi | Alueellinen (Turku) | NO (HTML) | [UNVERIFIED] | Lännen Median osakas |
| 25 | Karjalainen | [UNVERIFIED] | fi | Alueellinen (Joensuu) | ✔ https://www.karjalainen.fi/rss | [UNVERIFIED] | |
| 26 | Pohjalainen | [UNVERIFIED] | fi | Alueellinen (Vaasa) | NO (HTML) | [UNVERIFIED] | |
| 27 | Hämeen Sanomat | [UNVERIFIED] | fi | Alueellinen (Hämeenlinna) | ✔ https://www.hameensanomat.fi/rss | [UNVERIFIED] | |
| 28 | Demokraatti | Julkaisija [UNVERIFIED] | fi | Puoluelehti | ✔ https://demokraatti.fi/feed/ | [UNVERIFIED] | SDP:n äänenkannattaja |
| 29 | Suomenmaa | Joutsen Media | fi | Puoluelehti | NO (suomenmaa.fi/feed/ = HTML) | [UNVERIFIED] | Keskustan äänenkannattaja; lehti ilmestyy neljänä päivänä viikossa (wiki) |
| 30 | Kansan Uutiset | Kansan Uutiset Oy; enemmistö Yrjö Sirola -säätiöllä, osa ammattiliitoilla | fi | Puoluelehti | ✔ https://www.kansanuutiset.fi/feed | [UNVERIFIED] | Vasemmistoliiton äänenkannattaja; puolue itse ei omista osakkeita |
| 31 | Verkkouutiset | Kansalliskustannus Oy (Kokoomus-omistama, hakutulos) | fi | Verkkouutiset (puoluesidonnainen) | NO (Cloudflare-haaste) | [UNVERIFIED] | Kansallisen Kokoomuksen äänenkannattaja (NLF-tietue) |
| 32 | Uusi Suomi | [UNVERIFIED]; nettilehti alkoi 2007 | fi | Verkkolehti (painettu lakkautettu 1991) | NO (HTML) | [UNVERIFIED] | Kokoomuksen äänenkannattaja 1919–1976, sen jälkeen itsenäinen konservatiivinen |
| 33 | Hufvudstadsbladet (HBL) | Föreningen Konstsamfundet / KSF Media (wiki) | sv | Valtakunnallinen päivälehti | ✔ https://www.hbl.fi/rss | [UNVERIFIED] | Ei puoluesidettä löydetty; mahdollinen ruotsalainen pääomistaja (MTV-uutinen, ei varmistettu) |
| 34 | Vasabladet | Harry Schauman -säätiö (Yle-artikkeli, hakutulos) | sv | Alueellinen (Vaasa) | ✔ https://www.vasabladet.fi/rss | [UNVERIFIED] | |
| 35 | Åbo Underrättelser | [UNVERIFIED] | sv | Alueellinen (Turku) | NO (abo.fi/rss palauttaa Åbo Akademin syötteen, väärä) | [UNVERIFIED] | |
| 36 | Österbottens Tidning | Harry Schauman -säätiö (Yle-artikkeli, ei varmistettu) | sv | Alueellinen (Kokkola) | not checked | [UNVERIFIED] | |
| 37 | Seura | [UNVERIFIED] | fi | Viikkolehti | ✔ https://seura.fi/feed/ | [UNVERIFIED] | |
| 38 | Maaseudun Tulevaisuus (MT) | Viestilehdet Oy, omistaja MTK | fi | Alan lehti (perustettu 1916) | ✔ https://www.mt.fi/rss | [UNVERIFIED] | MTK on maatalous- ja metsänomistajien järjestö |
| 39 | MTV Uutiset | MTV Oy, emo Schibsted (kauppa valmistui 1.7.2025) | fi | Kaupallinen televisioyhtiö | ✔ https://www.mtvuutiset.fi/rss/uutiset.rss | [UNVERIFIED] | |
| 40 | MV-lehti | Perustettu 2014 (Ilja Janitskin); omistaja Juha Korhonen 2018 alkaen (wiki) | fi | Vaihtoehtomedia | ✔ https://mvlehti.net/rss (25 kohdetta, uusin 2.11.2026) | [UNVERIFIED] | Wiki (tieto 2022): disinformaatiota, anti-immigrant ja Venäjä-myönteinen; yhteys Soldiers of Odiniin. Elossa syötteen perusteella |
| 41 | Oikea Media | Ei löytynyt | - | - | NO (oikeamedia.fi/feed ja /rss tyhjiä) | - | Olemassaoloa ei vahvistettu, katso notes |
| 42 | Kainuun Sanomat | [UNVERIFIED] (Alma, 1998–99, vanha tieto) | fi | Alueellinen (Kajaani) | NO (tyhjä) | [UNVERIFIED] | |

Huom: Riveiltä 16–20 ja 36 puuttuu syötetarkistus. Ne jätettiin tarkistamatta, koska ne eivät olleet tämän kierroksen ydinlehtiä. Ne voi tarkistaa seuraavalla kierroksella.

## Huomiot

1. **Sanoma vs. Alma Media.** Sanoma osti Alma Median alueelliset lehdet 2020. Aamulehti ja Satakunnan Kansa siirtyivät Sanomalle. Alma Media omistaa edelleen Iltalehden ja Kauppalehden, Talouselämän sekä muut talousbrändit. Lähde: https://en.wikipedia.org/wiki/Alma_Media ja https://en.wikipedia.org/wiki/Sanoma. Sanoman sivu ei mainitse Kauppalehteä.
2. **Keskisuomalainen-ryhmä.** Ryhmä omisti noin 80 lehteä vuonna 2019. Tämä tieto on vanhentunut, joten ajankohtainen lukumäärä on [UNVERIFIED]. Lähde: https://en.wikipedia.org/wiki/Keskisuomalainen
3. **Kaleva Media / I-mediat.** Kaleva Median vuosikertomus 2024 listaa Lapin Kansan. Kalevan kerrotaan omistavan 65 % I-mediatasta ja Ilkka-ryhmän 35 %. Kaupan vuosi on [UNVERIFIED]. Lähde: https://kalevamedia.fi/wp-content/uploads/sites/196/2025/04/Vuosikertomus_2024.pdf
4. **Lännen Media.** Sisältöyhtiö, jonka osakkaita olivat mm. Turun Sanomat ja Ilkka-Pohjalainen. Verkkouutisten otsikon mukaan se lakkautetaan. Vuosi [UNVERIFIED]. Lähde: https://www.verkkouutiset.fi/a/ts-lannen-media-lakkautetaan/
5. **Puoluelehdet.** Demokraatti (SDP), Suomenmaa (Keskusta), Kansan Uutiset (Vasemmistoliitto) ja Verkkouutiset (Kokoomus) ovat kaikki puolueen tai sen lähipiirin julkaisemia. Lähteet: https://en.wikipedia.org/wiki/Demokraatti, https://en.wikipedia.org/wiki/Suomenmaa, https://en.wikipedia.org/wiki/Kansan_Uutiset, https://www.verkkouutiset.fi/a/kokoomuksen-mediayhtion-toimitusjohtaja-vaihtuu-kasperi-summanen-verkkouutisten-ja-nykypaivan-kustantajan-toimitusjohtajaksi/. Verkkouutisten omistajatieto perustuu hakutuloksen tekstiin, ei avattuun sivuun. Demokraatin omistajaa ei löytynyt lähteistä.
6. **MV-lehti.** Syöte on elossa 2.11.2026. Wikipedian tiedot ovat vuodelta 2022. Lähde: https://en.wikipedia.org/wiki/MV-media ja https://mvlehti.net/rss. Yhtiö on luokiteltu disinformaatiota levittäväksi. V-tuotteessa se kannattaa merkitä selvästi ja käsitellä kuten muutkin lähteet, mutta ei samassa luokassa kuin luotettavat lehdet.
7. **Oikea Media.** Hakutuloksista ei löytynyt yhtiötä tällä nimellä, eikä syötettä. Nimi on joko väärin kirjoitettu tai lakannut. Vaatii tarkistuksen, ennen kuin sitä lisätään listalle.
8. **Yle ja Svenska Yle.** Yle on 99.98 % valtion omistama ja rahoitetaan verolla. Lähde: https://en.wikipedia.org/wiki/Yle. Svenska Yle on Yleen kuuluva ruotsinkielinen osasto, sama lähde.
9. **Ruotsinkielinen media.** HBL:n omistaja on wikin mukaan Föreningen Konstsamfundet / KSF Media. Lähde: hakutulos https://en.wikipedia.org/wiki/Hufvudstadsbladet. Vasabladetin ja Österbottens Tidningin omistajatiedot ovat peräisin Yle-artikkelista, joka on hakutuloksen tiivistelmä. Lähde: https://yle.fi/a/7-706368 (ei avattu).
10. **Uusi Suomi.** Painettu lehti lakkautettiin 29.11.1991. Verkkolehti perustettiin 2007. Nykyinen omistaja [UNVERIFIED]. Lähde: https://en.wikipedia.org/wiki/Uusi_Suomi
11. **Maaseudun Tulevaisuus.** Viestilehdet Oy, omistaja MTK, perustettu 1916. Lähde: https://en.wikipedia.org/wiki/Maaseudun_Tulevaisuus
12. **MTV.** MTV Oy:n emo on Schibsted. Kauppa valmistui 1.7.2025. Lähde: https://en.wikipedia.org/wiki/MTV_Uutiset

## Lähteet

- https://en.wikipedia.org/wiki/Yle
- https://en.wikipedia.org/wiki/List_of_newspapers_in_Finland
- https://en.wikipedia.org/wiki/Alma_Media
- https://en.wikipedia.org/wiki/Sanoma
- https://en.wikipedia.org/wiki/Keskisuomalainen
- https://en.wikipedia.org/wiki/Demokraatti
- https://en.wikipedia.org/wiki/Kansan_Uutiset
- https://en.wikipedia.org/wiki/Suomenmaa
- https://en.wikipedia.org/wiki/MV-media
- https://en.wikipedia.org/wiki/Uusi_Suomi
- https://en.wikipedia.org/wiki/Maaseudun_Tulevaisuus
- https://en.wikipedia.org/wiki/Ilta-Sanomat
- https://en.wikipedia.org/wiki/MTV_Uutiset
- https://en.wikipedia.org/wiki/Helsingin_Sanomat
- https://en.wikipedia.org/wiki/Hufvudstadsbladet (hakutulos)
- https://kalevamedia.fi/wp-content/uploads/sites/196/2025/04/Vuosikertomus_2024.pdf
- https://www.verkkouutiset.fi/a/ts-lannen-media-lakkautetaan/
- https://www.verkkouutiset.fi/a/kokoomuksen-mediayhtion-toimitusjohtaja-vaihtuu-kasperi-summanen-verkkouutisten-ja-nykypaivan-kustantajan-toimitusjohtajaksi/
- https://data.nationallibrary.fi/bib/me/W00596043100 (Kansalliskirjaston tietue, Verkkouutiset)
- https://yle.fi/a/7-706368 (hakutulos, ei avattu)
- Syötteet: URL-taulukon mukaisesti, tarkistettu curl-komennolla 2.11.2026.
