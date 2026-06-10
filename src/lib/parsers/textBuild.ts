/**
 * TextBuild-Parser — parst englische Build-Texte.
 *
 * Erkennt Build-Text anhand von Schlüsselwörtern (Skill Gem, Class: etc.)
 * und delegiert an parseFullBuild aus dem zentralen parser.ts.
 */

import type { BuildParser, ParsedBuildResult } from "@/types/parser";
import { parseFullBuild } from "@/lib/parser";
import { emptyBuildResult } from "@/types/parser";

export const textBuildParser: BuildParser = {
  name: "textBuild",

  canParse(input: string): boolean {
    const trimmed = input.trim();
    if (trimmed.length < 10) return false;

    // Erkennt mehrzeilige Gem-Listen (eine Gemme pro Zeile, keine URL/PoB-Code)
    const looksLikeGemList =
      trimmed.includes("\n") &&
      !trimmed.startsWith("http") &&
      !/^[A-Za-z0-9+/=]{20,}$/.test(trimmed.replace(/\s/g, "")) &&
      trimmed.split("\n").every((line) => {
        const l = line.trim();
        return l.length > 0 && l.length < 60;
      });

    // Text-Builds enthalten typischerweise Zeilenumbrüche und Build-Keywords
    return (
      /[Ss]kill [Gg]em|[Ss]upport [Gg]em|[Cc]lass[: ]|[Pp]assive|[Aa]scendancy/i.test(trimmed) ||
      /\b(lightning|ice|fire|chaos|physical)\b.*\b(arrow|bolt|strike|blast|nova|orb|wave)\b/i.test(trimmed) ||
      /\b(ranger|mercenary|monk|witch|sorceress|warrior|huntress|druid|templar|duelist|shadow|marauder)\b/i.test(trimmed) ||
      looksLikeGemList ||
      (trimmed.includes("\n") && trimmed.length > 30)
    );
  },

  async parse(input: string): Promise<ParsedBuildResult> {
    const result = parseFullBuild(input);

    // Als Text-Build sollte mindestens etwas erkannt worden sein
    const hasData =
      result.characterClass ||
      result.sockets.some((s) => s !== null) ||
      result.selectedPassives.length > 0 ||
      Object.values(result.equipment).some((v) => v !== null);

    if (!hasData) {
      // Statt Fehler zu werfen, gebe ein leeres Ergebnis zurück
      // Dies ist konsistenter mit dem Verhalten in anderen Parsern
      console.warn("[textBuild] Text enthält keine erkannten Build-Daten");
      return emptyBuildResult();
    }

    return result;
  },
};