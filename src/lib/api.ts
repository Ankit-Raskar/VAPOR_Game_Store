const RAWG_BASE = "https://api.rawg.io/api";
const STEAM_STORE_BASE = "https://store.steampowered.com/api";

export interface GameSummary {
  id: number;
  slug: string;
  name: string;
  released: string | null;
  background_image: string | null;
  rating: number;
  metacritic: number | null;
  genres: { id: number; name: string }[];
  parent_platforms?: { platform: { id: number; name: string; slug: string } }[];
}

export interface RawgListResponse {
  count: number;
  next: string | null;
  results: GameSummary[];
}

const emptyGameList: RawgListResponse = { count: 0, next: null, results: [] };

function getRawgKey() {
  return import.meta.env.VITE_RAWG_API_KEY || "";
}

function missingRawgKey() {
  console.warn("RAWG_API_KEY is not available.");
}

function sanitizeRawgList(list: RawgListResponse): RawgListResponse {
  return {
    count: list.count ?? 0,
    next: list.next ? "next" : null,
    results: list.results ?? [],
  };
}

async function rawgFetch<T>(apiKey: string, path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${RAWG_BASE}${path}`);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    console.error("RAWG ERROR:", text);
    throw new Error(`RAWG ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function minusDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function listGames({ data }: { data: any }): Promise<RawgListResponse> {
  const apiKey = getRawgKey();
  if (!apiKey) {
    missingRawgKey();
    return emptyGameList;
  }
  const params: Record<string, string | number> = {
    page: data.page || 1,
    page_size: data.page_size || 20,
  };
  if (data.search) params.search = data.search;
  if (data.ordering) params.ordering = data.ordering;
  if (data.genres) params.genres = data.genres;
  if (data.dates) {
    params.dates = data.dates;
  } else if (data.ordering === "-released") {
    params.dates = `${minusDaysISO(365)},${todayISO()}`;
  }
  const list = await rawgFetch<RawgListResponse>(apiKey, "/games", params);
  const cleaned = {
    ...list,
    results: (list.results ?? []).filter((g) => !!g.background_image),
  };
  return sanitizeRawgList(cleaned);
}

export interface GenreSummary {
  id: number;
  name: string;
  slug: string;
  games_count: number;
  image_background: string | null;
}

export async function listGenres(): Promise<{ count: number; results: GenreSummary[] }> {
  const apiKey = getRawgKey();
  if (!apiKey) {
    missingRawgKey();
    return { count: 0, results: [] };
  }
  return rawgFetch<{ count: number; results: GenreSummary[] }>(apiKey, "/genres", { page_size: 20 });
}

export async function upcomingGames({ data }: { data: any }): Promise<RawgListResponse> {
  const apiKey = getRawgKey();
  if (!apiKey) {
    missingRawgKey();
    return emptyGameList;
  }
  const list = await rawgFetch<RawgListResponse>(apiKey, "/games", {
    dates: `${todayISO()},${plusDaysISO(365)}`,
    ordering: "released",
    page_size: data.page_size || 12,
  });
  return sanitizeRawgList(list);
}

export async function newlyReleasedGames({ data }: { data: any }): Promise<RawgListResponse> {
  const apiKey = getRawgKey();
  if (!apiKey) {
    missingRawgKey();
    return emptyGameList;
  }
  const list = await rawgFetch<RawgListResponse>(apiKey, "/games", {
    dates: `${minusDaysISO(30)},${todayISO()}`,
    ordering: "-released",
    page_size: data.page_size || 12,
  });
  return sanitizeRawgList(list);
}

export async function trendingGames({ data }: { data: any }): Promise<RawgListResponse> {
  const apiKey = getRawgKey();
  if (!apiKey) {
    missingRawgKey();
    return emptyGameList;
  }
  const list = await rawgFetch<RawgListResponse>(apiKey, "/games", {
    dates: `${minusDaysISO(90)},${todayISO()}`,
    ordering: "-added",
    page_size: data.page_size || 12,
  });
  return sanitizeRawgList(list);
}

export interface GameDetail extends GameSummary {
  description_raw: string;
  website: string;
  developers: { id: number; name: string }[];
  publishers: { id: number; name: string }[];
  platforms: { platform: { id: number; name: string } }[];
  tags: { id: number; name: string }[];
  background_image_additional: string | null;
  playtime: number;
  esrb_rating: { id: number; name: string } | null;
}

function fallbackGameDetail(slug: string): GameDetail {
  const name = slug.split("-").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return {
    id: 0,
    slug,
    name: name || "Game details",
    released: null,
    background_image: null,
    rating: 0,
    metacritic: null,
    genres: [],
    description_raw: "Game details temporarily unavailable.",
    website: "",
    developers: [],
    publishers: [],
    platforms: [],
    tags: [],
    background_image_additional: null,
    playtime: 0,
    esrb_rating: null,
  };
}

export async function getGame({ data }: { data: any }): Promise<GameDetail> {
  const apiKey = getRawgKey();
  if (!apiKey) {
    missingRawgKey();
    return fallbackGameDetail(data.slug);
  }
  return rawgFetch<GameDetail>(apiKey, `/games/${encodeURIComponent(data.slug)}`);
}

export interface GameTrailer {
  id: number;
  name: string;
  preview: string;
  data: { 480: string; max: string };
}

export async function getGameTrailers({ data }: { data: any }): Promise<{ results: GameTrailer[] }> {
  const apiKey = getRawgKey();
  if (!apiKey) {
    missingRawgKey();
    return { results: [] };
  }
  try {
    return await rawgFetch<{ results: GameTrailer[] }>(apiKey, `/games/${encodeURIComponent(data.slug)}/movies`);
  } catch {
    return { results: [] };
  }
}

export async function findYoutubeTrailer({ data }: { data: any }): Promise<{ videoId: string | null }> {
  try {
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${encodeURIComponent(data.query)}&sp=EgIQAQ%253D%253D`)}`;
    const res = await fetch(url);
    if (!res.ok) return { videoId: null };
    const json = await res.json();
    const html = json.contents;
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    return { videoId: match?.[1] ?? null };
  } catch {
    return { videoId: null };
  }
}

export interface SystemRequirements {
  minimum: string | null;
  recommended: string | null;
}

async function findSteamAppId(apiKey: string, slug: string): Promise<number | null> {
  try {
    const stores = await rawgFetch<{ results: { url: string }[] }>(apiKey, `/games/${encodeURIComponent(slug)}/stores`);
    const steam = stores.results?.find((s) => /store\.steampowered\.com\/app\/(\d+)/.test(s.url));
    const m = steam?.url.match(/\/app\/(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

function stripHtml(s: string | undefined | null): string | null {
  if (!s) return null;
  return s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/li>/gi, "\n").replace(/<li>/gi, "• ").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim() || null;
}

export async function getSystemRequirements({ data }: { data: any }): Promise<SystemRequirements> {
  const empty: SystemRequirements = { minimum: null, recommended: null };
  const apiKey = getRawgKey();
  if (!apiKey) return empty;
  const appid = await findSteamAppId(apiKey, data.slug);
  if (!appid) return empty;
  try {
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en&filters=basic`)}`;
    const res = await fetch(url);
    if (!res.ok) return empty;
    const json = JSON.parse((await res.json()).contents);
    const entry = json[String(appid)];
    const reqs = entry?.success && !Array.isArray(entry.data?.pc_requirements) ? entry.data?.pc_requirements : null;
    return { minimum: stripHtml(reqs?.minimum), recommended: stripHtml(reqs?.recommended) };
  } catch {
    return empty;
  }
}

export async function getDeveloperGames({ data }: { data: any }): Promise<RawgListResponse> {
  const apiKey = getRawgKey();
  if (!apiKey) {
    missingRawgKey();
    return emptyGameList;
  }
  try {
    const list = await rawgFetch<RawgListResponse>(apiKey, "/games", {
      developers: data.developer,
      page_size: 12,
      ordering: "-added",
    });
    return sanitizeRawgList(data.exclude_slug ? { ...list, results: list.results.filter((g) => g.slug !== data.exclude_slug) } : list);
  } catch {
    return emptyGameList;
  }
}

export async function getSimilarGames({ data }: { data: any }): Promise<RawgListResponse> {
  const apiKey = getRawgKey();
  if (!apiKey) return emptyGameList;
  try {
    const list = await rawgFetch<RawgListResponse>(apiKey, `/games/${encodeURIComponent(data.slug)}/suggested`, { page_size: 12 });
    const filtered = { ...list, results: (list.results ?? []).filter((g) => g.slug !== data.slug) };
    if (filtered.results.length > 0) return sanitizeRawgList(filtered);
  } catch {}
  return emptyGameList;
}

export async function getGameScreenshots({ data }: { data: any }) {
  const apiKey = getRawgKey();
  if (!apiKey) return { results: [] };
  return rawgFetch<{ results: { id: number; image: string }[] }>(apiKey, `/games/${encodeURIComponent(data.slug)}/screenshots`);
}

export interface SteamFeaturedItem {
  id: number;
  type: number;
  name: string;
  discounted: boolean;
  discount_percent: number;
  original_price: number | null;
  final_price: number;
  currency: string;
  large_capsule_image: string;
  header_image: string;
}

export async function steamFeatured() {
  const empty = { specials: [], topSellers: [], newReleases: [] };
  try {
    const res = await fetch("/api/steam?offers=true");
    if (!res.ok) return empty;
    const json = await res.json();
    return {
      specials: json.specials?.items?.slice(0, 8) ?? [],
      topSellers: json.top_sellers?.items?.slice(0, 8) ?? [],
      newReleases: json.new_releases?.items?.slice(0, 8) ?? [],
    };
  } catch {
    return empty;
  }
}

export async function steamNews({ data }: { data: any }) {
  return { appnews: { appid: data.appid, newsitems: [] } };
}

export interface GameMeta {
  appid: number | null;
  review_score_desc: string;
  positive_percent: number;
  total_reviews: number;
  price: { final: string; original: string | null; discount_percent: number; is_free: boolean } | null;
}

export async function getGameMeta({ data }: { data: any }): Promise<GameMeta> {
  const empty: GameMeta = { appid: null, review_score_desc: "", positive_percent: 0, total_reviews: 0, price: null };
  const apiKey = getRawgKey();
  if (!apiKey) return empty;
  
  const appid = await findSteamAppId(apiKey, data.slug);
  if (!appid) return empty;

  const meta: GameMeta = { ...empty, appid };

  try {
    const [reviewsRes, priceRes] = await Promise.all([
      fetch(`/api/steam?appid=${appid}`),
      fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en&filters=price_overview`)}`)
    ]);

    if (reviewsRes.ok) {
      const revData = await reviewsRes.json();
      if (revData?.query_summary) {
        meta.review_score_desc = revData.query_summary.review_score_desc;
        meta.total_reviews = revData.query_summary.total_reviews;
        if (meta.total_reviews > 0) {
          meta.positive_percent = Math.round((revData.query_summary.total_positive / meta.total_reviews) * 100);
        }
      }
    }

    if (priceRes.ok) {
      const priceJson = JSON.parse((await priceRes.json()).contents);
      const entry = priceJson[String(appid)];
      if (entry?.success && entry.data?.price_overview) {
        const po = entry.data.price_overview;
        meta.price = {
          final: po.final_formatted,
          original: po.initial !== po.final ? po.initial_formatted : null,
          discount_percent: po.discount_percent,
          is_free: false
        };
      } else if (entry?.success && entry.data?.is_free) {
        meta.price = { final: "Free", original: null, discount_percent: 0, is_free: true };
      }
    }
  } catch {}

  return meta;
}

export interface SteamReviewSummary {
  appid: number | null;
  steamUrl: string | null;
  review_score: number;
  review_score_desc: string;
  total_positive: number;
  total_negative: number;
  total_reviews: number;
  positive_percent: number;
  reviews: any[];
}

export async function getSteamReviews({ data }: { data: any }): Promise<SteamReviewSummary> {
  const empty: SteamReviewSummary = {
    appid: null, steamUrl: null, review_score: 0, review_score_desc: "No Steam reviews",
    total_positive: 0, total_negative: 0, total_reviews: 0, positive_percent: 0, reviews: []
  };

  const apiKey = getRawgKey();
  if (!apiKey) return empty;
  
  const appid = await findSteamAppId(apiKey, data.slug);
  if (!appid) return empty;

  try {
    const res = await fetch(`/api/steam?appid=${appid}`);
    if (!res.ok) return empty;
    const json = await res.json();
    
    const summary = json.query_summary;
    if (!summary) return empty;

    let positive_percent = 0;
    if (summary.total_reviews > 0) {
      positive_percent = Math.round((summary.total_positive / summary.total_reviews) * 100);
    }

    return {
      appid,
      steamUrl: `https://store.steampowered.com/app/${appid}`,
      review_score: summary.review_score,
      review_score_desc: summary.review_score_desc,
      total_positive: summary.total_positive,
      total_negative: summary.total_negative,
      total_reviews: summary.total_reviews,
      positive_percent,
      reviews: json.reviews || [],
    };
  } catch {
    return empty;
  }
}
