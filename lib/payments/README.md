# Payment provider boundary

The application uses an adapter boundary so provider-specific signing, event parsing,
idempotency and reconciliation logic do not leak into wallet code.

Required production flow:

1. Read the raw webhook body exactly once.
2. Verify the provider signature using a server-only secret/key.
3. Derive a stable provider event ID and payload hash.
4. Insert the event into `payment_webhook_events` with a unique provider/event ID.
5. Treat an existing event as a replay; never process it twice.
6. Create/update a `financial_operations` row using a stable idempotency key.
7. Reconcile the provider reference and amount against the internal operation.
8. Only an independently reviewed server-side transaction boundary may write a wallet
   ledger entry and balance. Browser requests and cashier requests must never do so.

No provider is enabled by these interfaces. They are scaffolding for a separately
reviewed integration.
