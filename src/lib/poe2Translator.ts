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

function stripDntPrefix(s: string): string {
  if (s.startsWith("[DNT] ")) return s.slice(6);
  return s;
}

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
      // "Coming Soon"-Platzhalter überspringen
      if (gem.nameEn === "Coming Soon") continue;
      // [DNT]-Prefix aus Schlüssel und Wert entfernen
      const en = stripDntPrefix(gem.nameEn);
      const de = stripDntPrefix(gem.nameDe);
      if (en && de && en !== de && !dict.has(en)) {
        dict.set(en, de);
      }
    }
  } catch { /* optional */ }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { passiveTalents } = require("@/data/passives");
    for (const talent of Object.values(passiveTalents as Record<string, { nameEn: string; nameDe: string }>)) {
      // [DNT]-Prefix aus Schlüssel und Wert entfernen
      const en = stripDntPrefix(talent.nameEn);
      const de = stripDntPrefix(talent.nameDe);
      if (en && de && en !== de && !dict.has(en)) {
        dict.set(en, de);
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
 * Teilt CamelCase in einzelne Wörter auf.
 * "ExplosiveGrenade" → "Explosive Grenade"
 */
function splitCamelCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

/**
 * Entfernt führende Qualifier-Wörter wie "Unique", "Skill", "Gem", "Support".
 * "Unique Skill Gem Herald Of Ash" → "Herald Of Ash"
 */
function stripQualifierWords(name: string): string {
  let prev: string;
  let cur = name.trim();
  do {
    prev = cur;
    cur = cur.replace(/^(unique|support|skill|gem)\b\s*/i, "").trim();
  } while (cur !== prev && cur.length > 0);
  return cur || name;
}

/**
 * Entfernt nachgestellte Tier-Marker von Support-Gems:
 * "Scattershot Two" → "Scattershot", "Splinter III" → "Splinter".
 * (In PoE 2 ist das Tier dieselbe Gemme in höherer Stufe – gleicher Name.)
 */
function stripTierSuffix(name: string): string {
  return name
    .replace(/\s+(two|three|four|five|six|seven|eight)$/i, "")
    .replace(/\s+(ii|iii|iv|v|vi|vii|viii)$/i, "")
    .replace(/\s+\d+$/, "")
    .trim();
}

/**
 * Übersetzt eine rohe Skill-ID (z.B. "Metadata/Items/Gem/SkillGemExplosiveGrenade")
 * in einen lesbaren deutschen Namen.
 *
 * Pipeline:
 * 1. Letzten Teil nach "/" extrahieren → "SkillGemExplosiveGrenade"
 * 2. "SkillGem"-Präfix entfernen → "ExplosiveGrenade"
 * 3. CamelCase in Wörter aufteilen → "Explosive Grenade"
 * 4. Durch translateTerm übersetzen → "Explosivgranate"
 *
 * @param rawId Die rohe Skill-ID aus dem Build-Parser
 * @returns Übersetzter Name oder Fallback
 */
export function translateSkillId(rawId: string): string {
  if (!rawId) return "";

  // 1. Letzten Teil nach dem letzten "/" extrahieren
  const parts = rawId.split("/");
  const lastPart = parts[parts.length - 1] || rawId;

  // 2. CamelCase in Wörter aufteilen
  //    ("UniqueSkillGemHeraldOfAsh" → "Unique Skill Gem Herald Of Ash")
  let name = splitCamelCase(lastPart);

  // 3. Führende Qualifier ("Unique", "Skill", "Gem", "Support") entfernen
  name = stripQualifierWords(name);

  // 4. Direkter (case-insensitiver) Match über translateTerm
  let translated = translateTerm(name);
  if (translated !== name) return translated;

  // 5. Getiertes Support-Gem: Tier-Suffix abschneiden und Basis übersetzen
  //    ("Scattershot Two" → "Scattershot" → "Streuschuss")
  const base = stripTierSuffix(name);
  if (base !== name && base.length > 0) {
    translated = translateTerm(base);
    if (translated !== base) return translated;
  }

  // 6. Fallback: bereinigter englischer Name
  return base || name || lastPart;
}

/**
 * Übersetzt eine rohe Tag-ID (z.B. "projectiles18", "grenades8")
 * in einen lesbaren deutschen Namen.
 *
 * Pipeline:
 * 1. Durch translateTerm übersetzen (exakter Match)
 * 2. Falls kein Treffer: Zahlen am Ende entfernen → "projectiles"
 * 3. Unterstriche durch Leerzeichen ersetzen
 * 4. Erneut translateTerm versuchen
 * 5. Fallback: bereinigten Text zurückgeben
 *
 * @param rawId Die rohe Tag-ID
 * @returns Übersetzter Name oder bereinigter Fallback
 */
export function translateTagId(rawId: string): string {
  if (!rawId) return "";

  // 1. Exakter Match über translateTerm
  const exact = translateTerm(rawId);
  if (exact !== rawId) return exact;

  // 2. Zahlen am Ende entfernen
  let cleaned = rawId.replace(/[0-9]+$/g, "");

  // 3. Unterstriche durch Leerzeichen ersetzen
  cleaned = cleaned.replace(/_+/g, " ").trim();

  if (!cleaned) return rawId;

  // 4. Erneut translateTerm versuchen mit bereinigtem Text
  const retry = translateTerm(cleaned);
  if (retry !== cleaned) return retry;

  // 5. Fallback: CamelCase aufteilen falls nötig
  const readable = splitCamelCase(cleaned);

  // Finaler translateTerm-Versuch mit CamelCase-aufgeteiltem Text
  const final = translateTerm(readable);
  if (final !== readable) return final;

  return readable || rawId;
}

/**
 * Übersetzt einen Beschreibungstext, indem bekannte Begriffe
 * im Text durch ihre deutschen Entsprechungen ersetzt werden.
 *
 * Da poe2Translator nur exakte Matches unterstützt, wird der
 * gesamte Text als Ganzes übersetzt. Falls kein exakter Match
 * existiert, wird der Originaltext zurückgegeben.
 *
 * @param text Der englische Beschreibungstext
 * @returns Übersetzter Text oder Original-Fallback
 */
export function translateDescription(text: string): string {
  if (!text) return "";

  const translated = translateTerm(text);
  return translated || text;
}

/**
 * Gibt die Größe des geladenen Wörterbuchs zurück.
 * Nützlich für Debugging.
 */
export function getDictionarySize(): number {
  return getCombinedDict().size;
}
