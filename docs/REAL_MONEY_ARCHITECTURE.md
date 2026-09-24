# BETNOW365 Real-Money Architecture

## Status

The application is being prepared for real-money operation, but the actual wallet-debit / settlement mutation is intentionally not enabled yet.

The current architecture separates:

1. **Authentication** — Supabase Auth user identity.
2. **Compliance gate** — KYC status, jurisdiction eligibility, responsible-gambling block and betting limits.
3. **Quote** — short-lived odds/stake quote with selection IDs and odds versions.
4. **Bet acceptance** — must be a single atomic server/database transaction.
5. **Wallet** — authoritative balance owned by the backend/database, never writable by the browser.
6. **Ledger** — append-only financial audit trail.
7. **Settlement** — authoritative event result processing with idempotency.
8. **Audit** — immutable operational/compliance trail.

## Required atomic bet transaction

When real-money acceptance is enabled, the server-side transaction must:

- require an authenticated user;
- lock the user's wallet row;
- lock/validate the quote;
- reject expired or already-consumed quotes;
- re-read current selection status and odds versions;
- reject suspended/closed markets;
- enforce KYC and jurisdiction eligibility;
- enforce responsible-gambling blocks;
- enforce daily/weekly/monthly betting limits;
- enforce minimum/maximum stake;
- enforce currency consistency;
- enforce an idempotency key;
- verify available balance;
- insert the bet and bet selections;
- debit the wallet;
- append exactly one corresponding ledger entry;
- mark the quote accepted;
- write an audit event;
- commit all changes together.

If any check fails, no financial mutation should commit.

## Settlement requirements

Settlement must also be atomic and idempotent. It should:

- accept only authoritative event outcomes;
- lock the bet before settlement;
- reject already-settled bets;
- calculate the settlement amount from stored accepted odds and the settlement rules;
- credit the wallet and append the matching ledger entry in the same transaction;
- record settlement result/time and an audit event;
- support void, push, half-win/half-loss and dead-heat rules where applicable;
- preserve the original bet/ledger history rather than editing financial history.

## Cash-out

Cash-out should be implemented as a separate server-side quote and acceptance flow. Availability and price must be revalidated at acceptance time. A UI quote is not a financial authorization.

## Security

Supabase RLS should protect user-owned data. Any SECURITY DEFINER function must use a pinned empty search_path and schema-qualified objects. Sensitive service-role/secret keys must remain server-side.

## Current blocker

The repository can contain the transaction design and migrations, but the ChatGPT execution environment will not activate a real-money wallet debit/settlement mutation. Therefore the site must not be presented as financially live until the transaction function is independently reviewed, migrated, tested, and enabled in the production Supabase project.

## Production launch checklist

- KYC provider integrated and verified
- jurisdiction service/rules configured
- limits and self-exclusion rules configured
- payment processor integrated
- wallet transaction function independently reviewed
- settlement worker independently reviewed
- ledger reconciliation jobs enabled
- fraud/AML monitoring integrated as required
- audit retention configured
- database backups/PITR configured
- RLS and grants tested
- staging end-to-end tests completed
- production secrets configured
- live sports/odds feed licensed and monitored
