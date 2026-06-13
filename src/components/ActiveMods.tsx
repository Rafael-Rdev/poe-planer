"use client";

import { Gem } from "@/data/gems";
import { translateDescription } from "@/lib/poe2Translator";
import {
  Zap,
  Flame,
  Snowflake,
  Swords,
  ArrowUp,
  Link2,
  Sparkles,
  Ban,
} from "lucide-react";

interface ActiveModsProps {
  activeGem: Gem | null;
  linkedSupports: Gem[];
}

/** Icon für Gem-Farbe */
function ColorIcon({ color }: { color: string }) {
  const cls =
    color === "red"
      ? "text-red-400"
      : color === "green"
        ? "text-emerald-400"
        : "text-blue-400";
  return <span className={`block h-2 w-2 rounded-full ${cls}`} />;
}

/** Effekt-Icon basierend auf Gem-Typ */
function EffectIcon({ gem }: { gem: Gem }) {
  if (gem.color === "red") return <Flame className="h-4 w-4 text-red-400" />;
  if (gem.color === "green") return <Zap className="h-4 w-4 text-emerald-400" />;
  return <Snowflake className="h-4 w-4 text-blue-400" />;
}

export default function ActiveMods({
  activeGem,
  linkedSupports,
}: ActiveModsProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 px-3 py-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-zinc-200">
          Aktive Modifikatoren
        </h2>
        {activeGem && (
          <span className="ml-auto text-[10px] text-zinc-500">
            {linkedSupports.length} Support{linkedSupports.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!activeGem ? (
        /* Platzhalter: Keine aktive Gemme */
        <div className="flex flex-col items-center px-3 py-8 text-center">
          <Swords className="mb-2 h-8 w-8 text-zinc-700" />
          <p className="text-xs text-zinc-500">
            Wähle eine aktive Gemme in Sockel 1 aus.
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-600">
            Danach erscheinen hier die aktiven Modifikatoren.
          </p>
        </div>
      ) : (
        <div className="p-3">
          {/* Aktive Gemme */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded border-2
                  ${activeGem.color === "red" ? "border-red-700 bg-red-950/40" : ""}
                  ${activeGem.color === "green" ? "border-emerald-700 bg-emerald-950/40" : ""}
                  ${activeGem.color === "blue" ? "border-blue-700 bg-blue-950/40" : ""}
                `}
              >
                <EffectIcon gem={activeGem} />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">
                  {activeGem.nameDe}
                </p>
                <p className="text-[10px] text-zinc-500">{translateDescription(activeGem.description)}</p>
              </div>
            </div>
          </div>

          {/* Trennlinie */}
          <div className="mb-3 border-t border-zinc-800" />

          {/* Support-Gemmen */}
          {linkedSupports.length === 0 ? (
            <div className="flex items-center gap-1.5 rounded border border-dashed border-zinc-700 bg-zinc-800/30 px-3 py-2">
              <Ban className="h-3.5 w-3.5 text-zinc-600" />
              <p className="text-[10px] text-zinc-500">
                Keine Support-Gemmen verlinkt.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {linkedSupports.map((gem) => (
                <div
                  key={gem.id}
                  className="rounded border border-zinc-700/50 bg-zinc-800/40 p-2 transition-colors hover:border-amber-700/30"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`
                        mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border
                        ${gem.color === "red" ? "border-red-700 bg-red-950/30" : ""}
                        ${gem.color === "green" ? "border-emerald-700 bg-emerald-950/30" : ""}
                        ${gem.color === "blue" ? "border-blue-700 bg-blue-950/30" : ""}
                      `}
                    >
                      <EffectIcon gem={gem} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-zinc-200">
                          {gem.nameDe}
                        </p>
                        <span
                          className={`text-[8px] font-mono ${
                            gem.color === "red"
                              ? "text-red-400"
                              : gem.color === "green"
                                ? "text-emerald-400"
                                : "text-blue-400"
                          }`}
                        >
                          ●
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-400">
                        {translateDescription(gem.effect)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats-Zusammenfassung */}
          {linkedSupports.length > 0 && (
            <div className="mt-3 rounded border border-zinc-800 bg-zinc-800/20 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <ArrowUp className="h-3 w-3 text-emerald-500" />
                <span>
                  <span className="font-semibold text-zinc-200">{activeGem.nameDe}</span>
                  {" "}unterstützt durch <span className="font-semibold text-amber-300">
                    {linkedSupports.length}
                  </span> Support-Gemme{linkedSupports.length !== 1 ? "n" : ""}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {linkedSupports.map((gem) => (
                  <span
                    key={gem.id}
                    className="inline-flex items-center gap-0.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 text-[9px] text-zinc-300"
                  >
                    <Link2 className="h-2 w-2 text-amber-500" />
                    {gem.nameDe}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
