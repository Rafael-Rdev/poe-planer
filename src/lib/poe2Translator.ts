/**
 * poe2Translator – Einfaches Dictionary-Lookup für deutsche Übersetzungen.
 *
 * Lädt ausschließlich aus `scripts/poe2-translations.json`.
 * KEIN Mistral/API-Aufruf. Fallback: englischen Term zurückgeben.
 *
 * Zusätzlich werden die App-Datenbanken (gems, passives, items) für
 * Übersetzungen herangezogen, die nicht im JSON-Dictionary stehen.
 */

import translationsData from "../../scripts/poe2-translations.json";

// ─── Typen für die JSON-Struktur ─────────────────────────────────

interface TranslationsFile {
  skills: Record<string, string>;
  stats: Record<string, string>;
  metadata?: Record<string, unknown>;
}

const typedData = translationsData as TranslationsFile;

/**
 * Kombiniertes Wörterbuch: skills + stats aus der JSON-Datei.
 * Wird lazy mit App-Datenbanken erweitert.
 */
let _combinedDict: Map<string, string> | null = null;

function getCombinedDict(): Map<string, string> {
  if (_combinedDict) return _combinedDict;

  const dict = new Map<string, string>();

  // 1. poe2-translations.json (Skills + Stats)
  if (typedData.skills) {
    for (const [en, de] of Object.entries(typedData.skills)) {
      if (typeof de === "string" && de.length > 0 && en !== de) {
        dict.set(en, de);
      }
    }
  }

  if (typedData.stats) {
    for (const [en, de] of Object.entries(typedData.stats)) {
      if (typeof de === "string" && de.length > 0 && en !== de) {
        if (!dict.has(en)) dict.set(en, de);
      }
    }
  }

  // 2. App-Datenbanken als Ergänzung (dynamischer Import vermeidet Zirkelabhängigkeiten)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { availableGems } = require("@/data/gems");
    for (const gem of Object.values(availableGems as Record<string, { nameEn: string; nameDe: string }>)) {
      if (gem.nameEn && gem.nameDe && gem.nameEn !== gem.nameDe && !dict.has(gem.nameEn)) {
        dict.set(gem.nameEn, gem.nameDe);
      }
    }
  } catch { /* optional */ }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { passiveTalents } = require("@/data/passives");
    for (const talent of Object.values(passiveTalents as Record<string, { nameEn: string; nameDe: string }>)) {
      if (talent.nameEn && talent.nameDe && talent.nameEn !== talent.nameDe && !dict.has(talent.nameEn)) {
        dict.set(talent.nameEn, talent.nameDe);
      }
    }
  } catch { /* optional */ }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { characterClasses } = require("@/data/passives");
    for (const cls of Object.values(characterClasses as Record<string, { nameEn: string; nameDe: string }>)) {
      if (cls.nameEn && cls.nameDe && cls.nameEn !== cls.nameDe && !dict.has(cls.nameEn)) {
        dict.set(cls.nameEn, cls.nameDe);
      }
    }
  } catch { /* optional */ }

  _combinedDict = dict;
  return dict;
}

/**
 * Übersetzt einen einzelnen englischen Begriff ins Deutsche.
 *
 * - Sucht im kombinierten Wörterbuch (poe2-translations.json + App-Datenbanken)
 * - Fallback: gibt den englischen Begriff unverändert zurück
 * - KEIN Mistral/API-Aufruf!
 *
 * @param englishTerm Der englische Begriff
 * @returns Die deutsche Übersetzung oder den englischen Begriff als Fallback
 */
export function translateTerm(englishTerm: string): string {
  if (!englishTerm) return "";

  const dict = getCombinedDict();

  // Exakter Match
  const exact = dict.get(englishTerm);
  if (exact) return exact;

  // Case-insensitive Match
  const lowerTerm = englishTerm.toLowerCase();
  for (const [en, de] of dict) {
    if (en.toLowerCase() === lowerTerm) return de;
  }

  // Fallback: englischen Begriff zurückgeben
  return englishTerm;
}

/**
 * Gibt die Größe des geladenen Wörterbuchs zurück.
 * Nützlich für Debugging.
 */
export function getDictionarySize(): number {
  return getCombinedDict().size;
}
