"use client";

import { Gem, GemColor, getAllGems, getGemById } from "@/data/gems";
import { useState, useRef, useEffect, useMemo } from "react";
import { translateDescription } from "@/lib/poe2Translator";
import { ChevronDown, X, Gem as GemIcon, Search } from "lucide-react";
import GemTooltip from "./GemTooltip";

export type SocketSize = "lg" | "sm";

interface GemSocketProps {
  socketIndex: number;
  gemId: string | null;
  linkedSockets: number[];
  onSelectGem: (socketIndex: number, gemId: string | null) => void;
  /** Visuelle Größe: "lg" für Hauptgemme, "sm" für Support-Gemmen */
  size?: SocketSize;
}

const colorMap: Record<GemColor, { border: string; bg: string; glow: string; text: string; label: string }> = {
  red: {
    border: "border-red-700",
    bg: "bg-red-950/60",
    glow: "shadow-red-500/30",
    text: "text-red-400",
    label: "Rot",
  },
  green: {
    border: "border-emerald-700",
    bg: "bg-emerald-950/60",
    glow: "shadow-emerald-500/30",
    text: "text-emerald-400",
    label: "Grün",
  },
  blue: {
    border: "border-blue-700",
    bg: "bg-blue-950/60",
    glow: "shadow-blue-500/30",
    text: "text-blue-400",
    label: "Blau",
  },
};

const emptyColors = {
  border: "border-zinc-700",
  bg: "bg-zinc-900/50",
  glow: "shadow-zinc-500/10",
  text: "text-zinc-500",
};

/** Eager-initialisierter Cache */
const _allGemsCache: ReturnType<typeof getAllGems> = getAllGems();

/** Debounce-Zeit in ms */
const SEARCH_DEBOUNCE_MS = 120;

export default function GemSocket({
  socketIndex,
  gemId,
  linkedSockets,
  onSelectGem,
  size = "sm",
}: GemSocketProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentGem = gemId ? getGemById(gemId) : null;
  const gemColors = currentGem ? colorMap[currentGem.color] : emptyColors;

  const isLarge = size === "lg";
  const buttonSize = isLarge ? "h-24 w-24 sm:h-28 sm:w-28" : "h-16 w-16";
  const iconSize = isLarge ? "h-8 w-8" : "h-5 w-5";
  const nameSize = isLarge ? "text-[11px]" : "text-[9px]";
  const emptyInnerSize = isLarge ? "h-12 w-12" : "h-8 w-8";

  // Debounce für Suche
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Dropdown außen schließen
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const gemOptions = useMemo(
    () =>
      socketIndex === 0
        ? _allGemsCache.filter((g) => g.type === "active")
        : _allGemsCache.filter((g) => g.type === "support"),
    [socketIndex],
  );

  const filteredGemOptions = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return gemOptions;
    return gemOptions.filter(
      (g) =>
        g.nameDe.toLowerCase().includes(query) ||
        g.nameEn.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query),
    );
  }, [debouncedSearch, gemOptions]);

  function handleSelect(gem: Gem) {
    onSelectGem(socketIndex, gem.id);
    setOpen(false);
    setSearch("");
  }

  function handleRemove() {
    onSelectGem(socketIndex, null);
    setOpen(false);
    setSearch("");
  }

  function handleMouseEnter() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setShowTooltip(true), 400);
  }

  function handleMouseLeave() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowTooltip(false);
  }

  return (
    <div className="relative flex flex-col items-center gap-1" ref={dropdownRef}>
      {/* Tooltip (bei Hover auf gesockelter Gemme) */}
      {currentGem && showTooltip && !open && (
        <GemTooltip
          gem={currentGem}
          onClose={() => setShowTooltip(false)}
        />
      )}

      {/* Sockel-Kreis */}
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          relative ${buttonSize} rounded-full border-2 transition-all duration-300
          flex items-center justify-center cursor-pointer
          ${gemColors.border} ${gemColors.bg}
          shadow-lg ${gemColors.glow}
          hover:brightness-125 hover:scale-105
          ${currentGem ? "ring-1 ring-amber-500/40" : ""}
          ${isLarge && currentGem ? "ring-2 ring-amber-400/50 shadow-amber-500/40" : ""}
        `}
        title={
          currentGem
            ? `${currentGem.nameDe} (${currentGem.type === "active" ? "Aktiv" : "Support"})`
            : isLarge
              ? "Aktive Fertigkeit – klicke zum Auswählen"
              : `Support-Sockel ${socketIndex} – leer`
        }
      >
        {currentGem ? (
          <span className="flex flex-col items-center justify-center text-center leading-tight px-1">
            <GemIcon className={`${iconSize} mx-auto mb-0.5 ${gemColors.text}`} />
            <span className={`block ${nameSize} text-zinc-300 truncate max-w-14 sm:max-w-20`}>
              {currentGem.nameDe}
            </span>
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <span
              className={`block ${emptyInnerSize} rounded-full border-2 border-dashed border-zinc-700`}
            />
          </span>
        )}
      </button>

      {/* Label unter dem Sockel */}
      <span className="text-[10px] text-zinc-600 font-mono">
        {isLarge ? "Aktiv" : `Support ${socketIndex}`}
      </span>

      {/* Dropdown-Menü */}
      {open && (
        <div className="absolute top-full mt-2 z-50 w-72 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
            <span className="text-xs font-semibold text-zinc-400">
              Sockel {socketIndex + 1}
              <span className="ml-1.5 text-zinc-600">
                ({socketIndex === 0 ? "Aktiv" : "Support"})
              </span>
            </span>
            {currentGem && (
              <button
                onClick={handleRemove}
                className="rounded p-0.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                title="Entfernen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Suchfeld */}
          <div className="relative border-b border-zinc-700 px-3 py-2">
            <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche nach Name oder Effekt…"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-1.5 pl-8 pr-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-colors"
              autoFocus
            />
          </div>

          {/* Gemmen-Liste */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredGemOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-zinc-600">
                {search.trim() ? "Keine Gemmen gefunden." : "Keine passenden Gemmen verfügbar."}
              </p>
            ) : (
              filteredGemOptions.map((gem) => {
                const isActive = gem.id === gemId;
                const c = colorMap[gem.color];
                return (
                  <button
                    key={gem.id}
                    onClick={() => handleSelect(gem)}
                    disabled={isActive}
                    className={`
                      w-full flex items-start gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors
                      ${isActive ? "bg-amber-900/30 text-amber-300" : "text-zinc-300 hover:bg-zinc-800"}
                      disabled:cursor-default
                    `}
                  >
                    <span
                      className={`mt-0.5 block h-3 w-3 shrink-0 rounded-full border ${c.border} ${c.bg}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs">{gem.nameDe}</span>
                        <span className="text-[10px] text-zinc-500">
                          {gem.type === "active" ? "Aktiv" : "Support"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-zinc-500 leading-tight">
                        {translateDescription(gem.description)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-mono ${c.text}`}>●</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Anzahl-Anzeige */}
          <div className="border-t border-zinc-700 px-3 py-1.5 text-[10px] text-zinc-600 text-center">
            {filteredGemOptions.length} / {gemOptions.length} Gemmen
          </div>
        </div>
      )}
    </div>
  );
}