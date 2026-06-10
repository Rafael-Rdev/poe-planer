/**
 * Parser-Registry — zentrale Registrierung und Auswahl von Build-Parsern.
 *
 * Nach dem Strategy-Pattern werden alle Parser hier registriert.
 * Die Registry durchläuft die Parser in Prioritäts-Reihenfolge und
 * wählt den ersten aus, der canParse() für den gegebenen Input erfüllt.
 *
 * Neue Parser können einfach durch Eintrag in die PARSERS-Liste
 * hinzugefügt werden — kein Refactoring der Registry nötig.
 */

import type { BuildParser, ParsedBuildResult } from "@/types/parser";
import { textBuildParser } from "./textBuild";
import { pobCodeParser } from "./pobCode";
import { pobXmlParser } from "./pobXml";
import { maxrollParser } from "./maxroll";
import { mobalyticsParser } from "./mobalytics";
import { genericUrlParser } from "./genericUrl";

/**
 * Alle registrierten Parser in Prioritäts-Reihenfolge.
 *
 * Reihenfolge ist wichtig:
 * 1. Spezifische URL-Parser zuerst (maxroll, mobalytics)
 * 2. Generischer URL-Parser
 * 3. PoB-Code (Base64)
 * 4. PoB-XML (Datei-Upload)
 * 5. Text-Build (Fallback für alle Text-Eingaben)
 */
const PARSERS: BuildParser[] = [
  maxrollParser,
  mobalyticsParser,
  genericUrlParser,
  pobCodeParser,
  pobXmlParser,
  textBuildParser,
];

/**
 * Findet den passenden Parser für einen gegebenen Input-String.
 *
 * @param input - Roher Input (URL, PoB-Code, XML oder Text)
 * @returns Den ersten Parser, dessen canParse() true zurückgibt
 * @throws Error wenn kein Parser den Input erkennt
 */
export function findParser(input: string): BuildParser {
  for (const parser of PARSERS) {
    if (parser.canParse(input)) {
      return parser;
    }
  }

  throw new Error(
    "Das Eingabeformat wird nicht erkannt. " +
      "Unterstützt werden: Build-Planner-URLs (maxroll, mobalytics, pob.party, poe2.ninja), " +
      "PoB-Codes, PoB-XML-Dateien und englische Build-Texte."
  );
}

/**
 * Parst einen Build-Input mit dem passenden Parser.
 *
 * Convenience-Funktion, die findParser() + parser.parse() kombiniert.
 *
 * @param input - Roher Input (URL, PoB-Code, XML oder Text)
 * @returns Das strukturierte Build-Ergebnis
 * @throws Error wenn kein Parser passt oder das Parsing fehlschlägt
 */
export async function parseBuild(input: string): Promise<ParsedBuildResult> {
  const parser = findParser(input);
  return parser.parse(input);
}

/**
 * Gibt die Liste aller registrierten Parser zurück.
 * Nützlich für Debugging oder UI-Anzeigen.
 */
export function getAllParsers(): ReadonlyArray<BuildParser> {
  return PARSERS;
}

/**
 * Prüft, ob der Input von irgendeinem Parser erkannt wird.
 */
export function isAnyBuildInput(input: string): boolean {
  return PARSERS.some((p) => p.canParse(input));
}

/**
 * Prüft, ob der Input eine Build-Planner-URL ist.
 */
export function isBuildUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return maxrollParser.canParse(trimmed) ||
    mobalyticsParser.canParse(trimmed) ||
    genericUrlParser.canParse(trimmed);
}