"use client";
import {FormEvent,useState} from "react";
import {createClient} from "@/lib/supabase-browser";

export default function Register(){
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [ok,setOk]=useState(false); const [error,setError]=useState(""); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault(); setError(""); setMessage("");
    if(!ok){setError("Please confirm the legal age and jurisdiction requirements.");return;}
    if(password.length<8){setError("Password must be at least 8 characters.");return;}
    setLoading(true);
    try{
      const supabase=createClient();
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
      if(error) throw error;
      if(data.session) window.location.href="/";
      else setMessage("Account created. Check your email to confirm your address before signing in.");
    }catch(err){
      setError(err instanceof Error ? err.message : "Unable to create your account.");
    }finally{setLoading(false);}
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <a href="/" className="brand">BETNOW<span>365</span></a>
    <h1>Create your account</h1><p>Set up your BETNOW365 profile.</p>
    <label>Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name" required/></label>
    <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required/></label>
    <label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="At least 8 characters" autoComplete="new-password" required/></label>
    <label className="check"><input type="checkbox" checked={ok} onChange={e=>setOk(e.target.checked)}/> I confirm I meet the legal age and jurisdiction requirements.</label>
    {error&&<div className="auth-error">{error}</div>}
    {message&&<div className="auth-success">{message}</div>}
    <button className="place-btn" disabled={!ok||loading}>{loading?"Creating…":"Register"}</button>
    <a href="/login" className="auth-link">Already have an account? Log in</a>
  </form></main>;
}