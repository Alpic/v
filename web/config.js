// Public config (anon key is read-only by RLS). Project kuljento (shared; V objects are v_-prefixed). The anon key is public by design.
window.V_CONFIG = { SUPABASE_URL: 'https://fkyuymjhbdjzlppajncx.supabase.co', ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXV5bWpoYmRqemxwcGFqbmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNzE5NzMsImV4cCI6MjEwMTg0Nzk3M30.q95eGUAOW35AM9A9X_ErWUZkLU1HdTCint22Nas7uCg' };
// ?fixture=1 runs fully offline from fixtures/feed.json (sample data, banner shown). Set true to force it.
window.V_FIXTURE = new URLSearchParams(location.search).has('fixture');
