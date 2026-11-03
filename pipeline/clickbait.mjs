// F18 headline-style score 0-100 (10 binary features x config weights; see docs/meetings/02_blueprint/independent_and_clickbait.md B.2-B.3). Not a truth measure.
import { readFileSync } from 'node:fs';
const W = JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url), 'utf8')).clickbait.weights;
const L = 'a-zåäö';
const re = (s) => new RegExp(s, 'iu');
const EMOTIVE = re(`(?<![${L}])(kohu|järkyt|shokki|sokki|uskomat|ennennäkemät|hämmentä|raivo|paljasta|paljastui|salaisuu|totuus|hirvei|pelottava|murskaa|räjäyttä|tuhoaa|sekaisin|hullu|ihme|mullistaa|valtava|ikimuistoinen|kaikkien aikojen|huolestuttava|paniikki|vihdoin|lopultakin|viraali|ihan oikeasti|shocking|jaw-dropping|will make you|goes viral|destroys|the truth about)`);
const SUPER = re(`(?<![${L}])(ainoa|suurin|pahin|parhaat|kaikki|kukaan|mikään|kauhein|hurjin|outo|uskomattomin|[${L}]{3,}immin|[${L}]{3,}impia|the (best|worst|biggest))(?![${L}])`);
const WATCH = re(`^(video|kuvat|kuva|katso)\\s*:|(?<![${L}])(katso|katsokaa|lue myös|älä missaa)(?![${L}])\\W*$|^(katso|katsokaa)(?![${L}])`);
const TEASE = re(`näin kävi|tässä syy|tämä on se|mitä seuraavaksi|mitä tapahtui|lopputulos|yllättävä|odottamaton|\\.\\.\\.|…|you won't believe|here's why|what happened next|this is what|the reason is`);
const LIST = re(`^\\d{1,2}\\s+(syytä|asiaa|tapaa|vinkkiä|faktaa|juttua|keinoa|reasons|things|ways|facts|tips|signs|[${L}]+ jota)`);
const ET = re(`(?<![${L}])(et|ette)\\s+(usko|tiedä|arvaa|halua|ymmärrä)`);
const QUOTE = /^["“”«»'].*["“”«»']$/u;

export function cbFeatures(t) {
  t = (t || '').trim();
  const caps = (t.match(/(?<![\p{L}])\p{Lu}{4,}(?![\p{L}])/gu) || []).length;
  return {
    f1_question: /\?$/.test(t), f2_superlative: SUPER.test(t), f3_watch: WATCH.test(t), f4_teaser: TEASE.test(t),
    f5_exclaim: t.includes('!'), f6_allcaps: caps >= 2, f7_emotive: EMOTIVE.test(t),
    f8_quote_only: QUOTE.test(t) && !/[,:]\s*\p{L}+\s*$/u.test(t.replace(/["“”«»]/g, '')) && t.length < 90,
    f9_number_list: LIST.test(t), f10_et_prompt: ET.test(t),
  };
}
export const cbScore = (t) => Math.min(100, Object.entries(cbFeatures(t)).reduce((s, [k, v]) => s + (v ? W[k] : 0), 0));
