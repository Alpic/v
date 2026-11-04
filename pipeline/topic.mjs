// Deterministic topic tagging for Finnish/English headlines. Rules first; null = ambiguous (top stories then go to the LLM in translate.mjs).
// Stems are matched at word start (Finnish inflection); a topic needs >= 1 hit and a strict winner, ties -> null.
export const TOPICS = ['politiikka', 'talous', 'urheilu', 'teknologia', 'tiede', 'terveys', 'kulttuuri', 'ympäristö', 'rikos', 'viihde', 'muu'];
const RULES = {
  politiikka: 'eduskun|hallitu|ministeri|pääministeri|presidentti|vaali|puolue|kansanedus|oppositi|parliament|government|minister|president|election|senate|congress|legislat|\\bvote|\\bmep\\b|\\bnato\\b|sanctions|pakote',
  talous: 'talou|osake|pörssi|inflaatio|korko|yritys|konkurss|työttömy|vero|budjet|velka|kauppa|euribor|economy|econom|stock|market|inflation|interest rate|bank|\\btax|\\bgdp|recession|tariff|company|layoff|profit|\\bbudget',
  urheilu: 'jääkiekko|liiga|futis|jalkapallo|maali|ottelu|olympia|mm-kisat|em-kisat|valmentaja|pelaaja|formula|hiihto|salibandy|koripallo|tennis|football|soccer|hockey|\\bnhl\\b|\\bnba\\b|championship|olympic|coach|tournament|match\\b|premier league|world cup',
  teknologia: 'teknologia|tekoäly|ohjelmisto|älypuhelin|sovellus|kyberturva|robotti|\\bai\\b|artificial intelligence|software|smartphone|\\bapp\\b|cyber|startup|chip|semiconductor|openai|google|apple|microsoft|\\bmeta\\b|tesla|\\btech',
  tiede: 'tutkimus|tutkijat|tiede|avaruus|planeetta|satelliitti|fysiikka|kemia|geeni|tähtitiede|\\bnasa\\b|scientist|research|study finds|space|planet|telescope|physics|astronom|fossil|species',
  terveys: 'terveys|sairaa|lääke|rokote|syöpä|potilas|hoito|influenssa|covid|sote|mielenterveys|health|hospital|vaccine|cancer|patient|disease|virus|medical|\\bwho\\b|drug|therapy',
  kulttuuri: 'kirja|kirjailija|teatteri|museo|näyttely|elokuva|musiikki|konsertti|taide|ooppera|festivaali|book|author|theatre|theater|museum|exhibition|film|music|concert|opera|festival|literature|\\bart\\b',
  ympäristö: 'ilmasto|ympäristö|päästö|saaste|metsä|luonto|energia|tuulivoima|ydinvoima|myrsky|tulva|metsäpalo|climate|environment|emission|pollution|forest|wildlife|renewable|solar|wildfire|flood|storm|hurricane|earthquake|maanjäristys',
  rikos: 'poliisi|rikos|murha|ampu|pidätet|vangit|tuomio|oikeus|syyte|huume|väkivalta|varkaus|petos|police|crime|murder|shooting|arrest|prison|sentenced|court|charged|trial|stabbing|fraud|drug trafficking|\\bkilled\\b',
  viihde: 'viihde|julkkis|tv-sarja|tähti|laulaja|näyttelijä|big brother|selviytyjät|vain elämää|eurovision|celebrity|actor|actress|singer|reality tv|hollywood|netflix|grammy|oscar|red carpet|royal',
};
const RE = Object.fromEntries(Object.entries(RULES).map(([k, v]) => [k, new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${v})`, 'giu')]));

// topicOf(...titles) -> topic string or null (no hit / tie)
export function topicOf(...titles) {
  const t = titles.filter(Boolean).join(' | ');
  if (!t) return null;
  const hits = Object.entries(RE).map(([k, re]) => [k, (t.match(re) || []).length]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (!hits.length) return null;
  return hits.length > 1 && hits[0][1] === hits[1][1] ? null : hits[0][0];
}
export const validTopic = (x) => (TOPICS.includes(x) ? x : null);
