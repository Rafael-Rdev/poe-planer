/**
 * Parser-Algorithmus für PoE 2 Build-Übersetzungen.
 *
 * Der Algorithmus arbeitet zeilenweise:
 * 1. Er sucht nach allen Vorkommen von englischen Begriffen aus dem
 *    Übersetzungs-Wörterbuch (längste Matches zuerst).
 * 2. Ersetzt diese Begriffe durch die deutsche PS5-Entsprechung.
 * 3. Groß-/Kleinschreibung wird beachtet, aber es findet auch
 *    Case-insensitive Matching statt, wobei die Großschreibung
 *    der Übersetzung angepasst wird.
 *
 * Zusätzlich gibt es eine Funktion extractGemsFromText, die gezielt
 * nach Gemmen-Namen sucht und diese als Socket-Array zurückgibt.
 */

import { getAllGems } from "@/data/gems";
import { getAllCharacterClasses, getAllPassiveTalents } from "@/data/passives";
import { getAllItems } from "@/data/items";
import type { SocketData, EquipmentSlots } from "@/context/buildStore";
import { translateTextSync } from "@/lib/translationService";

/**
 * Escaped Sonderzeichen für den Regex.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Übersetzt einen einzelnen englischen Build-Text in die deutsche Version.
 *
 * Nutzt den TranslationService, der aus allen offiziellen GGG-Datenquellen
 * (gems.ts, items.ts, passives.ts + Backup-JSONs) ein vollständiges
 * en→de Mapping aufbaut.
 *
 * Bei fehlenden Übersetzungen: Begriff bleibt Englisch + console.warn().
 */
export function translateBuildText(input: string): string {
  if (!input) return "";
  return translateTextSync(input);
}

// ============================================================
// Gemmen-Extraktion für das interaktive Gemmen-System
// ============================================================

/**
 * Durchsucht den Input-Text nach englischen Gemmen-Namen aus der
 * Datenbank und gibt ein Socket-Array (6 Slots) zurück:
 *   - Slot 0: Die erste gefundene aktive Gemme (oder null)
 *   - Slots 1–5: Die gefundenen Support-Gemmen (max. 5, in der
 *     Reihenfolge ihres Auftretens im Text)
 *
 * @param input Der englische Build-Text
 * @returns Ein Array mit 6 SocketData-Einträgen
 */
/**
 * Normalisiert den Input-Text vor dem Gem-Matching:
 * - Entfernt " Support"-Suffix (z. B. "Chain Support" → "Chain")
 * - Vereint zusammengeschriebene Varianten ("Bone Shatter" → "Boneshatter")
 *
 * Ermöglicht robusteres Matching auch bei typischen User-Tippvarianten.
 */
function normalizeGemInput(input: string): string {
  return input
    // " Support"-Suffix entfernen (case-insensitive)
    .replace(/\s+support\b/gi, "")
    // Leerzeichen in bekannten zusammengeschriebenen Gem-Namen entfernen
    .replace(/\bbone\s+shatter\b/gi, "Boneshatter")
    .replace(/\bbone\s+storm\b/gi, "Bonestorm")
    .replace(/\bbone\s+blast\b/gi, "Bone Blast");
}

export function extractGemsFromText(input: string): SocketData[] {
  const result: SocketData[] = [null, null, null, null, null, null];

  if (!input) return result;

  // Alias-Normalisierung vor dem Matching anwenden
  const normalizedInput = normalizeGemInput(input);

  // Alle Gemmen aus der Datenbank nach Länge des englischen Namens
  // absteigend sortieren (längste Matches zuerst), damit z. B.
  // "Greater Multiple Projectiles" vor "Multiple Projectiles" matched
  const sortedGems = getAllGems().sort(
    (a, b) => b.nameEn.length - a.nameEn.length
  );

  // Gefundene IDs merken, um Dopplungen zu vermeiden
  const foundIds = new Set<string>();

  let activeFound = false;
  let supportIndex = 1; // Slots 1–5

  for (const gem of sortedGems) {
    if (foundIds.has(gem.id)) continue;

    // Regex: case-insensitive, Wortgrenzen (damit "Lightning Arrow"
    // nicht in "Extra Lightning Arrow" matched)
    const regex = new RegExp(escapeRegex(gem.nameEn), "i");
    if (regex.test(normalizedInput)) {
      foundIds.add(gem.id);

      if (gem.type === "active" && !activeFound) {
        result[0] = gem.id;
        activeFound = true;
      } else if (gem.type === "support" && supportIndex <= 5) {
        result[supportIndex] = gem.id;
        supportIndex++;
      }
    }
  }

  return result;
}

// ============================================================
// Klassen-Extraktion für den Import-Bereich
// ============================================================

/**
 * Durchsucht den Input-Text nach englischen Klassennamen.
 *
 * Erkennt Formate wie:
 *   - "Class: Ranger"
 *   - "Mercenary Build"
 *   - "Level 92 Deadeye" (Ascendancy-Namen könnten später ergänzt werden)
 *
 * @param input Der englische Build-Text
 * @returns Die ID der erkannten Klasse (z. B. "ranger") oder null
 */
export function extractClassFromText(input: string): string | null {
  if (!input) return null;

  // Sortierte Liste: längste Klassen-Namen zuerst (z. B. "Sorceress" vor "Mercenary")
  const sortedClasses = getAllCharacterClasses().sort(
    (a, b) => b.nameEn.length - a.nameEn.length
  );

  for (const cls of sortedClasses) {
    // Pattern 1: "Class: Ranger" oder "Class: Mercenary"
    const classPattern = new RegExp(
      `class\\s*[:]?\\s*${escapeRegex(cls.nameEn)}`,
      "i"
    );
    if (classPattern.test(input)) {
      return cls.id;
    }

    // Pattern 2: "Ranger Build" oder "Mercenary Build"
    const buildPattern = new RegExp(
      `${escapeRegex(cls.nameEn)}\\s+[Bb]uild`,
      "i"
    );
    if (buildPattern.test(input)) {
      return cls.id;
    }

    // Pattern 3: Freistehendes Wort (als Fallback) – nur wenn als ganzes Wort
    const standalonePattern = new RegExp(
      `\\b${escapeRegex(cls.nameEn)}\\b`,
      "i"
    );
    if (standalonePattern.test(input)) {
      return cls.id;
    }
  }

  return null;
}

// ============================================================
// Passive-Talente-Extraktion
// ============================================================

/**
 * Durchsucht den Input-Text nach englischen Talent-Namen (nameEn)
 * aus der passives.ts-Datenbank und gibt ein Array der gefundenen IDs zurück.
 *
 * @param input Der englische Build-Text
 * @returns Array von Talent-IDs (z. B. ["crimson-dance", "toxic-strikes"])
 */
export function extractPassivesFromText(input: string): string[] {
  if (!input) return [];

  const found: string[] = [];

  // Sortierte Liste: längste Namen zuerst, damit "Crimson Dance" nicht
  // fälschlich in "Crimson Dance Floor" matched (auch wenn es kein
  // reales Talent ist – Vorsichtsprinzip)
  const sortedTalents = getAllPassiveTalents().sort(
    (a, b) => b.nameEn.length - a.nameEn.length
  );

  for (const talent of sortedTalents) {
    // Ganzes-Wort-Matching (case-insensitive)
    const regex = new RegExp(`\\b${escapeRegex(talent.nameEn)}\\b`, "i");
    if (regex.test(input)) {
      found.push(talent.id);
    }
  }

  return found;
}

// ============================================================
// Item-Extraktion für Ausrüstungs-Slots
// ============================================================

/**
 * Mapping von Item-Typen auf Equipment-Slot-Namen.
 */
const itemTypeToSlot: Record<string, keyof EquipmentSlots> = {
  bow: "mainHand",
  sword: "mainHand",
  staff: "mainHand",
  wand: "mainHand",
  flail: "mainHand",
  mace: "mainHand",
  axe: "mainHand",
  dagger: "mainHand",
  spear: "mainHand",
  crossbow: "mainHand",
  sceptre: "mainHand",
  shield: "offHand",
  quiver: "offHand",
  focus: "offHand",
  chest: "chest",
  body: "chest",
  helmet: "helmet",
  gloves: "gloves",
  belt: "belt",
  boots: "boots",
  ring: "ring1",
  amulet: "amulet",
};

/**
 * Durchsucht den Input-Text nach bekannten Item-Namen (nameEn) aus
 * der items.ts-Datenbank und ordnet sie den passenden Slots zu.
 *
 * Logik:
 * - Wird ein Item gefunden, wird es auf dem Slot platziert, der
 *   seinem type entspricht (z. B. "bow" → mainHand, "chest" → chest).
 * - Für Ringe (type "ring") wird ring1 priorisiert; ein zweiter
 *   Ring landet in ring2.
 * - Jedes Item wird nur einmal erkannt (Dopplungen vermieden).
 *
 * @param input Der englische Build-Text
 * @returns Ein EquipmentSlots-Objekt mit den gefundenen Items
 */
export function extractItemsFromText(input: string): EquipmentSlots {
  const equipment: EquipmentSlots = {
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
  };

  if (!input) return equipment;

  const sortedItems = getAllItems().sort(
    (a, b) => b.nameEn.length - a.nameEn.length
  );

  const foundIds = new Set<string>();

  for (const item of sortedItems) {
    if (foundIds.has(item.id)) continue;

    const regex = new RegExp(`\\b${escapeRegex(item.nameEn)}\\b`, "i");
    if (regex.test(input)) {
      foundIds.add(item.id);

      // Slot bestimmen
      const slot = itemTypeToSlot[item.type];
      if (slot) {
        // Ringe speziell behandeln: erster Ring → ring1, zweiter → ring2
        if (item.type === "ring") {
          if (!equipment.ring1) {
            equipment.ring1 = item;
          } else if (!equipment.ring2) {
            equipment.ring2 = item;
          }
          // weitere Ringe ignorieren
        } else {
          // Nur setzen, wenn der Slot noch leer ist
          if (!equipment[slot]) {
            equipment[slot] = item;
          }
        }
      }
    }
  }

  return equipment;
}

// ============================================================
// Master-Funktion: parseFullBuild
// ============================================================

/**
 * Gibt das vollständige Ergebnis einer Build-Analyse zurück.
 */
export interface ParsedBuildResult {
  /** Die erkannte Klasse (ID) oder null */
  characterClass: string | null;
  /** Die extrahierten Gemmen (6 Slots) */
  sockets: SocketData[];
  /** Die erkannten passiven Talent-IDs */
  selectedPassives: string[];
  /** Die erkannten Items auf den passenden Slots */
  equipment: EquipmentSlots;
}

/**
 * All-In-One Master-Funktion: Analysiert einen englischen Build-Text
 * und extrahiert Klasse, Gemmen, Passive Talente und Items in einem
 * einzigen Durchlauf.
 *
 * @param input Der englische Build-Text
 * @returns Ein ParsedBuildResult-Objekt mit allen erkannten Daten
 */
export function parseFullBuild(input: string): ParsedBuildResult {
  const characterClass = extractClassFromText(input);
  const sockets = extractGemsFromText(input);
  const selectedPassives = extractPassivesFromText(input);
  const equipment = extractItemsFromText(input);

  return {
    characterClass,
    sockets,
    selectedPassives,
    equipment,
  };
}
