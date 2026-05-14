import { Link } from "@tanstack/react-router";
import { Youtube, Facebook, Twitter, Apple } from "lucide-react";

const COLUMNS: { heading: string; links: { label: string; to?: string; href?: string }[] }[] = [
  {
    heading: "VAPOR",
    links: [
      { label: "About VAPOR", to: "/" },
      { label: "VAPOR SSA", href: "#" },
      { label: "Vaporworks", href: "#" },
      { label: "VAPOR Distribution", href: "#" },
      { label: "Gift Cards", href: "#" },
    ],
  },
  {
    heading: "STUDIO",
    links: [
      { label: "About Studio", href: "#" },
      { label: "Jobs", href: "#" },
      { label: "Hardware", href: "#" },
      { label: "Recycling", href: "#" },
    ],
  },
  {
    heading: "LEGAL",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Accessibility", href: "#" },
      { label: "Notices & Policies", href: "#" },
      { label: "Cookies", href: "#" },
      { label: "Refunds", href: "#" },
    ],
  },
  {
    heading: "MORE",
    links: [
      { label: "Get VAPOR", href: "#" },
      { label: "Get Mobile Apps", href: "#" },
      { label: "Get Support", href: "#" },
      { label: "My Account", to: "/my-library" },
    ],
  },
];

const SOCIALS = [
  { label: "YouTube", icon: Youtube, href: "https://youtube.com" },
  { label: "Bluesky", icon: Twitter, href: "https://bsky.app" },
  { label: "Facebook", icon: Facebook, href: "https://facebook.com" },
  { label: "X (Twitter)", icon: Twitter, href: "https://x.com" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      className="mt-20 border-t border-border bg-surface"
    >
      <section
        aria-labelledby="recommend-heading"
        className="border-b border-border bg-background/40"
      >
        <div className="mx-auto max-w-7xl px-6 py-14 text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-5 flex h-10 w-16 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground"
          >
            <svg viewBox="0 0 64 32" className="h-7 w-12" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="18" cy="16" r="10" />
              <circle cx="46" cy="16" r="6" />
              <line x1="26" y1="14" x2="40" y2="14" />
            </svg>
          </div>
          <h2 id="recommend-heading" className="text-2xl font-semibold text-primary">
            Keep scrolling for more recommendations
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Below, you'll find a variety of titles that you may be interested in from categories across VAPOR
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-lg font-bold tracking-wider text-foreground">
              <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-surface-elevated">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="9" cy="12" r="6" />
                  <circle cx="17" cy="12" r="3" />
                </svg>
              </span>
              VAPOR
            </span>
            <span className="rounded border border-border px-2 py-0.5 text-xs font-bold tracking-widest text-muted-foreground">
              STUDIO
            </span>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            © {year} VAPOR Corporation. All rights reserved. All trademarks are property of their
            respective owners in the US and other countries. VAT included in all prices where
            applicable.
          </p>
          <ul className="flex items-center gap-4" aria-label="Social media">
            {SOCIALS.map(({ label, icon: Icon, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full bg-surface-elevated text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h3 className="mb-4 text-xs font-bold tracking-widest text-foreground/90">
              {col.heading}
            </h3>
            <ul className="space-y-3 text-sm">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link
                      to={link.to}
                      className="text-primary/90 transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none focus-visible:underline"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-primary/90 transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none focus-visible:underline"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-4 text-center text-[11px] text-muted-foreground">
          Game data via RAWG & VAPOR. Not affiliated with Valve.
        </div>
      </div>
    </footer>
  );
}
