import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key) return NextResponse.json({ok:false,error:"Sports data is not configured."},{status:503});
 const q=req.nextUrl.searchParams; const sport=q.get("sport"); const status=q.get("status"); const search=q.get("search")?.trim();
 const page=Math.max(0,Number(q.get("page")||0)); const pageSize=Math.min(100,Math.max(12,Number(q.get("pageSize")||48)));
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 let query=db.from("events").select("id,sport,league,home_team,away_team,starts_at,status,home_score,away_score,markets(id,name,market_type,active,selections(id,label,odds,status,point))",{count:"exact"}).order("starts_at",{ascending:true}).range(page*pageSize,(page+1)*pageSize-1);
 if(sport&&sport!=="All") query=query.eq("sport",sport);
 if(status==="live") query=query.eq("status","live"); else if(status==="scheduled") query=query.eq("status","scheduled");
 if(search) query=query.or("home_team.ilike.%"+search+"%,away_team.ilike.%"+search+"%,league.ilike.%"+search+"%");
 const {data,error,count}=await query; if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
 const sports=[...new Set((data||[]).map((e:any)=>e.sport).filter(Boolean))];
 return NextResponse.json({ok:true,events:data||[],sports,total:count||0,page,pageSize,hasMore:(count||0)>(page+1)*pageSize});
}