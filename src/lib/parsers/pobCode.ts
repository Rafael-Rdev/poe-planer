/**
 * PoB-Code-Parser — parst Base64-kodierte Path of Building Codes.
 *
 * Dekodiert den PoB-Code via pobDecoder und delegiert dann an den
 * pobXml-Parser für die eigentliche XML-Extraktion.
 */

import type { BuildParser, ParsedBuildResult } from "@/types/parser";
import { decodePobCode } from "@/lib/pobDecoder";
import { pobXmlParser } from "./pobXml";

export const pobCodeParser: BuildParser = {
  name: "pobCode",

  canParse(input: string): boolean {
    const trimmed = input.trim();
    // PoB-Codes sind lange Base64-Strings ohne Whitespace
    if (trimmed.length < 80) return false;
    if (/\s/.test(trimmed)) return false;
    return /^[A-Za-z0-9\-_=]+$/.test(trimmed);
  },

  async parse(input: string): Promise<ParsedBuildResult> {
    let xmlString: string;
    try {
      xmlString = decodePobCode(input.trim());
    } catch (err) {
      throw new Error(
        `PoB-Code konnte nicht dekodiert werden: ${
          err instanceof Error ? err.message : "Unbekannter Fehler"
        }`
      );
    }

    // Delegiere an den PoB-XML-Parser für die Extraktion
    return pobXmlParser.parse(xmlString);
  },
};