"use client";

import { useMemo } from "react";
import { useBuildStore } from "@/context/buildStore";
import { getPassiveTalentById } from "@/data/passives";
import { translateTerm } from "@/lib/poe2Translator";
import { Zap } from "lucide-react";

/**
 * PassiveNotables – Zeigt nur Notable-Namen als kompakte Tags/Liste an.
 *
 * Kein "Allocation Step #1, #2..." Format mehr.
 * Deutsche Notable-Namen aus poe2-translations.json.
 */
export default function PassiveNotables() {
  const selectedPassives = useBuildStore((s) => s.selectedPassives);

  // Notable-Namen auflösen und ins Deutsche übersetzen
  const notables = useMemo(() => {
    return selectedPassives
      .map((id) => {
        const talent = getPassiveTalentById(id);
        if (talent) {
          // nameDe ist bereits in der Datenbank vorhanden
          return talent.nameDe || translateTerm(talent.nameEn);
        }
        // Fallback: ID übersetzen
        return translateTerm(id);
      })
      .filter(Boolean);
  }, [selectedPassives]);

  if (notables.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-800/50 bg-zinc-900/50">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-200">
          <Zap className="h-4 w-4 text-amber-400" />
          Passive Notables
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {notables.length} Notable{notables.length !== 1 ? "s" : ""} ausgewählt
        </p>
      </div>

      {/* Tags */}
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {notables.map((name, idx) => (
            <span
              key={`${name}-${idx}`}
              className="inline-flex items-center rounded-lg border border-zinc-700/50 bg-zinc-800/70 px-3 py-1.5 text-sm text-zinc-300 hover:border-amber-700/50 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
