// Web hardening guards: CSP meta present with the importmap hash, no inline scripts, DB URLs go through safe().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const rd = (f) => readFileSync(new URL(`../web/${f}`, import.meta.url), 'utf8');

test('index.html: CSP hash matches the inline importmap, no other inline script', () => {
  const h = rd('index.html'), im = h.match(/<script type="importmap">(.*?)<\/script>/s)[1];
  assert.ok(h.includes(`'sha256-${createHash('sha256').update(im).digest('base64')}'`), 'importmap hash stale: update the CSP meta');
  assert.equal([...h.matchAll(/<script(?![^>]*(src=|type="importmap"))[^>]*>/g)].length, 0);
  assert.match(h, /Content-Security-Policy/); assert.match(h, /object-src 'none'/);
});
test('lataa.html: CSP, no inline script', () => {
  const h = rd('lataa.html');
  assert.match(h, /Content-Security-Policy/); assert.equal([...h.matchAll(/<script(?![^>]*src=)[^>]*>/g)].length, 0);
});
test('views.js renders DB urls only through safe()', () => {
  const v = rd('views.js');
  assert.equal([...v.matchAll(/href=\$\{[^}]*\b(?:a\.url|s\.source_url)\b/g)].filter((m) => !/safe\(/.test(m[0])).length, 0);
});
