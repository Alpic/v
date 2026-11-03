-- V schema (blueprint 4.1). SHARED Supabase project 'kuljento': every object here is prefixed v_ and this file touches nothing else
-- (no global alters, no other tables/roles). Idempotent: safe to re-run. Writes only by the V-only role v_writer (see the commented role block at the end); never the service key.
-- Anon: read-only, plus the two v_sync_* RPCs.
create table if not exists v_sources (
  id text primary key, name text not null, domain text not null unique, country text, lang text, region text,
  feed_url text, via text default 'rss', owner text, owner_type text, tie text, paywall text, kind text,
  funding text, flags text[] default '{}', mbfc_lean text, mbfc_fact text, mbfc_date date, mbfc_url text,
  jsn_member boolean, jsn_count int, source_url text, checked_on date,
  etag text, last_modified text, last_ok timestamptz, fail_count int default 0, status text default 'ok');
alter table v_sources add column if not exists via text default 'rss';

create table if not exists v_stories (
  id bigint generated always as identity primary key, title text, lang text, first_at timestamptz, last_at timestamptz,
  n_articles int default 0, n_outlets int default 0, score real default 0, centroid real[], is_top boolean default false,
  twin_id bigint references v_stories(id) on delete set null);
create index if not exists v_stories_last on v_stories (last_at desc);

create table if not exists v_articles (
  id bigint generated always as identity primary key, source_id text not null references v_sources(id),
  url text not null, url_hash text not null unique, title text not null, lead text, lang text,
  published_at timestamptz, fetched_at timestamptz default now(), story_id bigint references v_stories(id) on delete set null,
  emb real[], emb_model text, body_ok boolean default false, voice jsonb, cb smallint);
alter table v_articles add column if not exists cb smallint;
create index if not exists v_articles_story on v_articles (story_id);
create index if not exists v_articles_pub on v_articles (published_at desc);
create index if not exists v_articles_fetched on v_articles (fetched_at desc);

create table if not exists v_bodies (article_id bigint primary key references v_articles(id) on delete cascade, body text not null, created_at timestamptz default now());

create table if not exists v_summaries (
  story_id bigint primary key references v_stories(id) on delete cascade, kind text check (kind in ('ai','extractive')),
  model text, sentences jsonb, n_articles_at int, made_at timestamptz default now());

create table if not exists v_outlet_lean (
  source_id text primary key references v_sources(id), v real, conf text, n int, method_ver int,
  source text check (source in ('voice','mbfc','manual')), visible boolean default false, computed_at timestamptz default now());

create table if not exists v_runs (id bigint generated always as identity primary key, at timestamptz default now(), stats jsonb);
alter table v_runs add column if not exists debug jsonb; -- raw errors/failed feeds: NOT granted to anon (L9)
create index if not exists v_runs_at on v_runs (at desc);

create table if not exists v_sync (code_hash text primary key, prefs jsonb not null, updated_at timestamptz default now());

-- Public feed view: no emb, centroid or body; hides articles of emptied (merged-away) stories. Runs as owner, so anon needs no direct table access.
create or replace view v_feed as
  select a.id, a.source_id, a.url, a.title, a.lead, a.lang, a.published_at, a.fetched_at, a.story_id, a.voice,
         s.name as source_name, s.domain, s.country, s.region, s.owner, s.owner_type, s.flags
  from v_articles a join v_sources s on s.id = a.source_id
  left join v_stories st on st.id = a.story_id
  where coalesce(st.n_articles, 1) > 0 and a.published_at > now() - interval '14 days'; -- bounded: no unbounded scans via anon (M3)
comment on view v_feed is 'owner-rights by design (hides emb/centroid/body); 14-day window';

-- RLS on all v_ tables; anon gets SELECT policies on public tables only (none on v_bodies, v_sync).
do $$ declare t text; begin
  foreach t in array array['v_sources','v_articles','v_bodies','v_stories','v_summaries','v_outlet_lean','v_runs','v_sync'] loop
    execute format('alter table %I enable row level security', t); end loop;
  foreach t in array array['v_sources','v_articles','v_stories','v_summaries','v_outlet_lean','v_runs'] loop
    execute format('drop policy if exists anon_read on %I', t);
    execute format('create policy anon_read on %I for select to anon using (true)', t); end loop;
end $$;

-- Privileges: strip defaults on v_ objects ONLY, then grant read of non-sensitive columns (emb, centroid stay private).
do $$ declare t text; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r','v','S') and c.relname like 'v\_%' loop
    execute format('revoke all on %I from anon, authenticated', t); end loop;
end $$;
grant select on v_sources, v_summaries, v_outlet_lean, v_feed to anon;
grant select (id, at, stats) on v_runs to anon;
grant select (id, source_id, url, url_hash, title, lead, lang, published_at, fetched_at, story_id, emb_model, body_ok, voice, cb) on v_articles to anon;
grant select (id, title, lang, first_at, last_at, n_articles, n_outlets, score, is_top, twin_id) on v_stories to anon;

-- Device sync without login: client holds a random code; only its sha256 is stored. RPC-only access, last write wins.
create or replace function v_sync_get(code text) returns jsonb language sql security definer set search_path = public as $$
  select prefs from v_sync where code_hash = encode(sha256(convert_to(code, 'UTF8')), 'hex') $$;

create or replace function v_sync_put(code text, prefs jsonb) returns void language plpgsql security definer set search_path = public as $$
declare h text := encode(sha256(convert_to(code, 'UTF8')), 'hex'); last timestamptz;
begin
  if length(code) < 16 or length(code) > 128 then raise exception 'bad code'; end if;
  if pg_column_size(prefs) > 65536 then raise exception 'prefs too large'; end if;
  select updated_at into last from v_sync where code_hash = h;
  if found then
    if last > now() - interval '10 seconds' then raise exception 'rate limited'; end if; -- per-code write limit
  elsif pg_total_relation_size('v_sync') > 50 * 1024 * 1024 then raise exception 'sync full'; -- global cap: worst case is a V-only sync outage
  end if;
  insert into v_sync (code_hash, prefs, updated_at) values (h, prefs, now())
  on conflict (code_hash) do update set prefs = excluded.prefs, updated_at = now();
end $$;

-- Search without leaking the term into the URL/logs: length 2-64, window <= 14 d, LIMIT 50, LIKE wildcards escaped. Invoker rights (anon reads v_feed).
create or replace function v_search(q text, d int default 14) returns setof v_feed language sql stable set search_path = public as $$
  select * from v_feed where length(q) between 2 and 64 and published_at > now() - make_interval(days => least(greatest(d, 1), 14))
    and (title ilike '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%' or lead ilike '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%')
  order by published_at desc limit 50 $$;

revoke all on function v_sync_get(text), v_sync_put(text, jsonb), v_search(text, int) from public, authenticated;
grant execute on function v_sync_get(text), v_sync_put(text, jsonb), v_search(text, int) to anon;

-- Batch writers (service key only): ONE request instead of thousands of PATCHes. Only keys present in a row are changed.
-- rows = [{id, score, is_top}]
create or replace function v_rank_update(rows jsonb) returns int language plpgsql set search_path = public as $$
declare n int;
begin
  update v_stories s set score = case when e ? 'score' then (e->>'score')::real else s.score end,
                         is_top = case when e ? 'is_top' then (e->>'is_top')::boolean else s.is_top end
  from jsonb_array_elements(rows) e where s.id = (e->>'id')::bigint;
  get diagnostics n = row_count; return n;
end $$;

-- rows = [{id, story_id?, emb?, emb_model?, body_ok?}]
create or replace function v_articles_update(rows jsonb) returns int language plpgsql set search_path = public as $$
declare n int;
begin
  update v_articles a set
    story_id = case when e ? 'story_id' then (e->>'story_id')::bigint else a.story_id end,
    emb = case when jsonb_typeof(e->'emb') = 'array' then (select array_agg(x::real) from jsonb_array_elements_text(e->'emb') x) else a.emb end,
    emb_model = case when e ? 'emb_model' then e->>'emb_model' else a.emb_model end,
    body_ok = case when e ? 'body_ok' then (e->>'body_ok')::boolean else a.body_ok end
  from jsonb_array_elements(rows) e where a.id = (e->>'id')::bigint;
  get diagnostics n = row_count; return n;
end $$;

-- rows = [{id, title?, first_at?, last_at?, n_articles?, n_outlets?, centroid?, twin_id?, score?, is_top?}]
create or replace function v_stories_update(rows jsonb) returns int language plpgsql set search_path = public as $$
declare n int;
begin
  update v_stories s set
    title = case when e ? 'title' then e->>'title' else s.title end,
    first_at = case when e ? 'first_at' then (e->>'first_at')::timestamptz else s.first_at end,
    last_at = case when e ? 'last_at' then (e->>'last_at')::timestamptz else s.last_at end,
    n_articles = case when e ? 'n_articles' then (e->>'n_articles')::int else s.n_articles end,
    n_outlets = case when e ? 'n_outlets' then (e->>'n_outlets')::int else s.n_outlets end,
    score = case when e ? 'score' then (e->>'score')::real else s.score end,
    is_top = case when e ? 'is_top' then (e->>'is_top')::boolean else s.is_top end,
    twin_id = case when e ? 'twin_id' then (e->>'twin_id')::bigint else s.twin_id end,
    centroid = case when jsonb_typeof(e->'centroid') = 'array' then (select array_agg(x::real) from jsonb_array_elements_text(e->'centroid') x) else s.centroid end
  from jsonb_array_elements(rows) e where s.id = (e->>'id')::bigint;
  get diagnostics n = row_count; return n;
end $$;

-- Per-outlet clickbait share over the last d days: {source_id: {share (% of headlines with cb >= threshold), n}}, only outlets with >= min_n headlines.
create or replace function v_cb_stats(d int, threshold int, min_n int) returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_object_agg(source_id, jsonb_build_object('share', share, 'n', n)), '{}'::jsonb) from (
    select source_id, count(*) n, round(100.0 * count(*) filter (where cb >= threshold) / count(*), 1) share
    from v_articles where cb is not null and published_at >= now() - make_interval(days => d)
    group by source_id having count(*) >= min_n) q $$;

-- Retention (end of each ingest, service key): emb 3 d, bodies 14 d, stories > 90 d, runs > 7 d, v_sync > 180 d idle, unmatched GDELT headlines (no story) > gdelt_h hours.
-- Mirrors config.json (retention.*, gdelt.unmatched_retention_h).
create or replace function v_retention(gdelt_h int default 12) returns jsonb language plpgsql set search_path = public as $$
declare e int; b int; s int; g int; r int; y int;
begin
  update v_articles set emb = null where emb is not null and fetched_at < now() - interval '3 days'; get diagnostics e = row_count;
  delete from v_bodies where created_at < now() - interval '14 days'; get diagnostics b = row_count;
  delete from v_stories where last_at < now() - interval '90 days'; get diagnostics s = row_count;
  delete from v_articles a using v_sources so where so.id = a.source_id and so.via = 'gdelt' and a.story_id is null
    and a.fetched_at < now() - make_interval(hours => gdelt_h); get diagnostics g = row_count;
  delete from v_runs where at < now() - interval '7 days'; get diagnostics r = row_count;
  delete from v_sync where updated_at < now() - interval '180 days'; get diagnostics y = row_count;
  return jsonb_build_object('emb_nulled', e, 'bodies_deleted', b, 'stories_deleted', s, 'gdelt_unmatched_deleted', g, 'runs_deleted', r, 'sync_deleted', y, 'sync_rows', (select count(*) from v_sync), 'sync_mb', round(pg_total_relation_size('v_sync') / 1048576.0, 1),
                            'db_mb', round(pg_database_size(current_database()) / 1048576.0, 1));
end $$;

-- Writer RPCs: not callable by anon/authenticated; service_role (if the role exists) keeps execute.
revoke all on function v_rank_update(jsonb), v_articles_update(jsonb), v_stories_update(jsonb), v_cb_stats(int, int, int), v_retention(int) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function v_rank_update(jsonb), v_articles_update(jsonb), v_stories_update(jsonb), v_cb_stats(int, int, int), v_retention(int) to service_role;
  end if;
end $$;

-- V-only writer role (H1). The pipeline connects directly (pooler string, secret V_DB_URL) as v_writer: no service key anywhere.
-- Run ONCE by the coordinator with a generated password (never commit it); then re-run this file whenever v_ objects are added (grants below re-apply):
--   create role v_writer login password '<GENERATED-SECRET>' connection limit 5 nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
--   alter role v_writer set statement_timeout = '120s';
-- Connection string: postgresql://v_writer.<project-ref>:<GENERATED-SECRET>@<pooler-host>:6543/postgres
do $$ declare t text; begin
  if not exists (select 1 from pg_roles where rolname = 'v_writer') then raise notice 'role v_writer missing: create it (see comment above)'; return; end if;
  grant usage on schema public to v_writer;
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname like 'v\_%' and c.relkind in ('r','S') loop
    if (select relkind from pg_class where relname = t and relnamespace = 'public'::regnamespace) = 'S' then
      execute format('grant usage, select, update on sequence %I to v_writer', t);
    else
      execute format('grant select, insert, update, delete on %I to v_writer', t);
      execute format('drop policy if exists v_writer_all on %I', t);
      execute format('create policy v_writer_all on %I for all to v_writer using (true) with check (true)', t);
    end if;
  end loop;
  grant select on v_feed to v_writer;
  grant execute on function v_rank_update(jsonb), v_articles_update(jsonb), v_stories_update(jsonb), v_cb_stats(int, int, int), v_retention(int) to v_writer;
end $$;
