import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmacPaymentAdapter } from "../../../../lib/payments/hmac";
export const runtime="nodejs";
export async function POST(request:Request){
 if(process.env.REAL_MONEY_ENABLED!=="true") return NextResponse.json({error:"Real-money payments are disabled on this environment."},{status:503});
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({error:"Payment server is not configured."},{status:503});
 const rawBody=await request.text(); const signature=request.headers.get("x-betnow365-signature");
 let adapter; try{adapter=createHmacPaymentAdapter();}catch{return NextResponse.json({error:"Payment provider is not configured."},{status:503});}
 let event; try{event=await adapter.normalizeWebhook({rawBody,headers:request.headers}); if(!(await adapter.verifyWebhook({rawBody,signature,headers:request.headers}))) return NextResponse.json({error:"Invalid webhook signature."},{status:401}); event.signatureVerified=true;}catch{return NextResponse.json({error:"Invalid webhook payload."},{status:400});}
 const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data,error}=await supabase.from("payment_webhook_events").insert({provider:event.provider,provider_event_id:event.providerEventId,event_type:event.eventType,signature_verified:true,idempotency_key:event.idempotencyKey,payload_hash:event.payloadHash,payload:event.payload,status:"verified"}).select("id").maybeSingle();
 if(error){if(error.code==="23505") return NextResponse.json({ok:true,duplicate:true},{status:200}); return NextResponse.json({error:"Webhook persistence failed."},{status:500});}
 return NextResponse.json({ok:true,accepted:true,webhook_id:data?.id??null},{status:202});
}