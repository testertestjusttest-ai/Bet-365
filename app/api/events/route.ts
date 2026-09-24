import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {chooseBookmaker,fetchOdds,fetchScores} from "../../../lib/feed/the-odds-api";
export const dynamic="force-dynamic";

function eventStatus(score?:{completed:boolean},commence?:string){
  if(score?.completed) return "finished";
  if(commence && new Date(commence).getTime()<=Date.now()) return "live";
  return "scheduled";
}
function normalizeProviderEvent(event:any,score:any){
  const bookmaker=chooseBookmaker(event);
  const markets=(bookmaker?.markets||[]).map((m:any)=>({
    id:m.key,
    name:m.key==="h2h"?"Match Result":m.key==="spreads"?"Handicap":m.key==="totals"?"Total":m.key.replaceAll("_"," "),
    market_type:m.key,active:true,
    selections:(m.outcomes||[]).filter((o:any)=>typeof o.price==="number"&&o.price>1).map((o:any)=>({id:m.key+":"+o.name+":"+String(o.point??""),label:o.point==null?o.name:o.name+" "+(o.point>0?"+":"")+o.point,odds:Number(o.price),status:"open",point:o.point??null}))
  })).filter((m:any)=>m.selections.length);
  const rows=score?.scores||[];
  const homeScore=Number(rows.find((s:any)=>s.name===event.home_team)?.score||0);
  const awayScore=Number(rows.find((s:any)=>s.name===event.away_team)?.score||0);
  return {id:event.id,sport:event.sport_title||event.sport_key,sport_key:event.sport_key,league:event.sport_title||event.sport_key,home_team:event.home_team,away_team:event.away_team,starts_at:event.commence_time,status:eventStatus(score,event.commence_time),home_score:Number.isFinite(homeScore)?homeScore:0,away_score:Number.isFinite(awayScore)?awayScore:0,markets};
}

export async function GET(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const q=req.nextUrl.searchParams; const sport=q.get("sport"); const status=q.get("status"); const search=q.get("search")?.trim();
 const page=Math.max(0,Number(q.get("page")||0)); const pageSize=Math.min(100,Math.max(12,Number(q.get("pageSize")||48)));

 if(status==="live" && process.env.SPORTS_FEED_API_KEY){
   try{
     const odds=await fetchOdds("upcoming");
     const scoresBySport=new Map<string,any[]>();
     for(const e of odds.filter((x:any)=>new Date(x.commence_time).getTime()<=Date.now())){
       if(!scoresBySport.has(e.sport_key)){
         try{scoresBySport.set(e.sport_key,await fetchScores(e.sport_key))}catch{scoresBySport.set(e.sport_key,[])}
       }
     }
     let events=odds.filter((e:any)=>new Date(e.commence_time).getTime()<=Date.now()).map((e:any)=>normalizeProviderEvent(e,(scoresBySport.get(e.sport_key)||[]).find((s:any)=>s.id===e.id))).filter((e:any)=>e.status==="live");
     if(sport&&sport!=="All") events=events.filter((e:any)=>e.sport===sport||e.sport_key===sport);
     if(search) events=events.filter((e:any)=>(e.home_team+" "+e.away_team+" "+e.league).toLowerCase().includes(search.toLowerCase()));
     events=events.slice(page*pageSize,(page+1)*pageSize);
     return NextResponse.json({ok:true,events,sports:[...new Set(events.map((e:any)=>e.sport))],total:events.length,page,pageSize,hasMore:false,source:"provider"});
   }catch(error:any){console.warn("Provider live feed unavailable",error?.message)}
 }

 if(!url||!key) return NextResponse.json({ok:false,error:"Sports data is not configured."},{status:503});
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 let query=db.from("events").select("id,sport,league,home_team,away_team,starts_at,status,home_score,away_score,markets(id,name,market_type,active,selections(id,label,odds,status,point))",{count:"exact"}).order("starts_at",{ascending:true}).range(page*pageSize,(page+1)*pageSize-1);
 if(sport&&sport!=="All") query=query.eq("sport",sport);
 if(status==="live") query=query.eq("status","live"); else if(status==="scheduled") query=query.eq("status","scheduled");
 if(search) query=query.or("home_team.ilike.%"+search+"%,away_team.ilike.%"+search+"%,league.ilike.%"+search+"%");
 const {data,error,count}=await query; if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
 const sports=[...new Set((data||[]).map((e:any)=>e.sport).filter(Boolean))];
 return NextResponse.json({ok:true,events:data||[],sports,total:count||0,page,pageSize,hasMore:(count||0)>(page+1)*pageSize,source:"database"});
}