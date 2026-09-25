"use client";

import {useEffect,useState} from "react";
import {Bell,ChevronRight,CircleUserRound,FileCheck,Headphones,KeyRound,LogOut,ShieldCheck,SlidersHorizontal,Ticket,WalletCards} from "lucide-react";
import {createClient} from "../../lib/supabase-browser";

const items=[
 {href:"/bets",icon:Ticket,title:"My Bets",sub:"Open, settled and bet history"},
 {href:"/cashier",icon:WalletCards,title:"Cashier",sub:"Deposit, withdrawal and transaction requests"},
 {href:"#profile",icon:CircleUserRound,title:"Profile details",sub:"Personal details and account information"},
 {href:"#verification",icon:FileCheck,title:"Verification",sub:"KYC and account verification status"},
 {href:"#security",icon:ShieldCheck,title:"Security",sub:"Password, sessions and account protection"},
 {href:"#limits",icon:SlidersHorizontal,title:"Responsible gambling",sub:"Deposit, betting and session limits"},
 {href:"#notifications",icon:Bell,title:"Notifications",sub:"Odds, bets and account alerts"},
 {href:"#support",icon:Headphones,title:"Help & support",sub:"Contact support and resolve account issues"},
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
   <section className="account-hero">
    <div className="account-avatar"><CircleUserRound size={32}/></div>
    <div><span className="eyebrow">MY ACCOUNT</span><h1>Account</h1><p>{email||"Checking your session…"}</p></div>
    <button className="account-logout" onClick={logout} disabled={signingOut}><LogOut size={17}/>{signingOut?"Signing out…":"Log out"}</button>
   </section>
   <section className="account-balance-grid">
    <a href="/cashier"><span>Cashier</span><b>Deposit & Withdraw</b><small>Manage your balance</small><ChevronRight/></a>
    <a href="/bets"><span>My Bets</span><b>Bet history</b><small>Open & settled bets</small><ChevronRight/></a>
   </section>
   <div className="account-section-title"><span className="eyebrow">ACCOUNT CENTRE</span><h2>Manage your account</h2></div>
   <section className="account-menu">
    {items.map(({href,icon:Icon,title,sub})=><a className="account-menu-row" href={href} key={title}><span className="account-menu-icon"><Icon size={19}/></span><span><b>{title}</b><small>{sub}</small></span><ChevronRight size={18}/></a>)}
   </section>
   <section className="account-panels">
    <article id="profile"><h3>Profile details</h3><p>Account email</p><b>{email||"Not signed in"}</b></article>
    <article id="verification"><h3>Verification</h3><p>Identity and age verification</p><span className="account-status">Review required when real-money services are enabled</span></article>
    <article id="security"><h3>Security</h3><p><KeyRound size={15}/> Keep your password private and use a unique password.</p></article>
    <article id="limits"><h3>Responsible gambling</h3><p>Set betting, deposit and session limits before using real-money features.</p></article>
    <article id="notifications"><h3>Notifications</h3><p>Manage account, odds and bet alerts.</p></article>
    <article id="support"><h3>Help & support</h3><p>Support centre and account assistance.</p></article>
   </section>
  </div>
 </main>;
}