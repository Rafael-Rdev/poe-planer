"use client";

import { useMemo } from "react";
import { useBuildStore } from "@/context/buildStore";
import { getPassiveTalentById } from "@/data/passives";
import { Zap } from "lucide-react";

/**
 * PassiveNotables – Zeigt NUR echte Notable-Namen als kompakte Tags.
 *
 * Filtert generische IDs (wie "grenades", "projectiles", "fire") heraus,
 * die nicht in der passiveTalents-Datenbank existieren.
 * Entfernt Duplikate (case-insensitive).
 */
export default function PassiveNotables() {
  const selectedPassives = useBuildStore((s) => s.selectedPassives);

  // Nur echte Notable-Namen auflösen, Duplikate entfernen
  const notables = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const id of selectedPassives) {
      // Prüfe ob die ID in der passives-Datenbank existiert
      const talent = getPassiveTalentById(id);
      if (!talent) {
        // Kein Eintrag in der DB → generische ID, überspringen
        continue;
      }

      const name = talent.nameDe || talent.nameEn;
      const key = name.toLowerCase();
      if (seen.has(key)) continue; // Duplikat entfernen

      seen.add(key);
      result.push(name);
    }

    return result;
  }, [selectedPassives]);

  if (notables.length === 0) return null;

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
          <Zap className="h-4 w-4" style={{ color: "#c8a96e" }} />
          Passive Notables
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: "rgba(255, 255, 255, 0.3)" }}>
          {notables.length} Notable{notables.length !== 1 ? "s" : ""} ausgewählt
        </p>
      </div>

      {/* Tags – kompakt in 2-3 Zeilen */}
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {notables.map((name) => (
            <span
              key={name}
              className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                background: "rgba(200, 169, 110, 0.08)",
                color: "#d4b87a",
                border: "1px solid rgba(200, 169, 110, 0.18)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(200, 169, 110, 0.16)";
                e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(200, 169, 110, 0.08)";
                e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.18)";
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
