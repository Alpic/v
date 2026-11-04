-- V 2.0 translation layer + topic. Additive and idempotent; touches only v_ objects. Run by the coordinator, never by the pipeline.
alter table v_stories add column if not exists title_fi text;
alter table v_stories add column if not exists title_en text;
alter table v_stories add column if not exists translated_from text; -- source language code the titles were translated from (null = not translated)
alter table v_stories add column if not exists topic text;           -- politiikka|talous|urheilu|teknologia|tiede|terveys|kulttuuri|ympäristö|rikos|viihde|muu

-- additions to the anon read grant only (existing column grants stay)
grant select (title_fi, title_en, translated_from, topic) on v_stories to anon;

-- rows = [{id, title?, first_at?, last_at?, n_articles?, n_outlets?, centroid?, twin_id?, score?, is_top?, title_fi?, title_en?, translated_from?, topic?}]
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
    title_fi = case when e ? 'title_fi' then e->>'title_fi' else s.title_fi end,
    title_en = case when e ? 'title_en' then e->>'title_en' else s.title_en end,
    translated_from = case when e ? 'translated_from' then e->>'translated_from' else s.translated_from end,
    topic = case when e ? 'topic' then e->>'topic' else s.topic end,
    centroid = case when jsonb_typeof(e->'centroid') = 'array' then (select array_agg(x::real) from jsonb_array_elements_text(e->'centroid') x) else s.centroid end
  from jsonb_array_elements(rows) e where s.id = (e->>'id')::bigint;
  get diagnostics n = row_count; return n;
end $$;

-- same privileges as schema.sql (create or replace keeps them; restated so this file is self-contained)
revoke all on function v_stories_update(jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function v_stories_update(jsonb) to service_role;
  end if;
  if exists (select 1 from pg_roles where rolname = 'v_writer') then
    grant execute on function v_stories_update(jsonb) to v_writer;
  end if;
end $$;
