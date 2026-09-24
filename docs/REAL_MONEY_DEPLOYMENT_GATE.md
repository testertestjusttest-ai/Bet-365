# BETNOW365 real-money deployment gate

Real-money betting remains **fail-closed** until every production control below is independently verified. Applying database migrations or adding UI alone does not authorize real-money operation.

## Verified in this repository / Supabase

- The real-money readiness migration has been applied to the configured Supabase project.
- Wallet/bet tables have RLS protections and client-side write access is restricted.
- Wallet ledger append-only controls are present.
- Manual cashier request tables, finance-admin RBAC, and cashier audit/status controls are present.
- The quote API performs authentication/compliance checks and remains disabled unless `REAL_MONEY_ENABLED=true`.
- `REAL_MONEY_ENABLED=false` remains the repository default.

## Still required before enabling real money

1. Run and record the production result of `supabase/tests/real_money_security.sql` (including RLS, grants, ledger-trigger and replay/idempotency checks).
2. Verify authoritative KYC/age verification, jurisdiction eligibility, responsible-gambling exclusions, and stake/limit data are populated and enforced.
3. Configure server-only Supabase credentials and confirm no service/secret key reaches browser bundles.
4. Integrate a licensed payment provider for deposits/withdrawals with webhook signature verification, idempotency keys, replay protection, reconciliation, and chargeback/dispute handling.
5. Implement and independently review the atomic financial transaction boundary for wallet credits/debits, bets, settlement, and rollback behavior. Do not mutate balances from browser code.
6. Add payment-provider and cashier reconciliation jobs with immutable audit records and alerting for mismatches.
7. Add provider-specific Bet Builder correlation/pricing rules; simple multiplication is not sufficient for correlated selections.
8. Complete controlled non-production deposit, withdrawal, wager, settlement, refund, duplicate-webhook, timeout, and rollback tests.
9. Review transaction logs, ledger invariants, idempotency/replay behavior, access controls, and operational recovery procedures.
10. Confirm applicable licensing, age, AML/KYC, tax, payment, and jurisdiction requirements for every launch market.
11. Only after the above evidence is reviewed should an authorized operator set the server-side `REAL_MONEY_ENABLED=true` flag.

## Manual cashier

Manual deposit/withdrawal requests are supported as a **request/review workflow**, not as automatic money movement. Users can submit requests and finance admins can review/update them under RBAC and audit controls. A completed request must have the required reviewer metadata.

Actual balance movement must remain behind the verified payment/finance transaction boundary. A manual request must never by itself credit or debit a wallet.

## Security notes

Supabase recommends RLS plus least-privilege grants for exposed tables. SECURITY DEFINER functions should pin `search_path` and use explicit privileges. Service/secret keys must remain server-side.

This gate is intentionally conservative: a green UI, a successful build, or an applied migration is not evidence that real-money financial operations are safe to enable.
