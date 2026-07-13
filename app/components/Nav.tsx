"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PeachMark } from "@/app/components/icons";

const baseLinks = [{ href: "/", label: "Ledger" }];

const adminLinks = [{ href: "/portal", label: "Portal" }];

export default function Nav({
  authed,
  isAdmin,
}: {
  authed: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const links = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <header className="bg-panel">
      {/* The awning — Peach Cob's front porch */}
      <div className="awning" aria-hidden="true" />
      <div className="mx-auto flex h-14 max-w-[1000px] items-center justify-between gap-4 px-4 sm:px-5">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <PeachMark size={22} />
          <span className="display text-lg font-semibold leading-none tracking-tight whitespace-nowrap">
            Peach Cob
          </span>
          <span className="mt-0.5 hidden font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ink-muted sm:inline">
            404 Parke Ave
          </span>
        </Link>
        {authed && (
          <nav className="flex h-full items-center gap-4 sm:gap-5" aria-label="Main navigation">
            {links.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full items-center border-b-2 px-0.5 text-sm font-medium transition-colors duration-100 ${
                    active
                      ? "border-accent text-ink"
                      : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
      <div className="h-px bg-line-soft" aria-hidden="true" />
    </header>
  );
}
