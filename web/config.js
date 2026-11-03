// Public config (anon key is read-only by RLS). Fill in after Supabase project creation (blueprint §8).
window.V_CONFIG = { SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co', ANON_KEY: 'YOUR-ANON-KEY' };
// ?fixture=1 runs fully offline from fixtures/feed.json (sample data, banner shown). Set true to force it.
window.V_FIXTURE = new URLSearchParams(location.search).has('fixture');
