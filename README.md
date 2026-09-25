# BETNOW365

Next.js sportsbook UI foundation with Supabase-ready data model.

## Architecture
- Next.js + TypeScript
- Supabase Auth/Postgres
- GitHub main branch
- Vercel Git integration

## Data model
profiles, wallets, events, markets, selections, bets, bet_selections.

## Production checklist
- Configure Supabase environment variables in Vercel.
- Apply supabase/schema.sql through Supabase migrations.
- Add age/KYC, jurisdiction controls, responsible-gambling controls, audit logging and secure payment integrations before enabling real-money operations.
- Keep service-role keys server-side only.

## Deployment
- Build fixes are committed on main; Vercel should deploy the latest main commit automatically.
- Deployment source of truth: the current main branch.
