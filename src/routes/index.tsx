import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trendingGames, upcomingGames, newlyReleasedGames, steamFeatured, listGames, getGameMeta, getGameScreenshots, type GameSummary } from "@/lib/api";
import { addToLibrary } from "@/lib/library";
import { useAuth } from "@/hooks/use-auth";
import { GameCard } from "@/components/GameCard";
import { ChevronRight, Flame, Sparkles, Tag, Search, X, Rocket, ThumbsUp, ThumbsDown, Library } from "lucide-react";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const Route = createFileRoute("/")({
  component: StorePage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-xl font-semibold">Couldn't load the store</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function StorePage() {
        
  const [trendingData, setTrendingData] = useState<any>(null);
  const [upcomingData, setUpcomingData] = useState<any>(null);
  const [newlyReleasedData, setNewlyReleasedData] = useState<any>(null);

  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [isLoadingNewlyReleased, setIsLoadingNewlyReleased] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    trendingGames({ data: { page_size: 40 } }).then(data => {
      if (mounted) { setTrendingData(data); setIsLoadingTrending(false); }
    });
    
    upcomingGames({ data: { page_size: 40 } }).then(data => {
      if (mounted) { setUpcomingData(data); setIsLoadingUpcoming(false); }
    });
    
    newlyReleasedGames({ data: { page_size: 40 } }).then(data => {
      if (mounted) { setNewlyReleasedData(data); setIsLoadingNewlyReleased(false); }
    });

    return () => { mounted = false; };
  }, []);

  const featured = useQuery({
    queryKey: ["steam-featured"],
    queryFn: () => steamFeatured(),
    retry: 0,
  });

  const trendingClean = (trendingData?.results ?? []).filter((g: any) => !!g.background_image && !!g.released);
  const upcomingClean = (upcomingData?.results ?? []).filter((g: any) => !!g.background_image && !!g.released);
  const newlyReleasedClean = (newlyReleasedData?.results ?? []).filter((g: any) => !!g.background_image && !!g.released);

  const heroes = trendingClean.slice(0, 5);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* INLINE SEARCH */}
      <HomeSearch />

      {/* HERO */}
      {heroes.length > 0 ? (
        <HeroCarousel games={heroes} />
      ) : (
        <div className="h-[320px] animate-pulse rounded-2xl bg-surface md:h-[360px]" />
      )}

      {/* SPECIAL OFFERS (Steam) */}
      {featured.data?.specials && featured.data.specials.length > 0 && (
        <Section title="Steam Special Offers" icon={<Tag className="h-5 w-5" />}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.data.specials.slice(0, 4).map((it: any) => (
              <Link
                key={it.id}
                to="/game/$slug"
                params={{ slug: slugify(it.name) }}
                className="group overflow-hidden rounded-lg bg-gradient-card shadow-card transition hover:-translate-y-1 hover:shadow-glow"
              >
                <img src={it.large_capsule_image} alt={it.name} className="aspect-[4/3] w-full object-cover" />
                <div className="space-y-2 p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold">{it.name}</h3>
                  <div className="flex items-center justify-between gap-2">
                    {it.discounted && (
                      <span className="rounded bg-success px-2 py-0.5 text-xs font-bold text-success-foreground">
                        −{it.discount_percent}%
                      </span>
                    )}
                    <div className="ml-auto text-right text-xs">
                      {it.original_price && it.discounted && (
                        <div className="text-muted-foreground line-through">
                          ${(it.original_price / 100).toFixed(2)}
                        </div>
                      )}
                      <div className="font-semibold text-foreground">
                        ${(it.final_price / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* TRENDING */}
      <Section
        title="Trending This Season"
        icon={<Flame className="h-5 w-5" />}
        action={<Link to="/library" search={{ ordering: "-added", search: "", page: 1, genres: "", price: "any" }} className="text-sm text-primary hover:underline">Browse all <ChevronRight className="inline h-3 w-3" /></Link>}
      >
        {isLoadingTrending ? (
          <SkeletonGrid />
        ) : trendingClean.length > 1 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {trendingClean.slice(1, 11).map((g: any, i: number) => (
              <GameCard key={g.id} game={g} index={i} />
            ))}
          </div>
        ) : (
          <EmptySection label="No trending games are available right now." />
        )}
      </Section>

      {/* NEWLY RELEASED */}
      <Section
        title="Newly Released"
        icon={<Rocket className="h-5 w-5" />}
        action={<Link to="/library" search={{ ordering: "-released", search: "", page: 1, genres: "", price: "any" }} className="text-sm text-primary hover:underline">Browse all <ChevronRight className="inline h-3 w-3" /></Link>}
      >
        {isLoadingNewlyReleased ? (
          <SkeletonGrid />
        ) : newlyReleasedClean.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {newlyReleasedClean.slice(0, 10).map((g: any, i: number) => (
              <GameCard key={g.id} game={g} index={i} />
            ))}
          </div>
        ) : (
          <EmptySection label="No new releases are available right now." />
        )}
      </Section>

      {/* UPCOMING */}
      <Section
        title="Upcoming Releases"
        icon={<Sparkles className="h-5 w-5" />}
        action={<Link to="/upcoming" className="text-sm text-primary hover:underline">See all <ChevronRight className="inline h-3 w-3" /></Link>}
      >
        {isLoadingUpcoming ? (
          <SkeletonGrid />
        ) : upcomingClean.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {upcomingClean.slice(0, 10).map((g: any, i: number) => (
              <GameCard key={g.id} game={g} index={i} />
            ))}
          </div>
        ) : (
          <EmptySection label="No upcoming releases are available right now." />
        )}
      </Section>

      {/* STEAM-STYLE TABBED LIBRARY LIST */}
      <SteamTabbedList />
    </main>
  );
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function HeroCarousel({ games }: { games: GameSummary[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = games.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [paused, count]);

  const current = games[index];
    const { data: meta } = useQuery({
    queryKey: ["hero-meta", current.slug],
    queryFn: () => getGameMeta({ data: { slug: current.slug } }),
    staleTime: 1000 * 60 * 30,
    retry: 0,
  });

  const desc: string = meta?.review_score_desc ?? "";
  const isPositive = /positive/i.test(desc);
  const isNegative = /negative/i.test(desc);
  const isMixed = /mixed/i.test(desc);
  const reviewClass = isPositive
    ? "bg-[oklch(0.32_0.06_220)] text-[oklch(0.85_0.18_220)]"
    : isNegative
      ? "bg-destructive/20 text-destructive"
      : isMixed
        ? "bg-[oklch(0.3_0.06_75)] text-[oklch(0.85_0.16_75)]"
        : "bg-surface-elevated text-muted-foreground";

  return (
    <div
      className="group relative h-[320px] overflow-hidden rounded-2xl bg-gradient-hero shadow-card md:h-[360px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {games.map((g, i) => (
        <Link
          key={g.id}
          to="/game/$slug"
          params={{ slug: g.slug }}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
          aria-hidden={i !== index}
        >
          {g.background_image && (
            <img
              src={g.background_image}
              alt={g.name}
              className={`absolute inset-0 h-full w-full object-cover opacity-70 ${i === index ? "scale-110 transition-transform duration-[6000ms] ease-out" : "scale-105"}`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          {i === index && (
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary backdrop-blur animate-fade-in">
                <Flame className="h-3 w-3 animate-pulse" /> Trending now
              </span>
              <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-foreground md:text-5xl animate-fade-in [animation-delay:150ms] [animation-fill-mode:both]">
                {g.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground animate-fade-in [animation-delay:300ms] [animation-fill-mode:both]">
                {g.metacritic && (
                  <span className="rounded bg-success/20 px-2 py-0.5 font-mono text-success">
                    {g.metacritic}
                  </span>
                )}
                {desc ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${reviewClass}`}>
                    {isPositive && <ThumbsUp className="h-3 w-3" />}
                    {isNegative && <ThumbsDown className="h-3 w-3" />}
                    <span>{desc}</span>
                    {meta && meta.total_reviews > 0 && (
                      <span className="opacity-75">· {meta.total_reviews.toLocaleString()} reviews</span>
                    )}
                  </span>
                ) : meta && meta.appid === null ? (
                  <span className="text-xs text-muted-foreground">No Steam reviews</span>
                ) : (
                  <span className="h-5 w-32 animate-pulse rounded-full bg-surface-elevated" />
                )}
                <span>{g.released ? new Date(g.released).getFullYear() : "TBA"}</span>
              </div>
            </div>
          )}
        </Link>
      ))}

      {/* Dots */}
      <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
        {games.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-primary" : "w-2 bg-foreground/30 hover:bg-foreground/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="aspect-[16/9] animate-pulse rounded-lg bg-surface" />
      ))}
    </div>
  );
}

function isoDay(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function steamTabsConfig() {
  const today = isoDay(0);
  return [
    {
      id: "trending" as const,
      label: "Trending",
      params: { ordering: "-added", dates: `${isoDay(-90)},${today}` },
    },
    {
      id: "top" as const,
      label: "Top Sellers",
      params: { ordering: "-metacritic", dates: `${isoDay(-730)},${today}` },
    },
    {
      id: "upcoming" as const,
      label: "Popular Upcoming",
      params: { ordering: "released", dates: `${isoDay(1)},${isoDay(365)}` },
    },
    {
      id: "new" as const,
      label: "New Releases",
      params: { ordering: "-released", dates: `${isoDay(-30)},${today}` },
    },
  ];
}

type SteamTabId = "trending" | "top" | "upcoming" | "new";

function SteamTabbedList() {
  const [tab, setTab] = useState<SteamTabId>("trending");
  const [visible, setVisible] = useState(10);
    const tabs = steamTabsConfig();
  const active = tabs.find((t) => t.id === tab)!;

  // Reset visible count when the tab changes
  useEffect(() => {
    setVisible(10);
  }, [tab]);

  const { data, isLoading } = useQuery({
    queryKey: ["steam-list", tab],
    queryFn: () =>
      listGames({
        data: {
          page: 1,
          page_size: 40,
          ...active.params,
        },
      }),
    staleTime: 60_000,
  });

  const allResults = (data?.results ?? []).filter((g) => !!g.background_image);
  const results = allResults.slice(0, visible);
  const isTopLoading = isLoading;
  const canLoadMore = allResults.length > results.length;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center gap-2">
        <Library className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">Browse the Library</h2>
      </div>

      {/* Tabs */}
      <div className="-mx-6 mb-4 flex gap-1 overflow-x-auto border-b border-border px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {isTopLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 p-3">
                <div className="h-[69px] w-[120px] shrink-0 rounded bg-surface-elevated sm:h-[80px] sm:w-[184px]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-surface-elevated" />
                  <div className="h-3 w-3/4 rounded bg-surface-elevated" />
                </div>
                <div className="hidden h-6 w-16 rounded bg-surface-elevated sm:block" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="divide-y divide-border">
            {results.map((g) => (
              <SteamRow key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <EmptySection label="No games found." />
        )}
      </div>

      {canLoadMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + 10)}
            className="rounded-md border border-border bg-surface px-5 py-2 text-sm font-medium text-foreground transition hover:bg-surface-elevated hover:border-primary"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}

function SteamFeaturedRow({ item: it }: { item: import("@/lib/api").SteamFeaturedItem }) {
  return (
    <Link
      to="/game/$slug"
      params={{ slug: slugify(it.name) }}
      className="group flex items-center gap-3 p-3 transition hover:bg-surface-elevated"
    >
      <img
        src={it.large_capsule_image || it.header_image}
        alt={it.name}
        loading="lazy"
        className="h-[69px] w-[120px] shrink-0 rounded object-cover sm:h-[80px] sm:w-[184px]"
      />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground sm:text-base">{it.name}</h3>
        <div className="mt-1 text-xs text-muted-foreground">Steam Top Seller</div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {it.discounted && (
          <span className="rounded bg-success px-2 py-1 text-xs font-bold text-success-foreground">
            −{it.discount_percent}%
          </span>
        )}
        <div className="text-right text-xs sm:text-sm">
          {it.original_price && it.discounted && (
            <div className="text-muted-foreground line-through">${(it.original_price / 100).toFixed(2)}</div>
          )}
          <div className="font-semibold text-foreground">
            {it.final_price > 0 ? `$${(it.final_price / 100).toFixed(2)}` : "Free"}
          </div>
        </div>
      </div>
    </Link>
  );
}


function SteamRow({ game: g }: { game: GameSummary }) {
  const price = priceFor(g);
  const rowRef = useRef<HTMLAnchorElement>(null);
  const [hover, setHover] = useState<{ top: number; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = rowRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cardW = 460;
      const img = el.querySelector("img");
      const anchorRight = img ? img.getBoundingClientRect().right : r.left + 200;
      const preferred = anchorRight + 12;
      const maxLeft = window.innerWidth - cardW - 8;
      const left = Math.max(8, Math.min(preferred, maxLeft));
      setHover({ top: r.top, left });
    }, 120);
  };
  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    setHover(null);
  };

  return (
    <>
      <Link
        ref={rowRef}
        to="/game/$slug"
        params={{ slug: g.slug }}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        className="group flex items-center gap-3 p-3 transition hover:bg-surface-elevated"
      >
        {g.background_image ? (
          <img
            src={g.background_image}
            alt={g.name}
            loading="lazy"
            className="h-[69px] w-[120px] shrink-0 rounded object-cover sm:h-[80px] sm:w-[184px]"
          />
        ) : (
          <div className="h-[69px] w-[120px] shrink-0 rounded bg-surface-elevated sm:h-[80px] sm:w-[184px]" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground sm:text-base">
            {g.name}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {g.genres?.slice(0, 3).map((gn) => (
              <span
                key={gn.id}
                className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {gn.name}
              </span>
            ))}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {g.released ? new Date(g.released).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "TBA"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {g.metacritic && (
            <span className="rounded bg-success/15 px-2 py-1 font-mono text-xs font-bold text-success">
              {g.metacritic}
            </span>
          )}
          {price.discount && (
            <span className="rounded bg-success px-2 py-1 text-xs font-bold text-success-foreground">
              −{price.discount}%
            </span>
          )}
          <div className="text-right text-xs sm:text-sm">
            {price.original && (
              <div className="text-muted-foreground line-through">${price.original.toFixed(2)}</div>
            )}
            <div className="font-semibold text-foreground">${price.final.toFixed(2)}</div>
          </div>
        </div>
      </Link>
      {hover && <SteamHoverCard game={g} top={hover.top} left={hover.left} />}
    </>
  );
}

function SteamHoverCard({ game: g, top, left }: { game: GameSummary; top: number; left: number }) {
      const { data: screens } = useQuery({
    queryKey: ["hover-screens", g.slug],
    queryFn: () => getGameScreenshots({ data: { slug: g.slug } }),
    staleTime: 1000 * 60 * 30,
    retry: 0,
  });
  const { data: meta } = useQuery({
    queryKey: ["hover-meta", g.slug],
    queryFn: () => getGameMeta({ data: { slug: g.slug } }),
    staleTime: 1000 * 60 * 30,
    retry: 0,
  });

  const desc = meta?.review_score_desc ?? "";
  const isPositive = /positive/i.test(desc);
  const isNegative = /negative/i.test(desc);
  const isMixed = /mixed/i.test(desc);
  const reviewClass = isPositive
    ? "text-success"
    : isNegative
      ? "text-destructive"
      : isMixed
        ? "text-[oklch(0.85_0.16_75)]"
        : "text-muted-foreground";

  const shots = (screens?.results ?? []).slice(0, 4);
  const clampedTop = Math.min(top, Math.max(8, window.innerHeight - 320));

  return (
    <div
      className="pointer-events-none fixed z-50 w-[460px] rounded-lg border border-border bg-surface shadow-card will-change-transform animate-[fade-in_120ms_ease-out]"
      style={{ top: clampedTop, left, transform: "translateZ(0)" }}
    >
      {g.background_image && (
        <img
          src={g.background_image}
          alt=""
          className="h-[215px] w-full rounded-t-lg object-cover"
        />
      )}
      <div className="space-y-2 p-3">
        <h4 className="line-clamp-1 text-sm font-bold text-foreground">{g.name}</h4>
        {desc ? (
          <div className={`text-xs font-semibold ${reviewClass}`}>
            {desc}
            {meta && meta.total_reviews > 0 && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({meta.total_reviews.toLocaleString()} reviews)
              </span>
            )}
          </div>
        ) : (
          <div className="h-3 w-32 animate-pulse rounded bg-surface-elevated" />
        )}
        <div className="flex flex-wrap gap-1">
          {g.genres?.slice(0, 4).map((gn) => (
            <span
              key={gn.id}
              className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {gn.name}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {g.released
              ? new Date(g.released).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
              : "TBA"}
          </span>
          {g.metacritic && (
            <span className="rounded bg-success/15 px-1.5 py-0.5 font-mono font-bold text-success">
              {g.metacritic}
            </span>
          )}
        </div>
        {shots.length > 0 && (
          <div className="grid grid-cols-4 gap-1 pt-1">
            {shots.map((s) => (
              <img
                key={s.id}
                src={s.image}
                alt=""
                loading="lazy"
                className="aspect-video w-full rounded object-cover"
              />
            ))}
          </div>
        )}
        {g.parent_platforms && g.parent_platforms.length > 0 && (
          <div className="pt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {g.parent_platforms.map((p) => p.platform.name).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

function priceFor(g: GameSummary): { final: number; original: number | null; discount: number | null } {
  // Synthesize a stable, plausible price from id + metacritic for display.
  const seed = (g.id % 7) + 1;
  const base = 9.99 + seed * 5; // 14.99 - 44.99
  const hasDiscount = g.id % 3 === 0;
  if (!hasDiscount) return { final: base, original: null, discount: null };
  const discount = 10 + ((g.id % 6) * 10); // 10..60
  const final = +(base * (1 - discount / 100)).toFixed(2);
  return { final, original: base, discount };
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function HomeSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

  const submitSearch = () => {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    navigate({
      to: "/library",
      search: { search: term, ordering: "-added", page: 1, genres: "", price: "any" },
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["home-search", debounced],
    queryFn: () => listGames({ data: { search: debounced, page: 1, page_size: 6 } }),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  return (
    <div ref={ref} className="relative mx-auto mb-6 max-w-2xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitSearch(); } }}
          placeholder="Search games on VAPOR… (press Enter for all results)"
          className="w-full rounded-full border border-border bg-input py-3 pl-11 pr-10 text-sm outline-none transition focus:border-primary focus:shadow-glow"
        />
        {q && (
          <button
            onClick={() => { setQ(""); setDebounced(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          {isFetching && <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>}
          {!isFetching && data?.results?.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No results</div>
          )}
          {data?.results?.map((g) => (
            <Link
              key={g.id}
              to="/game/$slug"
              params={{ slug: g.slug }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-surface-elevated"
            >
              {g.background_image ? (
                <img src={g.background_image} alt="" className="h-10 w-16 rounded object-cover" />
              ) : (
                <div className="h-10 w-16 rounded bg-surface-elevated" />
              )}
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-medium">{g.name}</div>
                <div className="text-xs text-muted-foreground">
                  {g.released ? new Date(g.released).getFullYear() : "TBA"}
                  {g.metacritic ? ` · MC ${g.metacritic}` : ""}
                </div>
              </div>
            </Link>
          ))}
          {!isFetching && (data?.results?.length ?? 0) > 0 && (
            <button
              onClick={submitSearch}
              className="flex w-full items-center justify-center gap-2 bg-surface-elevated px-3 py-2 text-sm font-medium text-primary hover:underline"
            >
              See all results for "{debounced}"
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Steam-style "More like this" infinite scrolling recommendations
// =====================================================================
function RecommendedInfinite({ seed }: { seed: string }) {
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

  return (
    <section className="mt-16">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">Recommended For You</h2>
      </div>

      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[280px] animate-pulse rounded-xl bg-surface" />
            ))
          : games.map((g, i) => (
              <RecommendationCard
                key={g.id}
                game={g}
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

function RecommendationCard({ game: g, reason }: { game: GameSummary; reason: string }) {
      const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const price = priceFor(g);
  const { data: screens } = useQuery({
    queryKey: ["rec-screens", g.slug],
    queryFn: () => getGameScreenshots({ data: { slug: g.slug } }),
    staleTime: 30 * 60_000,
    retry: 0,
  });

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
    if (!user) return navigate({ to: "/login" });
    wishlist.mutate();
  };
  const findSimilarGenre = (g.genres?.[0]?.name ?? "").toLowerCase().replace(/\s+/g, "-");

  if (hidden) return null;
  const shots = (screens?.results ?? []).slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 transition hover:border-primary/40">
      <Link
        to="/game/$slug"
        params={{ slug: g.slug }}
        className="group block"
      >
        <h3 className="text-lg font-bold text-foreground group-hover:text-primary">
          {g.name}
        </h3>
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
            onClick={() => setHidden(true)}
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
