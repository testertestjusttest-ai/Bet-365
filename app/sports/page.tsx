"use client";
import {useEffect,useState} from "react";
const fallback=["Football","Basketball","Tennis","NFL","WNBA","Euroleague","Baseball","Ice Hockey","Cricket","Rugby","Boxing","MMA","Golf","Darts"];
export default function Sports(){
 const [active,setActive]=useState("Football"),[events,setEvents]=useState<any[]>([]),[sports,setSports]=useState(fallback),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false),[loading,setLoading]=useState(false);
 async function load(next=0){setLoading(true);try{const r=await fetch("/api/events?sport="+encodeURIComponent(active)+"&page="+next+"&pageSize=48");const j=await r.json();if(next===0)setEvents(j.events||[]);else setEvents(x=>[...x,...(j.events||[])]);setHasMore(Boolean(j.hasMore));if(j.sports?.length)setSports(x=>[...new Set([...x,...j.sports])]);setPage(next);}finally{setLoading(false)}}
 useEffect(()=>{void load(0)},[active]);
 return <main className="app-shell"><header className="topbar"><a className="brand" href="/">BETNOW<span>365</span></a><a className="login-btn" href="/">Home</a></header><div className="sports-page">
 <div className="section-head"><div><span className="eyebrow">ALL SPORTS</span><h1>Sports</h1></div><span className="text-btn">Thousands of fixtures & markets</span></div>
 <p>Browse the full event catalogue. Tap any event to open its available markets.</p>
 <div className="sport-grid">{sports.map(x=><button className={active===x?"sport active":"sport"} onClick={()=>setActive(x)} key={x}>{x}</button>)}</div>
 <div className="event-grid">{events.map(e=><a className="match-card" href={"/event/"+e.id} key={e.id}><div className="match-meta"><span>{e.status==="live"?"🔴 LIVE ":""}{e.league||e.sport}</span><span>{e.status==="live"?e.home_score+" - "+e.away_score:new Date(e.starts_at).toLocaleString()}</span></div><div className="teams"><b>{e.home_team}</b><b>{e.away_team}</b></div><div className="odds-row">{(e.markets?.find((m:any)=>m.active!==false)?.selections||[]).slice(0,3).map((s:any)=><span className="odd" key={s.id}>{s.label} <strong>{Number(s.odds).toFixed(2)}</strong></span>)}</div><div className="market-row"><span>Open event</span><span>{e.markets?.length||0} markets</span></div></a>)}</div>
 {loading&&<div className="loading-card">Loading events…</div>}{!loading&&!events.length&&<div className="loading-card">No events available for {active}.</div>}
 {hasMore&&<button className="place-btn load-more" onClick={()=>load(page+1)} disabled={loading}>Load more events</button>}
 </div></main>
}