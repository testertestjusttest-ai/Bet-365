# BETNOW365 Sports Feed Engine

The first provider adapter is **The Odds API v4**. Its v4 API exposes sports, event odds and live scores; the odds endpoint can return upcoming/live events and the scores endpoint returns live/recent scores.

## Server environment

Set these only on the server/Vercel project:

- `SPORTS_FEED_API_KEY`
- `SPORTS_FEED_REGION` (default `eu`)
- `SPORTS_FEED_MARKETS` (default `h2h,spreads,totals`)
- `SPORTS_FEED_SPORTS` (comma-separated provider sport keys)
- `SPORTS_FEED_BOOKMAKER` (optional preferred bookmaker)
- `SUPABASE_SERVICE_ROLE_KEY`
- `FEED_SYNC_SECRET` (optional; if set, requests must include `x-feed-sync-secret`)

The public Supabase anon key is never used by the sync worker.

## Sync flow

Provider API -> /api/feed/sync -> events -> markets -> selections -> odds_snapshots -> Supabase Realtime -> web UI

Vercel Cron invokes the endpoint every minute. If no feed key is configured, the endpoint returns a configuration error and the development fixtures remain available.

Before real-money betting, add provider licensing/terms review, KYC/age and jurisdiction checks, betting limits, server-side quote validation, an immutable wallet ledger, settlement, audit logs and responsible-gambling controls.

## Quote validation

`POST /api/bets/quote` validates that selections are still open and markets are active, then returns a short-lived odds snapshot. It supports Singles, Multiples and a first-pass same-event Bet Builder rule (one selection per market). This is a pricing/validation layer only; it does not debit a wallet or place a real-money bet.


### Sport discovery
`GET /api/feed/sports` exposes the provider's current active sport catalogue. The sync worker also accepts `SPORTS_FEED_SPORTS=auto` to discover active sports automatically; because odds requests consume provider quota per market/region, production deployments should normally use an explicit allowlist.
