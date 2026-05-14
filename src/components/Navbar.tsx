import { Link, useNavigate } from "@tanstack/react-router";
import { Gamepad2, LogOut, User as UserIcon, Library } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-primary shadow-glow">
            <Gamepad2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg">VAPOR</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          <NavLink to="/">Store</NavLink>
          <NavLink to="/library">Library</NavLink>
          <NavLink to="/genres">Genres</NavLink>
          <NavLink to="/upcoming">Upcoming</NavLink>
          {user && <NavLink to="/my-library">My Collection</NavLink>}
        </nav>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-border bg-input px-3 py-1.5 text-sm transition hover:border-primary">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                {(user.user_metadata?.username ?? user.email ?? "U")[0].toUpperCase()}
              </div>
              <span className="hidden max-w-[120px] truncate sm:inline">
                {user.user_metadata?.username ?? user.email}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/my-library" })}>
                <Library className="mr-2 h-4 w-4" /> My Collection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut().then(() => navigate({ to: "/" }))}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <UserIcon className="h-4 w-4" />
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-surface-elevated hover:text-foreground"
      activeProps={{ className: "rounded-md px-3 py-1.5 bg-surface-elevated text-foreground" }}
      activeOptions={{ exact: true }}
    >
      {children}
    </Link>
  );
}
