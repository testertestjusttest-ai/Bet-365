"use client";
import {useEffect,useMemo,useState} from "react";
import {Bell,ChevronRight,Globe,Home,Search,Ticket,UserRound,Radio,Trophy} from "lucide-react";
import {createClient} from "../lib/supabase-browser";

type Match={id:number;league:string;time:string;home:string;away:string;flag:string;odds:string[]};
const sports=["Football","Live","Basketball","Tennis","NFL","WNBA","Euroleague","Casino"];
const fallback:Match[]=[
 {id:1,league:"UEFA Champions League",time:"Today • 20:00",home:"Manchester City",away:"Real Madrid",flag:"🇪🇺",odds:["1.72","3.90","4.80"]},
 {id:2,league:"La Liga",time:"Today • 21:00",home:"Barcelona",away:"Atletico Madrid",flag:"🇪🇸",odds:["1.84","3.70","4.20"]},
 {id:3,league:"Bundesliga",time:"Tomorrow • 18:30",home:"Bayern Munich",away:"Dortmund",flag:"🇩🇪",odds:["1.48","5.10","6.40"]},
 {id:4,league:"Premier League",time:"Tomorrow • 20:00",home:"Arsenal",away:"Liverpool",flag:"🏴",odds:["2.35","3.60","2.75"]}
];
const labels=["1","X","2"];

export default function HomePage(){
 const [sport,setSport]=useState("Football"),[query,setQuery]=useState(""),[slip,setSlip]=useState<{id:number;event:string;label:string;odd:string}[]>([]);
 const [lang,setLang]=useState("English"),[showLang,setShowLang]=useState(false),[matches,setMatches]=useState<Match[]>(fallback),[loading,setLoading]=useState(true);
 useEffect(()=>{setLang(localStorage.getItem("betnow365-language")||"English");(async()=>{try{
   if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY){return;}
   const supabase=createClient(); const {data,error}=await supabase.from("events").select("id,league,home_team,away_team,starts_at,markets(id,market_type,selections(label,odds,status))").eq("sport","Football").order("starts_at",{ascending:true}).limit(20);
   if(error) throw error;
   const rows=(data||[]).map((e:any)=>{const result=e.markets?.find((m:any)=>m.market_type==="1X2");const odds=["1","X","2"].map((l,i)=>{const s=result?.selections?.find((x:any)=>x.label===l);return s?Number(s.odds).toFixed(2):fallback.find(x=>x.id===e.id)?.odds[i]||"-"});return {id:e.id,league:e.league||"Football",time:new Date(e.starts_at).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),home:e.home_team,away:e.away_team,flag:"⚽",odds};});
   if(rows.length) setMatches(rows);
 }catch(e){console.warn("Supabase events unavailable; using fallback data.",e)}finally{setLoading(false)}})()},[]);
 const filtered=useMemo(()=>matches.filter(m=>(m.home+" "+m.away+" "+m.league).toLowerCase().includes(query.toLowerCase())),[query,matches]);
 const add=(m:Match,i:number)=>{if(m.odds[i]==="-")return;setSlip(s=>[...s,{id:Date.now(),event:m.home+" vs "+m.away,label:labels[i],odd:m.odds[i]}])};
 return <main className="app-shell">
  <header className="topbar"><div className="brand">BETNOW<span>365</span></div><button className="top-link"><Trophy size={15}/> Rewards</button>
   <div className="top-actions"><button className="lang-btn" onClick={()=>setShowLang(!showLang)}><Globe size={15}/>{lang}</button><a href="/register" className="outline-btn">Register</a><a href="/login" className="login-btn">Log in</a></div>
   {showLang&&<div className="language-menu">{["English","বাংলা","Español","Deutsch","Français"].map(x=><button key={x} onClick={()=>{setLang(x);localStorage.setItem("betnow365-language",x);setShowLang(false)}}>{x}</button>)}</div>}
  </header>
  <div className="search-wrap"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search sports, teams and events"/></div>
  <nav className="sports-strip">{sports.map(x=><button className={sport===x?"sport active":"sport"} key={x} onClick={()=>setSport(x)}>{x}</button>)}</nav>
  <section className="hero"><div><span className="eyebrow">BETNOW365 SPORTS</span><h1>More markets. More ways to play.</h1><p>Explore fixtures, live events and competitive odds in one fast sportsbook experience.</p><button className="cta">Explore events <ChevronRight size={18}/></button></div><div className="hero-mark">365</div></section>
  <section className="quick-grid">{[["⚽","Football","Live fixtures"],["🔴","Live","In-play events"],["🏀","Basketball","Upcoming games"],["🎾","Tennis","Matches today"]].map(([i,n,c])=><button key={n} className="quick-card"><span className="quick-icon">{i}</span><b>{n}</b><small>{c}</small></button>)}</section>
  <div className="content-layout"><section className="events"><div className="section-head"><div><span className="eyebrow">TOP EVENTS</span><h2>{sport==="Football"?"Football":"Popular "+sport}</h2></div><button className="text-btn">View all <ChevronRight size={16}/></button></div>
   <div className="league-tabs"><button className="tab active">Popular</button><button className="tab">Today</button><button className="tab">Tomorrow</button><button className="tab">Boosted</button></div>
   {loading&&<div className="loading-card">Loading live event data…</div>}
   {!loading&&filtered.length===0&&<div className="loading-card">No matching events found.</div>}
   {filtered.map(m=><article className="match-card" key={m.id}><div className="match-meta"><span>{m.flag} {m.league}</span><span>{m.time}</span></div><div className="match-main"><div className="teams"><b>{m.home}</b><b>{m.away}</b></div><a className="match-more" href={"/event/"+m.id}><ChevronRight/></a></div>
    <div className="odds-row">{m.odds.map((o,i)=><button key={i} onClick={()=>add(m,i)} className="odd" disabled={o==="-"}><span>{labels[i]}</span><strong>{o}</strong></button>)}</div><div className="market-row"><span>+ more markets</span><span>Bet Builder available</span></div></article>)}
  </section>
  <aside className="betslip"><div className="slip-head"><div><b>Bet Slip</b><small>{slip.length} selection{slip.length!==1?"s":""}</small></div><Ticket size={20}/></div>
   {slip.length===0?<div className="empty-slip"><Ticket size={34}/><b>Your bet slip is empty</b><span>Select odds to add a selection.</span></div>:<><div className="slip-tabs"><button className="active">Singles</button><button>Bet Builder</button></div>{slip.map(s=><div className="slip-item" key={s.id}><button onClick={()=>setSlip(slip.filter(x=>x.id!==s.id))}>×</button><small>{s.event}</small><div><b>{s.label}</b><strong>{s.odd}</strong></div></div>)}<div className="stake-row"><span>Stake</span><b>$0.00</b></div><a className="place-btn" href="/login">Log in to place bet</a></>}
  </aside></div>
  <nav className="bottom-nav"><a className="selected" href="/"><Home/><span>Home</span></a><a href="/sports"><Trophy/><span>Sports</span></a><a href="/live"><Radio/><span>Live</span></a><a href="/bets"><Ticket/><span>Bets</span></a><a href="/login"><UserRound/><span>Account</span></a></nav>
 </main>;
}