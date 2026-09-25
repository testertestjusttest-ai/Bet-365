"use client";
import {ChevronRight,Gamepad2,Home,Radio,Search,Ticket,Trophy} from "lucide-react";
import SiteFooter from "../../components/site-footer";

type Provider={name:string;full:string;type:string;logo?:string};

const providers:Provider[]=[
 {name:"JILI",full:"JILI",type:"Slots • Fishing • Table",logo:"https://www.google.com/s2/favicons?domain=jiligames.com&sz=128"},
 {name:"JDB",full:"JDB",type:"Slots • Arcade • Table",logo:"https://www.google.com/s2/favicons?domain=jdbgaming.com&sz=128"},
 {name:"Pragmatic Play",full:"Pragmatic Play",type:"Slots • Live Casino",logo:"https://www.google.com/s2/favicons?domain=pragmaticplay.com&sz=128"},
 {name:"PG Soft",full:"PG Soft",type:"Slots • Mobile Games",logo:"https://www.google.com/s2/favicons?domain=pgsoft.com&sz=128"},
 {name:"FC",full:"FC",type:"Slots • Casino"},
 {name:"COMBO",full:"COMBO",type:"Slots • Table"},
 {name:"LET'S GO",full:"Let's Go!",type:"Slots • Arcade"},
 {name:"Rich88",full:"Rich88",type:"Slots • Casino"},
 {name:"Mega",full:"Mega",type:"Slots • Table"},
 {name:"YellowBat",full:"YellowBat",type:"Slots • Casino"},
 {name:"FastSpin",full:"FastSpin",type:"Slots • Casino"},
 {name:"Spadegaming",full:"Spadegaming",type:"Slots • Table",logo:"https://www.google.com/s2/favicons?domain=spadegaming.com&sz=128"},
 {name:"FiveG",full:"FiveG",type:"Slots • Casino"},
 {name:"NextSpin",full:"NextSpin",type:"Slots • Casino"},
 {name:"GTF",full:"GTF",type:"Slots • Arcade"},
 {name:"Lucky365",full:"Lucky365",type:"Slots • Casino"},
 {name:"KM",full:"KM",type:"Slots • Table"},
 {name:"Playtech",full:"Playtech",type:"Slots • Live Casino",logo:"https://www.google.com/s2/favicons?domain=playtech.com&sz=128"},
 {name:"Play8",full:"Play8",type:"Slots • Casino"},
 {name:"Red Tiger",full:"Red Tiger",type:"Slots • Casino",logo:"https://www.google.com/s2/favicons?domain=redtiger.com&sz=128"},
 {name:"Drangoon",full:"Drangoon",type:"Slots • Fishing"},
 {name:"Big Time Gaming",full:"Big Time Gaming",type:"Slots • Megaways",logo:"https://www.google.com/s2/favicons?domain=bigtimegaming.com&sz=128"},
 {name:"Creative Gaming",full:"Creative Gaming",type:"Slots • Casino"},
 {name:"OCTOPLAY",full:"Octoplay",type:"Slots • Casino",logo:"https://www.google.com/s2/favicons?domain=octoplay.io&sz=128"},
 {name:"Relax Gaming",full:"Relax Gaming",type:"Slots • Casino",logo:"https://www.google.com/s2/favicons?domain=relax-gaming.com&sz=128"},
 {name:"YL Gaming",full:"YL Gaming",type:"Slots • Casino"},
 {name:"CQ9 Gaming",full:"CQ9 Gaming",type:"Slots • Table",logo:"https://www.google.com/s2/favicons?domain=cq9gaming.com&sz=128"},
 {name:"Joker",full:"Joker",type:"Slots • Arcade"},
 {name:"KA Gaming",full:"KA Gaming",type:"Slots • Table",logo:"https://www.google.com/s2/favicons?domain=kagaming.com&sz=128"},
 {name:"Evolution",full:"Evolution",type:"Live Casino",logo:"https://www.google.com/s2/favicons?domain=evolution.com&sz=128"},
 {name:"NetEnt",full:"NetEnt",type:"Slots • Table",logo:"https://www.google.com/s2/favicons?domain=netent.com&sz=128"},
 {name:"Play'n GO",full:"Play'n GO",type:"Slots • Casino",logo:"https://www.google.com/s2/favicons?domain=playngo.com&sz=128"},
 {name:"Hacksaw Gaming",full:"Hacksaw Gaming",type:"Slots • Casino",logo:"https://www.google.com/s2/favicons?domain=hacksawgaming.com&sz=128"},
 {name:"Nolimit City",full:"Nolimit City",type:"Slots • Casino",logo:"https://www.google.com/s2/favicons?domain=nolimitcity.com&sz=128"},
 {name:"Yggdrasil",full:"Yggdrasil",type:"Slots • Table",logo:"https://www.google.com/s2/favicons?domain=yggdrasilgaming.com&sz=128"},
 {name:"Push Gaming",full:"Push Gaming",type:"Slots • Casino"},
 {name:"Spribe",full:"Spribe",type:"Crash • Instant",logo:"https://www.google.com/s2/favicons?domain=spribe.co&sz=128"},
 {name:"Ezugi",full:"Ezugi",type:"Live Casino",logo:"https://www.google.com/s2/favicons?domain=ezugi.com&sz=128"},
 {name:"BGaming",full:"BGaming",type:"Slots • Crash",logo:"https://www.google.com/s2/favicons?domain=bgaming.com&sz=128"},
 {name:"Wazdan",full:"Wazdan",type:"Slots • Casino",logo:"https://www.google.com/s2/favicons?domain=wazdan.com&sz=128"},
 {name:"IGT",full:"IGT",type:"Slots • Casino",logo:"https://www.google.com/s2/favicons?domain=igt.com&sz=128"},
 {name:"Aristocrat",full:"Aristocrat",type:"Slots • Casino",logo:"https://www.google.com/s2/favicons?domain=aristocrat.com&sz=128"}
];

const initials=(name:string)=>name.split(/\\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();

export default function Casino(){
 const params=typeof window!=="undefined"?new URLSearchParams(window.location.search):null;
 const selected=params?.get("provider")||"";
 const filtered=selected?providers.filter(p=>p.name.toLowerCase()===selected.toLowerCase()):providers;
 return <main className="app-shell">
  <header className="topbar">
   <a className="brand" href="/">BETNOW<span>365</span></a>
   <div className="top-actions"><a href="/account" className="outline-btn">Account</a><a href="/cashier" className="login-btn">Deposit</a></div>
  </header>
  <div className="sports-page casino-page">
   <div className="section-head casino-title"><div><span className="eyebrow">CASINO</span><h1>{selected||"Casino"}</h1><p>{selected?"Provider lobby":"Game providers"}</p></div><Gamepad2 size={30}/></div>
   <div className="casino-filter-row">
    <a className={!selected?"active":""} href="/casino"><Search size={14}/> All</a>
    {selected&&<a className="active" href={"/casino?provider="+encodeURIComponent(selected)}>{selected}</a>}
   </div>
   <div className="casino-provider-grid">
    {filtered.map((provider,index)=><a className="casino-provider-card" href={"/casino?provider="+encodeURIComponent(provider.name)} key={provider.name}>
      <div className={"casino-provider-mark provider-mark-"+(index%8)+(provider.logo?" has-logo":"")}>
        {provider.logo ? <><img src={provider.logo} alt="" loading="lazy" onError={(e)=>{e.currentTarget.remove()}}/><span>{initials(provider.name)}</span></> : <span>{initials(provider.name)}</span>}
      </div>
      <div><b>{provider.full}</b><small>{provider.type}</small></div>
      <ChevronRight size={19}/>
    </a>)}
   </div>
   <div className="casino-provider-note">
    <b>One BETNOW365 account.</b> Provider cards do not redirect players to a second login. A playable game lobby will be opened inside BETNOW365 once the corresponding licensed aggregator/provider is connected.
   </div>
  </div>
  <SiteFooter/>
  <nav className="bottom-nav"><a href="/"><Home/><span>Home</span></a><a href="/sports"><Trophy/><span>All Sports</span></a><a href="/live"><Radio/><span>In-Play</span></a><a href="/bets"><Ticket/><span>My Bets</span></a><a href="/casino" className="selected"><span className="nav-emoji">🎰</span><span>Casino</span></a></nav>
 </main>;
}