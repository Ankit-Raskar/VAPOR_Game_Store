import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/complete-profile")({ component: CompleteProfilePage });

function CompleteProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const fallback = user.email?.split("@")[0] ?? "";
      const current = data?.username ?? "";
      // If they already have a real (custom) username, skip this step.
      if (current && current !== fallback) {
        navigate({ to: "/" });
        return;
      }
      setUsername(current || fallback);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const trimmed = username.trim();
      if (trimmed.length < 2) throw new Error("Username must be at least 2 characters");
      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmed, display_name: trimmed })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Welcome aboard!");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save username");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-xl bg-gradient-primary shadow-glow">
          <UserCircle2 className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Pick a username</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is how other gamers will see you on VAPOR.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
            maxLength={30}
            placeholder="gamer123"
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </button>
      </form>
    </main>
  );
}
