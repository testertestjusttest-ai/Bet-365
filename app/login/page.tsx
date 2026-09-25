"use client";
import {FormEvent,useEffect,useState} from "react";
import {createClient} from "../../lib/supabase-browser";

export default function Login(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [nextPath,setNextPath]=useState("/account");

  useEffect(()=>{
    const next=new URLSearchParams(window.location.search).get("next");
    if(next&&next.startsWith("/"))setNextPath(next);
  },[]);

  async function submit(e:FormEvent){
    e.preventDefault(); setError(""); setLoading(true);
    try{
      const supabase=createClient();
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error) throw error;
      window.location.href=nextPath;
    }catch(err){
      setError(err instanceof Error ? err.message : "Unable to log in. If your email needs confirmation, confirm it first and try again.");
    }finally{setLoading(false);}
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <a href="/" className="brand">BETNOW<span>365</span></a>
    <h1>Welcome back</h1><p>Log in to manage your account and bet slip.</p>
    <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required/></label>
    <label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" autoComplete="current-password" required/></label>
    {error&&<div className="auth-error">{error}</div>}
    <button className="place-btn" disabled={loading}>{loading?"Logging in…":"Log in"}</button>
    <a href="/register" className="auth-link">Create an account</a>
  </form></main>;
}