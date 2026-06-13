"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages, BookMarked, Info, Menu, X, Gem } from "lucide-react";
import { useState, useMemo } from "react";

const NAV_LINKS = [
  { href: "/translate", label: "Übersetzen", icon: Languages },
  { href: "/saved",     label: "Gespeicherte Builds", icon: BookMarked },
  { href: "/info",      label: "Info", icon: Info },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(
    () =>
      NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const cls = `flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-amber-900/30 text-amber-300"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        }`;
        return { href, label, Icon, cls };
      }),
    [pathname]
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-amber-900/40 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/translate"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-amber-400 hover:text-amber-300 transition-colors"
        >
          <Gem className="h-5 w-5" />
          <span className="hidden sm:inline">PoE 2 Guide-Übersetzer</span>
          <span className="sm:hidden">PoE 2</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(({ href, label, Icon, cls }) => (
            <Link key={href} href={href} className={cls}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          aria-label="Menü"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-amber-900/40 bg-zinc-900 md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {navItems.map(({ href, label, Icon, cls }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cls}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
