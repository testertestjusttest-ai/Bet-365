"use client";

import {useEffect,useMemo,useState} from "react";
import {ChevronRight,Gamepad2,Home,Radio,Search,Ticket,Trophy} from "lucide-react";
import SiteFooter from "../../components/site-footer";

type Provider={name:string;full:string;type:string;logo?:string;gameCount?:number;remote?:boolean};
type CasinoGame={id:string;provider_code:string;name:string;game_type?:string|null;thumbnail_url?:string|null;rtp?:number|null;has_demo?:boolean};

const providers:Provider[]=[];

const initials=(name:string)=>name.split(/\\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
const providerLabel=(code:string)=>code.replace(/[-_]+/g," ").replace(/\\b\\w/g,c=>c.toUpperCase());

export default function Casino(){
 const [selected,setSelected]=useState("");
 const [games,setGames]=useState<CasinoGame[]>([]);
 const [catalogState,setCatalogState]=useState<"loading"|"configured"|"offline">("loading");
 const [catalogMessage,setCatalogMessage]=useState("");
 useEffect(()=>{const params=new URLSearchParams(window.location.search);setSelected(params.get("provider")||"");},[]);
 useEffect(()=>{
   let cancelled=false;
   fetch("/api/casino/catalog").then(async r=>{
     const data=await r.json();
     if(cancelled)return;
     if(!r.ok)throw new Error(data.message||"Casino catalog unavailable");
     setGames(data.games||[]);
     setCatalogState(data.configured?"configured":"offline");
     setCatalogMessage(data.message||"");
   }).catch(error=>{if(cancelled)return;setCatalogState("offline");setCatalogMessage(error instanceof Error?error.message:"Casino catalog unavailable");});
   return()=>{cancelled=true};
 },[]);
 const remoteProviders=useMemo<Provider[]>(()=>{
   const counts=new Map<string,number>();
   for(const game of games) counts.set(game.provider_code,(counts.get(game.provider_code)||0)+1);
   return Array.from(counts.entries()).map(([code,count])=>({name:code,full:providerLabel(code),type:"Connected catalog",gameCount:count,remote:true}));
 },[games]);
 const allProviders=useMemo(()=>{const merged=[...providers];const known=new Set(merged.map(p=>p.name.toLowerCase()));for(const remote of remoteProviders){if(!known.has(remote.name.toLowerCase()))merged.push(remote);}return merged;},[remoteProviders]);
 const filtered=selected?allProviders.filter(p=>p.name.toLowerCase()===selected.toLowerCase()):allProviders;
 const filteredGames=selected?games.filter(g=>g.provider_code.toLowerCase()===selected.toLowerCase()):games;
 return <main className="app-shell">
  <header className="topbar"><a className="brand" href="/">BETNOW<span>365</span></a><div className="top-actions"><a href="/account" className="outline-btn">Account</a><a href="/cashier" className="login-btn">Deposit</a></div></header>
  <div className="sports-page casino-page">
   <div className="section-head casino-title"><div><span className="eyebrow">CASINO</span><h1>{selected||"Casino"}</h1><p>{selected?"Provider lobby":"Game providers"}</p></div><Gamepad2 size={30}/></div>
   <div className="casino-filter-row"><a className={!selected?"active":""} href="/casino"><Search size={14}/> All</a>{selected&&<a className="active" href={"/casino?provider="+encodeURIComponent(selected)}>{selected}</a>}</div>
   <div className="casino-provider-grid">{filtered.map((provider,index)=><a className="casino-provider-card" href={"/casino?provider="+encodeURIComponent(provider.name)} key={provider.name}>
     <div className={"casino-provider-mark provider-mark-"+(index%8)+(provider.logo?" has-logo":"")}>{provider.logo?<><img src={provider.logo} alt="" loading="lazy" onError={(e)=>{e.currentTarget.parentElement?.classList.remove("has-logo");e.currentTarget.remove()}}/><span>{initials(provider.name)}</span></>:<span>{initials(provider.full)}</span>}</div>
     <div><b>{provider.full}</b><small>{provider.type}{provider.gameCount?" • "+provider.gameCount+" games":""}</small></div><ChevronRight size={19}/></a>)}</div>
   {catalogState==="configured"&&filteredGames.length>0&&<section className="casino-games-section"><div className="section-head"><div><span className="eyebrow">CONNECTED CATALOG</span><h2>{selected?selected+" games":"Available games"}</h2></div></div>
    <div className="casino-game-grid">{filteredGames.slice(0,60).map(game=><article className="casino-game-card" key={game.id}>{game.thumbnail_url?<img src={game.thumbnail_url} alt="" loading="lazy"/>:<div className="casino-game-placeholder">{initials(game.name)}</div>}<div className="casino-game-info"><b>{game.name}</b><small>{game.provider_code+" • "+(game.game_type||"Casino")+(game.rtp?" • RTP "+game.rtp+"%":"")}</small></div><span className="casino-demo-badge">{game.has_demo?"Demo":"Catalog"}</span></article>)}</div>
    <p className="casino-provider-note">The connected catalog is read from the server-side Aggregator API. Game launch is intentionally kept in sandbox/demo mode until provider credentials, callback security, jurisdiction/KYC controls and approved production integration are completed.</p>
   </section>}
   {catalogState==="offline"&&<div className="casino-provider-note"><b>Sandbox catalog not connected yet.</b> {catalogMessage||"The local provider directory remains visible. Add a server-side AGGREGATOR_API_KEY when sandbox access is available."}</div>}
   <div className="casino-provider-note"><b>One BETNOW365 account.</b> Provider cards do not redirect players to a second login. A playable game lobby will be opened inside BETNOW365 once the corresponding licensed aggregator/provider is connected.</div>
  </div>
  <SiteFooter/>
  <nav className="bottom-nav"><a href="/"><Home/><span>Home</span></a><a href="/sports"><Trophy/><span>All Sports</span></a><a href="/live"><Radio/><span>In-Play</span></a><a href="/bets"><Ticket/><span>My Bets</span></a><a href="/casino" className="selected"><span className="nav-emoji">🎰</span><span>Casino</span></a></nav>
 </main>;
}