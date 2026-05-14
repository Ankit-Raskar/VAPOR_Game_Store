import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Gamepad2, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username, display_name: username },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created — check your email to confirm, then sign in.");
          setMode("signin");
          setLoading(false);
          return;
        }
        toast.success("Account created — welcome to VAPOR!");
        navigate({ to: "/" });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/email not confirmed/i.test(error.message)) {
            await supabase.auth.resend({
              type: "signup",
              email,
              options: { emailRedirectTo: `${window.location.origin}/` },
            });
            toast.error("Please confirm your email. We just sent you a new confirmation link.");
            return;
          }
          throw error;
        }
        toast.success("Signed in");
        navigate({ to: "/" });
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-xl bg-gradient-primary shadow-glow">
          <Gamepad2 className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === "signin" ? "Sign in to VAPOR" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "Welcome back, gamer." : "Start building your game library."}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <Field label="Username">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required minLength={2} maxLength={30}
                placeholder="gamer123"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Field>
          )}
          <Field label="Email" icon={<Mail className="h-4 w-4" />}>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="you@example.com"
              className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Password" icon={<Lock className="h-4 w-4" />}>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              placeholder="••••••••"
              className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </Field>

          <button
            type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to VAPOR? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-medium text-primary hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>

      <Link to="/" className="mt-6 text-center text-xs text-muted-foreground hover:text-foreground">
        ← Back to store
      </Link>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        {children}
      </div>
    </label>
  );
}
