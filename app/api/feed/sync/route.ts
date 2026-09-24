import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {chooseBookmaker,fetchOdds,fetchScores,feedConfig,mapMarketName,FeedOutcome} from "../../../../lib/feed/the-odds-api";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
function assertAuthorized(req:NextRequest){
  const secret=process.env.FEED_SYNC_SECRET||process.env.CRON_SECRET;
  if(!secret) return;
  const auth=req.headers.get("authorization")||"";
  const bearer=auth.startsWith("Bearer ")?auth.slice(7):"";
  const provided=req.headers.get("x-feed-sync-secret")||bearer||new URL(req.url).searchParams.get("secret");
  if(provided!==secret) throw new Error("Unauthorized feed sync request");
}
function outcomeKey(marketKey:string,o:FeedOutcome){return (marketKey+":"+o.name+":"+(o.point==null?"":String(o.point))).toLowerCase();}
function eventStatus(score?:{completed:boolean},commence?:string){
  if(score?.completed) return "finished";
  if(commence && new Date(commence).getTime()<=Date.now()) return "live";
  return "scheduled";
}
export async function GET(req:NextRequest){try{assertAuthorized(req);return await sync();}catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Feed sync failed"},{status:error?.message==="Unauthorized feed sync request"?401:500});}}
export async function POST(req:NextRequest){return GET(req);}
async function sync(){
  const c=feedConfig();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey) return NextResponse.json({ok:false,error:"Server Supabase credentials are not configured"},{status:500});
  const db=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const run=(await db.from("feed_sync_runs").insert({provider:"the_odds_api",status:"running",sports_requested:c.sports.length}).select("id").single()).data;
  const runId=run?.id;
  let eventsSeen=0,eventsUpserted=0,marketsUpserted=0,selectionsUpserted=0;
  const errors:string[]=[];
  try{
    for(const sportKey of c.sports){
      try{
        const [odds,scores]=await Promise.all([fetchOdds(sportKey),fetchScores(sportKey)]);
        const scoreMap=new Map(scores.map(s=>[s.id,s]));
        eventsSeen+=odds.length;
        for(const event of odds){
          const score=scoreMap.get(event.id);
          const scoreRows=score?.scores||[];
          const homeScore=Number(scoreRows.find(s=>s.name===event.home_team)?.score||0);
          const awayScore=Number(scoreRows.find(s=>s.name===event.away_team)?.score||0);
          const eventRow={sport:event.sport_title||sportKey,league:event.sport_title||sportKey,home_team:event.home_team,away_team:event.away_team,starts_at:event.commence_time,status:eventStatus(score,event.commence_time),home_score:Number.isFinite(homeScore)?homeScore:0,away_score:Number.isFinite(awayScore)?awayScore:0,provider:"the_odds_api",provider_event_id:event.id,provider_sport_key:sportKey,last_synced_at:new Date().toISOString(),sync_version:Date.now()};
          const saved=await db.from("events").upsert(eventRow,{onConflict:"provider,provider_event_id"}).select("id").single();
          if(saved.error||!saved.data) throw saved.error||new Error("Event upsert returned no row");
          eventsUpserted++;
          const bookmaker=chooseBookmaker(event);
          if(!bookmaker) continue;
          const configuredMarketKeys=c.markets.split(",").map(x=>x.trim()).filter(Boolean);
          if(configuredMarketKeys.length){
            await db.from("markets").update({active:false,suspension_reason:"Provider market unavailable",last_synced_at:new Date().toISOString()}).eq("event_id",saved.data.id).eq("provider","the_odds_api").in("provider_market_key",configuredMarketKeys);
          }
          for(const market of bookmaker.markets){
            const marketRow={event_id:saved.data.id,name:mapMarketName(market.key),market_type:market.key,provider:"the_odds_api",provider_market_key:market.key,active:true,suspension_reason:null,last_synced_at:new Date().toISOString()};
            const ms=await db.from("markets").upsert(marketRow,{onConflict:"event_id,provider,provider_market_key"}).select("id").single();
            if(ms.error||!ms.data) throw ms.error||new Error("Market upsert returned no row");
            marketsUpserted++;
            for(const outcome of market.outcomes){
              if(typeof outcome.price!=="number"||outcome.price<=1) continue;
              const pkey=outcomeKey(market.key,outcome);
              const ss=await db.from("selections").upsert({market_id:ms.data.id,label:outcome.point==null?outcome.name:outcome.name+" "+(outcome.point>0?"+":"")+outcome.point,odds:Number(outcome.price),status:"open",provider:"the_odds_api",provider_selection_key:pkey,outcome_key:outcome.name,point:outcome.point??null,last_synced_at:new Date().toISOString(),odds_version:Date.now()},{onConflict:"market_id,provider,provider_selection_key"}).select("id").single();
              if(ss.error||!ss.data) throw ss.error||new Error("Selection upsert returned no row");
              selectionsUpserted++;
              await db.from("odds_snapshots").insert({provider:"the_odds_api",provider_event_id:event.id,provider_market_key:market.key,provider_selection_key:pkey,odds:Number(outcome.price),point:outcome.point??null,bookmaker:bookmaker.key});
            }
          }
        }
      }catch(error:any){errors.push(sportKey+": "+(error?.message||"unknown error"));}
    }
    await db.from("feed_sync_runs").update({status:errors.length?"partial":"success",events_seen:eventsSeen,events_upserted:eventsUpserted,markets_upserted:marketsUpserted,selections_upserted:selectionsUpserted,errors,finished_at:new Date().toISOString()}).eq("id",runId);
    return NextResponse.json({ok:true,provider:"the_odds_api",sports:c.sports,eventsSeen,eventsUpserted,marketsUpserted,selectionsUpserted,errors,runId});
  }catch(error:any){
    await db.from("feed_sync_runs").update({status:"failed",errors:[...errors,error?.message||"unknown error"],finished_at:new Date().toISOString()}).eq("id",runId);
    return NextResponse.json({ok:false,error:error?.message||"Feed sync failed",runId},{status:500});
  }
}