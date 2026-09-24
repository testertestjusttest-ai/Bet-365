export type PaymentWebhook = {
  provider: string;
  providerEventId: string;
  eventType: string;
  signatureVerified: boolean;
  idempotencyKey?: string | null;
  payloadHash: string;
  payload: Record<string, unknown>;
};

export type PaymentProviderAdapter = {
  verifyWebhook(input: { rawBody: string; signature: string | null; headers: Headers }): Promise<boolean>;
  normalizeWebhook(input: { rawBody: string; headers: Headers }): Promise<PaymentWebhook>;
};
