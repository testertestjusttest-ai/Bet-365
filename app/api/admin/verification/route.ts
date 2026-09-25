import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {createServerClientForAuth} from "../../../lib/supabase-server";
async function actor(){const sb=await createServerClientForAuth();const {data:{user}}=await sb.auth.getUser();if(!user)return null;const {data:p}=await sb.from("profiles").select("id,admin_role").eq("id",user.id).maybeSingle();return p}
export async function PATCH(req:Request){
 const a=await actor();if(!a)return NextResponse.json({error:"Unauthorized"},{status:401});if(!["support_admin","admin","main_admin"].includes(a.admin_role))return NextResponse.json({error:"Forbidden"},{status:403});
 const body=await req.json();if(!body.id||!["pending","in_review","approved","rejected","needs_more_info"].includes(body.status))return NextResponse.json({error:"Invalid verification update"},{status:400});
 const sb=createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
 const {error}=await sb.from("verification_requests").update({status:body.status,reviewer_user_id:a.id}).eq("id",body.id);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true});
}