"use client";

import {useEffect,useState} from "react";
import {Bell,ChevronRight,CircleUserRound,FileCheck,Headphones,KeyRound,LogOut,ShieldCheck,SlidersHorizontal,Ticket,WalletCards} from "lucide-react";
import {createClient} from "../../lib/supabase-browser";

const items=[
 {href:"/bets",icon:Ticket,title:"My Bets",sub:"Open, settled and bet history"},
 {href:"/cashier",icon:WalletCards,title:"Cashier",sub:"Deposit, withdrawal and transaction requests"},
 {href:"/account/profile",icon:CircleUserRound,title:"Profile details",sub:"Personal details and account information"},
 {href:"/account/verification",icon:FileCheck,title:"Verification",sub:"KYC and account verification status"},
 {href:"/account/security",icon:ShieldCheck,title:"Security",sub:"Password, sessions and account protection"},
 {href:"/account/limits",icon:SlidersHorizontal,title:"Responsible gambling",sub:"Deposit, betting and session limits"},
 {href:"/account/notifications",icon:Bell,title:"Notifications",sub:"Odds, bets and account alerts"},
 {href:"/account/support",icon:Headphones,title:"Help & support",sub:"Contact support and resolve account issues"},
];

export default function Account(){
 const [email,setEmail]=useState("");
 const [signingOut,setSigningOut]=useState(false);
 const supabase=createClient();
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setEmail(data.user?.email||""))},[]);
 async function logout(){setSigningOut(true);await supabase.auth.signOut();location.href="/";}
 return <main className="app-shell account-page">
  <header className="topbar">
   <a className="brand" href="/">BETNOW<span>365</span></a>
   <div className="top-actions"><a className="login-btn" href="/">Home</a></div>
  </header>
  <div className="account-wrap">
   <a className="account-hero account-hero-link" href="/account/profile"><div className="account-avatar"><CircleUserRound size={32}/></div><div><span className="eyebrow">MY ACCOUNT</span><h1>Account</h1><p>{email||"Checking your session…"}</p></div><ChevronRight size={22}/></a>
   <section className="account-balance-grid">
    <a href="/cashier"><span>Cashier</span><b>Deposit & Withdraw</b><small>Manage your balance</small><ChevronRight/></a>
    <a href="/bets"><span>My Bets</span><b>Bet history</b><small>Open & settled bets</small><ChevronRight/></a>
   </section>
   <div className="account-section-title"><span className="eyebrow">ACCOUNT CENTRE</span><h2>Manage your account</h2></div>
   <section className="account-menu">
    {items.map(({href,icon:Icon,title,sub})=><a className="account-menu-row" href={href} key={title}><span className="account-menu-icon"><Icon size={19}/></span><span><b>{title}</b><small>{sub}</small></span><ChevronRight size={18}/></a>)}
   </section>
   <section className="account-logout-panel"><button className="account-logout account-logout-bottom" onClick={logout} disabled={signingOut}><LogOut size={17}/>{signingOut?"Signing out…":"Log out"}</button></section>
  </div>
 </main>;
}