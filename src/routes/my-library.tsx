import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getMyLibrary, removeFromLibrary } from "@/lib/library.functions";
import { useAuth } from "@/hooks/use-auth";
import { Library, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/my-library")({ component: MyLibraryPage });

function MyLibraryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getMyLibrary);
  const removeFn = useServerFn(removeFromLibrary);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-library"],
    queryFn: () => getFn(),
    enabled: !!user,
  });

  const remove = useMutation({
    mutationFn: (slug: string) => removeFn({ data: { game_slug: slug } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-library"] });
      toast.success("Removed from library");
    },
  });

  if (!user) return null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Library className="h-7 w-7 text-primary" /> My Collection
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.items.length ?? 0} {data?.items.length === 1 ? "game" : "games"} in your library
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[16/9] animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <p className="text-muted-foreground">Your library is empty.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-primary hover:underline">
            Browse the store →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {data?.items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-lg bg-gradient-card shadow-card">
              <Link to="/game/$slug" params={{ slug: item.game_slug }}>
                <div className="aspect-[16/9] overflow-hidden bg-surface">
                  {item.game_image ? (
                    <img src={item.game_image} alt={item.game_name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold">{item.game_name}</h3>
                </div>
              </Link>
              <button
                onClick={() => remove.mutate(item.game_slug)}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-background/80 text-destructive opacity-0 backdrop-blur transition hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
