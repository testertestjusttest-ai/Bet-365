import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {fetchEventMarkets,fetchEventOdds,mapMarketName} from "../../../../../lib/feed/the-odds-api";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest,{params}:{params:{id:string}}){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) return NextResponse.json({ok:false,error:"Server sports feed is not configured."},{status:503});
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:event,error}=await db.from("events").select("id,sport,provider,provider_event_id,provider_sport_key").eq("id",Number(params.id)).single();
 if(error||!event) return NextResponse.json({ok:false,error:"Event not found."},{status:404});
 if(event.provider!=="the_odds_api"||!event.provider_event_id||!event.provider_sport_key) return NextResponse.json({ok:true,source:"database",markets:[]});
 try{
  const discovered=await fetchEventMarkets(event.provider_sport_key,event.provider_event_id);
  const bookmaker=process.env.SPORTS_FEED_BOOKMAKER ? discovered.bookmakers.find((b:any)=>b.key===process.env.SPORTS_FEED_BOOKMAKER)||discovered.bookmakers[0] : discovered.bookmakers[0];
  const keys=[...new Set((bookmaker?.markets||[]).map((m:any)=>m.key).filter(Boolean))];
  const configured=(process.env.SPORTS_FEED_DETAIL_MARKETS||"").split(",").map(x=>x.trim()).filter(Boolean);
  const allowed=configured.length?keys.filter(k=>configured.includes(k)):keys.slice(0,12);
  if(!allowed.length) return NextResponse.json({ok:true,source:"provider",markets:[],availableMarketKeys:keys});
  const odds=await fetchEventOdds(event.provider_sport_key,event.provider_event_id,allowed.join(","));
  return NextResponse.json({ok:true,source:"provider",availableMarketKeys:keys,markets:(odds.bookmakers?.[0]?.markets||[]).map((m:any)=>({key:m.key,name:mapMarketName(m.key),outcomes:m.outcomes}))});
 }catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Event market lookup failed"},{status:502});}
}