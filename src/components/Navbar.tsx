"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TreePine,
  Gem,
  Package,
  Upload,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";

import { useState, useMemo } from "react";
import ShareBuild from "@/components/ShareBuild";
import HelpModal from "@/components/HelpModal";
import ResetBuildButton from "@/components/ResetBuildButton";

const navLinks = [
  { href: "/build",    label: "Build",    icon: LayoutDashboard },
  { href: "/skilltree", label: "Skilltree", icon: TreePine },
  { href: "/gemmen",   label: "Gemmen",   icon: Gem },
  { href: "/items",    label: "Items",    icon: Package },
  { href: "/import",   label: "Import",   icon: Upload },
];

// Vorberechnete hrefWithSlash vermeidet String-Concat in jedem Render-Zyklus
const NAV_LINKS_WITH_SLASH = navLinks.map((link) => ({
  ...link,
  hrefWithSlash: link.href + "/",
}));

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Memoized: Vermeidet doppelte .map()-Ausführung und unnötige Reconciliation
  const navLinkElements = useMemo(
    () =>
      NAV_LINKS_WITH_SLASH.map(({ href, label, icon: Icon, hrefWithSlash }) => {
        const active = pathname === href || pathname.startsWith(hrefWithSlash);
        const baseClass = `flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-amber-900/30 text-amber-300"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        }`;
        return { key: href, href, label, Icon, active, baseClass };
      }),
    [pathname],
  );

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-amber-900/40 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo / Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Gem className="h-6 w-6" />
            <span className="hidden sm:inline">PoE 2 Build-Planer</span>
            <span className="sm:hidden">PoE 2</span>
          </Link>

          {/* Desktop Links + Actions */}
          <div className="hidden md:flex items-center gap-1">
            {navLinkElements.map(({ key, href, label, Icon, baseClass }) => (
              <Link key={key} href={href} className={baseClass}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <div className="w-px h-5 bg-zinc-700/50 mx-1" />
            <ResetBuildButton />
            <ShareBuild />
            <button
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              title="Hilfe & Tipps"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Hilfe</span>
            </button>
          </div>

          {/* Mobile Burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            aria-label="Menü öffnen"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="border-t border-amber-900/40 bg-zinc-900 md:hidden">
            <div className="flex flex-col gap-1 px-4 py-3">
              {navLinkElements.map(({ key, href, label, Icon, baseClass }) => (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={baseClass}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
              <div className="border-t border-zinc-800 my-1 pt-2 flex flex-col gap-1">
                <ResetBuildButton />
                <ShareBuild />
                <button
                  onClick={() => {
                    setHelpOpen(true);
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <HelpCircle className="h-4 w-4" />
                  Hilfe
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

