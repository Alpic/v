-- V 2.0 "Kuumat / Luetuimmat": usage events + hotness columns. Additive and idempotent; touches only v_ objects. Run by the coordinator, never by the pipeline.
-- Anon gets exactly: insert-only through v_event() (validated, rate limited), and SELECT on the 4 new v_stories columns listed below. No anon select on v_events.
-- Events are anonymous: a random client id (client-generated, no personal data) + story ids. The web sends them ONLY when consent.stats is true.

alter table v_stories add column if not exists hot real default 0;        -- 0..100 explainable score (pipeline/hot.mjs, weights in pipeline/hot_weights.json)
alter table v_stories add column if not exists reads int default 0;       -- distinct readers in the usage window
alter table v_stories add column if not exists talk int default 0;        -- public discussion volume (Reddit/HN/Mastodon posts + comments)
alter table v_stories add column if not exists hot_why jsonb;             -- [["src",18],["talk",240],["reads",5]] top contributors, rendered by the web via i18n
alter table v_stories add column if not exists hot_at timestamptz;
create index if not exists v_stories_hot on v_stories (hot desc) where hot > 0;

create table if not exists v_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  cid text not null,            -- random anonymous client id, [a-z0-9]{16,40}
  k text not null check (k in ('open', 'click', 'dwell', 'path', 'fb')),
  s bigint,                     -- story (path: the story read before)
  s2 bigint,                    -- path only: the story read next
  src text,                     -- click only: outlet (v_sources.id)
  ms int,                       -- dwell only: visible time on the story page, <= 30 min
  v smallint);                  -- fb only: 1 = important, -1 = not
create index if not exists v_events_at on v_events (at desc);
create index if not exists v_events_cid on v_events (cid, at desc);
alter table v_events enable row level security;       -- no anon policy: anon cannot select, insert, update or delete directly
revoke all on v_events from anon, authenticated;

-- Anon grant: explicit columns, never *.
grant select (hot, reads, talk, hot_why) on v_stories to anon;

-- Insert-only intake. evs = [{k, s, s2?, src?, ms?, v?}] (1..20). Invalid events are dropped silently, the rest are stored; returns the number stored.
-- Limits: 60 events per client per minute, 2000 events per minute overall, table <= 60 MB (worst case = V-only intake outage).
create or replace function v_event(cid text, evs jsonb) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if cid is null or cid !~ '^[a-z0-9]{16,40}$' then raise exception 'bad id'; end if;
  if evs is null or jsonb_typeof(evs) <> 'array' or jsonb_array_length(evs) not between 1 and 20 then raise exception 'bad batch'; end if;
  if (select count(*) from v_events e where e.cid = v_event.cid and e.at > now() - interval '1 minute') >= 60 then raise exception 'rate limited'; end if;
  if (select count(*) from v_events e where e.at > now() - interval '1 minute') >= 2000 then raise exception 'busy'; end if;
  if pg_total_relation_size('v_events') > 60 * 1024 * 1024 then raise exception 'events full'; end if;
  with i as (
    select x->>'k' k,
      case when x->>'s' ~ '^[0-9]{1,15}$' then (x->>'s')::bigint end s,
      case when x->>'s2' ~ '^[0-9]{1,15}$' then (x->>'s2')::bigint end s2,
      case when x->>'src' ~ '^[a-z0-9_.-]{1,40}$' then x->>'src' end src,
      case when x->>'ms' ~ '^[0-9]{1,9}$' then least((x->>'ms')::bigint, 1800000)::int end ms,
      case x->>'v' when '1' then 1 when '-1' then -1 end v
    from jsonb_array_elements(evs) x)
  insert into v_events (cid, k, s, s2, src, ms, v)
  select v_event.cid, i.k, i.s, i.s2, i.src, i.ms, i.v from i
  where i.k in ('open', 'click', 'dwell', 'path', 'fb') and i.s is not null
    and exists (select 1 from v_stories st where st.id = i.s)
    and (i.k <> 'path' or (i.s2 is not null and i.s2 <> i.s and exists (select 1 from v_stories st where st.id = i.s2)))
    and (i.k <> 'click' or (i.src is not null and exists (select 1 from v_sources so where so.id = i.src)))
    and (i.k <> 'dwell' or i.ms is not null)
    and (i.k <> 'fb' or i.v is not null);
  get diagnostics n = row_count; return n;
end $$;

-- Writer RPCs (pipeline, role v_writer / service_role). rows = [{id, hot?, reads?, talk?, hot_why?}]
create or replace function v_hot_update(rows jsonb) returns int language plpgsql set search_path = public as $$
declare n int;
begin
  update v_stories s set
    hot = case when e ? 'hot' then (e->>'hot')::real else s.hot end,
    reads = case when e ? 'reads' then (e->>'reads')::int else s.reads end,
    talk = case when e ? 'talk' then (e->>'talk')::int else s.talk end,
    hot_why = case when e ? 'hot_why' then e->'hot_why' else s.hot_why end,
    hot_at = now()
  from jsonb_array_elements(rows) e where s.id = (e->>'id')::bigint;
  get diagnostics n = row_count; return n;
end $$;

create or replace function v_events_prune(days int default 30) returns int language plpgsql set search_path = public as $$
declare n int;
begin
  delete from v_events where at < now() - make_interval(days => least(greatest(days, 1), 365)); get diagnostics n = row_count; return n;
end $$;

revoke all on function v_event(text, jsonb) from public, authenticated;
grant execute on function v_event(text, jsonb) to anon;
revoke all on function v_hot_update(jsonb), v_events_prune(int) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function v_hot_update(jsonb), v_events_prune(int) to service_role;
  end if;
  if exists (select 1 from pg_roles where rolname = 'v_writer') then
    grant execute on function v_hot_update(jsonb), v_events_prune(int) to v_writer;
    grant select, insert, update, delete on v_events to v_writer;
    drop policy if exists v_writer_all on v_events;
    create policy v_writer_all on v_events for all to v_writer using (true) with check (true);
    grant select (hot, reads, talk, hot_why, hot_at) on v_stories to v_writer; -- v_writer already has table-wide rights via schema.sql; restated for self-containment
  end if;
end $$;
