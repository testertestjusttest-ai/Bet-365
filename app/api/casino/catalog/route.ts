import { NextResponse } from "next/server";
import { aggregatorStatus, listAggregatorGames } from "../../../../lib/casino/aggregator";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = aggregatorStatus();
  if (!status.configured) {
    return NextResponse.json({
      configured: false,
      status,
      games: [],
      total: 0,
      message: "Casino aggregator is not configured. The local provider directory remains active.",
    });
  }

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const search = url.searchParams.get("search") || undefined;

  try {
    const catalog = await listAggregatorGames({ provider, type, search });
    return NextResponse.json({ configured: true, status, ...catalog });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        status,
        games: [],
        total: 0,
        message: error instanceof Error ? error.message : "Unable to load casino catalog",
      },
      { status: 502 },
    );
  }
}
