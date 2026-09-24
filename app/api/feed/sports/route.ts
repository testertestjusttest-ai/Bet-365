import {NextRequest,NextResponse} from "next/server";
import {fetchSports} from "../../../../lib/feed/the-odds-api";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const secret=process.env.FEED_SYNC_SECRET||process.env.CRON_SECRET;
  if(secret){
    const auth=req.headers.get("authorization")||"";
    const provided=req.headers.get("x-feed-sync-secret")||((auth.startsWith("Bearer "))?auth.slice(7):"");
    if(provided!==secret)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  }
  try{return NextResponse.json({ok:true,sports:await fetchSports()})}
  catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Sports discovery failed"},{status:500})}
}