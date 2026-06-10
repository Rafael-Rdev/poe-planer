/**
 * Gemeinsame Typen für das Build-Parser Strategy-Pattern.
 *
 * Jeder Parser (Maxroll, Mobalytics, PoB, etc.) implementiert das
 * BuildParser-Interface und wird über die ParserRegistry anhand der
 * URL oder des Eingabeformats ausgewählt.
 */

import type { SocketData, EquipmentSlots } from "@/context/buildStore";

/**
 * Einheitliches Ergebnis eines Build-Parsers.
 * Wird von allen Parser-Strategien zurückgegeben.
 */
export interface ParsedBuildResult {
  /** Erkannte Charakterklasse (ID) oder null */
  characterClass: string | null;
  /** Charakter-Level (1–100), falls aus dem Build extrahierbar */
  level?: number;
  /** Gemmen-Sockets (6 Slots, null = leer) */
  sockets: SocketData[];
  /** IDs der ausgewählten passiven Talente */
  selectedPassives: string[];
  /** Ausrüstung pro Slot */
  equipment: EquipmentSlots;
}

/**
 * Interface für alle Build-Parser-Strategien.
 *
 * Jeder Parser erhält den Roheingabe-String (URL, XML, Text etc.)
 * und gibt ein einheitliches ParsedBuildResult zurück – oder wirft
 * einen Error, wenn das Format nicht erkannt wird.
 */
export interface BuildParser {
  /** Eindeutiger Name des Parsers (z. B. "maxroll", "pob-xml") */
  readonly name: string;

  /**
   * Prüft, ob dieser Parser für den gegebenen Input zuständig ist.
   * @returns true wenn der Parser das Format erkennt
   */
  canParse(input: string): boolean;

  /**
   * Parst den Input und gibt strukturierte Build-Daten zurück.
   * @throws Error wenn das Parsing fehlschlägt
   */
  parse(input: string): Promise<ParsedBuildResult>;
}

/**
 * Leeres Build-Ergebnis (alle Felder null/leer).
 * Nützlich als Initialwert oder Fallback.
 */
export function emptyBuildResult(): ParsedBuildResult {
  return {
    characterClass: null,
    sockets: [null, null, null, null, null, null],
    selectedPassives: [],
    equipment: {
      mainHand: null,
      weapon2: null,
      offHand: null,
      chest: null,
      helmet: null,
      gloves: null,
      belt: null,
      boots: null,
      ring1: null,
      ring2: null,
      amulet: null,
    },
  };
}
