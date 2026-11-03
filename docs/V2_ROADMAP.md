# V 2.0 ROADMAP (meeting 08, 2026-11-03; sources: docs/meetings/08_v2/{groundnews,finnish_media,video,bias_methods,product,tech,ux}.md)
Status: APPROVED 2026-11-03 (Gate B, founder "Ok") with the defaults below. Until then wave 1 is only specified, not built. C0 (V 1.0 go-live) comes first and does not wait for this.

## Positioning (from groundnews.md)
Ground News rates sources with a US lens, paywalls factuality and hides its method (CJR, Trustpilot complaints). V: Finnish + global, free ownership and factuality, **one tap shows how every score is made**, relative (not absolute) slant index (bias_methods.md: Gentzkow-Shapiro 2010).

## Wave 1 (build first; reconciled product vs tech)
| # | Feature | Why | Size | Where | Owner file |
|---|---|---|---|---|---|
| 1 | "Sinun poissaolosi aikana" (since you left) | return reason, client-only, no schema | S | browser | v/web/delta.js |
| 2 | Loppuneet uutiset (went-quiet stories; fallback wording, no coined word, SANASTO rule) | blindspot sibling, cheap | S | klj2 + view | v/pipeline/quiet.mjs |
| 3 | "Miten arvio syntyy" method sheet + relative slant per story + free ownership/factuality | the differentiator | M | klj2 + web | v/pipeline/storylean.mjs |
| 4 | Telegram morning digest | uses existing bot, zero UI | S | klj2 | v/pipeline/digest.mjs |
| 5 | Headline-vs-body mismatch (clickbait/JSN facts), embedding gate, LLM only on ~100/day | founder idea, measurable | M | klj2 | v/pipeline/mismatch.mjs |
Schema delta (additive, tech.md): v_stories +peak_n,quiet_at,lean_dist; v_articles +mm,mm_quote; table v_digest_log; view v_quiet; migration v/supabase/migrations/v2_wave1.sql.
Pipeline runs on **klj2** (decision of MASTERPLAN C0; the blueprint's Actions cron stays a disabled fallback).

## Wave 2 (after wave 1 is live and measured)
Corrections log (regex-only first, "Oikaisu" chip, does NOT replace the age on rows until measured), one-article scripted reel prototype (own summary + Piper TTS + CC0 image, voice licence checked; audio+image), ask-the-archive and fact matrix only with an anonymous-cost cap.

## Do not build (research verdicts)
Third-party captions/transcripts (video.md: not allowed) = **remove "caption fetching" from greyfield/out/m6-vision/SUMMARY.md:47**; overlays on YouTube players; publisher RSS media reuse; per-article truth scores; AllSides/Ad Fontes data; copying Yle text; accounts/ads/analytics. YouTube embed page deferred until wave 1 is live.

## Legal rules for V (finnish_media.md)
Headline + our own short summary + link back; no photos; check each source's terms before ingesting; Yle RSS: no paid/ad use. Unverified and to check before public launch: Copyright Act section, "very short excerpt" length, RSS terms of most outlets.

## Metrics (own local usage log, no identifiers)
Return rate (7-day), Sivuutetut/Loppuneet opens per active day, method-sheet-to-link-out rate.

## Defaults used unless Jesse objects (one batch)
1) local usage log counts opens, no identifiers: yes. 2) reel = audio + CC0 image, one-article prototype in wave 2. 3) YouTube embed page: deferred. 4) caption fetching removed from M6 vision: yes. 5) away threshold 6 h. 6) reel session cap 10. 7) went-quiet wording "Loppuneet uutiset". 8) corrections chip does not replace age on rows (decide after measuring).

## Acceptance (from tech.md + ux.md): 5 + 5 falsifiable checks live in those files; wave 1 is done when all pass in CI and the live app, security delta audit only if new RLS/RPC/workflow appears (migration adds a view and a table: yes, re-audit the migration).
