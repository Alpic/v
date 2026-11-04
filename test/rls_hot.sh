#!/bin/bash
# RLS/RPC check of supabase/migrations/v2_hot.sql against a scratch Postgres (not part of npm test; needs psql + a server).
# Usage: PSQL="psql -h /var/tmp/pgv -p 54329 -U postgres" test/rls_hot.sh
set -u; P="${PSQL:-psql -U postgres}"; fail=0; D="$(dirname "$0")/../supabase"
$P -q -c "create role anon nologin" 2>/dev/null; $P -q -c "create role authenticated nologin" 2>/dev/null
$P -q -c "create role v_writer login password 'test' nosuperuser nobypassrls" 2>/dev/null
for f in schema.sql migrations/v2_translation.sql migrations/v2_hot.sql migrations/v2_hot.sql; do $P -q -v ON_ERROR_STOP=1 -f "$D/$f" >/dev/null 2>&1 || { echo "FAIL apply $f"; exit 1; }; done
echo "PASS schema + translation + hot applied (hot twice = idempotent)"
$P -q -c "insert into v_sources(id,name,domain) values('yle','Yle','yle.fi') on conflict do nothing; insert into v_stories(id,title) overriding system value values (1,'a'),(2,'b') on conflict do nothing; truncate v_events" >/dev/null
t() { # name, expect(ok|deny), sql, role
  out=$($P -q -t -A -c "set role ${4:-anon}; $3" 2>&1); if [ "$2" = ok ] && ! echo "$out" | grep -q "ERROR"; then echo "PASS $1"; elif [ "$2" = deny ] && echo "$out" | grep -q "ERROR"; then echo "PASS $1"; else echo "FAIL $1: $out"; fail=1; fi; }
n() { [ "$($P -q -t -A -c "select count(*) from v_events")" = "$1" ] && echo "PASS $2" || { echo "FAIL $2 (rows: $($P -q -t -A -c 'select count(*) from v_events'))"; fail=1; }; }
C="'abcdefghij0123456789'"
t "anon select v_events denied" deny "select * from v_events"
t "anon insert v_events directly denied" deny "insert into v_events(cid,k,s) values ($C,'open',1)"
t "anon update/delete v_events denied" deny "delete from v_events"
t "anon select new story columns ok" ok "select hot, reads, talk, hot_why from v_stories"
t "anon select centroid still denied" deny "select centroid from v_stories"
t "anon v_hot_update denied" deny "select v_hot_update('[]'::jsonb)"
t "anon v_events_prune denied" deny "select v_events_prune(30)"
t "anon v_event ok" ok "select v_event($C, '[{\"k\":\"open\",\"s\":1},{\"k\":\"click\",\"s\":1,\"src\":\"yle\"},{\"k\":\"dwell\",\"s\":1,\"ms\":12000},{\"k\":\"path\",\"s\":1,\"s2\":2},{\"k\":\"fb\",\"s\":2,\"v\":-1}]'::jsonb)"
n 5 "5 valid events stored"
t "anon v_event drops invalid events (bad kind, unknown story, unknown outlet, self path, bad fb, huge ms clamped)" ok "select v_event($C, '[{\"k\":\"hack\",\"s\":1},{\"k\":\"open\",\"s\":999},{\"k\":\"click\",\"s\":1,\"src\":\"nope\"},{\"k\":\"path\",\"s\":1,\"s2\":1},{\"k\":\"fb\",\"s\":1,\"v\":5},{\"k\":\"dwell\",\"s\":1,\"ms\":999999999},\"x\",7,null]'::jsonb)"
n 6 "only the clamped dwell was added"
[ "$($P -q -t -A -c "select max(ms) from v_events")" = 1800000 ] && echo "PASS dwell clamped to 30 min" || { echo "FAIL dwell clamp"; fail=1; }
t "anon v_event bad id denied" deny "select v_event('Short', '[{\"k\":\"open\",\"s\":1}]'::jsonb)"
t "anon v_event id with injection chars denied" deny "select v_event('abcdefghij0123456789; drop', '[{\"k\":\"open\",\"s\":1}]'::jsonb)"
t "anon v_event empty batch denied" deny "select v_event($C, '[]'::jsonb)"
t "anon v_event 21 events denied" deny "select v_event($C, (select jsonb_agg(jsonb_build_object('k','open','s',1)) from generate_series(1,21)))"
t "anon v_event non-array denied" deny "select v_event($C, '{\"k\":\"open\"}'::jsonb)"
$P -q -c "insert into v_events(cid,k,s) select 'ratelimitclient00001','open',1 from generate_series(1,60)" >/dev/null
t "anon v_event per-client rate limit (60/min)" deny "select v_event('ratelimitclient00001', '[{\"k\":\"open\",\"s\":1}]'::jsonb)"
t "anon v_event other client still ok under the limit" ok "select v_event('otherclient000000001', '[{\"k\":\"open\",\"s\":1}]'::jsonb)"
$P -q -c "insert into v_events(cid,k,s) select 'flood'||i,'open',1 from generate_series(1,2000) i" >/dev/null
t "anon v_event global rate limit (2000/min)" deny "select v_event('newclient0000000001', '[{\"k\":\"open\",\"s\":1}]'::jsonb)"
$P -q -c "truncate v_events" >/dev/null
t "v_writer can select v_events and update stories" ok "select count(*) from v_events; select v_hot_update('[{\"id\":1,\"hot\":55.5,\"reads\":3,\"talk\":120,\"hot_why\":[[\"src\",5]]}]'::jsonb)" v_writer
[ "$($P -q -t -A -c "select hot||'/'||reads||'/'||talk||'/'||hot_why::text from v_stories where id=1")" = '55.5/3/120/[["src", 5]]' ] && echo "PASS v_hot_update wrote the row" || { echo "FAIL v_hot_update"; fail=1; }
$P -q -c "insert into v_events(cid,k,s,at) values ('oldclient000000001','open',1,now()-interval '40 days'),('newclient000000002','open',1,now())" >/dev/null
t "v_writer prune old events" ok "select v_events_prune(30)" v_writer
n 1 "prune removed only the old event"
exit $fail
