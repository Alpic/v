-- V crowd signals (docs/meetings/04_crowd/method.md section 6). SHARED project: only v_ objects. Idempotent. Writes only via the service key.
-- Raw tables (v_actors, v_shares, v_mentions, v_communities, v_crowd_cursors) have RLS on and NO anon policy/grant: anon cannot read them.
create table if not exists v_communities (id text primary key, adapter text not null, name text, kind text, party text, lean_doc_url text, checked_on date);
create table if not exists v_actors (id text primary key, adapter text not null, ext_id_hash text not null, anchor_party text, p real,
  community_id text references v_communities(id), first_seen timestamptz default now(), flags text[] default '{}');
create table if not exists v_shares (id text primary key, actor_id text not null references v_actors(id), source_id text not null references v_sources(id),
  url_hash text not null, shared_at timestamptz not null, p real);  -- p = anchor position at share time; id = hash(actor|url_hash)
create index if not exists v_shares_src on v_shares (source_id, shared_at desc);
create table if not exists v_mentions (id text primary key, actor_id text references v_actors(id), community_id text references v_communities(id),
  source_id text not null references v_sources(id), posted_at timestamptz not null, quote text check (length(quote) <= 500), post_url text, text_hash text,
  stance text, lean_claim text, quality_claim text, models text[], flags text[] default '{}');
create index if not exists v_mentions_src on v_mentions (source_id, posted_at desc);
create table if not exists v_crowd_cursors (id text primary key, cursor text, updated_at timestamptz default now());
create table if not exists v_outlet_audience (id text primary key, source_id text not null references v_sources(id), window_end date not null, method_version int not null,
  n_placed int, n_anchor int, a real, ci_lo real, ci_hi real, sd real, placed_share real, conf text, flags text[] default '{}', visible boolean not null default false,
  unique (source_id, window_end, method_version));
create table if not exists v_outlet_talk (id text primary key, source_id text not null references v_sources(id), window_end date not null, method_version int not null,
  n_authors int, n_comm int, dist jsonb, spike_days text[], flags text[] default '{}', visible boolean not null default false,
  unique (source_id, window_end, method_version));
create table if not exists v_validation (id text primary key, gate text not null, run_at timestamptz default now(), value real, passed boolean, notes text);

do $$ declare t text; begin
  foreach t in array array['v_communities','v_actors','v_shares','v_mentions','v_crowd_cursors','v_outlet_audience','v_outlet_talk','v_validation'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t); end loop;
  foreach t in array array['v_outlet_audience','v_outlet_talk'] loop
    execute format('drop policy if exists anon_read on %I', t);
    execute format('create policy anon_read on %I for select to anon using (visible)', t);   -- only published (gate-passed) rows
    execute format('grant select on %I to anon', t); end loop;
  drop policy if exists anon_read on v_validation;
  create policy anon_read on v_validation for select to anon using (true);
  grant select on v_validation to anon;
end $$;
