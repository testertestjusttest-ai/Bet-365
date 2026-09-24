import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime="nodejs";
export async function POST(request:Request){
 if(process.env.REAL_MONEY_ENABLED!=="true") return NextResponse.json({error:"Real-money payments are disabled on this environment."},{status:503});
 const secret=process.env.PAYMENT_RECONCILIATION_SECRET; const supplied=request.headers.get("x-reconciliation-secret");
 if(!secret || !supplied || supplied!==secret) return NextResponse.json({error:"Unauthorized."},{status:401});
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({error:"Server not configured."},{status:503});
 const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:ops,error}=await supabase.from("financial_operations").select("id,provider,provider_reference,amount,currency,status").not("provider_reference","is",null).in("status",["succeeded","processing","authorized"]).limit(500);
 if(error) return NextResponse.json({error:"Unable to load operations."},{status:500});
 let matched=0,mismatched=0,unmatched=0;
 for(const op of ops??[]){
  const {data:existing}=await supabase.from("reconciliation_items").select("id,status,observed_amount,currency").eq("provider",op.provider).eq("provider_reference",op.provider_reference).maybeSingle();
  if(!existing){await supabase.from("reconciliation_items").insert({provider:op.provider,provider_reference:op.provider_reference,operation_id:op.id,expected_amount:op.amount,currency:op.currency,status:"unmatched",metadata:{reason:"Provider settlement record required."}}); unmatched++; continue;}
  if(existing.status==="matched" || existing.status==="resolved"){matched++;continue;}
  if(existing.observed_amount!=null && Number(existing.observed_amount)!==Number(op.amount)){await supabase.from("reconciliation_items").update({status:"amount_mismatch"}).eq("id",existing.id);mismatched++;}
 }
 return NextResponse.json({ok:true,scanned:ops?.length??0,matched,mismatched,unmatched});
}