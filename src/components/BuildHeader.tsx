"use client";

import { useBuildStore } from "@/context/buildStore";
import { getCharacterClassById } from "@/data/passives";
import { translateTerm } from "@/lib/poe2Translator";
import { User, Star, FileText, ChevronRight } from "lucide-react";

/**
 * BuildHeader – Zeigt Build-Name, Autor, Ascendancy (deutsch) und
 * Kurzbeschreibung im Maxroll-Stil an.
 *
 * Alle Begriffe werden über poe2-translations.json übersetzt.
 * KEIN Mistral/API-Aufruf.
 */
export default function BuildHeader() {
  const buildName = useBuildStore((s) => s.buildName);
  const author = useBuildStore((s) => s.author);
  const ascendancy = useBuildStore((s) => s.ascendancy);
  const description = useBuildStore((s) => s.description);
  const characterClass = useBuildStore((s) => s.characterClass);
  const level = useBuildStore((s) => s.level);

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
    <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden">
      {/* Header-Leiste mit Build-Name */}
      <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/50">
        <div className="flex flex-wrap items-center gap-3">
          {/* Build-Name */}
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            {buildName || "Unbenannter Build"}
          </h1>

          {/* Level Badge */}
          {level > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/50 bg-amber-900/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
              Lv. {level}
            </span>
          )}
        </div>

        {/* Meta-Info Zeile */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          {/* Klasse & Ascendancy */}
          {classNameDe && (
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-zinc-300 font-medium">{classNameDe}</span>
              {ascendancyDe && ascendancyDe !== classNameDe && (
                <>
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                  <span className="text-amber-400 font-semibold">{ascendancyDe}</span>
                </>
              )}
            </span>
          )}

          {/* Ascendancy allein (falls keine Klasse gesetzt) */}
          {!classNameDe && ascendancyDe && (
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-400 font-semibold">{ascendancyDe}</span>
            </span>
          )}

          {/* Autor */}
          {author && (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-zinc-500" />
              <span>{author}</span>
            </span>
          )}
        </div>
      </div>

      {/* Beschreibung */}
      {description && (
        <div className="px-5 py-3 bg-zinc-950/50">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-zinc-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
