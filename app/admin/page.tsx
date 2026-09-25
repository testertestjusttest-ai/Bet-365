"use client";
import {useEffect,useState} from "react";
import {ShieldCheck,Users,FileCheck,WalletCards,Settings,RefreshCw} from "lucide-react";
import {createClient} from "../../lib/supabase-browser";

type AdminUser={id:string;display_name:string|null;preferred_language:string;admin_role:string;kyc_status:string;created_at:string};
type Verify={id:string;user_id:string;legal_name:string|null;date_of_birth:string|null;country:string|null;document_type:string|null;status:string;created_at:string};

export default function AdminPage(){
 const supabase=createClient();
 const [me,setMe]=useState<AdminUser|null>(null),[users,setUsers]=useState<AdminUser[]>([]),[verifications,setVerifications]=useState<Verify[]>([]),[message,setMessage]=useState("Loading…"),[busy,setBusy]=useState(false);
 async function load(){
  setMessage("Loading admin data…");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){location.href="/login?next=/admin";return;}
  const {data:profile}=await supabase.from("profiles").select("id,display_name,preferred_language,admin_role,kyc_status,created_at").eq("id",user.id).maybeSingle();
  if(!profile || !["support_admin","admin","main_admin"].includes(profile.admin_role)){setMessage("Access denied. This area is restricted to authorized staff.");return;}
  setMe(profile);
  const [u,v]=await Promise.all([
   supabase.from("profiles").select("id,display_name,preferred_language,admin_role,kyc_status,created_at").order("created_at",{ascending:false}).limit(100),
   supabase.from("verification_requests").select("id,user_id,legal_name,date_of_birth,country,document_type,status,created_at").order("created_at",{ascending:false}).limit(100)
  ]);
  setUsers((u.data as AdminUser[])||[]);setVerifications((v.data as Verify[])||[]);setMessage("");
 }
 useEffect(()=>{void load()},[]);
 async function setRole(id:string,role:string){
  if(me?.admin_role!=="main_admin"){setMessage("Only the main admin can change staff roles.");return;}
  setBusy(true);
  const r=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,admin_role:role})});
  const j=await r.json().catch(()=>({}));
  setMessage(r.ok?"Role updated.":j.error||"Role update failed.");await load();setBusy(false);
 }
 async function setKyc(id:string,status:string){
  setBusy(true);
  const r=await fetch("/api/admin/verification",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,status})});
  const j=await r.json().catch(()=>({}));
  setMessage(r.ok?"Verification status updated.":j.error||"Verification update failed.");await load();setBusy(false);
 }
 if(!me)return <main className="app-shell"><div className="sports-page"><h1>Admin</h1><div className="loading-card">{message}</div></div></main>;
 return <main className="app-shell admin-page">
  <header className="topbar"><a className="brand" href="/">BETNOW<span>365</span></a><div className="top-actions"><span className="admin-role-pill">{me.admin_role}</span><a className="login-btn" href="/account">Account</a></div></header>
  <div className="admin-wrap">
   <div className="admin-title"><div><span className="eyebrow">BACK OFFICE</span><h1>Admin control centre</h1><p>Role-based operations for account, KYC, cashier review and platform controls.</p></div><button className="admin-refresh" onClick={()=>load()}><RefreshCw size={16}/> Refresh</button></div>
   {message&&<div className="admin-message">{message}</div>}
   <section className="admin-stat-grid"><article><Users/><b>{users.length}</b><span>Accounts</span></article><article><FileCheck/><b>{verifications.filter(x=>x.status==="pending").length}</b><span>Pending KYC</span></article><article><WalletCards/><b>Review</b><span>Cashier requests</span></article><article><Settings/><b>RBAC</b><span>Staff permissions</span></article></section>
   <section className="admin-card"><h2>Staff & account roles</h2><p className="admin-muted">Main Admin has full control. Admin handles assigned back-office operations. Support Admin is limited to support/verification workflows.</p>
    <div className="admin-table">{users.map(u=><div className="admin-row" key={u.id}><div><b>{u.display_name||"Unnamed user"}</b><small>{u.id.slice(0,8)}… · KYC {u.kyc_status}</small></div><select value={u.admin_role} disabled={me.admin_role!=="main_admin"||busy} onChange={e=>setRole(u.id,e.target.value)}><option value="user">User</option><option value="support_admin">Support Admin</option><option value="admin">Admin</option><option value="main_admin">Main Admin</option></select></div>)}</div>
   </section>
   <section className="admin-card"><h2>Verification queue</h2><div className="admin-table">{verifications.length===0?<div className="admin-muted">No verification submissions yet.</div>:verifications.map(v=><div className="admin-row" key={v.id}><div><b>{v.legal_name||"Identity request"}</b><small>{v.country||"Country not provided"} · {v.document_type||"Document pending"} · {new Date(v.created_at).toLocaleString()}</small></div><select value={v.status} disabled={busy} onChange={e=>setKyc(v.id,e.target.value)}><option value="pending">Pending</option><option value="in_review">In review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="needs_more_info">Needs more info</option></select></div>)}</div></section>
   <section className="admin-card admin-warning"><ShieldCheck/><div><h2>Financial controls</h2><p>Real-money wallet mutation, payment settlement and investment products remain fail-closed until the licensed provider, KYC/age/jurisdiction controls, signed webhooks, reconciliation and independent review are in place.</p></div></section>
  </div>
 </main>;
}