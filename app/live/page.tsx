"use client";
import {useEffect,useState} from "react";
export default function Live(){
 const [events,setEvents]=useState<any[]>([]);
 useEffect(()=>{let active=true;async function load(){try{const r=await fetch("/api/events?status=live&page=0&pageSize=100");const j=await r.json();if(active)setEvents(j.events||[])}catch{if(active)setEvents([])}}load();const t=setInterval(load,30000);return()=>{active=false;clearInterval(t)}},[]);
 return <main className="app-shell"><header className="topbar"><a className="brand" href="/">BETNOW<span>365</span></a><a className="login-btn" href="/">Home</a></header><div className="sports-page">
 <div className="section-head"><div><span className="eyebrow">IN PLAY</span><h1>Live</h1></div><span className="text-btn">{events.length} live events</span></div>
 {events.length===0?<div className="loading-card">No live events right now.</div>:<div className="live-strip">{events.map(e=><a className="live-card" href={"/event/"+e.id} key={e.id}><div className="match-meta"><span>🔴 LIVE</span><span>{e.league||e.sport}</span></div><div className="teams"><b>{e.home_team}</b><b>{e.away_team}</b></div><div className="live-score"><strong>{e.home_score}</strong><strong>{e.away_score}</strong></div><div className="market-row"><span>Open event</span><span>{e.markets?.length||0} markets</span></div></a>)}</div>}
 <p style={{color:"#899891",fontSize:12}}>Live data refreshes automatically. Suspended markets remain unavailable until the provider reopens them.</p>
 </div></main>
}