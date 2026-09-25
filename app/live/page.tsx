"use client";
import {useEffect,useState} from "react";
import {Home,Radio,RefreshCw,Ticket,Trophy} from "lucide-react";
import SiteFooter from "../../components/site-footer";

export default function Live(){
 const [events,setEvents]=useState<any[]>([]),[source,setSource]=useState("database"),[loading,setLoading]=useState(true),[lastUpdated,setLastUpdated]=useState("");
 async function load(){
   setLoading(true);
   try{
     const r=await fetch("/api/events?status=live&page=0&pageSize=100",{cache:"no-store"});
     const j=await r.json();
     setEvents(j.events||[]);setSource(j.source||"database");setLastUpdated(new Date().toLocaleTimeString());
   }catch{setEvents([])}
   finally{setLoading(false)}
 }
 useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t)},[]);
 return <main className="app-shell"><header className="topbar"><a className="brand" href="/">BETNOW<span>365</span></a><div className="top-actions"><a className="join-btn" href="/">Home</a></div></header>
 <div className="sports-page">
  <div className="section-head"><div><span className="eyebrow">IN PLAY</span><h1>Live matches</h1></div><button className="view-all" onClick={load}><RefreshCw size={14}/> Refresh</button></div>
  <div className="live-status-bar"><span><i/> {loading?"Updating live feed…":events.length+" live events"}</span><small>{lastUpdated?"Updated "+lastUpdated:""}</small></div>
  {loading&&events.length===0?<div className="loading-card">Loading live matches…</div>:events.length===0?<div className="live-empty"><Radio size={25}/><b>{source==="provider"?"No live matches right now":"Live provider feed is not connected"}</b><small>{source==="provider"?"Tap Check again to refresh the provider feed.":"The current free Odds API tier only exposes NBA/MLB moneyline data. If the provider request is unavailable, this deployment falls back to the local database."}</small><button onClick={load}><RefreshCw size={14}/> Check again</button></div>:<div className="live-list">{events.map(e=><a className="live-full-card" href={"/event/"+encodeURIComponent(String(e.id))+"?provider=the_odds_api&sport="+encodeURIComponent(e.sport_key||"")} key={e.id}><div className="live-full-head"><span className="live-dot">● LIVE</span><b>{e.league||e.sport}</b><span>{new Date(e.starts_at).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</span></div><div className="live-full-body"><div><b>{e.home_team}</b><b>{e.away_team}</b></div><div className="live-full-score"><strong>{e.home_score}</strong><strong>{e.away_score}</strong></div></div><div className="live-full-foot"><span>Open event</span><span>{e.markets?.length||0} markets <b>›</b></span></div></a>)}</div>}
  <p className="live-note">Source: {source==="provider"?"live provider feed":"local event database"} • Odds can be suspended or change while an event is in play.</p>
 </div>
 <SiteFooter/>
 <nav className="bottom-nav"><a href="/"><Home/><span>Home</span></a><a href="/sports"><Trophy/><span>All Sports</span></a><a href="/live" className="selected"><Radio/><span>In-Play</span></a><a href="/bets"><Ticket/><span>My Bets</span></a><a href="/casino"><span className="nav-emoji">🎰</span><span>Casino</span></a></nav>
 </main>;
}