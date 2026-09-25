import {NextRequest,NextResponse} from "next/server";
import {chooseBookmaker,fetchEventMarkets,fetchEventOdds,fetchScores,mapMarketName} from "../../../../../../lib/feed/the-odds-api";
export const runtime="nodejs";
export const dynamic="force-dynamic";

function hashId(value:string){let h=0;for(let i=0;i<value.length;i++)h=((h<<5)-h+value.charCodeAt(i))|0;return Math.abs(h)||1}
function outcomeId(marketKey:string,name:string,point?:number){return hashId(marketKey+":"+name+":"+(point??""))}

export async function GET(req:NextRequest,{params}:{params:Promise<{sport:string;id:string}>}){
  try{
    const {sport,id}=await params;
    const configured=process.env.SPORTS_FEED_DETAIL_MARKETS||"";
    const detailRegions=process.env.SPORTS_FEED_DETAIL_REGION||"us,eu";
    let marketKeys=configured.split(",").map(x=>x.trim()).filter(Boolean);
    if(!marketKeys.length){
      const available=await fetchEventMarkets(sport,id,detailRegions);
      const book=available.bookmakers?.[0];
      marketKeys=(book?.markets||[]).map((m:any)=>m.key).slice(0,12);
    }
    if(!marketKeys.length) marketKeys=(process.env.SPORTS_FEED_MARKETS||"h2h,spreads,totals").split(",").map(x=>x.trim()).filter(Boolean);
    const event=await fetchEventOdds(sport,id,marketKeys.join(","),detailRegions);
    const bookmaker=chooseBookmaker(event);
    if(!bookmaker) return NextResponse.json({ok:false,error:"No bookmaker market data available"},{status:404});
    let score:any=null;
    try{
      const rows=await fetchScores(sport);
      score=rows.find((x:any)=>x.id===id) || null;
    }catch(error:any){
      console.warn("Provider event score lookup unavailable",error?.message);
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
      status:score?.completed?"finished":score?"live":"scheduled",
      home_score:score?.home||0,away_score:score?.away||0,markets
    }});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Provider event lookup failed"},{status:500});
  }
}
