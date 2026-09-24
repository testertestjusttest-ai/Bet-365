import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {chooseBookmaker,fetchEventMarkets,fetchEventOdds,mapMarketName} from "../../../../../lib/feed/the-odds-api";
export const runtime="nodejs";
export const dynamic="force-dynamic";

function hashId(value:string){let h=0;for(let i=0;i<value.length;i++)h=((h<<5)-h+value.charCodeAt(i))|0;return Math.abs(h)||1}
function outcomeId(marketKey:string,name:string,point?:number){return hashId(marketKey+":"+name+":"+(point??""))}

export async function GET(req:NextRequest,{params}:{params:Promise<{sport:string;id:string}>}){
  try{
    const {sport,id}=await params;
    const configured=process.env.SPORTS_FEED_DETAIL_MARKETS||"";
    let marketKeys=configured.split(",").map(x=>x.trim()).filter(Boolean);
    if(!marketKeys.length){
      const available=await fetchEventMarkets(sport,id);
      const book=available.bookmakers?.[0];
      marketKeys=(book?.markets||[]).map((m:any)=>m.key).slice(0,12);
    }
    if(!marketKeys.length) marketKeys=(process.env.SPORTS_FEED_MARKETS||"h2h,spreads,totals").split(",").map(x=>x.trim()).filter(Boolean);
    const event=await fetchEventOdds(sport,id,marketKeys.join(","));
    const bookmaker=chooseBookmaker(event);
    if(!bookmaker) return NextResponse.json({ok:false,error:"No bookmaker market data available"},{status:404});
    const scoresUrl=process.env.SPORTS_FEED_API_KEY
      ? `https://api.the-odds-api.com/v4/sports/${encodeURIComponent(sport)}/scores/?apiKey=${encodeURIComponent(process.env.SPORTS_FEED_API_KEY)}&dateFormat=iso`
      : "";
    let score:{home:number;away:number}|null=null;
    if(scoresUrl){
      const sr=await fetch(scoresUrl,{cache:"no-store",headers:{accept:"application/json"}});
      if(sr.ok){
        const rows=await sr.json();
        const hit=rows.find((x:any)=>x.id===id);
        if(hit?.scores){
          score={home:Number(hit.scores.find((x:any)=>x.name===event.home_team)?.score||0),away:Number(hit.scores.find((x:any)=>x.name===event.away_team)?.score||0)};
        }
      }
    }
    const markets=(bookmaker.markets||[]).map((m:any)=>({
      id:hashId(m.key),
      name:mapMarketName(m.key),
      market_type:m.key,
      active:true,
      selections:(m.outcomes||[]).filter((o:any)=>typeof o.price==="number"&&o.price>1).map((o:any)=>({id:outcomeId(m.key,o.name,o.point),label:o.point==null?o.name:o.name+" "+(o.point>0?"+":"")+o.point,odds:Number(o.price),status:"open",point:o.point}))
    })).filter((m:any)=>m.selections.length);
    return NextResponse.json({ok:true,provider:"the_odds_api",event:{
      id:hashId(id),provider_event_id:id,sport_key:sport,sport:event.sport_title||sport,league:event.sport_title||sport,
      home_team:event.home_team,away_team:event.away_team,starts_at:event.commence_time,
      status:new Date(event.commence_time).getTime()<=Date.now()?"live":"scheduled",
      home_score:score?.home||0,away_score:score?.away||0,markets
    }});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Provider event lookup failed"},{status:500});
  }
}
