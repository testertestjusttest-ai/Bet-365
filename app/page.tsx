"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {ChevronRight,Globe,Home,Search,Ticket,UserRound,Radio,Trophy,Clock3,RefreshCw} from "lucide-react";
import {createClient} from "../lib/supabase-browser";
import {readBetSlip,writeBetSlip,pickKey,BetPick} from "../lib/betslip";
import SiteFooter from "../components/site-footer";

type Match={id:any;sport:string;sport_key?:string;league:string;time:string;home:string;away:string;status:string;homeScore:number;awayScore:number;odds:{label:string;odd:string}[]};
type LiveEvent={id:string;sport:string;sport_key?:string;league:string;home_team:string;away_team:string;home_score:number;away_score:number;starts_at:string;markets?:any[]};

const sports=[
  ["⚽","Football"],["🏀","Basketball"],["🎾","Tennis"],["🏈","NFL"],["🏏","Cricket"],
  ["🏒","Ice Hockey"],["⚽","Futsal"],["🏐","Volleyball"],["🤾","Handball"],["🏉","Rugby"],["🥊","Boxing"],["🥋","MMA"],["🏎️","Motor Sports"],["🏓","Table Tennis"],["🏸","Badminton"],["⛳","Golf"],["🎯","Darts"],["🎮","Esports"]
];
const fallback:Match[]=[
 {id:1,sport:"Football",league:"UEFA Champions League",time:"Today • 20:00",home:"Manchester City",away:"Real Madrid",status:"scheduled",homeScore:0,awayScore:0,odds:[{label:"1",odd:"1.72"},{label:"X",odd:"3.90"},{label:"2",odd:"4.80"}]},
 {id:2,sport:"Football",league:"La Liga",time:"Today • 21:00",home:"Barcelona",away:"Atletico Madrid",status:"scheduled",homeScore:0,awayScore:0,odds:[{label:"1",odd:"1.84"},{label:"X",odd:"3.70"},{label:"2",odd:"4.20"}]}
];

export default function HomePage(){
 const [sport,setSport]=useState("Football"),[query,setQuery]=useState(""),[matches,setMatches]=useState<Match[]>(fallback);
 const [loading,setLoading]=useState(true),[live,setLive]=useState<LiveEvent[]>([]),[liveLoading,setLiveLoading]=useState(true),[liveSource,setLiveSource]=useState("database"),[eventSource,setEventSource]=useState("database");
 const [single,setSingle]=useState<BetPick[]>([]),[multiple,setMultiple]=useState<BetPick[]>([]),[ready,setReady]=useState(false);
 const [lang,setLang]=useState("English"),[showLang,setShowLang]=useState(false),[userEmail,setUserEmail]=useState<string|null>(null),[eventTab,setEventTab]=useState("Popular");
 const timers=useRef<Record<string,ReturnType<typeof setTimeout>>>({}); const longPressed=useRef<Record<string,boolean>>({});

 useEffect(()=>{
   setLang(localStorage.getItem("betnow365-language")||"English");
   const saved=readBetSlip();setSingle(saved.single);setMultiple(saved.multiple);setReady(true);
   const supabase=createClient();supabase.auth.getSession().then(({data})=>setUserEmail(data.session?.user?.email||null));
   const {data}=supabase.auth.onAuthStateChange((_event,session)=>setUserEmail(session?.user?.email||null));
   return()=>data.subscription.unsubscribe();
 },[]);
 useEffect(()=>{loadEvents(sport,eventTab)},[sport,eventTab]);
 useEffect(()=>{
   let active=true;
   async function loadLive(){
     setLiveLoading(true);
     try{
       const r=await fetch("/api/events?status=live&page=0&pageSize=100",{cache:"no-store"});
       const j=await r.json();
       if(active){setLive(j.events||[]);setLiveSource(j.source||"database")}
     }catch{if(active){setLive([]);setLiveSource("database")}}
     finally{if(active)setLiveLoading(false)}
   }
   loadLive(); const t=setInterval(loadLive,30000); return()=>{active=false;clearInterval(t)};
 },[]);
 useEffect(()=>{if(ready)writeBetSlip({single,multiple})},[single,multiple,ready]);
 useEffect(()=>{const sync=()=>{const saved=readBetSlip();setSingle(saved.single);setMultiple(saved.multiple)};window.addEventListener("betnow365-betslip",sync);return()=>window.removeEventListener("betnow365-betslip",sync)},[]);

 async function loadEvents(selected:string,tab:string){
   setLoading(true);
   try{
     const params=new URLSearchParams({sport:selected,page:"0",pageSize:"48"});
     if(tab==="Today"){
       const d=new Date();params.set("from",new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString());params.set("to",new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).toISOString());
     }else if(tab==="Tomorrow"){
       const d=new Date();params.set("from",new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).toISOString());params.set("to",new Date(d.getFullYear(),d.getMonth(),d.getDate()+2).toISOString());
     }
     const r=await fetch("/api/events?"+params.toString(),{cache:"no-store"});const j=await r.json();
     if(!r.ok)throw new Error(j.error||"Events unavailable");
     setEventSource(j.source||"database");
     const rows=(j.events||[]).map((e:any)=>{
       const market=e.markets?.find((m:any)=>["1X2","h2h","winner","moneyline"].includes(m.market_type))||e.markets?.[0];
       const odds=(market?.selections||[]).filter((s:any)=>s.status==="open").slice(0,3).map((s:any)=>({label:s.label,odd:Number(s.odds).toFixed(2)}));
       return {id:e.id,sport:e.sport,sport_key:e.sport_key,league:e.league||selected,time:new Date(e.starts_at).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),home:e.home_team,away:e.away_team,status:e.status,homeScore:e.home_score||0,awayScore:e.away_score||0,odds};
     });
     setMatches(rows);
   }catch(e){console.warn("Event data unavailable",e);setEventSource("database");setMatches(selected==="Football"&&tab==="Popular"?fallback:[])}
   finally{setLoading(false)}
 }

 const filtered=useMemo(()=>matches.filter(m=>(m.home+" "+m.away+" "+m.league).toLowerCase().includes(query.toLowerCase())),[query,matches]);
 const addSingle=(m:Match,o:{label:string;odd:string})=>setSingle(s=>{const p:BetPick={id:pickKey({eventId:m.id,label:o.label}),eventId:m.id,event:m.home+" vs "+m.away,label:o.label,odd:Number(o.odd),sport:m.sport,mode:"single"};return [p,...s.filter(x=>pickKey(x)!==p.id)].slice(0,20)});
 const toggleMultiple=(m:Match,o:{label:string;odd:string})=>setMultiple(s=>{const p:BetPick={id:pickKey({eventId:m.id,label:o.label}),eventId:m.id,event:m.home+" vs "+m.away,label:o.label,odd:Number(o.odd),sport:m.sport,mode:"multiple"};return s.some(x=>x.id===p.id)?s.filter(x=>x.id!==p.id):[...s,p].slice(0,12)});
 const pressStart=(m:Match,o:{label:string;odd:string})=>{const key=m.id+"-"+o.label;longPressed.current[key]=false;timers.current[key]=setTimeout(()=>{longPressed.current[key]=true;toggleMultiple(m,o)},520)};
 const pressEnd=(m:Match,o:{label:string;odd:string})=>{const key=m.id+"-"+o.label;clearTimeout(timers.current[key]);if(!longPressed.current[key])addSingle(m,o)};
 const multipleOdds=multiple.reduce((a,x)=>a*Number(x.odd),1);

 return <main className="app-shell">
  <header className="topbar">
   <a className="brand" href="/">BETNOW<span>365</span></a>
   <button className="top-link"><Trophy size={15}/> Rewards</button>
   <div className="top-actions">
    <button className="lang-btn" onClick={()=>setShowLang(!showLang)}><Globe size={15}/>{lang}</button>
    {!userEmail&&<a href="/register" className="join-btn">Join</a>}
    {userEmail?<><a href="/account" className="outline-btn">Account</a><button className="login-btn" onClick={async()=>{await createClient().auth.signOut();setUserEmail(null)}}>Log out</button></>:<a href="/login" className="login-btn">Log in</a>}
   </div>
   {showLang&&<div className="language-menu">{["English","বাংলা","Español","Deutsch","Français"].map(x=><button key={x} onClick={()=>{setLang(x);localStorage.setItem("betnow365-language",x);setShowLang(false)}}>{x}</button>)}</div>}
  </header>

  <div className="search-wrap"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search"/></div>

  <nav className="icon-sports-strip">{sports.map(([icon,name])=><button key={name} className={sport===name?"icon-sport active":"icon-sport"} onClick={()=>setSport(name)}><span>{icon}</span><b>{name}</b></button>)}</nav>

  <section className="promo-strip">
   <article className="promo-card promo-one"><div><small>WELCOME OFFER</small><h2>Up to €200 in Bet Credits</h2><p>Original BETNOW365 promotions are subject to account eligibility and terms.</p><button onClick={()=>location.href="/register"}>Join now <ChevronRight size={16}/></button></div><strong>365</strong></article>
   <article className="promo-card promo-two"><div><small>BET BUILDER+</small><h2>Build your own match</h2><p>Combine supported selections from the same event.</p><button onClick={()=>document.getElementById("events")?.scrollIntoView({behavior:"smooth"})}>Explore markets <ChevronRight size={16}/></button></div><strong>+</strong></article>
  </section>

  <div className="category-tabs">{["Popular","Today","Tomorrow","Boosted"].map(x=><button className={eventTab===x?"active":""} onClick={()=>setEventTab(x)} key={x}>{x}</button>)}</div>

  <section className="home-live">
   <div className="section-head live-head"><div><span className="eyebrow">LIVE</span><h2>In-Play <span className="live-count">{liveLoading?"…":live.length}</span></h2></div><a className="view-all" href="/live">View All <ChevronRight size={17}/></a></div>
   {liveLoading?<div className="live-empty">Loading live matches…</div>:live.length===0?<div className="live-empty"><Radio size={22}/><b>No live matches right now</b><small>Live fixtures appear automatically when the provider reports an in-play event.</small><button onClick={()=>location.href="/live"}><RefreshCw size={14}/> Refresh</button></div>:<div className="live-strip">{live.map(e=><a className="live-card" href={"/event/"+encodeURIComponent(String(e.id))+"?provider=the_odds_api&sport="+encodeURIComponent(e.sport_key||"")} key={e.id}><div className="match-meta"><span className="live-dot">● LIVE</span><span>{e.league||e.sport}</span></div><div className="live-team-list"><b>{e.home_team}</b><b>{e.away_team}</b></div><div className="live-score"><strong>{e.home_score}</strong><strong>{e.away_score}</strong></div><div className="market-row"><span>Open event</span><span>{e.markets?.length||0} markets</span></div></a>)}</div>}
  </section>

  <section className="quick-grid">{[["⚽","Football","Top leagues"],["🔴","Live","In-play now"],["🏀","Basketball","NBA • Euroleague"],["🎾","Tennis","ATP • WTA"]].map(([i,n,c])=><button key={n} className="quick-card" onClick={()=>n==="Live"?location.href="/live":setSport(n==="Football"?"Football":n==="Basketball"?"Basketball":"Tennis")}><span className="quick-icon">{i}</span><b>{n}</b><small>{c}</small></button>)}</section>

  <div className="content-layout" id="events">
   <section className="events">
    <div className="section-head"><div><span className="eyebrow">SPORTS</span><h2>{sport}</h2></div><a className="view-all" href="/sports">View All <ChevronRight size={17}/></a></div>
    <div className="hold-tip"><Clock3 size={14}/> Tap = Single • Press & hold = Multiple</div>
    {loading&&<div className="loading-card">Loading {sport} events…</div>}
    {!loading&&filtered.length===0&&<div className="loading-card">No {sport} events available yet.</div>}
    {filtered.map(m=><article className="match-card" key={m.id}>
      <div className="league-row"><b>{m.league}</b><span>{m.status==="live"?"🔴 LIVE":m.time}</span></div>
      <div className="match-main"><div className="teams"><b>{m.home}</b><b>{m.away}</b></div><a className="match-more" href={eventSource==="provider"?"/event/"+encodeURIComponent(String(m.id))+"?provider=the_odds_api&sport="+encodeURIComponent(m.sport_key||""):"/event/"+m.id}><ChevronRight/></a></div>
      {m.status==="live"&&<div className="score-line"><span>LIVE SCORE</span><strong>{m.homeScore} - {m.awayScore}</strong></div>}
      <div className="odds-row">{m.odds.map(o=>{const selected=multiple.some(x=>x.eventId===m.id&&x.label===o.label);return <button key={o.label} className={"odd"+(selected?" selected":"")} onPointerDown={()=>pressStart(m,o)} onPointerUp={()=>pressEnd(m,o)} onPointerCancel={()=>clearTimeout(timers.current[m.id+"-"+o.label])} onContextMenu={e=>e.preventDefault()}><span>{o.label}</span><strong>{o.odd}</strong></button>})}</div>
      <div className="market-row"><a href={eventSource==="provider"?"/event/"+encodeURIComponent(String(m.id))+"?provider=the_odds_api&sport="+encodeURIComponent(m.sport_key||""):"/event/"+m.id}>More markets</a><span>Bet Builder+</span></div>
    </article>)}
   </section>

   <aside className="betslip">
    <div className="slip-head"><div><b>Bet Slip</b><small>{single.length+multiple.length} selections</small></div><Ticket size={20}/></div>
    <div className="slip-tabs"><button className={single.length?"active":""}>Singles {single.length?"("+single.length+")":""}</button><button className={multiple.length?"active":""}>Multiple {multiple.length?"("+multiple.length+")":""}</button></div>
    {multiple.length>0&&<div className="builder-box"><b>Multiple selected</b><span>{multiple.length} legs • combined odds <strong>{multipleOdds.toFixed(2)}</strong></span><small>Press and hold an odd to add/remove a leg.</small></div>}
    {single.length===0&&multiple.length===0?<div className="empty-slip"><Ticket size={34}/><b>Your bet slip is empty</b><span>Tap an odd for a single or hold it for a multiple.</span></div>:<>{[...single,...multiple].map(s=><div className="slip-item" key={s.id}><button onClick={()=>{setSingle(x=>x.filter(y=>y.id!==s.id));setMultiple(x=>x.filter(y=>y.id!==s.id))}}>×</button><small>{s.event}</small><div><b>{s.label}</b><strong>{Number(s.odd).toFixed(2)}</strong></div></div>)}<div className="stake-row"><span>Multiple potential odds</span><b>{multiple.length?multipleOdds.toFixed(2):"—"}</b></div><a className="place-btn" href="/login">Log in to place bet</a></>}
   </aside>
  </div>
  <SiteFooter/>
  <nav className="bottom-nav"><a href="/"><Home/><span>Home</span></a><a href="/sports"><Trophy/><span>All Sports</span></a><a href="/live"><Radio/><span>In-Play</span></a><a href="/bets" className="selected"><Ticket/><span>My Bets</span></a><a href="/casino"><span className="nav-emoji">🎰</span><span>Casino</span></a></nav>
 </main>;
}
