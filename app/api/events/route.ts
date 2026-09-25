import { NextRequest, NextResponse } from "next/server";
import { chooseBookmaker, fetchOdds, fetchScores, fetchSports } from "../../../lib/feed/the-odds-api";

export const dynamic = "force-dynamic";

function eventStatus(score: { completed: boolean } | undefined, commence?: string) {
  if (score?.completed) return "finished";
  // A start time in the past is not enough to call an event live.
  // The provider's live scores feed is the authoritative live signal.
  if (score && commence && new Date(commence).getTime() <= Date.now()) return "live";
  return "scheduled";
}

function normalizeProviderEvent(event: any, score: any) {
  const bookmaker = chooseBookmaker(event);
  const markets = (bookmaker?.markets || [])
    .map((m: any) => ({
      id: m.key,
      name:
        m.key === "h2h"
          ? "Match Result"
          : m.key === "spreads"
            ? "Handicap"
            : m.key === "totals"
              ? "Total"
              : m.key.replaceAll("_", " "),
      market_type: m.key,
      active: true,
      selections: (m.outcomes || [])
        .filter((o: any) => typeof o.price === "number" && o.price > 1)
        .map((o: any) => ({
          id: m.key + ":" + o.name + ":" + String(o.point ?? ""),
          label:
            o.point == null
              ? o.name
              : o.name + " " + (o.point > 0 ? "+" : "") + o.point,
          odds: Number(o.price),
          status: "open",
          point: o.point ?? null,
        })),
    }))
    .filter((m: any) => m.selections.length);

  const rows = score?.scores || [];
  const homeScore = Number(
    rows.find((s: any) => s.name === event.home_team)?.score || 0
  );
  const awayScore = Number(
    rows.find((s: any) => s.name === event.away_team)?.score || 0
  );

  return {
    id: event.id,
    sport: event.sport_title || event.sport_key,
    sport_key: event.sport_key,
    league: event.sport_title || event.sport_key,
    home_team: event.home_team,
    away_team: event.away_team,
    starts_at: event.commence_time,
    status: eventStatus(score, event.commence_time),
    home_score: Number.isFinite(homeScore) ? homeScore : 0,
    away_score: Number.isFinite(awayScore) ? awayScore : 0,
    markets,
  };
}

function sportMatches(requested: string | null, item: any) {
  if (!requested || requested === "All") return true;
  const q = requested.toLowerCase();
  const key = String(item.key || "").toLowerCase();
  const group = String(item.group || "").toLowerCase();
  const title = String(item.title || "").toLowerCase();

  const aliases: Record<string, string[]> = {
    football: ["soccer", "football"],
    basketball: ["basketball"],
    tennis: ["tennis"],
    nfl: ["americanfootball_nfl"],
    wnba: ["basketball_wnba"],
    euroleague: ["basketball_euroleague"],
    baseball: ["baseball"],
    "ice hockey": ["icehockey"],
    cricket: ["cricket"],
    rugby: ["rugby"],
    boxing: ["boxing"],
    mma: ["mma"],
    golf: ["golf"],
    darts: ["darts"],
    futsal: ["futsal"],
    volleyball: ["volleyball"],
    handball: ["handball"],
    "table tennis": ["tabletennis", "table_tennis"],
    badminton: ["badminton"],
    "aussie rules": ["aussierules"],
    esports: ["esports", "e_sports"],
  };

  const wanted = aliases[q] || [q];
  return wanted.some((x) => key.includes(x) || group.includes(x) || title.includes(x));
}

function parseDate(value: string | null) {
  if (!value) return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}

async function providerEvents(requestedSport: string | null, status: string | null, from: string | null, to: string | null) {
  // The free Odds API plan has a small monthly quota. Keep the public
  // browsing path to one featured market and make the event-detail endpoint
  // responsible for additional markets. Set SPORTS_FEED_FREE_MODE=false when
  // using a paid quota and wanting the full configured market set.
  const freeMode = process.env.SPORTS_FEED_FREE_MODE !== "false";
  const configured = (process.env.SPORTS_FEED_SPORTS || "auto")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const explicitSports = configured.length && !configured.includes("auto")
    ? new Set(configured)
    : null;

  if (status === "live") {
    // Live status is provider-authoritative. An event being past its
    // scheduled start time is NOT enough to call it live.
    const liveOdds = await fetchOdds("upcoming", "h2h");
    const now = Date.now();
    const candidates = liveOdds.filter((event: any) => {
      if (explicitSports && !explicitSports.has(String(event.sport_key))) return false;
      if (!sportMatches(requestedSport, event)) return false;
      const startMs = Date.parse(event.commence_time);
      return Number.isFinite(startMs) && startMs <= now;
    });

    // One score request per sport that actually has a candidate event.
    // This keeps the free plan usable while ensuring we never label a
    // merely scheduled event as LIVE.
    const scoreMap = new Map<string, any>();
    const bySport = new Set(candidates.map((e: any) => String(e.sport_key || "")));
    await Promise.all([...bySport].map(async (sportKey) => {
      try {
        const scores = await fetchScores(sportKey);
        for (const score of scores) {
          if (!score.completed) scoreMap.set(score.id, score);
        }
      } catch (error: any) {
        console.warn("Provider live score request unavailable", sportKey, error?.message);
      }
    }));

    const results = candidates
      .filter((event: any) => scoreMap.has(event.id))
      .map((event: any) => normalizeProviderEvent(event, scoreMap.get(event.id)))
      .filter((event: any) => event.status === "live");

    results.sort((a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
    return results;
  }

  let sportItems: any[];
  if (configured.length && !configured.includes("auto")) {
    const all = await fetchSports();
    sportItems = all.filter((s) => configured.includes(s.key));
  } else {
    sportItems = (await fetchSports()).filter((s) => s.active);
  }

  sportItems = sportItems.filter((s) => sportMatches(requestedSport, s));

  // Keep scheduled browsing bounded. The Live branch above uses the provider's
  // all-sports endpoint so it is not limited to the first 24 active sports.
  const maxSports = Math.min(sportItems.length, 24);
  const selected = sportItems.slice(0, maxSports);
  const results: any[] = [];

  for (const sport of selected) {
    try {
      const odds = await fetchOdds(sport.key, freeMode ? "h2h" : undefined);
      for (const raw of odds) {
        const start = new Date(raw.commence_time).getTime();
        const item = normalizeProviderEvent(raw, undefined);
        if (status === "scheduled" && (item.status !== "scheduled" || start <= Date.now())) continue;
        if (status === "finished" && item.status !== "finished") continue;

        const fromMs = parseDate(from);
        const toMs = parseDate(to);
        if (fromMs !== null && start < fromMs) continue;
        if (toMs !== null && start >= toMs) continue;

        results.push(item);
      }
    } catch (error: any) {
      console.warn("Provider sport unavailable", sport.key, error?.message);
    }
  }

  results.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
  return results;
}

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const q = req.nextUrl.searchParams;
  const sport = q.get("sport");
  const status = q.get("status");
  const search = q.get("search")?.trim();
  const from = q.get("from");
  const to = q.get("to");
  const page = Math.max(0, Number(q.get("page") || 0));
  const pageSize = Math.min(100, Math.max(12, Number(q.get("pageSize") || 48)));

  if (process.env.SPORTS_FEED_API_KEY) {
    try {
      let events = await providerEvents(sport, status, from, to);
      if (search) {
        const needle = search.toLowerCase();
        events = events.filter((e) =>
          (e.home_team + " " + e.away_team + " " + e.league)
            .toLowerCase()
            .includes(needle)
        );
      }

      const total = events.length;
      const paged = events.slice(page * pageSize, (page + 1) * pageSize);
      return NextResponse.json({
        ok: true,
        events: paged,
        sports: [...new Set(events.map((e) => e.sport))],
        total,
        page,
        pageSize,
        hasMore: total > (page + 1) * pageSize,
        source: "provider",
      });
    } catch (error: any) {
      console.warn("Provider feed unavailable", error?.message);
      return NextResponse.json({ok:false,error:"The live sports provider is unavailable. No local/demo events are being substituted.",source:"provider"}, {status:502});
    }
  }

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Sports provider is not configured. No demo/local fixtures are served.", source: "provider" },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: false, error: "Sports provider is unavailable. No demo/local fixtures are served.", source: "provider" },
    { status: 503 }
  );
}
