import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY; const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!key||!url) return NextResponse.json({error:"Server financial processing is not configured."},{status:503});
 const auth=req.headers.get("authorization")||""; if(!auth.startsWith("Bearer ")) return NextResponse.json({error:"Sign in required."},{status:401});
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:{user},error:userError}=await db.auth.getUser(auth.slice(7)); if(userError||!user) return NextResponse.json({error:"Invalid session."},{status:401});
 const body=await req.json().catch(()=>null) as {requestId?:string}|null; if(!body?.requestId) return NextResponse.json({error:"requestId is required."},{status:400});
 const {data:row}=await db.from("cashier_requests").select("id,user_id,request_type,amount,currency,status,transaction_reference").eq("id",body.requestId).eq("user_id",user.id).maybeSingle();
 if(!row) return NextResponse.json({error:"Cashier request not found."},{status:404});
 if(!["approved","under_review"].includes(row.status)) return NextResponse.json({error:"Cashier request is not eligible for financial processing."},{status:409});
 if(process.env.REAL_MONEY_ENABLED!=="true") return NextResponse.json({error:"Real-money processing is disabled on this environment."},{status:503});
 const operationType=row.request_type==="deposit"?"deposit":"withdrawal"; const idempotencyKey="cashier:"+row.id;
 const {data:operation,error}=await db.from("financial_operations").upsert({user_id:user.id,operation_type:operationType,source_type:"cashier_request",source_id:row.id,idempotency_key:idempotencyKey,amount:row.amount,currency:row.currency,status:"pending",provider_reference:row.transaction_reference,metadata:{created_from:"cashier_financial_operation_api"}},{onConflict:"user_id,idempotency_key"}).select("id,status").maybeSingle();
 if(error) return NextResponse.json({error:"Financial operation could not be recorded."},{status:500});
 return NextResponse.json({ok:true,operation},{status:202});
}