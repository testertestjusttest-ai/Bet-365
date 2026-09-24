# BETNOW365 real-money deployment gate

Real-money debit/settlement is deliberately fail-closed until the production database migration is applied and independently reviewed.

## Required before enabling

1. Apply supabase/migrations/20260925_real_money_readiness.sql.
2. Run supabase/tests/real_money_security.sql.
3. Confirm RLS and client grants on all wallet/bet tables.
4. Confirm KYC, jurisdiction, responsible-gambling blocks, and stake limits are populated from an authoritative compliance workflow.
5. Configure a server-only Supabase secret/service credential. Never expose it to the browser.
6. Configure an external payment provider with webhook signature verification, idempotency, reconciliation, and chargeback handling.
7. Add provider-specific Bet Builder correlation/pricing rules.
8. Perform a controlled test in a non-production environment.
9. Review transaction logs, ledger invariants, replay/idempotency behavior, and settlement reconciliation.
10. Only then set the server-side real-money feature flag.

## Current state

The quote API is authentication/compliance-aware in code, but the current production database does not yet contain the readiness columns. Therefore real-money quoting/placement must remain disabled until the migration is applied.

Supabase recommends RLS plus least-privilege grants for exposed tables, and warns that SECURITY DEFINER functions require a pinned search_path and explicit function privileges. Service/secret keys must remain server-side.
