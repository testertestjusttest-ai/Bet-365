import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {createServerClientForAuth} from "../../../../lib/supabase-server";

function adminClient(){return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}})}
async function actor(){const sb=await createServerClientForAuth();const {data:{user}}=await sb.auth.getUser();if(!user)return null;const {data:p}=await sb.from("profiles").select("id,admin_role").eq("id",user.id).maybeSingle();return p}
export async function GET(){
 const a=await actor();if(!a)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!["super_admin","finance_admin"].includes(a.admin_role))return NextResponse.json({error:"Forbidden"},{status:403});
 const sb=adminClient();const {data,error}=await sb.from("profiles").select("id,display_name,preferred_language,admin_role,kyc_status,created_at").order("created_at",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({items:data||[]});
}
export async function PATCH(req:Request){
 const a=await actor();if(!a)return NextResponse.json({error:"Unauthorized"},{status:401});if(a.admin_role!=="super_admin")return NextResponse.json({error:"Main Admin only"},{status:403});
 const body=await req.json();if(!body.id||!["user","support","finance_admin","super_admin"].includes(body.admin_role))return NextResponse.json({error:"Invalid role"},{status:400});
 const sb=adminClient();const {error}=await sb.from("profiles").update({admin_role:body.admin_role}).eq("id",body.id);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true});
}