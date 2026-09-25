"use client";
import {UserRound,ShieldCheck,HelpCircle,Settings,ChevronRight,Home,Radio,Trophy,Ticket} from "lucide-react";
import SiteFooter from "../../components/site-footer";
const items=[["Account","Profile, verification and limits",UserRound,"/account"],["Cashier","Deposit and withdrawal requests",ShieldCheck,"/cashier"],["Responsible Gambling","Limits, cooling-off and support",ShieldCheck,"#"],["Help & Support","Betting and account help",HelpCircle,"#"],["Settings","Language and preferences",Settings,"#"]];
export default function Menu(){
 return <main className="app-shell"><header className="topbar"><a className="brand" href="/">BETNOW<span>365</span></a><a href="/" className="login-btn">Home</a></header>
 <div className="sports-page"><span className="eyebrow">BETNOW365</span><h1>Menu</h1><p>Account, support, responsible-gambling and sportsbook controls.</p><div className="menu-list">{items.map(([name,desc,Icon,href]:any)=><a className="menu-row" href={href} key={name}><Icon size={20}/><span><b>{name}</b><small>{desc}</small></span><ChevronRight size={18}/></a>)}</div></div>
 <SiteFooter/>
 <nav className="bottom-nav"><a href="/"><Home/><span>Home</span></a><a href="/sports"><Trophy/><span>All Sports</span></a><a href="/live"><Radio/><span>In-Play</span></a><a href="/bets"><Ticket/><span>My Bets</span></a><a href="/casino"><span className="nav-emoji">🎰</span><span>Casino</span></a></nav>
 </main>;
}