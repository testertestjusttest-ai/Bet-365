"use client";
import {FormEvent,useState} from "react";
import {ChevronLeft,ChevronRight,ShieldCheck,X} from "lucide-react";
import {createClient} from "@/lib/supabase-browser";

type FormState={
 country:string;documentId:string;email:string;phone:string;gender:"Male"|"Female";firstName:string;lastName1:string;lastName2:string;
 dob:string;nationality:string;fiscalResidence:string;address:string;city:string;postalCode:string;username:string;password:string;accept:boolean
};

const initial:FormState={
 country:"Bangladesh",documentId:"",email:"",phone:"",gender:"Male",firstName:"",lastName1:"",lastName2:"",
 dob:"",nationality:"Bangladeshi",fiscalResidence:"",address:"",city:"",postalCode:"",username:"",password:"",accept:false
};

export default function Register(){
 const [step,setStep]=useState(1),[form,setForm]=useState<FormState>(initial),[error,setError]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(false);
 const set=(key:keyof FormState,value:string|boolean)=>setForm(x=>({...x,[key]:value}));

 function next(){
   setError("");
   if(step===1){
     if(!form.country||!form.email||!form.phone||!form.firstName||!form.lastName1||!form.dob||!form.nationality||!form.fiscalResidence){
       setError("Please complete all required personal details.");return;
     }
     const age=new Date().getFullYear()-new Date(form.dob).getFullYear();
     if(age<18){setError("You must meet the legal gambling age in your jurisdiction.");return;}
   }
   if(step===2&&!form.address){setError("Please enter your address.");return;}
   setStep(s=>Math.min(3,s+1));
 }
 function back(){setError("");setStep(s=>Math.max(1,s-1));}

 async function submit(e:FormEvent){
   e.preventDefault();setError("");setMessage("");
   if(!form.username||!form.password){setError("Enter a username and password.");return;}
   if(form.password.length<8){setError("Password must be at least 8 characters.");return;}
   if(!form.accept){setError("Please accept the terms and responsible-gambling requirements.");return;}
   setLoading(true);
   try{
     const supabase=createClient();
     const {data,error}=await supabase.auth.signUp({
       email:form.email,password:form.password,
       options:{data:{
         username:form.username,full_name:[form.firstName,form.lastName1,form.lastName2].filter(Boolean).join(" "),
         country:form.country,document_id:form.documentId,phone:form.phone,gender:form.gender,
         date_of_birth:form.dob,nationality:form.nationality,fiscal_residence:form.fiscalResidence,
         address:form.address,city:form.city,postal_code:form.postalCode
       }}
     });
     if(error)throw error;
     if(data.session)window.location.href="/";
     else setMessage("Registration submitted. Check your email to confirm your account. Real-money features remain unavailable until required verification is completed.");
   }catch(err){setError(err instanceof Error?err.message:"Unable to create your account.");}
   finally{setLoading(false);}
 }

 return <main className="register-page">
  <header className="register-top"><a href="/" className="register-brand">BETNOW<span>365</span></a><a href="/" aria-label="Close"><X/></a></header>
  <form className="register-card" onSubmit={submit}>
   <h1>Join Us</h1>
   <div className="register-steps"><div className={step>=1?"active":""}><b>1.</b><span>Personal Info</span></div><div className={step>=2?"active":""}><b>2.</b><span>Address</span></div><div className={step>=3?"active":""}><b>3.</b><span>Login Details</span></div></div>
   {step===1&&<section className="register-section">
    <label>Country of residence<select value={form.country} onChange={e=>set("country",e.target.value)}><option>Bangladesh</option><option>Spain</option><option>United Kingdom</option><option>Other</option></select></label>
    <p className="register-help">Enter your details accurately as they appear on your identification documents. Verification may be required before betting, deposits or withdrawals.</p>
    <label>National ID / document number<input value={form.documentId} onChange={e=>set("documentId",e.target.value)} placeholder="Document number"/></label>
    <label>Email address<input value={form.email} onChange={e=>set("email",e.target.value)} type="email" placeholder="Email address" autoComplete="email"/></label>
    <label>Mobile number<input value={form.phone} onChange={e=>set("phone",e.target.value)} type="tel" placeholder="+880 mobile number" autoComplete="tel"/></label>
    <div className="gender-switch"><button type="button" className={form.gender==="Male"?"active":""} onClick={()=>set("gender","Male")}>Male</button><button type="button" className={form.gender==="Female"?"active":""} onClick={()=>set("gender","Female")}>Female</button></div>
    <div className="register-two"><input value={form.firstName} onChange={e=>set("firstName",e.target.value)} placeholder="First name"/><input value={form.lastName1} onChange={e=>set("lastName1",e.target.value)} placeholder="Last name"/></div>
    <input value={form.lastName2} onChange={e=>set("lastName2",e.target.value)} placeholder="Last name 2 (optional)"/>
    <label>Date of birth<input value={form.dob} onChange={e=>set("dob",e.target.value)} type="date"/></label>
    <label>Nationality<select value={form.nationality} onChange={e=>set("nationality",e.target.value)}><option>Bangladeshi</option><option>Spanish</option><option>British</option><option>Other</option></select></label>
    <label>Fiscal residence<select value={form.fiscalResidence} onChange={e=>set("fiscalResidence",e.target.value)}><option value="">Select fiscal residence</option><option>Bangladesh</option><option>Spain</option><option>United Kingdom</option><option>Other</option></select></label>
   </section>}
   {step===2&&<section className="register-section">
    <p className="register-help">Your registered address may be used for account verification and regulatory checks.</p>
    <label>Street address<input value={form.address} onChange={e=>set("address",e.target.value)} placeholder="Street and house number" autoComplete="street-address"/></label>
    <label>City / district<input value={form.city} onChange={e=>set("city",e.target.value)} placeholder="City or district" autoComplete="address-level2"/></label>
    <label>Postal code<input value={form.postalCode} onChange={e=>set("postalCode",e.target.value)} placeholder="Postal code" autoComplete="postal-code"/></label>
    <div className="verification-note"><ShieldCheck size={20}/><span>Keep your details accurate. If verification is required, documents may need to match your registered name, date of birth and address.</span></div>
   </section>}
   {step===3&&<section className="register-section">
    <label>Username<input value={form.username} onChange={e=>set("username",e.target.value)} placeholder="Choose a username" autoComplete="username"/></label>
    <label>Password<input value={form.password} onChange={e=>set("password",e.target.value)} type="password" placeholder="At least 8 characters" autoComplete="new-password"/></label>
    <label className="register-check"><input type="checkbox" checked={form.accept} onChange={e=>set("accept",e.target.checked)}/> I confirm that I meet the legal age requirements, the information is accurate, and I agree to the terms and responsible-gambling requirements.</label>
   </section>}
   {error&&<div className="auth-error">{error}</div>}{message&&<div className="auth-success">{message}</div>}
   <div className="register-actions">{step>1?<button type="button" className="secondary-action" onClick={back}><ChevronLeft size={17}/> Back</button>:<span/>}{step<3?<button type="button" className="primary-action" onClick={next}>Continue <ChevronRight size={17}/></button>:<button className="primary-action" disabled={loading}>{loading?"Creating…":"Create account"}</button>}</div>
   <p className="register-footnote">By registering, you agree to the BETNOW365 terms. Account access, deposits, withdrawals and betting are subject to verification, jurisdiction and responsible-gambling controls.</p>
  </form>
 </main>;
}
