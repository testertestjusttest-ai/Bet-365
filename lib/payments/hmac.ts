import crypto from "crypto";
import type { PaymentProviderAdapter, PaymentWebhook } from "./types";
function digest(secret: string, rawBody: string) { return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"); }
function safeEqual(a: string, b: string) { const aa=Buffer.from(a,"utf8"), bb=Buffer.from(b,"utf8"); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); }
export function createHmacPaymentAdapter(): PaymentProviderAdapter {
  const provider=process.env.PAYMENT_PROVIDER; const secret=process.env.PAYMENT_WEBHOOK_SECRET;
  if (!provider || !secret) throw new Error("PAYMENT_PROVIDER/PAYMENT_WEBHOOK_SECRET not configured");
  return {
    async verifyWebhook({rawBody,signature}) { return Boolean(signature && safeEqual(digest(secret,rawBody),signature.trim())); },
    async normalizeWebhook({rawBody,headers}) {
      const payload=JSON.parse(rawBody) as Record<string,unknown>;
      const providerEventId=String(payload.id ?? payload.event_id ?? "").trim();
      const eventType=String(payload.type ?? payload.event_type ?? "").trim();
      const idempotencyKey=headers.get("x-idempotency-key") ?? (payload.idempotency_key ? String(payload.idempotency_key) : null);
      const payloadHash=crypto.createHash("sha256").update(rawBody,"utf8").digest("hex");
      if(!providerEventId || !eventType) throw new Error("Webhook missing stable event id or event type");
      const result: PaymentWebhook={provider,providerEventId,eventType,signatureVerified:false,idempotencyKey,payloadHash,payload};
      return result;
    }
  };
}