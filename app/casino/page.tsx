"use client";
import {ChevronRight,Gamepad2,Home,Radio,Ticket,Trophy} from "lucide-react";
import SiteFooter from "../../components/site-footer";

const providers=["Pragmatic Play","Evolution","NetEnt","Play'n GO","Hacksaw Gaming","Nolimit City","Red Tiger","Quickspin","Microgaming","Playtech","Light & Wonder","Relax Gaming","Yggdrasil","ELK Studios","Push Gaming","Big Time Gaming","Games Global","Blueprint Gaming","Red Rake Gaming","Betsoft","1X2 Network","Spribe","Ezugi","BGaming","Spinomenal","Endorphina","Thunderkick","Wazdan","Tom Horn Gaming","Kalamba Games","Mascot Gaming","3 Oaks Gaming","AvatarUX","BetGames","Turbo Games","Peter & Sons","Lady Luck Games","Playson","Amatic","IGT","Aristocrat"];

export default function Casino(){
 return <main className="app-shell">
  <header className="topbar">
   <a className="brand" href="/">BETNOW<span>365</span></a>
   <div className="top-actions"><a href="/register" className="join-btn">Join</a><a href="/login" className="login-btn">Log in</a></div>
  </header>
  <div className="sports-page casino-page">
   <div className="section-head casino-title"><div><span className="eyebrow">BETNOW365</span><h1>Casino</h1><p>Game providers</p></div><Gamepad2 size={30}/></div>
   <div className="casino-provider-grid">
    {providers.map((name,index)=><a className="casino-provider-card" href="/login" key={name}>
      <div className="casino-provider-mark">{name.slice(0,1)}</div>
      <div><b>{name}</b><small>{index%3===0?"Slots • Live Casino":"Slots • Table Games"}</small></div>
      <ChevronRight size={19}/>
    </a>)}
   </div>
   <div className="casino-provider-note">Provider availability depends on licensing, jurisdiction and the game aggregator connected to BETNOW365. This directory is ready for provider integration; games are not represented as live until the corresponding licensed provider is connected.</div>
  </div>
  <SiteFooter/>
  <nav className="bottom-nav"><a href="/"><Home/><span>Home</span></a><a href="/sports"><Trophy/><span>All Sports</span></a><a href="/live"><Radio/><span>In-Play</span></a><a href="/bets"><Ticket/><span>My Bets</span></a><a href="/casino" className="selected"><span className="nav-emoji">🎰</span><span>Casino</span></a></nav>
 </main>;
}