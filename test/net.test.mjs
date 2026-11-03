import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCapped, readText } from '../pipeline/net.mjs';

test('readCapped: small body ok, oversized streamed body aborted, content-length rejected', async () => {
  assert.equal(await readText(new Response('hello'), 100), 'hello');
  await assert.rejects(readCapped(new Response('x'.repeat(1000)), 100), /too large/);
  await assert.rejects(readCapped(new Response('x', { headers: { 'content-length': '5000' } }), 100), /too large/);
  const endless = new Response(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(65536)); } }));
  await assert.rejects(readCapped(endless, 1e6), /too large/);
});
