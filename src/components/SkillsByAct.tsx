"use client";

import { useMemo } from "react";
import { useBuildStore } from "@/context/buildStore";
import { getGemById } from "@/data/gems";
import type { Gem } from "@/data/gems";
import { translateSkillId } from "@/lib/poe2Translator";
import type { BuildSkill } from "@/types/parser";
import { Sparkles } from "lucide-react";

/** Deutsche Akt-Namen */
const ACT_NAMES: Record<number, string> = {
  1: "Akt I",
  2: "Akt II",
  3: "Akt III",
  4: "Akt IV",
};

/**
 * Gibt die Farbe für ein Gem anhand seines Typs/Color zurück.
 * - Aktiv = Orange (#c8a96e)
 * - Support = Grün (#4ade80)
 * - Spirit/Blau = Blau (#60a5fa)
 */
function getGemDisplayColor(gem: Gem | undefined): string {
  if (!gem) return "#c8a96e"; // default orange für unbekannte
  if (gem.type === "support") return "#4ade80";
  if (gem.color === "blue") return "#60a5fa";
  return "#c8a96e"; // active = orange/gold
}

/**
 * SkillsByAct – Maxroll-ähnliche Skill-Übersicht.
 *
 * Gruppiert Skills nach Akt und zeigt aktive Gemmen mit ihren
 * Support-Gemmen als eingerückte Liste mit "└"-Verbindungszeichen.
 *
 * 3-spaltiges Card-Grid pro Akt (1-spaltig auf Mobile).
 * Farben: Aktiv = Orange, Support = Grün, Spirit = Blau
 * "Player Default"-Einträge werden herausgefiltert.
 */
export default function SkillsByAct() {
  const skillsByAct = useBuildStore((s) => s.skillsByAct);

  // Skills deduplizieren, "Player Default" filtern und nach Akt gruppieren.
  // Jeder Skill erscheint nur EINMAL – in seinem zuerst auftretenden Akt –
  // mit über alle Akte zusammengeführten (und nach Name deduplizierten)
  // Support-Gems.
  const grouped = useMemo(() => {
    const groups: Record<number, BuildSkill[]> = { 1: [], 2: [], 3: [], 4: [] };
    const seen = new Map<string, BuildSkill>();
    const supportNames = new Map<BuildSkill, Set<string>>();

    for (const skill of skillsByAct) {
      const act = skill.act >= 1 && skill.act <= 4 ? skill.act : 1;
      const gem = getGemById(skill.activeGemId);

      // "Player Default"-Einträge herausfiltern –
      // prüft nameEn UND nameDe (samt Fallback), case-insensitive.
      const nameDe = gem ? gem.nameDe : translateSkillId(skill.activeGemId);
      const nameEn = gem ? gem.nameEn : translateSkillId(skill.activeGemId);
      if (
        nameDe.toLowerCase().includes("player default") ||
        nameEn.toLowerCase().includes("player default")
      ) continue;

      const key = (gem ? gem.id : translateSkillId(skill.activeGemId)).toLowerCase();

      let entry = seen.get(key);
      if (!entry) {
        entry = { activeGemId: skill.activeGemId, supportGemIds: [], act };
        seen.set(key, entry);
        supportNames.set(entry, new Set());
        groups[act].push(entry);
      }

      const nameSet = supportNames.get(entry)!;
      for (const supId of skill.supportGemIds) {
        if (!supId) continue;
        const supGem = getGemById(supId);
        const supName = (supGem ? supGem.nameDe : translateSkillId(supId)).toLowerCase();
        if (!supName || nameSet.has(supName)) continue;
        nameSet.add(supName);
        entry.supportGemIds.push(supId);
      }
    }

    return groups;
  }, [skillsByAct]);

  // Nichts anzuzeigen
  const hasSkills = skillsByAct.length > 0;
  if (!hasSkills) return null;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderColor: "rgba(200, 169, 110, 0.15)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5"
        style={{
          borderBottom: "1px solid rgba(200, 169, 110, 0.1)",
          background: "rgba(0, 0, 0, 0.15)",
        }}
      >
        <h2
          className="flex items-center gap-2 text-base font-semibold"
          style={{ color: "#f0e6d3" }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "#c8a96e" }} />
          Skills & Support-Gemmen
        </h2>
      </div>

      {/* Akte */}
      <div className="p-5 space-y-5">
        {([1, 2, 3, 4] as const).map((act) => {
          const actSkills = grouped[act];
          if (actSkills.length === 0) return null;

          return (
            <div key={act}>
              {/* Akt-Überschrift */}
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: "#c8a96e" }}
              >
                <span
                  className="flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold"
                  style={{
                    background: "rgba(200, 169, 110, 0.15)",
                    color: "#d4b87a",
                  }}
                >
                  {act}
                </span>
                {ACT_NAMES[act]}
              </h3>

              {/* Skills-Cards – 3-spaltig auf Desktop, 1-spaltig auf Mobile */}
              <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {actSkills.map((skill, idx) => {
                  const activeGem = getGemById(skill.activeGemId);
                  const activeNameDe = activeGem
                    ? activeGem.nameDe
                    : translateSkillId(skill.activeGemId);

                  const gemColor = getGemDisplayColor(activeGem);
                  const isActive = activeGem?.type !== "support";

                  const supportGems = skill.supportGemIds
                    .map((id) => {
                      const gem = getGemById(id);
                      return gem
                        ? { name: gem.nameDe, gem }
                        : { name: translateSkillId(id), gem: undefined };
                    })
                    .filter((s) => Boolean(s.name));

                  return (
                    <div
                      key={`${skill.activeGemId}-${idx}`}
                      className="rounded-xl p-4 transition-all duration-200 relative"
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.05)";
                        e.currentTarget.style.borderColor =
                          "rgba(200, 169, 110, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.borderColor =
                          "rgba(255, 255, 255, 0.06)";
                      }}
                    >
                      {/* AKTIV/PASSIV Badge – oben rechts */}
                      <span
                        className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: `${gemColor}1a`,
                          color: gemColor,
                          border: `1px solid ${gemColor}33`,
                        }}
                      >
                        {isActive ? "AKTIV" : "PASSIV"}
                      </span>

                      {/* Skill-Name groß oben */}
                      <div className="flex items-center gap-2.5 pr-16">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{
                            background: gemColor,
                            boxShadow: `0 0 6px ${gemColor}66`,
                          }}
                        />
                        <span
                          className="text-sm font-semibold leading-tight"
                          style={{ color: "#e8e0d0" }}
                        >
                          {activeNameDe}
                        </span>
                      </div>

                      {/* Support-Gemmen eingerückt mit └ */}
                      <div className="mt-3 ml-5 space-y-1">
                        {supportGems.length > 0 ? (
                          supportGems.map((sup, si) => {
                            const supColor = getGemDisplayColor(sup.gem);
                            return (
                              <div
                                key={si}
                                className="flex items-center gap-1.5 text-[12px]"
                                style={{ color: supColor }}
                              >
                                <span
                                  className="flex-shrink-0 text-[10px]"
                                  style={{
                                    color: "rgba(255, 255, 255, 0.25)",
                                  }}
                                >
                                  └
                                </span>
                                <span className="truncate">{sup.name}</span>
                              </div>
                            );
                          })
                        ) : (
                          <p
                            className="text-[11px] italic flex items-center gap-1.5"
                            style={{ color: "rgba(255, 255, 255, 0.2)" }}
                          >
                            <span
                              className="flex-shrink-0 text-[10px]"
                              style={{ color: "rgba(255, 255, 255, 0.15)" }}
                            >
                              └
                            </span>
                            Keine Support-Gemmen
                          </p>
                        )}
                      </div>
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
