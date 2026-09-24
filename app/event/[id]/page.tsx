"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {ArrowLeft,Bell,ChevronDown} from "lucide-react";
import {createClient} from "../../../lib/supabase-browser";

type Market={id:number;name:string;market_type:string;selections:{id:number;label:string;odds:number;status:string}[]};
export default function Event(){
 const params=useParams<{id:string}>();
 const [open,setOpen]=useState(0),[event,setEvent]=useState<any>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{try{
   if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return;
   const supabase=createClient(); const {data,error}=await supabase.from("events").select("id,league,home_team,away_team,starts_at,status,home_score,away_score,markets(id,name,market_type,selections(id,label,odds,status))").eq("id",Number(params.id)).single();
   if(error) throw error; setEvent(data);
 }catch(e){console.warn("Event lookup failed",e)}finally{setLoading(false)}})()},[params.id]);
 const fallback=!event;
 const markets:Market[]=event?.markets||[];
 return <main className="event-page"><header className="event-top"><a href="/"><ArrowLeft/></a><div><small>{event?.league||"Football"}</small><b>{event?event.home_team+" vs "+event.away_team:"Event"}</b></div><Bell/></header>
  <div className="event-tabs"><button className="active">Popular</button><button>Bet Builder</button><button>Player Props</button></div>
  <section className="event-score"><small>{loading?"Loading…":event?new Date(event.starts_at).toLocaleString():"Event data unavailable"}</small><h1>{event?.home_team||"Manchester City"} <span>vs</span> {event?.away_team||"Real Madrid"}</h1><p>{event?.status==="live"?"Live":"Pre-match"} • {markets.length||4}+ markets</p></section>
  <div className="market-list">{(markets.length?markets:[{id:0,name:"Match Result",market_type:"1X2",selections:[{id:0,label:"1",odds:1.72,status:"open"},{id:0,label:"X",odds:3.9,status:"open"},{id:0,label:"2",odds:4.8,status:"open"}]}]).map((m:Market,i:number)=><section className="market-card" key={m.id+"-"+m.name}><button className="market-title" onClick={()=>setOpen(open===i?-1:i)}><b>{m.name}</b><ChevronDown className={open===i?"rotate":""}/></button>{open===i&&<div className="market-options">{m.selections.map(s=><button key={s.id+"-"+s.label} disabled={s.status!=="open"}><span>{s.label}</span><strong>{Number(s.odds).toFixed(2)}</strong></button>)}</div>}</section>)}</div>
 </main>;
}