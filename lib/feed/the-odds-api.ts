export type FeedOutcome={name:string;price:number;point?:number;sid?:string};
export type FeedMarket={key:string;outcomes:FeedOutcome[]};
export type FeedBookmaker={key:string;title:string;last_update?:string;markets:FeedMarket[]};
export type FeedEvent={id:string;sport_key:string;sport_title?:string;commence_time:string;home_team:string;away_team:string;bookmakers:FeedBookmaker[]};
const BASE="https://api.the-odds-api.com/v4";
export function feedConfig(){
  const apiKey=process.env.SPORTS_FEED_API_KEY;
  if(!apiKey) throw new Error("SPORTS_FEED_API_KEY is not configured");
  const sports=(process.env.SPORTS_FEED_SPORTS||"soccer_epl,basketball_nba,americanfootball_nfl,baseball_mlb,icehockey_nhl,tennis_atp_french_open,tennis_wta_french_open").split(",").map(s=>s.trim()).filter(Boolean);
  return {apiKey,sports,regions:process.env.SPORTS_FEED_REGION||"eu",markets:process.env.SPORTS_FEED_MARKETS||"h2h,spreads,totals",bookmaker:process.env.SPORTS_FEED_BOOKMAKER||""};
}
async function getJson<T>(url:string):Promise<T>{
  const res=await fetch(url,{cache:"no-store",headers:{"accept":"application/json"}});
  if(!res.ok) throw new Error("Feed request failed: "+res.status+" "+await res.text());
  return res.json() as Promise<T>;
}
export async function fetchSports(){
  const c=feedConfig();
  const q=new URLSearchParams({apiKey:c.apiKey});
  return getJson<Array<{key:string;group:string;title:string;description?:string;active:boolean;has_outrights:boolean}>>(BASE+"/sports?"+q.toString());
}

export async function fetchOdds(sport:string){
  const c=feedConfig();
  const q=new URLSearchParams({apiKey:c.apiKey,regions:c.regions,markets:c.markets,oddsFormat:"decimal",dateFormat:"iso"});
  if(c.bookmaker) q.set("bookmakers",c.bookmaker);
  return getJson<FeedEvent[]>(BASE+"/sports/"+encodeURIComponent(sport)+"/odds?"+q.toString());
}
export async function fetchScores(sport:string){
  const c=feedConfig();
  const q=new URLSearchParams({apiKey:c.apiKey,dateFormat:"iso"});
  return getJson<Array<{id:string;sport_key:string;commence_time:string;completed:boolean;home_team:string;away_team:string;scores?:Array<{name:string;score:string}>;last_update?:string}>>(BASE+"/sports/"+encodeURIComponent(sport)+"/scores?"+q.toString());
}
export function chooseBookmaker(event:FeedEvent){
  const preferred=process.env.SPORTS_FEED_BOOKMAKER;
  return preferred ? (event.bookmakers.find(b=>b.key===preferred)||event.bookmakers[0]) : event.bookmakers[0];
}
export function mapMarketName(key:string){
  if(key==="h2h") return "Match Result";
  if(key==="spreads") return "Handicap";
  if(key==="totals") return "Total";
  if(key==="outrights") return "Outrights";
  return key.replaceAll("_"," ");
}