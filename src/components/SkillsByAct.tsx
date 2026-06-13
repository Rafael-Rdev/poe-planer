"use client";

import { useMemo } from "react";
import { useBuildStore } from "@/context/buildStore";
import { getGemById } from "@/data/gems";
import { translateTerm } from "@/lib/poe2Translator";
import type { BuildSkill } from "@/types/parser";
import { Sparkles, Gem } from "lucide-react";

/** Deutsche Akt-Namen */
const ACT_NAMES: Record<number, string> = {
  1: "Akt I",
  2: "Akt II",
  3: "Akt III",
  4: "Akt IV",
};

/**
 * SkillsByAct – Gruppiert Skills nach Akt und zeigt aktive Gemmen
 * mit ihren Support-Gemmen in deutscher Übersetzung an.
 *
 * Darstellung als Cards im Maxroll-Stil.
 * Alle Begriffe aus poe2-translations.json, KEIN Mistral-Aufruf.
 */
export default function SkillsByAct() {
  const skillsByAct = useBuildStore((s) => s.skillsByAct);

  // Gruppiere nach Akt (1–4)
  const grouped = useMemo(() => {
    const groups: Record<number, BuildSkill[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    };

    for (const skill of skillsByAct) {
      const act = skill.act >= 1 && skill.act <= 4 ? skill.act : 1;
      groups[act].push(skill);
    }

    return groups;
  }, [skillsByAct]);

  // Nichts anzuzeigen
  const hasSkills = skillsByAct.length > 0;
  if (!hasSkills) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-800/50 bg-zinc-900/50">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-200">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Skills & Support-Gemmen
        </h2>
      </div>

      {/* Akte */}
      <div className="p-4 space-y-5">
        {([1, 2, 3, 4] as const).map((act) => {
          const actSkills = grouped[act];
          if (actSkills.length === 0) return null;

          return (
            <div key={act}>
              {/* Akt-Überschrift */}
              <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded bg-amber-900/30 text-[11px] font-bold text-amber-300">
                  {act}
                </span>
                {ACT_NAMES[act]}
              </h3>

              {/* Skills-Cards */}
              <div className="grid gap-2 sm:grid-cols-2">
                {actSkills.map((skill, idx) => {
                  const activeGem = getGemById(skill.activeGemId);
                  const activeNameDe = activeGem
                    ? activeGem.nameDe
                    : translateTerm(skill.activeGemId);

                  const supportGems = skill.supportGemIds
                    .map((id) => {
                      const gem = getGemById(id);
                      return gem ? gem.nameDe : translateTerm(id);
                    })
                    .filter(Boolean);

                  return (
                    <div
                      key={`${skill.activeGemId}-${idx}`}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 hover:border-zinc-700 transition-colors"
                    >
                      {/* Aktive Gemme */}
                      <div className="flex items-center gap-2">
                        <Gem className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-zinc-200">
                          {activeNameDe}
                        </span>
                        {activeGem && (
                          <span
                            className={`ml-auto h-2 w-2 rounded-full flex-shrink-0 ${
                              activeGem.color === "red"
                                ? "bg-red-600"
                                : activeGem.color === "green"
                                  ? "bg-emerald-500"
                                  : "bg-blue-500"
                            }`}
                          />
                        )}
                      </div>

                      {/* Support-Gemmen */}
                      {supportGems.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {supportGems.map((supName, si) => (
                            <span
                              key={si}
                              className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400"
                            >
                              {supName}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Keine Supports */}
                      {supportGems.length === 0 && (
                        <p className="mt-1 text-[11px] text-zinc-600 italic">
                          Keine Support-Gemmen
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
