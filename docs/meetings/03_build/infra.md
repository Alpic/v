# Meeting 3 infra check (project V, v.kuljento.fi)

Read-only check, 2026-11-02 (UTC 15:48). Nothing created, changed or deleted.
Connections used: Composio github (Alpic), supabase, netlify_mcp, cloudflare_api_key.

## 1. GitHub (toolkit `github`, connection ACTIVE, account login `Alpic`)
- Authenticated user is the **Alpic personal user account** (type `User`, free plan, 4 private repos). Not an org.
- Orgs for this user: none (`GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER` returns []).
- So "org Alpic" is a user account: use the personal-repo tool, not the org one.
- Repo `Alpic/v`: **does not exist** (GITHUB_GET_A_REPOSITORY -> 404).
- Create repo (public):
  - `GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER` (applies to Alpic)
  - `GITHUB_CREATE_AN_ORGANIZATION_REPOSITORY` (only if Alpic were an org; it is not)
- Actions secrets:
  - `GITHUB_GET_A_REPOSITORY_PUBLIC_KEY` (needed first, to encrypt the value)
  - `GITHUB_CREATE_OR_UPDATE_A_REPOSITORY_SECRET`
  - also `GITHUB_LIST_REPOSITORY_SECRETS`, `GITHUB_DELETE_A_REPOSITORY_SECRET`
- Releases and assets:
  - `GITHUB_CREATE_A_RELEASE`
  - `GITHUB_UPLOAD_RELEASE_ASSET`
  - also `GITHUB_GENERATE_RELEASE_NOTES`, `GITHUB_LIST_RELEASES`
- Commits: `GITHUB_COMMIT_MULTIPLE_FILES`, `GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS`
- Membership tool: none found in search; not needed (no org).

## 2. Supabase (toolkit `supabase`, connection ACTIVE)
- Organizations: 1 — "korpineboss-2151's projects" (slug `vercel_icfg_...`, i.e. created via Vercel integration).
- Projects (4 total):

| name | region | status | ref |
|---|---|---|---|
| nemocore | eu-central-2 | INACTIVE (paused) | zbsothipcnosakkoogkm |
| mori-core | eu-central-1 | INACTIVE (paused) | jnihfbtqszmxmgojavqt |
| tyoajat | eu-north-1 | ACTIVE_HEALTHY | alyyggnrnlgalpjtejbm |
| kuljento | eu-north-1 | ACTIVE_HEALTHY | fkyuymjhbdjzlppajncx |

- No project named `v` exists.
- Free-tier limit: the API did not return the org plan, so this is unverified. Supabase's free plan normally allows 2 active projects per org (paused ones do not count). Two are already ACTIVE, so a new free project would likely be refused. Check the plan in the dashboard before creating.
- Tool slugs:
  - create project: `SUPABASE_CREATE_A_PROJECT`
  - run SQL: `SUPABASE_BETA_RUN_SQL_QUERY` (writes), `SUPABASE_RUN_READ_ONLY_QUERY` (reads)
  - migrations: `SUPABASE_APPLY_A_MIGRATION`
  - API keys: `SUPABASE_GET_PROJECT_API_KEYS` (param `ref`)
  - also `SUPABASE_LIST_ALL_PROJECTS`, `SUPABASE_GET_PROJECT`, `SUPABASE_LIST_ALL_ORGANIZATIONS`
- API keys retrievable: **yes** (tested on `tyoajat`, value not printed). Four keys come back: legacy anon, legacy service_role, a publishable key and a secret key (new format).

## 3. Netlify (toolkit `netlify_mcp`, connection ACTIVE, account `netlify_mcp_bedrid-port`)
- Sites (Netlify calls them projects): 1 — `calm-cucurucho-75b9a6` (plan `nf_team_dev`), primary URL `calm-cucurucho-75b9a6.netlify.app`.
- Every project requires SSO team login (`requiresSSOTeamLogin: all`). Visitors would be blocked, so check this before using it for public output.
- Custom domains: none shown in this read. No site named `v` exists.
- Tool slugs (all via `NETLIFY_MCP_NETLIFY_*`):
  - create site: `..._PROJECT_SERVICES_UPDATER`, operation `create-new-project` (params `name`, `teamSlug`)
  - deploy files: `..._DEPLOY_SERVICES_UPDATER`, operation `deploy-site` (param `siteId`). With no siteId, it creates a new site, so confirm with the founder first.
  - custom domain: **no operation in the listed schemas**. Set it in the dashboard or check with the vendor.
  - list sites: `..._PROJECT_SERVICES_READER` (`get-projects`, `get-project`)
  - env vars: `..._PROJECT_SERVICES_UPDATER` (`manage-env-vars`)
- Token: no secret to fetch by hand. Composio's connection handles auth for each call, so the playbook's "fresh token" step is covered by the connection.

## 4. Cloudflare (toolkit `cloudflare_api_key`, connection ACTIVE)
- **Blocked.** `CLOUDFLARE_API_KEY_LIST_ZONES` failed with code 9109 "Invalid access token", so zone `kuljento.fi` and its DNS records could not be listed. Whether `v` exists is **unknown**.
- Fix: refresh the Cloudflare API token in the Composio connection, then re-check.
- Toolkit `cloudflare` (OAuth) has **no connection**; not added (would need a new auth link).
- Tool slugs:
  - zones: `CLOUDFLARE_API_KEY_LIST_ZONES`
  - DNS list: `CLOUDFLARE_API_KEY_LIST_DNS_RECORDS` (needs `zone_id`)
  - DNS create: `CLOUDFLARE_API_KEY_CREATE_DNS_RECORD`
  - DNS update: `CLOUDFLARE_API_KEY_OVERWRITE_DNS_RECORD` (overwrite resets missing fields, incl. TTL)
  - DNS delete: `CLOUDFLARE_API_KEY_DELETE_DNS_RECORD`

## 5. Environment (names only, from `env`)
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CCR_AUTO_MODE_USER_ENV_KEYS_FACT, CLAUDE_CODE_MESSAGING_TOKEN, CLAUDE_SESSION_INGRESS_TOKEN_FILE, CLOUDSDK_AUTH_ACCESS_TOKEN, GEMINI_API_KEY, GH_TOKEN, GITHUB_TOKEN, GOOGLE_SA_KEY, HANSLARI_SIGNING_PASS, OPENROUTER_API_KEY, OVERSEER_PASS, TYOAJAT_RELEASE_KEY
(Non-secret matches: BUN_TLS_EXTRA_DISTRUSTED_KEYS, GIT_ASKPASS, GIT_CONFIG_KEY_ x3, MAX_THINKING_TOKENS.)
- Not in env: Supabase, Netlify, Cloudflare tokens (they go through Composio connections).

## Open items
1. Cloudflare token invalid: refresh it, then list zone `kuljento.fi` and check for `v`.
2. Supabase plan: confirm the free-project limit before creating a project.
3. Netlify: confirm the SSO-only setting is wanted for v.kuljento.fi, and find where to set a custom domain.
4. Repo: create `Alpic/v` with the personal-repo tool once the founder confirms.

ask.sh calls: 0
