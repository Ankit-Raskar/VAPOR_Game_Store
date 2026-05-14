import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { listGames, getGameScreenshots, trendingGames, type GameSummary } from "@/lib/api";
import { addToLibrary } from "@/lib/library";
import { useAuth } from "@/hooks/use-auth";

function isoDay(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function priceFor(g: GameSummary): { final: number; original: number | null; discount: number | null } {
  const seed = (g.id % 7) + 1;
  const base = 9.99 + seed * 5;
  const hasDiscount = g.id % 3 === 0;
  if (!hasDiscount) return { final: base, original: null, discount: null };
  const discount = 10 + ((g.id % 6) * 10);
  const final = +(base * (1 - discount / 100)).toFixed(2);
  return { final, original: base, discount };
}

export function RecommendedInfiniteHome() {
  const trending = useQuery({
    queryKey: ["trending"],
    queryFn: () => trendingGames({ data: { page_size: 40 } }),
  });
  const seed =
    (trending.data?.results ?? []).find((g) => !!g.background_image && !!g.released)?.name ??
    "your library";
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <RecommendedInfinite seed={seed} />
    </div>
  );
}

export function RecommendedInfinite({ seed }: { seed: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["recommended-infinite"],
      queryFn: ({ pageParam }) =>
        listGames({
          data: {
            page: pageParam as number,
            page_size: 10,
            ordering: "-rating",
            dates: `${isoDay(-365 * 3)},${isoDay(0)}`,
          },
        }),
      initialPageParam: 1,
      getNextPageParam: (_last, all) => (all.length < 8 ? all.length + 1 : undefined),
      staleTime: 5 * 60_000,
    });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const games = (data?.pages.flatMap((p) => p.results) ?? []).filter(
    (g) => !!g.background_image,
  );

  const [ignored, setIgnored] = useState<Set<number>>(new Set());
  const visible = games.filter((g) => !ignored.has(g.id));
  const ignore = (id: number) =>
    setIgnored((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">Recommended For You</h2>
      </div>

      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[280px] animate-pulse rounded-xl bg-surface" />
            ))
          : visible.map((g, i) => (
              <RecommendationCard
                key={g.id}
                game={g}
                onIgnore={() => ignore(g.id)}
                reason={
                  i % 3 === 0
                    ? `Since you recently played ${seed}`
                    : i % 3 === 1
                      ? `Recommended because it's popular`
                      : `Highly rated in ${g.genres?.[0]?.name ?? "your genres"}`
                }
              />
            ))}

        {isFetchingNextPage && (
          <div className="h-[280px] animate-pulse rounded-xl bg-surface" />
        )}

        <div ref={sentinelRef} className="h-1" />

        {!hasNextPage && games.length > 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            You've reached the end
          </div>
        )}
      </div>
    </section>
  );
}

function RecommendationCard({ game: g, reason, onIgnore }: { game: GameSummary; reason: string; onIgnore: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const price = priceFor(g);
  const { data: screens } = useQuery({
    queryKey: ["rec-screens", g.slug],
    queryFn: () => getGameScreenshots({ data: { slug: g.slug } }),
    staleTime: 30 * 60_000,
    retry: 0,
  });
  const shots = (screens?.results ?? []).slice(0, 3);

  const wishlist = useMutation({
    mutationFn: () =>
      addToLibrary({
        data: {
          game_slug: g.slug,
          game_id: g.id,
          game_name: g.name,
          game_image: g.background_image ?? undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-library"] });
      toast.success(`${g.name} added to your library`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add"),
  });

  const onWishlist = () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    wishlist.mutate();
  };

  const findSimilarGenre = (g.genres?.[0]?.name ?? "").toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="rounded-xl border border-border bg-surface p-5 transition hover:border-primary/40">
      <Link to="/game/$slug" params={{ slug: g.slug }} className="group block">
        <h3 className="text-lg font-bold text-foreground group-hover:text-primary">{g.name}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{reason}</p>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <img
            src={g.background_image!}
            alt={g.name}
            loading="lazy"
            className="aspect-video w-full rounded object-cover"
          />
          {shots.length > 0
            ? shots.map((s) => (
                <img
                  key={s.id}
                  src={s.image}
                  alt=""
                  loading="lazy"
                  className="aspect-video w-full rounded object-cover"
                />
              ))
            : Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-video w-full rounded bg-surface-elevated" />
              ))}
        </div>

        <div className="mt-3 flex items-center gap-3 text-sm">
          {price.discount && (
            <span className="rounded bg-success px-2 py-1 text-xs font-bold text-success-foreground">
              −{price.discount}%
            </span>
          )}
          {price.original && (
            <span className="text-muted-foreground line-through">
              ${price.original.toFixed(2)}
            </span>
          )}
          <span className="font-semibold text-foreground">${price.final.toFixed(2)}</span>
        </div>
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Link
          to="/game/$slug"
          params={{ slug: g.slug }}
          className="rounded bg-surface-elevated px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          Visit Product Page
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onWishlist}
            disabled={wishlist.isPending}
            className="rounded bg-surface-elevated px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {wishlist.isPending ? "Adding…" : "Add to your wishlist"}
          </button>
          <button
            onClick={onIgnore}
            className="rounded bg-surface-elevated px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            Ignore
          </button>
          <button
            onClick={() =>
              navigate({
                to: "/library",
                search: { search: "", ordering: "-rating", page: 1, genres: findSimilarGenre, price: "any" },
              })
            }
            className="rounded bg-surface-elevated px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            Find More like this
          </button>
        </div>
      </div>
    </div>
  );
}
