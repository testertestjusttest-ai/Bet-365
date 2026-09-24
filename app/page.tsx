"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {ChevronRight,Globe,Home,Search,Ticket,UserRound,Radio,Trophy,Clock3} from "lucide-react";
import {createClient} from "../lib/supabase-browser";
import {readBetSlip,writeBetSlip,pickKey,BetPick} from "../lib/betslip";

type Match={id:number;sport:string;league:string;time:string;home:string;away:string;status:string;homeScore:number;awayScore:number;odds:{label:string;odd:string}[]};

const sports=["Football","Basketball","Tennis","NFL","WNBA","Euroleague","Baseball","Ice Hockey","Cricket","Rugby","Boxing","MMA","Golf","Darts"];
const fallback:Match[]=[
{id:1,sport:"Football",league:"UEFA Champions League",time:"Today • 20:00",home:"Manchester City",away:"Real Madrid",status:"scheduled",homeScore:0,awayScore:0,odds:[{label:"1",odd:"1.72"},{label:"X",odd:"3.90"},{label:"2",odd:"4.80"}]},
{id:2,sport:"Football",league:"La Liga",time:"Today • 21:00",home:"Barcelona",away:"Atletico Madrid",status:"scheduled",homeScore:0,awayScore:0,odds:[{label:"1",odd:"1.84"},{label:"X",odd:"3.70"},{label:"2",odd:"4.20"}]}
];

export default function HomePage(){
 const [sport,setSport]=useState("Football"),[query,setQuery]=useState(""),[matches,setMatches]=useState<Match[]>(fallback),[loading,setLoading]=useState(true);
 const [single,setSingle]=useState<BetPick[]>([]),[multiple,setMultiple]=useState<BetPick[]>([]),[ready,setReady]=useState(false),[lang,setLang]=useState("English"),[showLang,setShowLang]=useState(false);
 const timers=useRef<Record<string,ReturnType<typeof setTimeout>>>({});
 const longPressed=useRef<Record<string,boolean>>({});
 useEffect(()=>{setLang(localStorage.getItem("betnow365-language")||"English");const saved=readBetSlip();setSingle(saved.single);setMultiple(saved.multiple);setReady(true)},[]);
 useEffect(()=>{loadEvents(sport)},[sport]);
 useEffect(()=>{if(ready)writeBetSlip({single,multiple})},[single,multiple,ready]);
 useEffect(()=>{const sync=()=>{const saved=readBetSlip();setSingle(saved.single);setMultiple(saved.multiple)};window.addEventListener("betnow365-betslip",sync);return()=>window.removeEventListener("betnow365-betslip",sync)},[]);
 async function loadEvents(selected:string){
  setLoading(true);
  try{
   if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY){setLoading(false);return;}
   const supabase=createClient();
   const {data,error}=await supabase.from("events").select("id,sport,league,home_team,away_team,starts_at,status,home_score,away_score,markets(id,market_type,selections(label,odds,status))").eq("sport",selected).order("starts_at",{ascending:true}).limit(50);
   if(error)throw error;
   const rows=(data||[]).map((e:any)=>{
    const market=e.markets?.find((m:any)=>["1X2","winner","moneyline"].includes(m.market_type))||e.markets?.[0];
    const odds=(market?.selections||[]).filter((s:any)=>s.status==="open").slice(0,4).map((s:any)=>({label:s.label,odd:Number(s.odds).toFixed(2)}));
    return {id:e.id,sport:e.sport,league:e.league||selected,time:new Date(e.starts_at).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),home:e.home_team,away:e.away_team,status:e.status,homeScore:e.home_score||0,awayScore:e.away_score||0,odds};
   });
   setMatches(rows);
  }catch(e){console.warn("Event data unavailable",e);setMatches(selected==="Football"?fallback:[])}
  finally{setLoading(false)}
 }
 const filtered=useMemo(()=>matches.filter(m=>(m.home+" "+m.away+" "+m.league).toLowerCase().includes(query.toLowerCase())),[query,matches]);
 const addSingle=(m:Match,o:{label:string;odd:string})=>setSingle(s=>[{id:pickKey({eventId:m.id,label:o.label}),eventId:m.id,event:m.home+" vs "+m.away,label:o.label,odd:Number(o.odd),sport:m.sport,mode:"single"},...s.filter(x=>pickKey(x)!==pickKey({eventId:m.id,label:o.label}))].slice(0,20));
 const toggleMultiple=(m:Match,o:{label:string;odd:string})=>setMultiple(s=>s.some(x=>pickKey(x)===pickKey({eventId:m.id,label:o.label}))?s.filter(x=>pickKey(x)!==pickKey({eventId:m.id,label:o.label})):[...s,{id:pickKey({eventId:m.id,label:o.label}),eventId:m.id,event:m.home+" vs "+m.away,label:o.label,odd:Number(o.odd),sport:m.sport,mode:"multiple"}].slice(0,12));
 const pressStart=(m:Match,o:{label:string;odd:string})=>{const key=m.id+"-"+o.label;longPressed.current[key]=false;timers.current[key]=setTimeout(()=>{longPressed.current[key]=true;toggleMultiple(m,o)},520)};
 const pressEnd=(m:Match,o:{label:string;odd:string})=>{const key=m.id+"-"+o.label;clearTimeout(timers.current[key]);if(!longPressed.current[key])addSingle(m,o)};
 const multipleOdds=multiple.reduce((a,x)=>a*Number(x.odd),1);
 return <main className="app-shell">
  <header className="topbar"><a className="brand" href="/">BETNOW<span>365</span></a><button className="top-link"><Trophy size={15}/> Rewards</button>
   <div className="top-actions"><button className="lang-btn" onClick={()=>setShowLang(!showLang)}><Globe size={15}/>{lang}</button><a href="/register" className="outline-btn">Register</a><a href="/cashier" className="outline-btn">Cashier</a><a href="/login" className="login-btn">Log in</a></div>
   {showLang&&<div className="language-menu">{["English","বাংলা","Español","Deutsch","Français"].map(x=><button key={x} onClick={()=>{setLang(x);localStorage.setItem("betnow365-language",x);setShowLang(false)}}>{x}</button>)}</div>}
  </header>
  <div className="search-wrap"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search sports, teams and events"/></div>
  <nav className="sports-strip">{sports.map(x=><button className={sport===x?"sport active":"sport"} key={x} onClick={()=>setSport(x)}>{x}</button>)}</nav>
  <section className="hero"><div><span className="eyebrow">BETNOW365 SPORTS</span><h1>More markets. More ways to play.</h1><p>Tap an odd for a single. Press and hold an odd to add it to your multiple.</p><button className="cta" onClick={()=>document.getElementById("events")?.scrollIntoView({behavior:"smooth"})}>Explore events <ChevronRight size={18}/></button></div><div className="hero-mark">365</div></section>
  <section className="quick-grid">{[["⚽","Football","Fixtures"],["🔴","Live","In-play"],["🏀","Basketball","NBA • Euroleague"],["🎾","Tennis","ATP • WTA"]].map(([i,n,c])=><button key={n} className="quick-card" onClick={()=>n==="Live"?location.href="/live":setSport(n)}><span className="quick-icon">{i}</span><b>{n}</b><small>{c}</small></button>)}</section>
  <div className="content-layout" id="events"><section className="events"><div className="section-head"><div><span className="eyebrow">TOP EVENTS</span><h2>{sport}</h2></div><a className="text-btn" href="/sports">All sports <ChevronRight size={16}/></a></div>
   <div className="league-tabs"><button className="tab active">Popular</button><button className="tab">Today</button><button className="tab">Tomorrow</button><button className="tab">Boosted</button></div>
   <div className="hold-tip"><Clock3 size={14}/> Tap = Single bet • Press & hold = Multiple selection</div>
   {loading&&<div className="loading-card">Loading {sport} events…</div>}
   {!loading&&filtered.length===0&&<div className="loading-card">No {sport} events available yet.</div>}
   {filtered.map(m=><article className="match-card" key={m.id}><div className="match-meta"><span>{m.status==="live"?"🔴 LIVE":"⚽"} {m.league}</span><span>{m.status==="live"?m.homeScore+" - "+m.awayScore:m.time}</span></div><div className="match-main"><div className="teams"><b>{m.home}</b><b>{m.away}</b></div><a className="match-more" href={"/event/"+m.id}><ChevronRight/></a></div>
    <div className="odds-row">{m.odds.map(o=>{const selected=multiple.some(x=>x.eventId===m.id&&x.label===o.label);return <button key={o.label} className={"odd"+(selected?" selected":"")} onPointerDown={()=>pressStart(m,o)} onPointerUp={()=>pressEnd(m,o)} onPointerCancel={()=>clearTimeout(timers.current[m.id+"-"+o.label])} onContextMenu={e=>e.preventDefault()}><span>{o.label}</span><strong>{o.odd}</strong></button>})}</div>
    <div className="market-row"><a href={"/event/"+m.id}>+ more markets</a><span>Bet Builder</span></div></article>)}
  </section>
  <aside className="betslip"><div className="slip-head"><div><b>Bet Slip</b><small>{single.length+multiple.length} selections</small></div><Ticket size={20}/></div>
   <div className="slip-tabs"><button className={single.length?"active":""}>Singles {single.length?"("+single.length+")":""}</button><button className={multiple.length?"active":""}>Multiple {multiple.length?"("+multiple.length+")":""}</button></div>
   {multiple.length>0&&<div className="builder-box"><b>Multiple selected</b><span>{multiple.length} legs • combined odds <strong>{multipleOdds.toFixed(2)}</strong></span><small>Long-press selections to add/remove legs.</small></div>}
   {single.length===0&&multiple.length===0?<div className="empty-slip"><Ticket size={34}/><b>Your bet slip is empty</b><span>Tap an odd for a single or hold it for a multiple.</span></div>:<>{[...single,...multiple].map(s=><div className="slip-item" key={s.id}><button onClick={()=>{setSingle(x=>x.filter(y=>y.id!==s.id));setMultiple(x=>x.filter(y=>y.id!==s.id))}}>×</button><small>{s.event}</small><div><b>{s.label}</b><strong>{Number(s.odd).toFixed(2)}</strong></div></div>)}<div className="stake-row"><span>Multiple potential odds</span><b>{multiple.length?multipleOdds.toFixed(2):"—"}</b></div><a className="place-btn" href="/login">Log in to place bet</a></>}
  </aside></div>
  <nav className="bottom-nav"><a className="selected" href="/"><Home/><span>Home</span></a><a href="/sports"><Trophy/><span>Sports</span></a><a href="/live"><Radio/><span>Live</span></a><a href="/bets"><Ticket/><span>Bets</span></a><a href="/login"><UserRound/><span>Account</span></a></nav>
 </main>;
}