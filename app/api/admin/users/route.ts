import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {createServerClientForAuth} from "../../../../lib/supabase-server";

function adminClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error("Admin service configuration is missing");
 return createSupabaseClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
async function actor(){
 const sb=await createServerClientForAuth();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)return null;
 const {data:p}=await sb.from("profiles").select("id,admin_role").eq("id",user.id).maybeSingle();
 return p;
}
const STAFF_ROLES=["support_admin","admin","main_admin"] as const;
const ASSIGNABLE_ROLES=["user","support_admin","admin","main_admin"] as const;

export async function GET(){
 try{
  const a=await actor();
  if(!a)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!STAFF_ROLES.includes(a.admin_role as typeof STAFF_ROLES[number]))return NextResponse.json({error:"Forbidden"},{status:403});
  const sb=adminClient();
  const {data,error}=await sb.from("profiles").select("id,display_name,preferred_language,admin_role,kyc_status,created_at").order("created_at",{ascending:false}).limit(100);
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({items:data||[]});
 }catch(error:any){
  return NextResponse.json({error:error?.message||"Admin service unavailable"},{status:500});
 }
}

export async function PATCH(req:Request){
 try{
  const a=await actor();
  if(!a)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(a.admin_role!=="main_admin")return NextResponse.json({error:"Main Admin only"},{status:403});
  const body=await req.json();
  if(!body.id||!ASSIGNABLE_ROLES.includes(body.admin_role as typeof ASSIGNABLE_ROLES[number]))return NextResponse.json({error:"Invalid role"},{status:400});
  if(body.id===a.id&&body.admin_role!=="main_admin")return NextResponse.json({error:"Main Admin cannot remove their own main-admin role here."},{status:400});
  const sb=adminClient();
  const {error}=await sb.from("profiles").update({admin_role:body.admin_role}).eq("id",body.id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
 }catch(error:any){
  return NextResponse.json({error:error?.message||"Role update failed"},{status:500});
 }
}
