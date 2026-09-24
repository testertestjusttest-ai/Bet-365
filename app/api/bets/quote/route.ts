import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type RequestBody={selectionIds:number[];betType:"single"|"multiple"|"builder";stake?:number};

function fail(message:string,status=400){return NextResponse.json({ok:false,error:message},{status});}

export async function POST(req:NextRequest){
  try{
    const body=(await req.json()) as RequestBody;
    const ids=[...new Set((body.selectionIds||[]).map(Number).filter(Number.isInteger))];
    if(ids.length<1||ids.length>12)return fail("Select between 1 and 12 selections.");
    if(!["single","multiple","builder"].includes(body.betType))return fail("Unsupported bet type.");
    if(body.stake!=null&&(!Number.isFinite(body.stake)||body.stake<=0))return fail("Invalid stake.");

    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)return fail("Server betting credentials are not configured.",500);
    const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
    let userId:string|null=null;
    const auth=req.headers.get("authorization")||"";
    if(auth.startsWith("Bearer ")){const authResult=await db.auth.getUser(auth.slice(7));if(!authResult.error)userId=authResult.data.user?.id||null;}

    const {data:selections,error}=await db.from("selections").select("id,odds,status,market_id").in("id",ids);
    if(error)throw error;
    if(!selections||selections.length!==ids.length)return fail("One or more selections are no longer available.",409);
    if(selections.some(s=>s.status!=="open"))return fail("One or more selections are suspended.",409);

    const marketIds=[...new Set(selections.map(s=>s.market_id))];
    const {data:markets,error:marketError}=await db.from("markets").select("id,event_id,market_type,active").in("id",marketIds);
    if(marketError)throw marketError;
    if(!markets||markets.length!==marketIds.length)return fail("One or more markets are unavailable.",409);
    if(markets.some(m=>m.active===false))return fail("One or more markets are suspended.",409);

    const eventIds=[...new Set(markets.map(m=>m.event_id))];
    if(body.betType==="builder"&&eventIds.length!==1)return fail("Bet Builder selections must belong to one event.");
    if(body.betType==="builder"){
      const usedMarkets=selections.map(s=>s.market_id);
      if(new Set(usedMarkets).size!==usedMarkets.length)return fail("Bet Builder cannot contain two selections from the same market.");
    }

    const odds=selections.map(s=>Number(s.odds));
    const combinedOdds=odds.reduce((a,b)=>a*b,1);
    const stake=body.stake==null?null:Number(body.stake);
    const expiresAt=new Date(Date.now()+15000).toISOString();
    const potentialReturn=stake==null?null:Number((stake*combinedOdds).toFixed(2));
    const saved=await db.from("bet_quotes").insert({user_id:userId,bet_type:body.betType,selection_ids:ids,odds,combined_odds:Number(combinedOdds.toFixed(6)),stake,potential_return:potentialReturn,expires_at:expiresAt}).select("id,expires_at").single();
    if(saved.error)throw saved.error;
    return NextResponse.json({
      ok:true,
      quote:{
        betType:body.betType,
        selectionIds:ids,
        odds,
        combinedOdds:Number(combinedOdds.toFixed(4)),
        stake,
        potentialReturn,
        quotedAt:new Date().toISOString(),
        expiresAt,
        quoteId:saved.data.id
      },
      pricing_engine:"independent_product_v1",
      note:"Production Bet Builder pricing must add provider-specific correlation rules before real-money placement."
    });
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Quote failed"},{status:500});
  }
}
