"use client";
import {useEffect,useRef,useState} from "react";
import {useParams} from "next/navigation";
import {ArrowLeft,Bell,ChevronDown,Clock3,Ticket} from "lucide-react";
import {createClient} from "../../../lib/supabase-browser";
import {readBetSlip,writeBetSlip,pickKey,BetPick} from "../../../lib/betslip";

type Selection={id:number;label:string;odds:number;status:string;point?:number};
type Market={id:number;name:string;market_type:string;active?:boolean;selections:Selection[]};
type EventData={id:number;league:string;home_team:string;away_team:string;starts_at:string;status:string;home_score:number;away_score:number;markets:Market[]};

export default function Event(){
 const params=useParams<{id:string}>(); const [provider,setProvider]=useState(""); const [providerSport,setProviderSport]=useState("");
 const [open,setOpen]=useState(0),[event,setEvent]=useState<EventData|null>(null),[loading,setLoading]=useState(true),[eventTab,setEventTab]=useState("Popular");
 const [single,setSingle]=useState<BetPick[]>([]),[multiple,setMultiple]=useState<BetPick[]>([]),[ready,setReady]=useState(false);
 const timers=useRef<Record<string,ReturnType<typeof setTimeout>>>({}); const held=useRef<Record<string,boolean>>({});
 useEffect(()=>{const s=readBetSlip();setSingle(s.single);setMultiple(s.multiple);setReady(true);const q=new URLSearchParams(window.location.search);setProvider(q.get("provider")||"");setProviderSport(q.get("sport")||"")},[]);
 useEffect(()=>{if(ready)writeBetSlip({single,multiple})},[single,multiple,ready]);
 useEffect(()=>{
   let mounted=true;
   async function load(){
     setLoading(true);
     try{
       if(provider==="the_odds_api"){
         const r=await fetch("/api/provider/events/"+encodeURIComponent(providerSport)+"/"+encodeURIComponent(String(params.id)),{cache:"no-store"});
         const j=await r.json(); if(!r.ok||!j.event)throw new Error(j.error||"Provider event unavailable");
         if(mounted)setEvent(j.event as EventData);
       }else{
         const supabase=createClient();
         const {data,error}=await supabase.from("events").select("id,league,home_team,away_team,starts_at,status,home_score,away_score,markets(id,name,market_type,active,selections(id,label,odds,status,point))").eq("id",Number(params.id)).single();
         if(error)throw error; if(mounted)setEvent(data as EventData);
       }
     }catch(e){console.warn("Event lookup failed",e)}
     finally{if(mounted)setLoading(false)}
   }
   load();
   if(provider==="the_odds_api") return ()=>{mounted=false};
   const supabase=createClient();
   const channel=supabase.channel("event-"+params.id).on("postgres_changes",{event:"*",schema:"public",table:"events",filter:"id=eq."+params.id},load).on("postgres_changes",{event:"*",schema:"public",table:"markets"},load).on("postgres_changes",{event:"*",schema:"public",table:"selections"},load).subscribe();
   return()=>{mounted=false;supabase.removeChannel(channel)};
 },[params.id,provider,providerSport]);

 const addSingle=(m:Market,s:Selection)=>{const id=pickKey({eventId:event?.id||Number(params.id),selectionId:s.id});const p:BetPick={id,eventId:event?.id||Number(params.id),event:(event?.home_team||"Home")+" vs "+(event?.away_team||"Away"),label:m.name+" • "+s.label,odd:Number(s.odds),sport:event?.league||"Sports",selectionId:s.id,marketType:m.market_type,mode:"single"};setSingle(x=>[p,...x.filter(y=>y.id!==p.id)].slice(0,20));};
 const toggleMultiple=(m:Market,s:Selection)=>{const eventId=event?.id||Number(params.id);const p:BetPick={id:pickKey({eventId,selectionId:s.id}),eventId,event:(event?.home_team||"Home")+" vs "+(event?.away_team||"Away"),label:m.name+" • "+s.label,odd:Number(s.odds),sport:event?.league||"Sports",selectionId:s.id,marketType:m.market_type,mode:"multiple"};setMultiple(x=>x.some(y=>y.id===p.id)?x.filter(y=>y.id!==p.id):[...x,p].slice(0,12));};
 const down=(m:Market,s:Selection)=>{const k=String(m.id)+":"+s.id;held.current[k]=false;clearTimeout(timers.current[k]);timers.current[k]=setTimeout(()=>{held.current[k]=true;toggleMultiple(m,s)},520)};
 const up=(m:Market,s:Selection)=>{const k=String(m.id)+":"+s.id;clearTimeout(timers.current[k]);if(!held.current[k])addSingle(m,s)};
 const multipleOdds=multiple.reduce((a,x)=>a*Number(x.odd),1),allMarkets=event?.markets||[],markets=eventTab==="Popular"?allMarkets.slice(0,8):eventTab==="Player Props"?allMarkets.filter(m=>/player|scorer|points|assists|rebounds|shots|goalscorer/i.test(m.name+" "+m.market_type)):allMarkets;
 return <main className="event-page">
  <header className="event-top"><a href="/"><ArrowLeft/></a><div><small>{event?.league||"Sports"}</small><b>{event?event.home_team+" vs "+event.away_team:"Event"}</b></div><Bell/></header>
  <div className="event-tabs">{["Popular","Bet Builder","Player Props"].map(t=><button key={t} className={eventTab===t?"active":""} onClick={()=>setEventTab(t)}>{t}</button>)}</div>
  <section className="event-score"><small>{loading?"Loading…":event?new Date(event.starts_at).toLocaleString():"Event data unavailable"}</small><h1>{event?.home_team||"Event"} <span>{event?.status==="live"?event.home_score+" - "+event.away_score:"vs"}</span> {event?.away_team||""}</h1><p>{event?.status==="live"?"LIVE • In play":"Pre-match"} • {markets.length||0} markets</p></section>
  <div className="hold-tip"><Clock3 size={14}/> Tap = Single • Press & hold = Multiple</div>
  <div className="market-list">{markets.map((m,i)=><section className="market-card" key={m.id}><button className="market-title" onClick={()=>setOpen(open===i?-1:i)}><b>{m.name}</b><ChevronDown className={open===i?"rotate":""}/></button>{open===i&&<div className="market-options">{m.selections.map(s=><button key={s.id} className={"event-odd "+(multiple.some(x=>x.selectionId===s.id)?"selected":"")} disabled={s.status!=="open"||m.active===false} onPointerDown={()=>down(m,s)} onPointerUp={()=>up(m,s)} onPointerCancel={()=>clearTimeout(timers.current[String(m.id)+":"+s.id])} onContextMenu={e=>e.preventDefault()}><span>{s.status==="open"?s.label:"Suspended"}</span><strong>{s.status==="open"?Number(s.odds).toFixed(2):"—"}</strong></button>)}</div>}</section>)}</div>
  <aside className="betslip event-slip"><div className="slip-head"><div><b>Bet Slip</b><small>{single.length+multiple.length} selections</small></div><Ticket size={20}/></div>{multiple.length>0&&<div className="builder-box"><b>Multiple selected</b><span>{multiple.length} legs • combined odds <strong>{multipleOdds.toFixed(2)}</strong></span><small>Selections are held across pages.</small></div>}{single.length===0&&multiple.length===0?<div className="empty-slip"><Ticket size={30}/><b>Bet slip is empty</b><span>Tap an odd or press and hold for Multiple.</span></div>:[...single,...multiple].map(p=><div className="slip-item" key={p.id}><button onClick={()=>{setSingle(x=>x.filter(y=>y.id!==p.id));setMultiple(x=>x.filter(y=>y.id!==p.id))}}>×</button><small>{p.event}</small><div><b>{p.label}</b><strong>{Number(p.odd).toFixed(2)}</strong></div></div>)}<a className="place-btn" href="/login">Log in to place bet</a></aside>
 </main>;
}