/**
 * statCalculator.ts — Die globale Rechen-Engine für Charakter-Stats.
 *
 * Liest den aktuellen Zustand aus dem Store (equipment, sockets, selectedPassives),
 * parst alle Stat-Strings aus Items, Gemmen und passiven Talenten,
 * und aggregiert sie in ein kategorisiertes Objekt (Offensive, Defensive, Utility).
 */

import { type EquipmentSlots, type SocketData } from "@/context/buildStore";
import { getItemById, type Item } from "@/data/items";
import { getGemById, type Gem } from "@/data/gems";
import { getPassiveTalentById, type PassiveTalent } from "@/data/passives";

// ============================================================
// TYPES
// ============================================================

export interface CharacterStats {
  offensive: OffensiveStats;
  defensive: DefensiveStats;
  utility: UtilityStats;
}

export interface OffensiveStats {
  physischerSchaden: number;
  feuerSchaden: number;
  kälteSchaden: number;
  blitzSchaden: number;
  chaosSchaden: number;
  giftSchaden: number;
  elementarSchaden: number;
  zauberschaden: number;
  angriffsgeschwindigkeit: number;
  kritischeTrefferchance: number;
  kritischerMultiplikator: number;
  projektilgeschwindigkeit: number;
  schadenUeberZeit: number;
}

export interface DefensiveStats {
  ruestung: number;
  ausweichwert: number;
  maximalesLeben: number;
  maximalesLebenProzent: number;
  maximalesMana: number;
  maximalesManaProzent: number;
  lebenRegeneration: number;
  feuerwiderstand: number;
  kältewiderstand: number;
  blitzwiderstand: number;
  chaoswiderstand: number;
}

export interface UtilityStats {
  bewegungsgeschwindigkeit: number;
  seltenheitswert: number;
  staerke: number;
  geschicklichkeit: number;
  intelligenz: number;
  manaKostenReduktion: number;
  fluchLimit: number;
  maximaleDiener: number;
  projektile: number;
}

// ============================================================
// DEFAULT-WERTE (leichtgewichtige Factory statt Deep-Clone)
// ============================================================

/**
 * Erzeugt ein frisches, null-initialisiertes CharacterStats-Objekt.
 * Vermeidet structuredClone / JSON.parse(JSON.stringify(...)) Overhead.
 */
function createEmptyStats(): CharacterStats {
  return {
    offensive: {
      physischerSchaden: 0,
      feuerSchaden: 0,
      kälteSchaden: 0,
      blitzSchaden: 0,
      chaosSchaden: 0,
      giftSchaden: 0,
      elementarSchaden: 0,
      zauberschaden: 0,
      angriffsgeschwindigkeit: 0,
      kritischeTrefferchance: 0,
      kritischerMultiplikator: 0,
      projektilgeschwindigkeit: 0,
      schadenUeberZeit: 0,
    },
    defensive: {
      ruestung: 0,
      ausweichwert: 0,
      maximalesLeben: 0,
      maximalesLebenProzent: 0,
      maximalesMana: 0,
      maximalesManaProzent: 0,
      lebenRegeneration: 0,
      feuerwiderstand: 0,
      kältewiderstand: 0,
      blitzwiderstand: 0,
      chaoswiderstand: 0,
    },
    utility: {
      bewegungsgeschwindigkeit: 0,
      seltenheitswert: 0,
      staerke: 0,
      geschicklichkeit: 0,
      intelligenz: 0,
      manaKostenReduktion: 0,
      fluchLimit: 0,
      maximaleDiener: 0,
      projektile: 0,
    },
  };
}

// ============================================================
// RAW STAT — interne Zwischenrepräsentation
// ============================================================

type StatCategory = "offensive" | "defensive" | "utility";

interface RawStat {
  /** Ziel-Property im jeweiligen Kategorie-Objekt (z. B. "blitzSchaden") */
  key: string;
  /** Numerischer Wert (mit Vorzeichen, z. B. -3) */
  value: number;
  /** Kategorie */
  category: StatCategory;
}

// ============================================================
// MAPPING-TABLE: ItemStat.name → RawStat
// ============================================================

const ITEM_STAT_MAP: Record<string, { key: keyof OffensiveStats | keyof DefensiveStats | keyof UtilityStats; category: StatCategory }> = {
  // === Offensive ===
  "Physischer Schaden": { key: "physischerSchaden", category: "offensive" },
  "Feuerschaden": { key: "feuerSchaden", category: "offensive" },
  "Kälteschaden": { key: "kälteSchaden", category: "offensive" },
  "Blitzschaden": { key: "blitzSchaden", category: "offensive" },
  "Chaosschaden": { key: "chaosSchaden", category: "offensive" },
  "Gift-Schaden": { key: "giftSchaden", category: "offensive" },
  "Giftschaden": { key: "giftSchaden", category: "offensive" },
  "Elementarschaden": { key: "elementarSchaden", category: "offensive" },
  "Zauberschaden": { key: "zauberschaden", category: "offensive" },
  "Angriffsgeschwindigkeit": { key: "angriffsgeschwindigkeit", category: "offensive" },
  "Kritische Trefferchance": { key: "kritischeTrefferchance", category: "offensive" },
  "Kritischer Multiplikator": { key: "kritischerMultiplikator", category: "offensive" },
  "Projektilgeschwindigkeit": { key: "projektilgeschwindigkeit", category: "offensive" },
  "Schaden über Zeit": { key: "schadenUeberZeit", category: "offensive" },
  // === Defensive ===
  "Rüstung": { key: "ruestung", category: "defensive" },
  "Ausweichwert": { key: "ausweichwert", category: "defensive" },
  "Maximale Leben": { key: "maximalesLeben", category: "defensive" },
  "Maximale Mana": { key: "maximalesMana", category: "defensive" },
  "Leben regeneriert": { key: "lebenRegeneration", category: "defensive" },
  "Feuerwiderstand": { key: "feuerwiderstand", category: "defensive" },
  "Kältewiderstand": { key: "kältewiderstand", category: "defensive" },
  "Blitzwiderstand": { key: "blitzwiderstand", category: "defensive" },
  "Chaoswiderstand": { key: "chaoswiderstand", category: "defensive" },
  // === Utility ===
  "Bewegungsgeschwindigkeit": { key: "bewegungsgeschwindigkeit", category: "utility" },
  "Seltenheitswert": { key: "seltenheitswert", category: "utility" },
  "Stärke": { key: "staerke", category: "utility" },
  "Geschicklichkeit": { key: "geschicklichkeit", category: "utility" },
  "Intelligenz": { key: "intelligenz", category: "utility" },
};

// ============================================================
// 1. STATS AUS ITEMS EXTRAHIEREN
// ============================================================

/**
 * Extrahiert Rohdaten aus den Item-Stats.
 * Items haben bereits strukturierte { name, value }-Paare.
 */
function collectItemStats(items: Item[]): RawStat[] {
  const result: RawStat[] = [];

  for (const item of items) {
    for (const stat of item.stats) {
      const mapping = ITEM_STAT_MAP[stat.name];
      if (mapping) {
        result.push({
          key: mapping.key,
          value: stat.value,
          category: mapping.category,
        });
      }
    }
  }

  return result;
}

// ============================================================
// 2. STATS AUS PASSIVEN TALENTEN EXTRAHIEREN
// ============================================================

/**
 * Patterns für passive Talent-Beschreibungen.
 * Die descriptions haben meist das Format:
 *   "+X % Y" oder "+X Y" oder "Y um X% [erhöht/reduziert]"
 */
const PASSIVE_DESCRIPTION_PATTERNS: Array<{
  regex: RegExp;
  mapKey: (match: RegExpExecArray) => string;
  category: StatCategory;
}> = [
  // === Offensive ===
  // "+25 % Feuerschaden", "+30 % Gift-Schaden", "+25 % Blitzschaden"
  {
    regex: /([+-])\s*(\d+)\s*%\s*(Feuer|Kälte|Blitz|Chaos|Elementar|Gift-|physischer)\s*(Schaden)?/gi,
    mapKey: (m) => {
      const elem = m[3].toLowerCase();
      if (elem === "feuer") return "feuerSchaden";
      if (elem === "kälte") return "kälteSchaden";
      if (elem === "blitz") return "blitzSchaden";
      if (elem === "chaos") return "chaosSchaden";
      if (elem === "elementar") return "elementarSchaden";
      if (elem === "gift-") return "giftSchaden";
      if (elem === "physischer") return "physischerSchaden";
      return "physischerSchaden";
    },
    category: "offensive",
  },
  // "+40 % kritischer Schadensmultiplikator"
  {
    regex: /([+-])\s*(\d+)\s*%\s*kritischer\s*Schadensmultiplikator/gi,
    mapKey: () => "kritischerMultiplikator",
    category: "offensive",
  },
  // "+30 % physischer Schaden mit Waffen"
  // "+20 % physischer Schaden über Zeit"
  {
    regex: /([+-])\s*(\d+)\s*%\s*physischer\s*Schaden(?:\s*(?:mit\s*Waffen|über\s*Zeit))?/gi,
    mapKey: (m) => {
      if (m[0].toLowerCase().includes("über zeit")) return "schadenUeberZeit";
      return "physischerSchaden";
    },
    category: "offensive",
  },
  // "+30 % Gift-Schaden"
  {
    regex: /([+-])\s*(\d+)\s*%\s*Gift-Schaden/gi,
    mapKey: () => "giftSchaden",
    category: "offensive",
  },

  // === Defensive ===
  // "+8 % maximale Leben"
  {
    regex: /([+-])\s*(\d+)\s*%\s*maximale\s*(Leben)/gi,
    mapKey: () => "maximalesLebenProzent",
    category: "defensive",
  },
  // "+15 % maximales Mana"
  {
    regex: /([+-])\s*(\d+)\s*%\s*maximale\s*(?:s)?\s*(Mana)/gi,
    mapKey: () => "maximalesManaProzent",
    category: "defensive",
  },
  // "+50 Rüstung", "+200 Rüstung" (ohne %)
  {
    regex: /([+-])\s*(\d+)\s*(Rüstung)(?!%)/gi,
    mapKey: () => "ruestung",
    category: "defensive",
  },
  // "+50 Ausweichwert" (ohne %)
  {
    regex: /([+-])\s*(\d+)\s*(Ausweichwert)/gi,
    mapKey: () => "ausweichwert",
    category: "defensive",
  },
  // "2 % Leben pro Sekunde regeneriert"
  {
    regex: /(\d+)\s*%\s*Leben\s*pro\s*Sekunde\s*regeneriert/gi,
    mapKey: () => "lebenRegeneration",
    category: "defensive",
  },

  // === Utility ===
  // "+1 Fluch-Limit"
  {
    regex: /([+-])\s*(\d+)\s*(?:maximale\s*)?(?:s)?\s*(?:Fluch-Limit|Diener)(?:\s*mit\s*Fertigkeit)?/gi,
    mapKey: (m) => {
      if (m[0].toLowerCase().includes("fluch")) return "fluchLimit";
      if (m[0].toLowerCase().includes("diener")) return "maximaleDiener";
      return "maximaleDiener";
    },
    category: "utility",
  },
];

/**
 * Extrahiert Rohdaten aus passiven Talenten.
 * Parst sowohl `description` als auch `effect`.
 */
function collectPassiveStats(passives: PassiveTalent[]): RawStat[] {
  const result: RawStat[] = [];

  for (const passive of passives) {
    // Description parsen
    const parsedFromDesc = parseStatText(passive.description);
    result.push(...parsedFromDesc);

    // Effect parsen (falls vorhanden)
    if (passive.effect) {
      const parsedFromEffect = parseStatText(passive.effect);
      result.push(...parsedFromEffect);
    }
  }

  return result;
}

// ============================================================
// 3. STATS AUS GEMMEN EXTRAHIEREN
// ============================================================

/**
 * Patterns für Gemmen-Effekte.
 * Gemmen haben freiere Formulierungen, daher spezifischere Patterns.
 */
const GEM_EFFECT_PATTERNS: Array<{
  regex: RegExp;
  mapKey: (match: RegExpExecArray) => string;
  category: StatCategory;
}> = [
  // "Fügt Angriffen zusätzlichen Blitzschaden in Höhe von 30% des Waffenschadens hinzu."
  {
    regex: /zusätzlichen\s+(Blitz|Kälte|Feuer|Chaos)schaden\s+.*?(\d+)%/gi,
    mapKey: (m) => {
      const elem = m[1].toLowerCase();
      if (elem === "blitz") return "blitzSchaden";
      if (elem === "kälte" || elem === "kaelte") return "kälteSchaden";
      if (elem === "feuer") return "feuerSchaden";
      if (elem === "chaos") return "chaosSchaden";
      return "elementarSchaden";
    },
    category: "offensive",
  },
  // "Erhöht Elementarschaden um 40%"
  {
    regex: /Erhöht\s+(Elementar|Feuer|Kälte|Blitz|Chaos)schaden\s+um\s+(\d+)%/gi,
    mapKey: (m) => {
      const elem = m[1].toLowerCase();
      if (elem === "elementar") return "elementarSchaden";
      if (elem === "feuer") return "feuerSchaden";
      if (elem === "kälte" || elem === "kaelte") return "kälteSchaden";
      if (elem === "blitz") return "blitzSchaden";
      if (elem === "chaos") return "chaosSchaden";
      return "elementarSchaden";
    },
    category: "offensive",
  },
  // "kritische Trefferchance um 50%"
  {
    regex: /kritische\s*Trefferchance\s*um\s*(\d+)%/gi,
    mapKey: () => "kritischeTrefferchance",
    category: "offensive",
  },
  // "kritischen Multiplikator um 30%"
  {
    regex: /kritischen\s*Multiplikator\s*um\s*(\d+)%/gi,
    mapKey: () => "kritischerMultiplikator",
    category: "offensive",
  },
  // "reduziert den Schaden pro Projektil um 25%"
  {
    regex: /reduziert\s+den\s+Schaden\s+pro\s+Projektil\s+um\s+(\d+)%/gi,
    mapKey: () => "physischerSchaden",
    category: "offensive",
  },
  // "Schaden um 10% reduziert" / "Schaden um 20% reduziert"
  {
    regex: /Schaden\s+um\s+(\d+)%\s+reduziert/gi,
    mapKey: () => "physischerSchaden",
    category: "offensive",
  },
  // "+40% Elementarschaden"
  {
    regex: /([+-])\s*(\d+)%\s*(Elementar|Feuer|Kälte|Blitz|Chaos)schaden/gi,
    mapKey: (m) => {
      const elem = m[3].toLowerCase();
      if (elem === "elementar") return "elementarSchaden";
      if (elem === "feuer") return "feuerSchaden";
      if (elem === "kälte" || elem === "kaelte") return "kälteSchaden";
      if (elem === "blitz") return "blitzSchaden";
      if (elem === "chaos") return "chaosSchaden";
      return "elementarSchaden";
    },
    category: "offensive",
  },
  // "Reduziert Manakosten um 30%"
  {
    regex: /Reduziert\s+(?:Mana|Manakosten)\s*(?:kosten)?\s*um\s*(\d+)%/gi,
    mapKey: () => "manaKostenReduktion",
    category: "utility",
  },
  // "erhöht den Schaden um 15%"
  {
    regex: /erhöht\s+den\s+Schaden\s+um\s*(\d+)%/gi,
    mapKey: () => "elementarSchaden",
    category: "offensive",
  },
  // "4 zusätzliche Projektile"
  {
    regex: /(\d+)\s*zusätzliche\s*Projektile/gi,
    mapKey: () => "projektile",
    category: "utility",
  },
  // "2 zusätzliche Gegner"
  {
    regex: /(\d+)\s*zusätzliche\s*Gegner/gi,
    mapKey: () => "projektile",
    category: "utility",
  },
  // "+ Blitzschaden, Unterstützung" (description field, qualitative)
  {
    regex: /\+\s*(\w+schaden)/gi,
    mapKey: (m) => {
      const dmg = m[1].toLowerCase();
      if (dmg.includes("blitz")) return "blitzSchaden";
      if (dmg.includes("kälte") || dmg.includes("kaelte")) return "kälteSchaden";
      if (dmg.includes("feuer")) return "feuerSchaden";
      if (dmg.includes("chaos")) return "chaosSchaden";
      if (dmg.includes("elementar")) return "elementarSchaden";
      if (dmg.includes("gift")) return "giftSchaden";
      return "elementarSchaden";
    },
    category: "offensive",
  },
];

/**
 * Extrahiert Rohdaten aus Gemmen.
 * Parst sowohl `effect` als auch `description`-Felder.
 */
function collectGemStats(gems: Gem[]): RawStat[] {
  const result: RawStat[] = [];

  for (const gem of gems) {
    // Effect parsen
    const parsedFromEffect = parseGemText(gem.effect);
    result.push(...parsedFromEffect);

    // Description parsen (oft kürzer, aber nützlich)
    const parsedFromDesc = parseGemText(gem.description);
    result.push(...parsedFromDesc);
  }

  return result;
}

// ============================================================
// GEMEINSAME TEXT-PARSER
// ============================================================

/**
 * Parst einen Text mit den PASSIVE_PATTERNS.
 * Erkennt "+X% Y", "+X Y" und ähnliche Konstrukte.
 */
function parseStatText(text: string): RawStat[] {
  const result: RawStat[] = [];

  for (const pattern of PASSIVE_DESCRIPTION_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, "gi");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const sign = match[1] === "-" ? -1 : 1;
      const value = parseInt(match[2], 10) * sign;
      const key = pattern.mapKey(match);

      result.push({ key, value, category: pattern.category });
    }
  }

  return result;
}

/**
 * Parst einen Text mit den GEM_PATTERNS.
 */
function parseGemText(text: string): RawStat[] {
  const result: RawStat[] = [];

  for (const pattern of GEM_EFFECT_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, "gi");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      let value: number;

      // Versuche, den Zahlenwert zu holen – er kann in Gruppe 1, 2 oder 3 sein
      // je nach Pattern. Suche die erste Gruppe, die eine Zahl ist.
      const numGroup = findNumberGroup(match);
      if (numGroup === null) continue;

      const rawValue = parseInt(numGroup, 10);

      // Wenn ein Vorzeichen in Gruppe 1 ist (z. B. "+" oder "-")
      if (match[1] === "-") {
        value = -rawValue;
      } else if (match[1] === "+") {
        value = rawValue;
      } else {
        // Prüfe auf negierende Wörter
        const fullMatch = match[0].toLowerCase();
        if (fullMatch.includes("reduziert") || fullMatch.includes("weniger")) {
          value = -rawValue;
        } else {
          value = rawValue;
        }
      }

      const key = pattern.mapKey(match);

      result.push({ key, value, category: pattern.category });
    }
  }

  return result;
}

/**
 * Findet die erste numerische Gruppe in einem RegExp-Match.
 */
function findNumberGroup(match: RegExpExecArray): string | null {
  for (let i = 1; i < match.length; i++) {
    if (match[i] !== undefined && /^\d+$/.test(match[i])) {
      return match[i];
    }
  }
  return null;
}

// ============================================================
// 4. AGGREGATION — typsicher
// ============================================================

/**
 * Dedupliziert RawStats: behält pro (category, key)-Paar nur den
 * ersten Eintrag. Verhindert Doppelzählung durch überlappende Regex-Patterns.
 * Priorisierung: Spezifischere Matches (längere Match-Texte) werden bevorzugt,
 * da sie in den Pattern-Arrays zuerst definiert sind und hier first-match zählt.
 */
function deduplicateRawStats(rawStats: RawStat[]): RawStat[] {
  const seen = new Set<string>();
  return rawStats.filter((s) => {
    const compositeKey = `${s.category}:${s.key}`;
    if (seen.has(compositeKey)) return false;
    seen.add(compositeKey);
    return true;
  });
}

/**
 * Aggregiert alle RawStats in das strukturierte CharacterStats-Objekt.
 * Summiert gleiche Keys innerhalb einer Kategorie auf.
 */
function aggregateStats(rawStats: RawStat[]): CharacterStats {
  // Frisches, null-initialisiertes Objekt
  const stats = createEmptyStats();

  for (const raw of rawStats) {
    const categoryObj = stats[raw.category] as unknown as Record<string, number>;
    if (raw.key in categoryObj) {
      categoryObj[raw.key] += raw.value;
    }
  }

  return stats;
}

// ============================================================
// 5. HAUPTFUNKTION — ZUGRIFF AUF STORE + BERECHNUNG
// ============================================================

/**
 * Sammelt alle Items aus den Equipment-Slots (leere/null-Slots werden ignoriert).
 */
function collectEquippedItems(equipment: EquipmentSlots): Item[] {
  const items: Item[] = [];

  for (const slot of Object.values(equipment)) {
    if (slot !== null) {
      items.push(slot);
    }
  }

  return items;
}

/**
 * Sammelt alle Gemmen-Objekte aus den Socket-IDs.
 */
function collectSocketedGems(sockets: SocketData[]): Gem[] {
  const gems: Gem[] = [];

  for (const gemId of sockets) {
    if (gemId !== null) {
      const gem = getGemById(gemId);
      if (gem) {
        gems.push(gem);
      }
    }
  }

  return gems;
}

/**
 * Sammelt alle passiven Talent-Objekte aus den selectedPassives-IDs.
 */
function collectSelectedPassives(passiveIds: string[]): PassiveTalent[] {
  return passiveIds
    .map((id) => getPassiveTalentById(id))
    .filter((p): p is PassiveTalent => p !== undefined);
}

// ============================================================
// EXPORTIERTE HAUPTFUNKTION
// ============================================================

/**
 * Berechnet alle Charakter-Stats aus den übergebenen Build-Daten.
 *
 * Reine Funktion: Erhält Equipment, Sockets und Passives als Parameter,
 * extrahiert Stats aus Items, Gemmen und passiven Talenten,
 * und aggregiert sie in ein kategorisiertes Objekt.
 *
 * @param equipment - Die aktuellen Ausrüstungs-Slots (Item-Objekte oder null)
 * @param sockets - Die aktuellen Socket-Belegungen (Gemmen-IDs oder null)
 * @param selectedPassives - Die aktuell aktiven passiven Talent-IDs
 */
export function calculateAllStats(
  equipment: EquipmentSlots,
  sockets: SocketData[],
  selectedPassives: string[],
  level: number = 1,
): CharacterStats {
  // Items aus allen Equipment-Slots sammeln
  const items = collectEquippedItems(equipment);
  const itemStats = collectItemStats(items);

  // Gemmen aus Sockets sammeln
  const gems = collectSocketedGems(sockets);
  const gemStats = collectGemStats(gems);

  // Passive Talente sammeln
  const passives = collectSelectedPassives(selectedPassives);
  const passiveStats = collectPassiveStats(passives);

  // Alle Rohdaten zusammenführen, deduplizieren und aggregieren
  const allRawStats = [...itemStats, ...gemStats, ...passiveStats];
  const deduplicatedStats = deduplicateRawStats(allRawStats);

  const stats = aggregateStats(deduplicatedStats);

  // Basiswerte aus dem Level berechnen und addieren
  const clampedLevel = Math.min(100, Math.max(1, level));
  stats.defensive.maximalesLeben  += 50 + 10 * clampedLevel;
  stats.defensive.maximalesMana   += 40 + 6  * clampedLevel;

  return stats;
}
