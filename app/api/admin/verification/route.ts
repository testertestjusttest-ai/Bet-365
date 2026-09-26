import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {createServerClientForAuth} from "../../../../lib/supabase-server";

async function actor(){
 const sb=await createServerClientForAuth();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)return null;
 const {data:p}=await sb.from("profiles").select("id,admin_role").eq("id",user.id).maybeSingle();
 return p;
}

const STAFF_ROLES=["support_admin","admin","main_admin"] as const;
const VERIFICATION_STATUSES=["pending","under_review","approved","rejected"] as const;

export async function PATCH(req:Request){
 try{
  const a=await actor();
  if(!a)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!STAFF_ROLES.includes(a.admin_role as typeof STAFF_ROLES[number]))return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await req.json();
  if(!body.id||!VERIFICATION_STATUSES.includes(body.status as typeof VERIFICATION_STATUSES[number]))return NextResponse.json({error:"Invalid verification update"},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:"Admin service configuration is missing"},{status:500});
  const sb=createSupabaseClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const reviewed=body.status==="approved"||body.status==="rejected";
  const {error}=await sb.from("verification_requests").update({
   status:body.status,
   reviewer_user_id:a.id,
   reviewed_at:reviewed?new Date().toISOString():null,
   review_note:typeof body.review_note==="string"?body.review_note.trim()||null:null,
   updated_at:new Date().toISOString()
  }).eq("id",body.id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
 }catch(error:any){
  return NextResponse.json({error:error?.message||"Verification update failed"},{status:500});
 }
}
