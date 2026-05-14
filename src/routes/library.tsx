import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueries, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { z } from "zod";
import { listGames, listGenres, getGameMeta, type GameSummary } from "@/lib/api";
import { GameCard } from "@/components/GameCard";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";

const PRICE_OPTIONS = [
  { value: "any", label: "Any price" },
  { value: "free", label: "Free" },
  { value: "10", label: "Under $10" },
  { value: "20", label: "Under $20" },
  { value: "40", label: "Under $40" },
  { value: "60", label: "Under $60" },
] as const;

const searchSchema = z.object({
  search: z.string().optional().default(""),
  ordering: z.string().optional().default("-added"),
  page: z.number().int().min(1).optional().default(1),
  genres: z.string().optional().default(""),
  price: z.string().optional().default("any"),
});

function parsePrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  if (/free/i.test(raw)) return 0;
  const m = raw.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

export const Route = createFileRoute("/library")({
  validateSearch: (s) => searchSchema.parse(s),
  component: LibraryPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-xl font-semibold">Couldn't load games</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const ORDERINGS = [
  { value: "-added", label: "Most Popular" },
  { value: "-rating", label: "Top Rated" },
  { value: "-released", label: "Newest" },
  { value: "-metacritic", label: "Best Reviewed" },
  { value: "name", label: "A–Z" },
];

const PAGE_SIZE = 24;
const SERVER_PAGE_SIZE = 40;

function LibraryPage() {
  const { search, ordering, page, genres, price } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [query, setQuery] = useState(search);

  // Debounce input -> URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (query !== search) navigate({ search: (p: any) => ({ ...p, search: query, page: 1 }) });
    }, 350);
    return () => clearTimeout(t);
  }, [query, search, navigate]);

  const priceActive = !!(price && price !== "any" && price !== "free");
  const isFree = price === "free";

  
  // No price filter (or "free" which uses tags): server pagination, fixed PAGE_SIZE per page.
  const plainQuery = useQuery({
    queryKey: ["games", { search, ordering, page, genres, isFree }],
    queryFn: () =>
      listGames({
        data: { search: search || undefined, ordering, page, page_size: PAGE_SIZE, genres: genres || undefined, tags: isFree ? "free-to-play" : undefined },
      }),
    placeholderData: (prev) => prev,
    enabled: !priceActive,
  });

  // Price filter: accumulate server pages, filter client-side, paginate at PAGE_SIZE.
  const infinite = useInfiniteQuery({
    queryKey: ["games-infinite", { search, ordering, genres }],
    queryFn: ({ pageParam }) =>
      listGames({
        data: {
          search: search || undefined,
          ordering,
          page: pageParam as number,
          page_size: SERVER_PAGE_SIZE,
          genres: genres || undefined,
        },
      }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last?.next ? all.length + 1 : undefined),
    enabled: priceActive,
  });

  const allFetched = useMemo<GameSummary[]>(
    () => (infinite.data?.pages ?? []).flatMap((p) => p?.results ?? []),
    [infinite.data],
  );

    const metaQueries = useQueries({
    queries: priceActive
      ? allFetched.map((g) => ({
          queryKey: ["game-meta", g.slug],
          queryFn: () => getGameMeta({ data: { slug: g.slug } }),
          staleTime: 1000 * 60 * 30,
          retry: 0,
        }))
      : [],
  });

  const allMetaSettled =
    priceActive && metaQueries.length > 0 && metaQueries.every((q) => !q.isLoading);

  const filtered = useMemo(() => {
    if (!priceActive) return [] as GameSummary[];
    const out: GameSummary[] = [];
    for (let i = 0; i < allFetched.length; i++) {
      const m = metaQueries[i]?.data as { price?: { final?: string | null } } | undefined;
      const value = parsePrice(m?.price?.final ?? null);
      if (value === null) continue;
      if (price === "free") {
        if (value === 0) out.push(allFetched[i]);
      } else {
        const max = parseFloat(price);
        if (Number.isFinite(max) && value <= max) out.push(allFetched[i]);
      }
    }
    return out;
  }, [priceActive, price, allFetched, metaQueries]);

  // Auto-fetch more pages until we have enough filtered results for the current page, up to a max of 3 pages.
  useEffect(() => {
    if (!priceActive) return;
    if (!allMetaSettled) return;
    if (filtered.length >= page * PAGE_SIZE) return;
    const pagesFetched = infinite.data?.pages.length ?? 0;
    if (infinite.hasNextPage && !infinite.isFetchingNextPage && pagesFetched < 3) {
      infinite.fetchNextPage();
    }
  }, [priceActive, allMetaSettled, filtered.length, page, infinite]);

  const pagesFetched = infinite.data?.pages.length ?? 0;
  const isLoading = priceActive
    ? infinite.isLoading ||
      (filtered.length < page * PAGE_SIZE && (infinite.hasNextPage || !allMetaSettled) && pagesFetched < 3)
    : plainQuery.isLoading;
  const isFetching = priceActive ? infinite.isFetching : plainQuery.isFetching;
  const totalCount = priceActive ? undefined : plainQuery.data?.count;
  const displayed = priceActive
    ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : plainQuery.data?.results ?? [];
  const hasNext = priceActive
    ? filtered.length > page * PAGE_SIZE || infinite.hasNextPage
    : !!plainQuery.data?.next;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Game Library</h1>
          <p className="text-sm text-muted-foreground">
            Browse {totalCount?.toLocaleString() ?? "thousands of"} games
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  navigate({ search: (p: any) => ({ ...p, search: query, page: 1 }) });
                }
              }}
              placeholder="Search games…"
              className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-3 text-sm outline-none focus:border-primary sm:w-72"
            />
          </div>
          <GenreSelect
            value={genres}
            onChange={(g) => navigate({ search: (p: any) => ({ ...p, genres: g, page: 1 }) })}
          />
          <select
            value={price}
            onChange={(e) => navigate({ search: (p: any) => ({ ...p, price: e.target.value, page: 1 }) })}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            aria-label="Price filter"
          >
            {PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={ordering}
            onChange={(e) => navigate({ search: (p: any) => ({ ...p, ordering: e.target.value, page: 1 }) })}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {ORDERINGS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {(genres || priceActive) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filter:</span>
          {genres && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-primary">
              {genres}
              <button
                onClick={() => navigate({ search: (p: any) => ({ ...p, genres: "", page: 1 }) })}
                className="ml-1"
                aria-label="Clear genre"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {priceActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-primary">
              {PRICE_OPTIONS.find((o) => o.value === price)?.label}
              <button
                onClick={() => navigate({ search: (p: any) => ({ ...p, price: "any", page: 1 }) })}
                className="ml-1"
                aria-label="Clear price"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="aspect-[16/9] animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 ${isFetching ? "opacity-70" : ""}`}>
          {displayed.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-center gap-3">
        <button
          disabled={page <= 1}
          onClick={() => navigate({ search: (p: any) => ({ ...p, page: Math.max(1, page - 1) }) })}
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <button
          disabled={!hasNext}
          onClick={() => navigate({ search: (p: any) => ({ ...p, page: page + 1 }) })}
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </main>
  );
}

function GenreSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const { data } = useQuery({ queryKey: ["genres"], queryFn: () => listGenres() });
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
    >
      <option value="">All genres</option>
      {data?.results?.map((g) => (
        <option key={g.id} value={g.slug}>{g.name}</option>
      ))}
    </select>
  );
}
