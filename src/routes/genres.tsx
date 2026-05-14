import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGenres } from "@/lib/games.functions";
import { Tag } from "lucide-react";

export const Route = createFileRoute("/genres")({ component: GenresPage });

function GenresPage() {
  const fn = useServerFn(listGenres);
  const { data, isLoading } = useQuery({ queryKey: ["genres"], queryFn: () => fn() });

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Tag className="h-7 w-7 text-primary" /> Browse by Genre
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Discover games across every genre.</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data?.results?.map((g) => (
            <Link
              key={g.id}
              to="/library"
              search={{ search: "", ordering: "-added", page: 1, genres: g.slug }}
              className="group relative overflow-hidden rounded-xl border border-border bg-gradient-card shadow-card transition hover:-translate-y-1 hover:shadow-glow"
            >
              {g.image_background && (
                <img src={g.image_background} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 transition group-hover:opacity-60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="relative flex h-40 flex-col justify-end p-4">
                <h3 className="text-lg font-bold text-foreground">{g.name}</h3>
                <p className="text-xs text-muted-foreground">{g.games_count?.toLocaleString()} games</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
