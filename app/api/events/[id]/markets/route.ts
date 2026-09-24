import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {fetchEventMarkets,fetchEventOdds,mapMarketName} from "../../../../../lib/feed/the-odds-api";
export const runtime="nodejs";
export const dynamic="force-dynamic";
async function loadProviderEvent(id:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error("Server sports feed is not configured.");
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:event,error}=await db.from("events").select("id,sport,provider,provider_event_id,provider_sport_key").eq("id",Number(id)).single();
 if(error||!event) throw new Error("Event not found.");
 return {db,event};
}

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
export async function POST(req:NextRequest,{params}:{params:{id:string}}){
 try{
  const {db,event}=await loadProviderEvent(params.id);
  if(event.provider!=="the_odds_api"||!event.provider_event_id||!event.provider_sport_key) return NextResponse.json({ok:true,source:"database",synced:0});
  const discovered=await fetchEventMarkets(event.provider_sport_key,event.provider_event_id);
  const bookmaker=process.env.SPORTS_FEED_BOOKMAKER ? discovered.bookmakers.find((b:any)=>b.key===process.env.SPORTS_FEED_BOOKMAKER)||discovered.bookmakers[0] : discovered.bookmakers[0];
  const keys=[...new Set((bookmaker?.markets||[]).map((m:any)=>m.key).filter(Boolean))];
  const configured=(process.env.SPORTS_FEED_DETAIL_MARKETS||"").split(",").map(x=>x.trim()).filter(Boolean);
  const allowed=configured.length?keys.filter(k=>configured.includes(k)):keys.slice(0,12);
  if(!allowed.length) return NextResponse.json({ok:true,synced:0,availableMarketKeys:keys});
  const odds=await fetchEventOdds(event.provider_sport_key,event.provider_event_id,allowed.join(","));
  const source=odds.bookmakers?.find((b:any)=>b.key===process.env.SPORTS_FEED_BOOKMAKER)||odds.bookmakers?.[0];
  let markets=0,selections=0;
  for(const m of source?.markets||[]){
   const ms=await db.from("markets").upsert({event_id:event.id,name:mapMarketName(m.key),market_type:m.key,provider:"the_odds_api",provider_market_key:m.key,active:true,suspension_reason:null,last_synced_at:new Date().toISOString()},{onConflict:"event_id,provider,provider_market_key"}).select("id").single();
   if(ms.error||!ms.data) throw ms.error||new Error("Market sync failed"); markets++;
   for(const o of m.outcomes||[]){
    const pkey=(m.key+":"+o.name+":"+(o.point==null?"":String(o.point))).toLowerCase();
    const ss=await db.from("selections").upsert({market_id:ms.data.id,label:o.point==null?o.name:o.name+" "+(o.point>0?"+":"")+o.point,odds:Number(o.price),status:"open",provider:"the_odds_api",provider_selection_key:pkey,outcome_key:o.name,point:o.point??null,last_synced_at:new Date().toISOString(),odds_version:Date.now()},{onConflict:"market_id,provider,provider_selection_key"}).select("id").single();
    if(ss.error||!ss.data) throw ss.error||new Error("Selection sync failed"); selections++;
   }
  }
  return NextResponse.json({ok:true,synced:true,markets,selections,availableMarketKeys:keys});
 }catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Event market sync failed"},{status:502});}
}
