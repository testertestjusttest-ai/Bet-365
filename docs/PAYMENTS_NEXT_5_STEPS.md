# Payment next five implementation steps

1. Webhook inbox: raw-body signature verification and locked-down persistence.
2. Replay protection: unique provider event IDs return a safe duplicate response.
3. Financial operation handoff: cashier requests can create an idempotent pending operation; no wallet mutation occurs.
4. Reconciliation: server-only processing records unmatched or amount-mismatch items and never silently changes balances.
5. Production gate: all payment/reconciliation routes remain fail-closed until the real-money flag is deliberately enabled after provider integration, security review, reconciliation controls, and legal/compliance checks.

The generic HMAC adapter is a development boundary only. Production must use the licensed provider's official signing and event format.
Required environment variables: PAYMENT_PROVIDER, PAYMENT_WEBHOOK_SECRET, PAYMENT_RECONCILIATION_SECRET, SUPABASE_SERVICE_ROLE_KEY.
