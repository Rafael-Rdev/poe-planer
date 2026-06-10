/**
 * PoB-XML-Parser — parst Path of Building XML-Exporte.
 *
 * Implementiert das BuildParser-Interface und delegiert die
 * XML-Extraktion an die bestehende parsePobXml-Funktion aus pobParser.ts.
 */

import type { BuildParser, ParsedBuildResult } from "@/types/parser";
import { parsePobXml as parseXml } from "@/lib/pobParser";
import { emptyBuildResult } from "@/types/parser";

export const pobXmlParser: BuildParser = {
  name: "pobXml",

  canParse(input: string): boolean {
    const trimmed = input.trim();
    if (trimmed.length < 20) return false;

    // XML-Dokumente oder Fragmente mit PoB-typischen Tags
    return (
      (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) &&
      (trimmed.includes("<PathOfBuilding") ||
        trimmed.includes("<Build") ||
        trimmed.includes("<Skills") ||
        trimmed.includes("<Tree") ||
        trimmed.includes("<Items"))
    );
  },

  async parse(input: string): Promise<ParsedBuildResult> {
    const result = parseXml(input);

    // Validiere, dass mindestens eine Kategorie erkannt wurde
    const hasData =
      result.characterClass ||
      result.sockets.some((s) => s !== null) ||
      result.selectedPassives.length > 0 ||
      Object.values(result.equipment).some((v) => v !== null);

    if (!hasData) {
      // Statt Fehler zu werfen, gebe ein leeres Ergebnis zurück
      // Dies ist konsistenter mit dem Verhalten in anderen Parsern
      console.warn("[pobXml] XML enthält keine erkannten Build-Daten");
      return emptyBuildResult();
    }

    return {
      ...result,
      level: result.level ?? undefined,
    };
  },
};