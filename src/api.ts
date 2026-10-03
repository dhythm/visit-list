import { municipalitiesFromVocabulary } from "./places";
import type { Facility, PlaceChoice, SearchResponse, SuggestResponse } from "./types";

const SUGGEST_URL = "https://api.openpoiapi.com/v1/suggest";
const SEARCH_URL = "https://api.openpoiapi.com/v1/search";

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<string> {
  if (response.status === 429) {
    return "アクセスが集中しています。少し待ってからもう一度お試しください。";
  }
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    if (body.error) return body.error;
    if (body.message) return body.message;
  } catch {
    // The body was not JSON.
  }
  return "検索に失敗しました。通信を確認してもう一度お試しください。";
}

export async function suggestMunicipalities(query: string, signal: AbortSignal): Promise<PlaceChoice[]> {
  const params = new URLSearchParams({ q: query, limit: "8" });
  const response = await fetch(`${SUGGEST_URL}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new ApiError(await readError(response));
  }
  const body = (await response.json()) as SuggestResponse;
  return municipalitiesFromVocabulary(body.vocabulary ?? []);
}

export async function searchFacilities(input: {
  keyword: string;
  center: [number, number];
  radius: number;
  signal: AbortSignal;
}): Promise<Facility[]> {
  const [lng, lat] = input.center;
  const params = new URLSearchParams({
    q: input.keyword,
    center: `${lng},${lat}`,
    radius: String(input.radius),
    limit: "50",
  });
  const response = await fetch(`${SEARCH_URL}?${params.toString()}`, { signal: input.signal });
  if (!response.ok) {
    throw new ApiError(await readError(response));
  }
  const body = (await response.json()) as SearchResponse;
  return body.results ?? [];
}
