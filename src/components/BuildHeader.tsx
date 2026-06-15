"use client";

import { useState } from "react";
import { useBuildStore } from "@/context/buildStore";
import { getCharacterClassById } from "@/data/passives";
import { translateTerm, translateDescription } from "@/lib/poe2Translator";
import { User, Star, ChevronDown, ChevronUp } from "lucide-react";

/**
 * BuildHeader – Maxroll-ähnlicher Build-Header im dunklen Design.
 *
 * - Build-Name groß & prominent
 * - Klasse + Ascendancy als Badges
 * - Autor klein
 * - Beschreibung als aufklappbarer Block
 *
 * Farbpalette: Hintergrund #1a1a2e, Akzente #c8a96e (PoE-Gold)
 */
export default function BuildHeader() {
  const buildName = useBuildStore((s) => s.buildName);
  const author = useBuildStore((s) => s.author);
  const ascendancy = useBuildStore((s) => s.ascendancy);
  const description = useBuildStore((s) => s.description);
  const characterClass = useBuildStore((s) => s.characterClass);
  const level = useBuildStore((s) => s.level);

  const [descOpen, setDescOpen] = useState(false);

  // Klassenname deutsch aus der Datenbank
  const classInfo = characterClass ? getCharacterClassById(characterClass) : null;
  const classNameDe = classInfo?.nameDe ?? (characterClass ? translateTerm(characterClass) : null);

  // Ascendancy deutsch übersetzen
  const ascendancyDe = ascendancy ? translateTerm(ascendancy) : null;

  // Nichts anzuzeigen
  if (!buildName && !author && !ascendancyDe && !description && !classNameDe) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border shadow-lg overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderColor: "rgba(200, 169, 110, 0.15)",
      }}
    >
      {/* Obere Sektion: Build-Name, Level, Klasse/Ascendancy */}
      <div className="px-6 py-5">
        {/* Build-Name – groß & prominent */}
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
          style={{ color: "#f0e6d3" }}
        >
          {buildName || "Unbenannter Build"}
        </h1>

        {/* Badges: Level, Klasse, Ascendancy */}
        <div className="flex flex-wrap items-center gap-2.5 mb-2">
          {/* Level Badge */}
          {level > 1 && (
            <span
              className="inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold"
              style={{
                background: "rgba(200, 169, 110, 0.12)",
                color: "#c8a96e",
                border: "1px solid rgba(200, 169, 110, 0.25)",
              }}
            >
              Lv. {level}
            </span>
          )}

          {/* Klasse Badge */}
          {classNameDe && (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#c8c8d0",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Star className="h-3 w-3" style={{ color: "#c8a96e" }} />
              {classNameDe}
            </span>
          )}

          {/* Ascendancy Badge – nur wenn von Klasse verschieden */}
          {ascendancyDe && ascendancyDe !== classNameDe && (
            <span
              className="inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold"
              style={{
                background: "rgba(200, 169, 110, 0.18)",
                color: "#d4b87a",
                border: "1px solid rgba(200, 169, 110, 0.3)",
              }}
            >
              {ascendancyDe}
            </span>
          )}

          {/* Ascendancy allein (falls keine Klasse) */}
          {!classNameDe && ascendancyDe && (
            <span
              className="inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold"
              style={{
                background: "rgba(200, 169, 110, 0.18)",
                color: "#d4b87a",
                border: "1px solid rgba(200, 169, 110, 0.3)",
              }}
            >
              {ascendancyDe}
            </span>
          )}
        </div>

        {/* Autor – klein & dezent */}
        {author && (
          <div className="flex items-center gap-1.5 mt-1">
            <User className="h-3.5 w-3.5" style={{ color: "rgba(200, 169, 110, 0.5)" }} />
            <span className="text-xs" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
              {author}
            </span>
          </div>
        )}
      </div>

      {/* Beschreibung – aufklappbar */}
      {description && (
        <div
          style={{
            borderTop: "1px solid rgba(200, 169, 110, 0.08)",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <button
            onClick={() => setDescOpen(!descOpen)}
            className="w-full px-6 py-2.5 flex items-center justify-between text-xs font-medium transition-colors hover:bg-white/5"
            style={{ color: "rgba(200, 169, 110, 0.7)" }}
          >
            <span>Beschreibung</span>
            {descOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {descOpen && (
            <div className="px-6 pb-4">
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255, 255, 255, 0.5)" }}
              >
                {translateDescription(description)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
