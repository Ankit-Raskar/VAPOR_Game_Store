import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { upcomingGames } from "@/lib/games.functions";
import { GameCard } from "@/components/GameCard";
import { CalendarClock } from "lucide-react";

export const Route = createFileRoute("/upcoming")({
  component: UpcomingPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-xl font-semibold">Couldn't load upcoming games</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Retry
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function UpcomingPage() {
  const fn = useServerFn(upcomingGames);
  const { data, isLoading } = useQuery({
    queryKey: ["upcoming-page"],
    queryFn: () => fn({ data: { page_size: 30 } }),
  });

  // Group by month
  type Game = NonNullable<typeof data>["results"][number];
  const grouped = (data?.results ?? []).reduce<Record<string, Game[]>>((acc, g) => {
    const key = g.released
      ? new Date(g.released).toLocaleString("en", { month: "long", year: "numeric" })
      : "TBA";
    (acc[key] ||= []).push(g);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-primary shadow-glow">
          <CalendarClock className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upcoming Releases</h1>
          <p className="text-sm text-muted-foreground">Auto-synced from RAWG — the next 12 months</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[16/9] animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([month, games]) => (
            <section key={month}>
              <h2 className="mb-4 border-l-4 border-primary pl-3 text-lg font-semibold">{month}</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                {games.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
