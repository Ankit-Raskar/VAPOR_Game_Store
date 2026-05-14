import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSteamReviews } from "@/lib/games.functions";
import { ThumbsUp, ThumbsDown, ExternalLink, Clock, MessageSquare } from "lucide-react";

const SCORE_COLOR: Record<string, string> = {
  "Overwhelmingly Positive": "text-[oklch(0.78_0.18_220)]",
  "Very Positive": "text-[oklch(0.78_0.18_220)]",
  "Positive": "text-[oklch(0.78_0.18_220)]",
  "Mostly Positive": "text-[oklch(0.78_0.18_220)]",
  "Mixed": "text-[oklch(0.8_0.16_75)]",
  "Mostly Negative": "text-destructive",
  "Negative": "text-destructive",
  "Very Negative": "text-destructive",
  "Overwhelmingly Negative": "text-destructive",
};

function timeAgo(ts: number) {
  const s = Math.floor(Date.now() / 1000) - ts;
  const d = Math.floor(s / 86400);
  if (d > 365) return `${Math.floor(d / 365)}y ago`;
  if (d > 30) return `${Math.floor(d / 30)}mo ago`;
  if (d > 0) return `${d}d ago`;
  return "today";
}

export function SteamReviews({
  slug,
  variant = "full",
}: {
  slug: string;
  variant?: "full" | "summary" | "recent";
}) {
  const fn = useServerFn(getSteamReviews);
  const { data, isLoading } = useQuery({
    queryKey: ["steam-reviews", slug],
    queryFn: () => fn({ data: { slug } }),
  });

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-surface" />;
  }
  if (!data || !data.appid) {
    if (variant === "summary") return null;
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        No Steam reviews available for this title.
      </div>
    );
  }

  const colorClass = SCORE_COLOR[data.review_score_desc] ?? "text-foreground";
  const pct = data.positive_percent;

  const summary = (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Steam Reviews
        </h3>
        {data.steamUrl && (
          <a
            href={data.steamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            Steam <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className={`mt-3 text-lg font-bold ${colorClass}`}>
        {data.review_score_desc}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {pct}% of {data.total_reviews.toLocaleString()} reviews are positive.
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5">
          <ThumbsUp className="h-3.5 w-3.5 text-primary" />
          <div>
            <div className="text-xs font-semibold">{data.total_positive.toLocaleString()}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Positive</div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5">
          <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
          <div>
            <div className="text-xs font-semibold">{data.total_negative.toLocaleString()}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Negative</div>
          </div>
        </div>
      </div>
    </div>
  );

  const recent = data.reviews.length > 0 && (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight">Recent Steam Reviews</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {data.reviews.slice(0, 6).map((r) => (
          <article
            key={r.recommendationid}
            className="group rounded-xl border border-border bg-surface p-4 transition hover:border-primary/40"
          >
            <header className="flex items-center justify-between">
              <div
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                  r.voted_up ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                }`}
              >
                {r.voted_up ? (
                  <><ThumbsUp className="h-3 w-3" /> Recommended</>
                ) : (
                  <><ThumbsDown className="h-3 w-3" /> Not Recommended</>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">{timeAgo(r.timestamp_created)}</span>
            </header>
            <p className="mt-3 line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {r.review}
            </p>
            <footer className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(r.author.playtime_forever / 60)}h on record
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {r.author.num_reviews} reviews
              </span>
              {r.votes_up > 0 && <span className="ml-auto">{r.votes_up} found helpful</span>}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );

  if (variant === "summary") return summary;
  if (variant === "recent") return <>{recent}</>;
  return (
    <div className="space-y-5">
      {summary}
      {recent}
    </div>
  );
}
