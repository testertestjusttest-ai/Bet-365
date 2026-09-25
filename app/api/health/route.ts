import { NextResponse } from "next/server";

export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasSportsFeedKey = Boolean(process.env.SPORTS_FEED_API_KEY);

  return NextResponse.json({
    ok: true,
    app: "BETNOW365",
    build: "a78f762f114e9181b4d5fb019a6408301b007a9a",
    checks: {
      supabase: hasSupabaseUrl && hasSupabaseAnonKey,
      sportsFeed: hasSportsFeedKey,
    },
  });
}
