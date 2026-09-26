type AggregatorGame = {
  id: string;
  provider_code: string;
  provider_game_id?: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  game_type?: string | null;
  rtp?: number | null;
  has_demo?: boolean;
  thumbnail_url?: string | null;
  supported_currencies?: string[];
  blocked_countries?: string[];
  certified_markets?: unknown;
};

type AggregatorGamesResponse = {
  games?: AggregatorGame[];
  total?: number;
  page?: number;
  per_page?: number;
};

const DEFAULT_BASE_URL = "https://api.aggregator.gg/v1";

function config() {
  const apiKey = process.env.AGGREGATOR_API_KEY?.trim();
  const baseUrl = (process.env.AGGREGATOR_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const currency = (process.env.AGGREGATOR_CURRENCY || "USD").trim().toUpperCase();
  const country = (process.env.AGGREGATOR_COUNTRY || "BD").trim().toUpperCase();
  const subOperatorRef = process.env.AGGREGATOR_SUB_OPERATOR_REF?.trim() || "";

  return { apiKey, baseUrl, currency, country, subOperatorRef };
}

function configured() {
  return Boolean(config().apiKey);
}

async function aggregatorFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiKey, baseUrl } = config();
  if (!apiKey) throw new Error("AGGREGATOR_API_KEY is not configured");

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const body = await response.text();
  let parsed: unknown = null;
  try { parsed = body ? JSON.parse(body) : null; } catch { parsed = { message: body }; }

  if (!response.ok) {
    const error = parsed && typeof parsed === "object" && "error" in parsed
      ? (parsed as { error?: { message?: string; code?: string } }).error
      : undefined;
    throw new Error(error?.message || `Aggregator API returned HTTP ${response.status}`);
  }

  return parsed as T;
}

export function aggregatorStatus() {
  const { currency, country, subOperatorRef } = config();
  return {
    configured: configured(),
    environment: config().apiKey?.startsWith("sk_test_") ? "test" : config().apiKey ? "live" : "not-configured",
    currency,
    country,
    subOperatorRef: subOperatorRef || null,
  };
}

export async function listAggregatorGames(options?: {
  provider?: string;
  type?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const { currency, subOperatorRef } = config();
  const params = new URLSearchParams();
  params.set("currency", currency);
  params.set("page", String(options?.page || 1));
  params.set("per_page", String(Math.min(options?.perPage || 200, 200)));
  if (options?.provider) params.set("provider", options.provider);
  if (options?.type) params.set("type", options.type);
  if (options?.search) params.set("search", options.search);
  if (subOperatorRef) params.set("sub_operator_ref", subOperatorRef);

  const data = await aggregatorFetch<AggregatorGamesResponse>(`/games?${params.toString()}`);
  return {
    games: data.games || [],
    total: data.total || 0,
    page: data.page || 1,
    perPage: data.per_page || options?.perPage || 200,
  };
}

export type { AggregatorGame };
