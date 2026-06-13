"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSkillDetail, type SkillDetail } from "@/lib/skillDetailService";
import type { Gem } from "@/data/gems";
import { X, Loader2 } from "lucide-react";
import { translateDescription } from "@/lib/poe2Translator";

interface GemTooltipProps {
  gem: Gem;
  /** Position relativ zum Trigger-Element oder fest via Koordinaten */
  position?: { x: number; y: number } | null;
  /** Wird aufgerufen, um den Tooltip zu schließen */
  onClose: () => void;
}

/**
 * Farb-Mapping für Gem-Farben → Tooltip-Akzentfarbe
 */
const gemColorAccent: Record<string, { border: string; badge: string; text: string }> = {
  red: {
    border: "border-red-700/60",
    badge: "bg-red-950/70 border-red-700/50 text-red-400",
    text: "text-red-400",
  },
  green: {
    border: "border-emerald-700/60",
    badge: "bg-emerald-950/70 border-emerald-700/50 text-emerald-400",
    text: "text-emerald-400",
  },
  blue: {
    border: "border-blue-700/60",
    badge: "bg-blue-950/70 border-blue-700/50 text-blue-400",
    text: "text-blue-400",
  },
};

const defaultAccent = {
  border: "border-amber-700/60",
  badge: "bg-amber-950/70 border-amber-700/50 text-amber-400",
  text: "text-amber-400",
};

export default function GemTooltip({ gem, onClose }: GemTooltipProps) {
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const accent = gemColorAccent[gem.color] ?? defaultAccent;

  // Lade Skill-Details asynchron
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSkillDetail(gem.id).then((d) => {
      if (!cancelled) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [gem.id]);

  // Click-Outside schließen
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Verzögert, damit der öffnende Click nicht sofort schließt
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const showDetail = detail && !loading;

  return (
    <div
      ref={tooltipRef}
      className={`
        absolute z-[100] w-72 sm:w-80
        rounded-lg border ${accent.border}
        bg-[#0d0814]/98 shadow-2xl shadow-black/60
        backdrop-blur-md
        animate-in fade-in zoom-in-95 duration-150
      `}
      style={{ top: "-4px", left: "calc(100% + 12px)" }}
    >
      {/* ─── Close-Button (oben rechts) ─── */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-0.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* ─── Header: Name + Typ ─── */}
      <div className="px-3.5 pt-3 pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          {/* Farb-Indikator */}
          <span
            className={`block h-2.5 w-2.5 shrink-0 rounded-full border ${
              accent.border
            } ${
              gem.color === "red"
                ? "bg-red-500/40"
                : gem.color === "green"
                  ? "bg-emerald-500/40"
                  : "bg-blue-500/40"
            }`}
          />
          <h3 className="text-sm font-semibold text-amber-400 leading-tight truncate">
            {showDetail ? detail.nameDe : gem.nameDe}
          </h3>
          <span className="ml-auto shrink-0 text-[10px] text-zinc-600 font-mono">
            {gem.type === "active" ? "Aktiv" : "Support"}
          </span>
        </div>
      </div>

      {/* ─── Tags ─── */}
      {showDetail && detail.tags.length > 0 && (
        <div className="px-3.5 pt-2 pb-1.5 border-b border-zinc-800/40">
          <div className="flex flex-wrap gap-1">
            {detail.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-violet-950/60 border border-violet-700/40 text-violet-300 leading-none"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Werte-Sektion: Anforderungen ─── */}
      <div className="px-3.5 py-2 space-y-1 text-[11px] leading-tight">
        {/* Attribute Requirements */}
        <div className="flex items-center gap-3 text-zinc-500">
          <span className="text-zinc-600 shrink-0">Anforderungen:</span>
          {detail?.requirements ? (
            <>
              <span className="text-red-400 tabular-nums">
                {detail.requirements.strength} Str
              </span>
              <span className="text-emerald-400 tabular-nums">
                {detail.requirements.dexterity} Ges
              </span>
              <span className="text-blue-400 tabular-nums">
                {detail.requirements.intelligence} Int
              </span>
            </>
          ) : (
            <span className="text-zinc-700">—</span>
          )}
        </div>
      </div>

       {/* ─── Beschreibung ─── */}
       {(showDetail ? detail.description : gem.description) && (
         <div className="px-3.5 pb-3 pt-1">
           <p className="text-[11px] leading-relaxed text-zinc-300/90">
             {translateDescription(showDetail ? detail.description : gem.description)}
           </p>
         </div>
       )}

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex items-center justify-center px-3.5 py-4">
          <Loader2 className="h-4 w-4 text-zinc-600 animate-spin" />
        </div>
      )}
    </div>
  );
}