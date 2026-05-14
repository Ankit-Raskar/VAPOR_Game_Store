import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import type { GameSummary } from "@/lib/api";
import { getGameMeta, getGame } from "@/lib/api";
import { ThumbsUp, ThumbsDown, Calendar, Gamepad2 } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

const POSITIVE = /positive/i;
const NEGATIVE = /negative/i;
const MIXED = /mixed/i;

function reviewClass(desc: string) {
  if (POSITIVE.test(desc)) return "bg-[oklch(0.32_0.06_220)] text-[oklch(0.82_0.18_220)]";
  if (NEGATIVE.test(desc)) return "bg-destructive/15 text-destructive";
  if (MIXED.test(desc)) return "bg-[oklch(0.3_0.06_75)] text-[oklch(0.82_0.16_75)]";
  return "bg-surface-elevated text-muted-foreground";
}

export function GameCard({ game, index = 0 }: { game: GameSummary; index?: number }) {
      const queryClient = useQueryClient();
  const prefetchedRef = useRef(false);
  const [open, setOpen] = useState(false);

  const { data: meta } = useQuery({
    queryKey: ["game-meta", game.slug],
    queryFn: () => getGameMeta({ data: { slug: game.slug } }),
    staleTime: 1000 * 60 * 30,
    retry: 0,
  });

  const { data: detail } = useQuery({
    queryKey: ["game", game.slug],
    queryFn: () => getGame({ data: { slug: game.slug } }),
    staleTime: 1000 * 60 * 10,
    enabled: open,
    retry: 0,
  });

  // Preload the full game detail data on the first hover / focus / touch.
  // PointerEnter covers mouse, pen and touch in a single passive event,
  // and we guard with a ref so we never re-fetch while the cursor lingers.
  const prefetchDetail = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    queryClient.prefetchQuery({
      queryKey: ["game", game.slug],
      queryFn: () => getGame({ data: { slug: game.slug } }),
      staleTime: 1000 * 60 * 10,
    });
  }, [queryClient, getGame, game.slug]);

  const hasReview = meta?.review_score_desc && meta.total_reviews > 0;
  const isPositive = hasReview && POSITIVE.test(meta.review_score_desc);
  const isNegative = hasReview && NEGATIVE.test(meta.review_score_desc);

  const ariaParts = [
    game.name,
    game.released ? `released ${new Date(game.released).getFullYear()}` : "release date to be announced",
    meta?.price?.final ? `price ${meta.price.final}` : null,
    hasReview ? `reviews ${meta!.review_score_desc}` : null,
  ].filter(Boolean);

  const description = detail?.description_raw
    ? detail.description_raw.replace(/\s+/g, " ").slice(0, 260).trim() + (detail.description_raw.length > 260 ? "…" : "")
    : null;
  const platformList = detail?.parent_platforms ?? game.parent_platforms;

  return (
    <HoverCard openDelay={250} closeDelay={120} open={open} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        <Link
          to="/game/$slug"
          params={{ slug: game.slug }}
          preload="intent"
          aria-label={ariaParts.join(", ")}
          onPointerEnter={prefetchDetail}
          onFocus={prefetchDetail}
          onTouchStart={prefetchDetail}
          style={{ animationDelay: `${Math.min(index, 9) * 60}ms` }}
          className="group relative block overflow-hidden rounded-lg bg-gradient-card opacity-0 shadow-card outline-none animate-fade-in transition duration-300 [animation-fill-mode:forwards] [will-change:transform] hover:-translate-y-1 hover:shadow-glow focus-visible:-translate-y-1 focus-visible:shadow-glow focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:animate-none motion-reduce:opacity-100"
        >
          <div className="aspect-[16/9] overflow-hidden bg-surface">
            {game.background_image ? (
              <img
                src={game.background_image}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground" aria-hidden="true">
                No image
              </div>
            )}
            {meta?.price?.discount_percent ? (
              <span
                aria-label={`Discount ${meta.price.discount_percent} percent`}
                className="absolute left-2 top-2 rounded bg-success px-1.5 py-0.5 text-[11px] font-bold text-success-foreground shadow-card"
              >
                −{meta.price.discount_percent}%
              </span>
            ) : null}
          </div>
          <div className="space-y-2 p-3">
            <h3 className="line-clamp-1 font-semibold text-foreground">{game.name}</h3>

            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {game.released ? new Date(game.released).getFullYear() : "TBA"}
              </span>
              {meta === undefined ? (
                <span
                  role="status"
                  aria-label="Loading price"
                  className="h-3 w-10 animate-pulse rounded bg-surface-elevated motion-reduce:animate-none"
                />
              ) : meta.price ? (
                <div className="flex items-center gap-1.5">
                  {meta.price.original && (
                    <span className="text-muted-foreground line-through">{meta.price.original}</span>
                  )}
                  <span className="font-semibold text-foreground">{meta.price.final}</span>
                </div>
              ) : (
                <span className="text-muted-foreground" aria-hidden="true">—</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              {meta === undefined ? (
                <span
                  role="status"
                  aria-label="Loading reviews"
                  className="h-4 w-24 animate-pulse rounded bg-surface-elevated motion-reduce:animate-none"
                />
              ) : meta.appid ? (
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${reviewClass(
                    meta.review_score_desc || "No reviews",
                  )}`}
                >
                  {isPositive && <ThumbsUp className="h-2.5 w-2.5" aria-hidden="true" />}
                  {isNegative && <ThumbsDown className="h-2.5 w-2.5" aria-hidden="true" />}
                  <span className="truncate">{meta.review_score_desc || "No reviews"}</span>
                </span>
              ) : (
                <span />
              )}
              {game.metacritic ? (
                <span
                  aria-label={`Metacritic score ${game.metacritic}`}
                  className="rounded bg-success/15 px-1.5 py-0.5 font-mono text-[10px] text-success"
                >
                  {game.metacritic}
                </span>
              ) : null}
            </div>

            {game.genres?.length ? (
              <ul className="flex flex-wrap gap-1 pt-1" aria-label="Genres">
                {game.genres.slice(0, 2).map((g) => (
                  <li
                    key={g.id}
                    className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {g.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Link>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="center"
        sideOffset={12}
        avoidCollisions
        collisionPadding={{ top: 80, right: 16, bottom: 16, left: 16 }}
        sticky="always"
        className="hidden w-[min(460px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/60 bg-popover/95 p-0 shadow-glow backdrop-blur md:block"
        role="dialog"
        aria-label={`${game.name} preview`}
      >
        <div className="flex">
          <div className="relative h-44 w-44 shrink-0 overflow-hidden bg-surface">
            {(detail?.background_image || game.background_image) ? (
              <img
                src={detail?.background_image || game.background_image || ""}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted-foreground" aria-hidden="true">
                No image
              </div>
            )}
            {meta?.price?.discount_percent ? (
              <span className="absolute left-2 top-2 rounded bg-success px-1.5 py-0.5 text-[11px] font-bold text-success-foreground">
                −{meta.price.discount_percent}%
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
            <h4 className="line-clamp-1 text-base font-semibold text-foreground">{game.name}</h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {game.released ? new Date(game.released).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "TBA"}
              </span>
              {hasReview && (
                <span className="inline-flex items-center gap-1">
                  {isPositive && <ThumbsUp className="h-3 w-3" aria-hidden="true" />}
                  {isNegative && <ThumbsDown className="h-3 w-3" aria-hidden="true" />}
                  {meta!.review_score_desc} ({meta!.positive_percent}%)
                </span>
              )}
              {game.metacritic && (
                <span className="rounded bg-success/15 px-1.5 py-0.5 font-mono text-success">{game.metacritic}</span>
              )}
            </div>

            {description ? (
              <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
            ) : (
              <div className="space-y-1.5" role="status" aria-label="Loading details">
                <span className="block h-2.5 w-full animate-pulse rounded bg-surface-elevated motion-reduce:animate-none" />
                <span className="block h-2.5 w-11/12 animate-pulse rounded bg-surface-elevated motion-reduce:animate-none" />
                <span className="block h-2.5 w-9/12 animate-pulse rounded bg-surface-elevated motion-reduce:animate-none" />
              </div>
            )}

            {platformList?.length ? (
              <div className="flex flex-wrap items-center gap-1 pt-1" aria-label="Platforms">
                <Gamepad2 className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                {platformList.slice(0, 4).map((p) => (
                  <span
                    key={p.platform.id}
                    className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {p.platform.name}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              {meta?.price ? (
                <div className="flex items-center gap-1.5 text-sm">
                  {meta.price.original && (
                    <span className="text-muted-foreground line-through">{meta.price.original}</span>
                  )}
                  <span className="font-semibold text-foreground">{meta.price.final}</span>
                </div>
              ) : <span />}
              <Link
                to="/game/$slug"
                params={{ slug: game.slug }}
                preload="intent"
                className="rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                View details
              </Link>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
