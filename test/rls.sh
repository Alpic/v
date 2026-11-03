#!/bin/bash
# RLS check against a scratch Postgres (needs psql + a server; creates anon/authenticated roles). Usage: PSQL="psql -h /var/tmp/pgt -p 54329 -U postgres" test/rls.sh
set -u; P="${PSQL:-psql -U postgres}"; fail=0
$P -q -c "create role anon nologin" 2>/dev/null; $P -q -c "create role authenticated nologin" 2>/dev/null
$P -q -c "create role v_writer login password 'test' nosuperuser nobypassrls" 2>/dev/null; $P -q -c "create table if not exists other_app(x int); grant select on other_app to anon" 2>/dev/null
$P -q -v ON_ERROR_STOP=1 -f "$(dirname "$0")/../supabase/schema.sql" >/dev/null 2>&1 || { echo "schema failed"; exit 1; }
$P -q -v ON_ERROR_STOP=1 -f "$(dirname "$0")/../supabase/schema.sql" >/dev/null 2>&1 && echo "PASS schema idempotent (2nd run)" || { echo "FAIL schema 2nd run"; exit 1; }
$P -q -c "insert into v_sources(id,name,domain) values('t','T','t.fi') on conflict do nothing; insert into v_articles(source_id,url,url_hash,title,emb) values('t','u','h','x','{1,2}') on conflict do nothing; insert into v_bodies(article_id,body) select id,'b' from v_articles on conflict do nothing" >/dev/null
t() { # name, expect(ok|deny), sql
  out=$($P -q -t -A -c "set role ${4:-anon}; $3" 2>&1); if [ "$2" = ok ] && ! echo "$out" | grep -q "ERROR"; then echo "PASS $1"; elif [ "$2" = deny ] && echo "$out" | grep -q "ERROR\|^0$"; then echo "PASS $1"; else echo "FAIL $1: $out"; fail=1; fi; }
t "anon select feed" ok "select count(*) from v_feed"
t "anon select sources" ok "select count(*) from v_sources"
t "anon insert sources denied" deny "insert into v_sources(id,name,domain) values('x','x','x')"
t "anon select bodies denied" deny "select * from v_bodies"
t "anon select sync denied" deny "select * from v_sync"
t "anon select articles.emb denied" deny "select emb from v_articles"
t "anon select stories.centroid denied" deny "select centroid from v_stories"
t "anon v_retention denied" deny "select v_retention(12)"
t "anon v_rank_update denied" deny "select v_rank_update('[]'::jsonb)"
t "anon sync_put/get roundtrip" ok "select v_sync_put('0123456789abcdef0123','{\"a\":1}'::jsonb); select v_sync_get('0123456789abcdef0123')"
t "anon sync_put short code rejected" deny "select v_sync_put('short','{}'::jsonb)"
[ "$($P -q -t -A -c "select count(*) from v_sync where code_hash='0123456789abcdef0123'")" = 0 ] && echo "PASS code stored hashed" || { echo "FAIL plain code stored"; fail=1; }
# C1: size cap, per-code rate limit, global cap; H1: v_writer scope; M3/L9/L10
t "anon sync_put 70 KB denied" deny "select v_sync_put('bigbigbigbigbig0001', jsonb_build_object('x', (select string_agg(md5(i::text), '') from generate_series(1,2200) i)))"
t "anon sync_put 50 KB ok" ok "select v_sync_put('okokokokokokokok0001', jsonb_build_object('x', (select string_agg(md5(i::text), '') from generate_series(1,1500) i)))"
t "anon sync_put 2nd write within 10 s denied" deny "select v_sync_put('rate0000rate0000rate', '{}'::jsonb); select v_sync_put('rate0000rate0000rate', '{\"b\":1}'::jsonb)"
$P -q -c "truncate v_sync; alter table v_sync alter column prefs set storage external; insert into v_sync select md5(i::text), jsonb_build_object('x', repeat('a', 60000)) from generate_series(1,900) i" >/dev/null
t "anon sync_put NEW code denied when table > 50 MB" deny "select v_sync_put('fullfullfullfullfull', '{}'::jsonb)"
t "anon sync_put EXISTING code allowed when table full" ok "update v_sync set updated_at = now() - interval '1 hour'" postgres
$P -q -c "truncate v_sync; alter table v_sync alter column prefs set storage main" >/dev/null
t "v_retention drops sync rows > 180 d" ok "insert into v_sync values ('old', '{}', now() - interval '200 days'); select v_retention(12)" postgres
[ "$($P -q -t -A -c "select count(*) from v_sync where code_hash='old'")" = 0 ] && echo "PASS v_sync retention" || { echo "FAIL v_sync retention"; fail=1; }
t "anon v_search works" ok "select count(*) from v_search('abc')"
t "anon v_search 1-char query returns nothing" ok "select count(*) from v_search('a')"
t "anon select v_runs.debug denied" deny "select debug from v_runs"
t "anon select v_runs stats ok" ok "select id, at, stats from v_runs"
t "v_writer can write v_ tables" ok "insert into v_sources(id,name,domain) values('w','W','w.fi') on conflict do nothing; update v_sources set name='W2' where id='w'; select count(*) from v_bodies; select v_rank_update('[]'::jsonb)" v_writer
t "v_writer cannot read another app's table" deny "select * from other_app" v_writer
t "v_writer cannot write another app's table" deny "insert into other_app values (1)" v_writer
t "v_writer cannot create objects" deny "create table public.evil(x int)" v_writer
t "authenticated v_sync_put denied" deny "select v_sync_put('0123456789abcdef9999','{}'::jsonb)" authenticated
t "anon cannot use v_ sequences" deny "select nextval('v_articles_id_seq')"
exit $fail
