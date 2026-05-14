import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

interface RawgListResponse {
  count: number;
  next: string | null;
  results: GameSummary[];
}

const emptyGameList: RawgListResponse = { count: 0, next: null, results: [] };

function missingRawgKey() {
  console.warn("RAWG_API_KEY is not available to the backend runtime.");
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
  if (!res.ok) throw new Error(`RAWG ${res.status}: ${await res.text()}`);
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

export const listGames = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        page: z.number().int().min(1).max(50).default(1),
        page_size: z.number().int().min(1).max(40).default(20),
        search: z.string().max(120).optional(),
        ordering: z.string().max(40).optional(),
        genres: z.string().max(60).optional(),
        dates: z.string().max(40).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) {
      missingRawgKey();
      return emptyGameList;
    }
    const params: Record<string, string | number> = {
      page: data.page,
      page_size: data.page_size,
    };
    if (data.search) params.search = data.search;
    if (data.ordering) params.ordering = data.ordering;
    if (data.genres) params.genres = data.genres;
    if (data.dates) {
      params.dates = data.dates;
    } else if (data.ordering === "-released") {
      // Avoid RAWG returning far-future placeholder entries (no images, year 2030+)
      params.dates = `${minusDaysISO(365)},${todayISO()}`;
    }
    const list = await rawgFetch<RawgListResponse>(apiKey, "/games", params);
    // Filter out entries without artwork to keep the grid clean
    const cleaned = {
      ...list,
      results: (list.results ?? []).filter((g) => !!g.background_image),
    };
    return sanitizeRawgList(cleaned);
  });

export interface GenreSummary {
  id: number;
  name: string;
  slug: string;
  games_count: number;
  image_background: string | null;
}

export const listGenres = createServerFn({ method: "GET" }).handler(async () => {
  const apiKey = process.env.VITE_RAWG_API_KEY;
  if (!apiKey) {
    missingRawgKey();
    return { count: 0, results: [] };
  }
  return rawgFetch<{ count: number; results: GenreSummary[] }>(apiKey, "/genres", { page_size: 20 });
});

export const upcomingGames = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ page_size: z.number().int().min(1).max(40).default(12) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) {
      missingRawgKey();
      return emptyGameList;
    }
    const list = await rawgFetch<RawgListResponse>(apiKey, "/games", {
      dates: `${todayISO()},${plusDaysISO(365)}`,
      ordering: "released",
      page_size: data.page_size,
    });
    return sanitizeRawgList(list);
  });

export const newlyReleasedGames = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ page_size: z.number().int().min(1).max(40).default(12) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) {
      missingRawgKey();
      return emptyGameList;
    }
    const list = await rawgFetch<RawgListResponse>(apiKey, "/games", {
      dates: `${minusDaysISO(30)},${todayISO()}`,
      ordering: "-released",
      page_size: data.page_size,
    });
    return sanitizeRawgList(list);
  });

export const trendingGames = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ page_size: z.number().int().min(1).max(40).default(12) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) {
      missingRawgKey();
      return emptyGameList;
    }
    const list = await rawgFetch<RawgListResponse>(apiKey, "/games", {
      dates: `${minusDaysISO(90)},${todayISO()}`,
      ordering: "-added",
      page_size: data.page_size,
    });
    return sanitizeRawgList(list);
  });

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
  const name = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    id: 0,
    slug,
    name: name || "Game details",
    released: null,
    background_image: null,
    rating: 0,
    metacritic: null,
    genres: [],
    description_raw: "Game details are temporarily unavailable.",
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

export const getGame = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) {
      missingRawgKey();
      return fallbackGameDetail(data.slug);
    }
    return rawgFetch<GameDetail>(apiKey, `/games/${encodeURIComponent(data.slug)}`);
  });

export interface GameTrailer {
  id: number;
  name: string;
  preview: string;
  data: { 480: string; max: string };
}

export const getGameTrailers = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ results: GameTrailer[] }> => {
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) {
      missingRawgKey();
      return { results: [] };
    }
    try {
      return await rawgFetch<{ results: GameTrailer[] }>(
        apiKey,
        `/games/${encodeURIComponent(data.slug)}/movies`,
      );
    } catch {
      return { results: [] };
    }
  });

export const findYoutubeTrailer = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ videoId: string | null }> => {
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(data.query)}&sp=EgIQAQ%253D%253D`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!res.ok) return { videoId: null };
      const html = await res.text();
      const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      return { videoId: match?.[1] ?? null };
    } catch {
      return { videoId: null };
    }
  });

export interface SystemRequirements {
  minimum: string | null;
  recommended: string | null;
}

async function findSteamAppId(apiKey: string, slug: string): Promise<number | null> {
  try {
    const stores = await rawgFetch<{ results: { url: string }[] }>(
      apiKey,
      `/games/${encodeURIComponent(slug)}/stores`,
    );
    const steam = stores.results?.find((s) => /store\.steampowered\.com\/app\/(\d+)/.test(s.url));
    const m = steam?.url.match(/\/app\/(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

function stripHtml(s: string | undefined | null): string | null {
  if (!s) return null;
  const cleaned = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || null;
}

export const getSystemRequirements = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<SystemRequirements> => {
    const empty: SystemRequirements = { minimum: null, recommended: null };
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) return empty;
    const appid = await findSteamAppId(apiKey, data.slug);
    if (!appid) return empty;
    try {
      const res = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en&filters=basic`,
      );
      if (!res.ok) return empty;
      const json = (await res.json()) as Record<
        string,
        { success: boolean; data?: { pc_requirements?: { minimum?: string; recommended?: string } | [] } }
      >;
      const entry = json[String(appid)];
      const reqs = entry?.success && !Array.isArray(entry.data?.pc_requirements)
        ? entry.data?.pc_requirements
        : null;
      return {
        minimum: stripHtml(reqs?.minimum),
        recommended: stripHtml(reqs?.recommended),
      };
    } catch {
      return empty;
    }
  });

export const getDeveloperGames = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        developer: z.union([z.string(), z.number()]).transform(String),
        exclude_slug: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<RawgListResponse> => {
    const apiKey = process.env.VITE_RAWG_API_KEY;
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
      const filtered = data.exclude_slug
        ? { ...list, results: list.results.filter((g) => g.slug !== data.exclude_slug) }
        : list;
      return sanitizeRawgList(filtered);
    } catch {
      return emptyGameList;
    }
  });

export const getSimilarGames = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<RawgListResponse> => {
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) {
      missingRawgKey();
      return emptyGameList;
    }
    // Try /suggested first (works for some games), then fall back to genre/tag matching
    try {
      const list = await rawgFetch<RawgListResponse>(
        apiKey,
        `/games/${encodeURIComponent(data.slug)}/suggested`,
        { page_size: 12 },
      );
      const filtered = { ...list, results: (list.results ?? []).filter((g) => g.slug !== data.slug) };
      if (filtered.results.length > 0) return sanitizeRawgList(filtered);
    } catch {
      // fall through to genre-based fallback
    }
    try {
      const detail = await rawgFetch<{
        genres: { id: number }[];
        tags: { id: number; language?: string; games_count?: number }[];
      }>(apiKey, `/games/${encodeURIComponent(data.slug)}`);

      const genreIdsArr = (detail.genres ?? []).map((g) => g.id);
      const genreIds = genreIdsArr.slice(0, 3).join(",");
      if (!genreIds) return emptyGameList;

      // Pick the most descriptive English tags (skip ultra-generic huge tags)
      const tagIds = (detail.tags ?? [])
        .filter((t) => (!t.language || t.language === "eng") && (t.games_count ?? 0) < 8000)
        .slice(0, 6)
        .map((t) => t.id);

      // Try tags + genres for tighter relevance, then fall back to genres only.
      const attempts: Record<string, string | number>[] = [];
      if (tagIds.length >= 2) {
        attempts.push({
          genres: genreIds,
          tags: tagIds.join(","),
          page_size: 24,
          ordering: "-rating",
          metacritic: "60,100",
        });
      }
      attempts.push({
        genres: genreIds,
        page_size: 24,
        ordering: "-rating",
        metacritic: "70,100",
      });
      attempts.push({ genres: genreIds, page_size: 24, ordering: "-added" });

      // Score candidates by overlap with the source game's genres + tags.
      const sourceGenreSet = new Set(genreIdsArr);
      const sourceTagSet = new Set(tagIds);

      for (const params of attempts) {
        const list = await rawgFetch<RawgListResponse & { results: (GameSummary & { tags?: { id: number }[] })[] }>(
          apiKey,
          "/games",
          params,
        );
        const candidates = (list.results ?? []).filter((g) => g.slug !== data.slug);
        if (candidates.length === 0) continue;

        const scored = candidates
          .map((g) => {
            const withTags = g as GameSummary & { tags?: { id: number }[] };
            const gGenres = (g.genres ?? []).map((x) => x.id);
            const gTags = (withTags.tags ?? []).map((x) => x.id);
            const genreOverlap = gGenres.filter((id: number) => sourceGenreSet.has(id)).length;
            const tagOverlap = gTags.filter((id: number) => sourceTagSet.has(id)).length;
            const score = genreOverlap * 3 + tagOverlap + (g.rating ?? 0) / 5;
            return { g, score, genreOverlap };
          })
          .filter((x) => x.genreOverlap > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12)
          .map((x) => x.g);

        if (scored.length >= 6) {
          return sanitizeRawgList({ ...list, results: scored });
        }
      }
      return emptyGameList;
    } catch {
      return emptyGameList;
    }
  });

export const getGameScreenshots = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) {
      missingRawgKey();
      return { results: [] };
    }
    return rawgFetch<{ results: { id: number; image: string }[] }>(
      apiKey,
      `/games/${encodeURIComponent(data.slug)}/screenshots`,
    );
  });

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

export const steamFeatured = createServerFn({ method: "GET" }).handler(async () => {
  const empty = { specials: [], topSellers: [], newReleases: [] };
  const res = await fetch(`${STEAM_STORE_BASE}/featuredcategories?cc=us&l=en`);
  if (!res.ok) {
    console.warn(`Steam featured categories unavailable: ${res.status}`);
    return empty;
  }
  const json = (await res.json()) as {
    specials?: { items: SteamFeaturedItem[] };
    top_sellers?: { items: SteamFeaturedItem[] };
    new_releases?: { items: SteamFeaturedItem[] };
  };
  return {
    specials: json.specials?.items?.slice(0, 8) ?? [],
    topSellers: json.top_sellers?.items?.slice(0, 8) ?? [],
    newReleases: json.new_releases?.items?.slice(0, 8) ?? [],
  };
});

export const steamNews = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ appid: z.number().int().min(1), count: z.number().int().min(1).max(20).default(5) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.STEAM_API_KEY;
    if (!key) {
      console.warn("STEAM_API_KEY is not available to the backend runtime.");
      return { appnews: { appid: data.appid, newsitems: [] } };
    }
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${data.appid}&count=${data.count}&maxlength=400&format=json&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Steam news unavailable: ${res.status}`);
      return { appnews: { appid: data.appid, newsitems: [] } };
    }
    return res.json() as Promise<{
      appnews: { appid: number; newsitems: { gid: string; title: string; url: string; author: string; contents: string; date: number }[] };
    }>;
  });

export interface SteamReviewSummary {
  appid: number | null;
  steamUrl: string | null;
  review_score: number;
  review_score_desc: string;
  total_positive: number;
  total_negative: number;
  total_reviews: number;
  positive_percent: number;
  reviews: {
    recommendationid: string;
    author: { steamid: string; playtime_forever: number; num_reviews: number };
    language: string;
    review: string;
    timestamp_created: number;
    voted_up: boolean;
    votes_up: number;
    votes_funny: number;
  }[];
}

export interface GameMeta {
  appid: number | null;
  review_score_desc: string;
  positive_percent: number;
  total_reviews: number;
  price: { final: string; original: string | null; discount_percent: number; is_free: boolean } | null;
}

export const getGameMeta = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<GameMeta> => {
    const empty: GameMeta = {
      appid: null,
      review_score_desc: "",
      positive_percent: 0,
      total_reviews: 0,
      price: null,
    };
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) return empty;
    let stores: { results: { url: string; store_id: number }[] };
    try {
      stores = await rawgFetch(apiKey, `/games/${encodeURIComponent(data.slug)}/stores`);
    } catch {
      return empty;
    }
    const steam = stores.results?.find((s) => /store\.steampowered\.com\/app\/(\d+)/.test(s.url));
    if (!steam) return empty;
    const m = steam.url.match(/\/app\/(\d+)/);
    if (!m) return empty;
    const appid = Number(m[1]);

    const [reviewsRes, detailsRes] = await Promise.allSettled([
      fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&num_per_page=0&filter=summary&purchase_type=all`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
      fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en&filters=price_overview,basic`),
    ]);

    const out: GameMeta = { ...empty, appid };

    if (reviewsRes.status === "fulfilled" && reviewsRes.value.ok) {
      const j = (await reviewsRes.value.json()) as {
        query_summary?: { review_score_desc?: string; total_positive?: number; total_negative?: number; total_reviews?: number };
      };
      const q = j.query_summary;
      const total = q?.total_reviews ?? 0;
      out.review_score_desc = q?.review_score_desc ?? "";
      out.total_reviews = total;
      out.positive_percent = total > 0 ? Math.round(((q?.total_positive ?? 0) / total) * 100) : 0;
    }

    if (detailsRes.status === "fulfilled" && detailsRes.value.ok) {
      const j = (await detailsRes.value.json()) as Record<string, { success: boolean; data?: { is_free?: boolean; price_overview?: { final_formatted: string; initial_formatted: string; discount_percent: number } } }>;
      const entry = j[String(appid)];
      if (entry?.success && entry.data) {
        if (entry.data.is_free) {
          out.price = { final: "Free", original: null, discount_percent: 0, is_free: true };
        } else if (entry.data.price_overview) {
          const p = entry.data.price_overview;
          out.price = {
            final: p.final_formatted,
            original: p.discount_percent > 0 ? p.initial_formatted : null,
            discount_percent: p.discount_percent,
            is_free: false,
          };
        }
      }
    }

    return out;
  });

export const getSteamReviews = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<SteamReviewSummary> => {
    const empty: SteamReviewSummary = {
      appid: null,
      steamUrl: null,
      review_score: 0,
      review_score_desc: "No Steam reviews",
      total_positive: 0,
      total_negative: 0,
      total_reviews: 0,
      positive_percent: 0,
      reviews: [],
    };
    const apiKey = process.env.VITE_RAWG_API_KEY;
    if (!apiKey) {
      missingRawgKey();
      return empty;
    }
    // Find the Steam store URL via RAWG
    const stores = await rawgFetch<{ results: { url: string; store_id: number }[] }>(
      apiKey,
      `/games/${encodeURIComponent(data.slug)}/stores`,
    );
    const steam = stores.results?.find((s) => /store\.steampowered\.com\/app\/(\d+)/.test(s.url));
    if (!steam) return empty;
    const m = steam.url.match(/\/app\/(\d+)/);
    if (!m) return empty;
    const appid = Number(m[1]);

    const url = `https://store.steampowered.com/appreviews/${appid}?json=1&num_per_page=10&filter=summary&language=english&purchase_type=all`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { ...empty, appid, steamUrl: steam.url };
    const json = (await res.json()) as {
      success: number;
      query_summary: {
        review_score: number;
        review_score_desc: string;
        total_positive: number;
        total_negative: number;
        total_reviews: number;
      };
      reviews?: SteamReviewSummary["reviews"];
    };
    const q = json.query_summary;
    const total = q?.total_reviews ?? 0;
    return {
      appid,
      steamUrl: steam.url,
      review_score: q?.review_score ?? 0,
      review_score_desc: q?.review_score_desc ?? "No reviews",
      total_positive: q?.total_positive ?? 0,
      total_negative: q?.total_negative ?? 0,
      total_reviews: total,
      positive_percent: total > 0 ? Math.round(((q.total_positive) / total) * 100) : 0,
      reviews: json.reviews ?? [],
    };
  });
