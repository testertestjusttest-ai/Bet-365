import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
  const configured = (process.env.SPORTS_FEED_SPORTS || "auto")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const explicitSports = configured.length && !configured.includes("auto")
    ? new Set(configured)
    : null;

  if (status === "live") {
    // The Odds API's /odds/upcoming endpoint includes all currently live
    // events across sports. This is more reliable than relying only on the
    // scores endpoint, whose coverage is limited to selected sports/leagues.
    const liveOdds = await fetchOdds("upcoming", "h2h");
    const now = Date.now();

    const liveRaw = liveOdds.filter((event: any) => {
      if (explicitSports && !explicitSports.has(String(event.sport_key))) return false;
      if (!sportMatches(requestedSport, event)) return false;
      const startMs = Date.parse(event.commence_time);
      return Number.isFinite(startMs) && startMs <= now;
    });

    // Scores are optional enrichment. A live event must not disappear merely
    // because its sport/league is not yet covered by the scores endpoint.
    const bySport = new Map<string, any[]>();
    for (const event of liveRaw) {
      const key = String(event.sport_key || "");
      if (!bySport.has(key)) bySport.set(key, []);
      bySport.get(key)!.push(event);
    }

    const scoreMap = new Map<string, any>();
    await Promise.all(
      [...bySport.keys()].map(async (sportKey) => {
        try {
          const scores = await fetchScores(sportKey);
          for (const score of scores) scoreMap.set(score.id, score);
        } catch (error: any) {
          console.warn("Provider score enrichment unavailable", sportKey, error?.message);
        }
      })
    );

    const results = liveRaw.map((event: any) => {
      const item = normalizeProviderEvent(event, scoreMap.get(event.id));
      return { ...item, status: "live" };
    });

    results.sort(
      (a, b) =>
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
      const odds = await fetchOdds(sport.key);
      const scoreMap = new Map<string, any>();
      let scores: any[] = [];
      try {
        scores = await fetchScores(sport.key);
      } catch {
        scores = [];
      }
      for (const score of scores) scoreMap.set(score.id, score);

      for (const raw of odds) {
        const start = new Date(raw.commence_time).getTime();
        const item = normalizeProviderEvent(raw, scoreMap.get(raw.id));
        if (status === "scheduled" && item.status !== "scheduled") continue;
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
    }
  }

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Sports data is not configured." },
      { status: 503 }
    );
  }

  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = db
    .from("events")
    .select(
      "id,sport,league,home_team,away_team,starts_at,status,home_score,away_score,markets(id,name,market_type,active,selections(id,label,odds,status,point))",
      { count: "exact" }
    )
    .order("starts_at", { ascending: true })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (sport && sport !== "All") query = query.eq("sport", sport);
  if (status === "live") query = query.eq("status", "live");
  else if (status === "scheduled") query = query.eq("status", "scheduled");
  else if (status === "finished") query = query.eq("status", "finished");
  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lt("starts_at", to);
  if (search)
    query = query.or(
      "home_team.ilike.%" +
        search +
        "%,away_team.ilike.%" +
        search +
        "%,league.ilike.%" +
        search +
        "%"
    );

  const { data, error, count } = await query;
  if (error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const sports = [...new Set((data || []).map((e: any) => e.sport).filter(Boolean))];
  return NextResponse.json({
    ok: true,
    events: data || [],
    sports,
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > (page + 1) * pageSize,
    source: "database",
  });
}
