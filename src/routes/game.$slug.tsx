import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGame, getGameScreenshots, getGameTrailers, findYoutubeTrailer, getSystemRequirements, getDeveloperGames, getSimilarGames, type GameSummary } from "@/lib/games.functions";
import { addToLibrary, removeFromLibrary, isInLibrary } from "@/lib/library.functions";
import { SteamReviews } from "@/components/SteamReviews";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Calendar, Check, Clock, Loader2, Plus, Star, X, ChevronLeft, ChevronRight, Youtube } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useRef } from "react";

export const Route = createFileRoute("/game/$slug")({
  component: GamePage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    const { slug } = Route.useParams();
    const pretty = slug.replace(/-/g, " ");
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">We couldn't load this game</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may not be in our catalog. {error.message}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Retry
          </button>
          <Link
            to="/library"
            search={{ search: pretty, ordering: "-added", page: 1 }}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm hover:border-primary"
          >
            Search "{pretty}" in library
          </Link>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">Game not found</h1>
      <Link to="/library" className="mt-4 inline-block text-primary hover:underline">Back to library</Link>
    </div>
  ),
});

function GamePage() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const navigate = useNavigate();
  const gameFn = useServerFn(getGame);
  const shotsFn = useServerFn(getGameScreenshots);
  const trailersFn = useServerFn(getGameTrailers);

  const { data: game, isLoading } = useQuery({
    queryKey: ["game", slug],
    queryFn: () => gameFn({ data: { slug } }),
  });
  const { data: shots } = useQuery({
    queryKey: ["screenshots", slug],
    queryFn: () => shotsFn({ data: { slug } }),
  });
  const { data: trailers } = useQuery({
    queryKey: ["trailers", slug],
    queryFn: () => trailersFn({ data: { slug } }),
  });
  const trailer = trailers?.results?.[0];

  const sysReqFn = useServerFn(getSystemRequirements);
  const { data: sysReq } = useQuery({
    queryKey: ["sysreq", slug],
    queryFn: () => sysReqFn({ data: { slug } }),
    staleTime: 60 * 60_000,
  });

  const devGamesFn = useServerFn(getDeveloperGames);
  const primaryDevId = game?.developers?.[0]?.id;
  const primaryDevName = game?.developers?.[0]?.name;
  const { data: devGames } = useQuery({
    queryKey: ["dev-games", primaryDevId, slug],
    queryFn: () => devGamesFn({ data: { developer: primaryDevId!, exclude_slug: slug } }),
    enabled: !!primaryDevId,
    staleTime: 30 * 60_000,
  });

  const similarFn = useServerFn(getSimilarGames);
  const { data: similar } = useQuery({
    queryKey: ["similar-games", slug],
    queryFn: () => similarFn({ data: { slug } }),
    staleTime: 30 * 60_000,
  });

  const ytFn = useServerFn(findYoutubeTrailer);
  const [showYt, setShowYt] = useState(false);
  const { data: ytData, isFetching: ytLoading } = useQuery({
    queryKey: ["yt-trailer", slug],
    queryFn: () => ytFn({ data: { query: `${game?.name ?? slug} official trailer` } }),
    enabled: showYt && !!game?.name && !trailer,
    staleTime: 60 * 60_000,
  });

  const gallery: string[] = [
    ...(game?.background_image ? [game.background_image] : []),
    ...((shots?.results ?? []).slice(0, 6).map((s) => s.image)),
  ];
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIdx(null), []);
  const next = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i + 1) % gallery.length)),
    [gallery.length],
  );
  const prev = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i - 1 + gallery.length) % gallery.length)),
    [gallery.length],
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, close, next, prev]);

  if (isLoading || !game) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="h-96 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <button
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.history.back();
          } else {
            navigate({ to: "/" });
          }
        }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero with backdrop blur */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-border shadow-card">
        {game.background_image && (
          <>
            <img
              src={game.background_image}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          </>
        )}
        <div className="relative grid gap-6 p-6 md:grid-cols-[3fr_2fr] md:p-8">
          <div className="space-y-3">
            {trailer ? (
              <div className="overflow-hidden rounded-2xl shadow-card bg-black">
                <video
                  key={trailer.id}
                  src={trailer.data.max || trailer.data[480]}
                  poster={trailer.preview || game.background_image || undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="aspect-video w-full object-cover"
                />
              </div>
            ) : (
              game.background_image && (
                <div className="relative overflow-hidden rounded-2xl shadow-card bg-black">
                  {showYt ? (
                    ytLoading ? (
                      <div className="flex aspect-video w-full items-center justify-center text-sm text-muted-foreground">
                        Loading trailer…
                      </div>
                    ) : ytData?.videoId ? (
                      <iframe
                        key="yt-embed"
                        src={`https://www.youtube.com/embed/${ytData.videoId}?autoplay=1`}
                        title={`${game.name} trailer`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="aspect-video w-full"
                      />
                    ) : (
                      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                        <span>No trailer found.</span>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${game.name} official trailer`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Search on YouTube
                        </a>
                      </div>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setLightboxIdx(0)}
                        className="group block w-full"
                        aria-label="Open image"
                      >
                        <img
                          src={game.background_image}
                          alt={game.name}
                          className="aspect-video w-full cursor-zoom-in object-cover transition group-hover:scale-[1.02]"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowYt(true)}
                        className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/90"
                      >
                        <Youtube className="h-4 w-4 text-red-500" /> Watch trailer
                      </button>
                    </>
                  )}
                </div>
              )
            )}
          </div>

          {/* Steam-style details panel */}
          <div className="flex min-w-0 flex-col">
            <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
              {game.name}
            </h1>
            {game.description_raw && (
              <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-muted-foreground">
                {game.description_raw.replace(/<[^>]+>/g, "").slice(0, 400)}
              </p>
            )}

            <dl className="mt-5 space-y-2 text-xs">
              <InfoRow label="Reviews">
                <span className="font-semibold text-primary">
                  {game.rating > 0 ? `${game.rating.toFixed(1)} / 5` : "—"}
                </span>
                {game.metacritic && (
                  <span className="ml-2 rounded bg-success/20 px-1.5 py-0.5 font-mono text-[10px] text-success">
                    MC {game.metacritic}
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Release Date">
                <span className="text-foreground">
                  {game.released ? new Date(game.released).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "TBA"}
                </span>
              </InfoRow>
              {game.developers?.length > 0 && (
                <InfoRow label="Developer">
                  <span className="text-primary">{game.developers.map((d) => d.name).join(", ")}</span>
                </InfoRow>
              )}
              {game.publishers?.length > 0 && (
                <InfoRow label="Publisher">
                  <span className="text-primary">{game.publishers.map((p) => p.name).join(", ")}</span>
                </InfoRow>
              )}
            </dl>

            {(game.tags?.length ?? 0) > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Popular tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {game.tags.slice(0, 6).map((t) => (
                    <span
                      key={t.id}
                      className="rounded-md bg-primary/15 px-2 py-1 text-xs text-primary"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {game.genres?.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {game.genres.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-full border border-border bg-surface/80 px-2.5 py-0.5 text-[11px] backdrop-blur"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {shots?.results && shots.results.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-bold tracking-tight">Screenshots</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {shots.results.slice(0, 6).map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setLightboxIdx(game.background_image ? i + 1 : i)}
                    className="group block overflow-hidden rounded-lg shadow-card"
                  >
                    <img
                      src={s.image}
                      alt=""
                      className="aspect-video w-full cursor-zoom-in object-cover transition group-hover:scale-[1.03]"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-xl font-bold tracking-tight">About</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {game.description_raw}
            </p>
          </section>

          {(sysReq?.minimum || sysReq?.recommended) && (
            <section>
              <h2 className="mb-2 text-lg font-bold tracking-tight">System Requirements</h2>
              <div className="grid gap-3 rounded-xl border border-border bg-surface/50 p-3 md:grid-cols-2">
                {sysReq?.minimum && (
                  <div>
                    <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Minimum</h3>
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-snug text-foreground/80">{sysReq.minimum}</pre>
                  </div>
                )}
                {sysReq?.recommended && (
                  <div>
                    <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recommended</h3>
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-snug text-foreground/80">{sysReq.recommended}</pre>
                  </div>
                )}
              </div>
            </section>
          )}

          <SteamReviews slug={slug} variant="recent" />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card">
            <LibraryButton game={game} />

            <dl className="mt-5 space-y-3 text-sm">
              <Stat icon={<Star className="h-4 w-4" />} label="Rating">
                {game.rating > 0 ? `${game.rating.toFixed(1)} / 5` : "—"}{" "}
                {game.metacritic && (
                  <span className="ml-2 rounded bg-success/20 px-1.5 py-0.5 font-mono text-xs text-success">
                    MC {game.metacritic}
                  </span>
                )}
              </Stat>
              <Stat icon={<Calendar className="h-4 w-4" />} label="Released">
                {game.released ? new Date(game.released).toLocaleDateString() : "TBA"}
              </Stat>
              <Stat icon={<Clock className="h-4 w-4" />} label="Avg Playtime">
                {game.playtime > 0 ? `${game.playtime}h` : "—"}
              </Stat>
              <Stat label="Developer">
                {game.developers?.length > 0 ? game.developers.map((d) => d.name).join(", ") : "—"}
              </Stat>
              <Stat label="Publisher">
                {game.publishers?.length > 0 ? game.publishers.map((p) => p.name).join(", ") : "—"}
              </Stat>
              <Stat label="Platforms">
                {game.platforms?.length > 0 ? game.platforms.map((p) => p.platform.name).join(", ") : "—"}
              </Stat>
            </dl>
          </div>

          <SteamReviews slug={slug} variant="summary" />

          {game.website && (
            <a
              href={game.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-border bg-surface p-4 text-center text-sm hover:border-primary hover:text-primary"
            >
              Official website ↗
            </a>
          )}
        </aside>
      </div>

      {(devGames?.results?.length ?? 0) > 0 && (
        <GameCarousel
          title={`More from ${primaryDevName ?? "this developer"}`}
          games={devGames!.results.slice(0, 12)}
        />
      )}

      {(similar?.results?.length ?? 0) > 0 && (
        <GameCarousel title="More like this" games={similar!.results.slice(0, 12)} />
      )}

      {lightboxIdx !== null && gallery[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-surface/80 p-2 text-foreground hover:bg-surface"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {gallery.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 p-3 hover:bg-surface"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 p-3 hover:bg-surface"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={gallery[lightboxIdx]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-glow"
          />
          {gallery.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface/80 px-3 py-1 text-xs text-muted-foreground">
              {lightboxIdx + 1} / {gallery.length}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function GameCarousel({ title, games }: { title: string; games: GameSummary[] }) {
  const scrollerRef = useCallback(() => null, []);
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.9), behavior: "smooth" });
  };
  void scrollerRef;
  return (
    <section className="mt-10 rounded-2xl border border-border bg-surface/40 p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="relative">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 shadow-card backdrop-blur hover:border-primary hover:text-primary md:inline-flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 shadow-card backdrop-blur hover:border-primary hover:text-primary md:inline-flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div
          ref={ref}
          className="-mx-1 flex gap-3 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:thin]"
        >
          {games.map((g) => (
            <Link
              key={g.id}
              to="/game/$slug"
              params={{ slug: g.slug }}
              className="group block w-56 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-surface shadow-card transition hover:border-primary"
            >
              <div className="aspect-video w-full overflow-hidden bg-background">
                {g.background_image ? (
                  <img
                    src={g.background_image}
                    alt={g.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                  {g.name}
                </p>
                {g.released && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(g.released).getFullYear()}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-24 flex-shrink-0 uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate">{children}</dd>
    </div>
  );
}

function Stat({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

function LibraryButton({ game }: { game: { slug: string; id: number; name: string; background_image: string | null } }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkFn = useServerFn(isInLibrary);
  const addFn = useServerFn(addToLibrary);
  const removeFn = useServerFn(removeFromLibrary);

  const { data: status } = useQuery({
    queryKey: ["in-library", game.slug, user?.id],
    queryFn: () => checkFn({ data: { slug: game.slug } }),
    enabled: !!user,
  });
  const inLib = status?.inLibrary;

  const add = useMutation({
    mutationFn: () => addFn({ data: { game_slug: game.slug, game_id: game.id, game_name: game.name, game_image: game.background_image ?? undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["in-library", game.slug] });
      qc.invalidateQueries({ queryKey: ["my-library"] });
      toast.success(`${game.name} added to library`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add"),
  });
  const remove = useMutation({
    mutationFn: () => removeFn({ data: { game_slug: game.slug } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["in-library", game.slug] });
      qc.invalidateQueries({ queryKey: ["my-library"] });
      toast.success("Removed from library");
    },
  });

  if (!user) {
    return (
      <button
        onClick={() => navigate({ to: "/login" })}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" /> Sign in to add to Library
      </button>
    );
  }

  if (inLib) {
    return (
      <button
        onClick={() => remove.mutate()}
        disabled={remove.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-success bg-success/10 py-3 font-semibold text-success transition hover:bg-success/20 disabled:opacity-50"
      >
        {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        In your Library
      </button>
    );
  }

  return (
    <button
      onClick={() => add.mutate()}
      disabled={add.isPending}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
    >
      {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Add to Library
    </button>
  );
}
