/**
 * SkillDetailService – Lädt Detail-Daten (Tags, Level, Manakosten, Beschreibungen)
 * aus den GGG-Backup-JSONs und matcht sie mit unseren Gemmen.
 *
 * Datenfluss:
 *   Gem.id (z.B. "icenova") → de_skillgems.json → GemEffects[0].Id (z.B. "IceNova")
 *   → de_activeskills.json (Id: "IceNova") → DisplayedName, Description, ActiveSkillTypes, Stats
 *
 * Dieser Service wird lazy initialisiert und gecached.
 */

// ─── Typen für Rohe JSON-Daten ──────────────────────────────────────────

interface SkillGemEntry {
  BaseItemTypesKey: { TableName: string; Id: string };
  GemEffects: Array<{ TableName: string; Id: string }>;
  StrengthRequirementPercent: number;
  DexterityRequirementPercent: number;
  IntelligenceRequirementPercent: number;
}

interface ActiveSkillEntry {
  Id: string;
  DisplayedName: string;
  Description: string;
  ActiveSkillTypes: Array<{ TableName: string; RowIndex: number }>;
  Input_StatKeys: Array<{ TableName: string; Id: string }>;
  Output_StatKeys: Array<{ TableName: string; Id: string }>;
  IsManuallyCasted: boolean;
}

// ─── Externer Detail-Typ ───────────────────────────────────────────────

export interface SkillDetail {
  /** Anzeigename in Deutsch (aus de_activeskills.json) */
  nameDe: string;
  /** Volle Tooltip-Beschreibung in Deutsch */
  description: string;
  /** Tags wie [Angriff], [Zauber], [AoE], [Nahkampf] etc. */
  tags: string[];
  /** Attributs-Anforderungen (0-100 für jeden Wert) */
  requirements: {
    strength: number;
    dexterity: number;
    intelligence: number;
  };
  /** Ob die Fertigkeit manuell gewirkt wird */
  isManuallyCasted: boolean;
  /** Input-Stat-IDs (z.B. für Schadensberechnung) */
  inputStats: string[];
  /** Output-Stat-IDs */
  outputStats: string[];
}

// ─── ActiveSkillType → Tag-Label Mapping ──────────────────────────────

/**
 * Mapping von RowIndex → deutschem Tag-Label.
 * Quelle: PoE 2 ActiveSkillType.dat / Community-Wiki.
 * Nur die für Tooltips relevanten Tags sind gelistet.
 */
const TAG_INDEX_MAP: Record<number, string> = {
  0: "Angriff",
  1: "Zauber",
  2: "Projektil",
  3: "Fläche",
  4: "Nahkampf",
  5: "Fernkampf",
  6: "Bewegung",
  7: "Kälte",
  8: "Feuer",
  9: "Blitz",
  10: "Chaos",
  11: "Physisch",
  12: "Falle",
  13: "Mine",
  14: "Totem",
  15: "Diener",
  16: "Aura",
  17: "Fluch",
  18: "Siegel",
  19: "Hieb",
  20: "Stoß",
  21: "Bogen",
  22: "Armbrust",
  23: "Streitkolben",
  24: "Stab",
  25: "Dolch",
  26: "Klaue",
  27: "Axt",
  28: "Schwert",
  29: "Ketten",
  30: "Kanalisierung",
  31: "Dauerhaft",
  32: "Auslöser",
  33: "Reise",
  34: "Schild",
  35: "Brand",
  36: "Verstärkung",
  37: "Entzug",
  38: "Neu",
  39: "Nova",
  40: "Wiederholung",
  41: "Rückung",
  42: "Marker",
  43: "Äther",
  44: "Dienerangriff",
  45: "Kugel",
  46: "Eingebettet",
  47: "Umwandlung",
  48: "Schrei",
  49: "Bleiben",
  50: "Prisma",
  51: "Granate",
  52: "Blitzschnell",
  53: "Werfen",
  54: "Erschütternd",
  55: "Phalanx",
  56: "Orb",
  57: "Brunnen",
  58: "Metall",
  59: "Physischer Hieb",
  60: "Physischer Stoß",
  90: "Bezahlt",
  91: "AoE",
  92: "Elementar",
  93: "Vaal",
};

function rowIndexToTag(index: number): string | null {
  return TAG_INDEX_MAP[index] ?? null;
}

// ─── Lazy-geladene Caches ──────────────────────────────────────────────

let _skillGemEntries: Map<string, SkillGemEntry> | null = null;
let _activeSkillEntries: Map<string, ActiveSkillEntry> | null = null;
let _detailCache: Map<string, SkillDetail | null> | null = null;
let _loadingPromise: Promise<void> | null = null;

/**
 * Extrahiert die Gem-Effekt-ID aus dem BaseItemTypesKey.Id-Pfad.
 * Aus "Metadata/Items/Gems/SkillGemIceNova" → "IceNova"
 */
function extractEffectId(baseTypeId: string): string {
  const parts = baseTypeId.split("/");
  const last = parts[parts.length - 1]; // "SkillGemIceNova"
  return last.replace(/^SkillGem/, "");
}

/**
 * Lädt de_skillgems.json und indiziert nach BaseItemTypesKey.Id.
 */
async function loadSkillGemEntries(): Promise<Map<string, SkillGemEntry>> {
  if (_skillGemEntries) return _skillGemEntries;

  const data = (await import("@/data/backup/de_skillgems.json")).default as SkillGemEntry[];

  const map = new Map<string, SkillGemEntry>();
  for (const entry of data) {
    if (entry.BaseItemTypesKey?.Id && entry.GemEffects?.length > 0) {
      map.set(entry.BaseItemTypesKey.Id, entry);
    }
  }

  _skillGemEntries = map;
  return map;
}

/**
 * Lädt de_activeskills.json und indiziert nach Id (case-insensitive für Matching).
 */
async function loadActiveSkillEntries(): Promise<Map<string, ActiveSkillEntry>> {
  if (_activeSkillEntries) return _activeSkillEntries;

  const data = (await import("@/data/backup/de_activeskills.json")).default as ActiveSkillEntry[];

  const map = new Map<string, ActiveSkillEntry>();
  for (const entry of data) {
    if (entry.Id) {
      map.set(entry.Id.toLowerCase(), entry);
    }
  }

  _activeSkillEntries = map;
  return map;
}

/**
 * Initialisiert beide Caches parallel.
 */
async function ensureLoaded(): Promise<void> {
  if (_detailCache) return;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    await Promise.all([loadSkillGemEntries(), loadActiveSkillEntries()]);
    _detailCache = new Map();
    console.log("[SkillDetailService] Daten geladen.");
  })();

  return _loadingPromise;
}

// ─── Haupt-API ─────────────────────────────────────────────────────────

/**
 * Holt die Skill-Details für eine Gemme anhand ihrer ID (z.B. "icenova").
 *
 * Matching-Pfad:
 *   1. Gem.id = "icenova"
 *   2. Suche in de_skillgems.json nach BaseItemTypesKey.Id die "IceNova" enthält
 *   3. Extrahiere GemEffects[0].Id = "IceNova"
 *   4. Suche in de_activeskills.json nach Id = "IceNova"
 *   5. Extrahiere DisplayedName, Description, Tags, Stats
 */
export async function getSkillDetail(gemId: string): Promise<SkillDetail | null> {
  await ensureLoaded();
  if (!_detailCache) return null;

  // Cache-Check
  const cached = _detailCache.get(gemId);
  if (cached !== undefined) return cached;

  // Suche in de_skillgems.json nach der Gemme
  const skillGems = _skillGemEntries!;
  const activeSkills = _activeSkillEntries!;

  // Finde den SkillGem-Eintrag via BaseItemTypesKey.Id
  let effectId: string | null = null;
  let skillGemEntry: SkillGemEntry | null = null;

  for (const [baseId, entry] of skillGems) {
    const extracted = extractEffectId(baseId);
    if (extracted.toLowerCase() === gemId.toLowerCase()) {
      effectId = entry.GemEffects[0]?.Id ?? extracted;
      skillGemEntry = entry;
      break;
    }
  }

  // Fallback: Wenn kein Eintrag in de_skillgems.json, versuche Direkt-Match
  if (!effectId) {
    // Check ob es einen ActiveSkill-Eintrag mit dieser ID gibt
    const directMatch = activeSkills.get(gemId.toLowerCase());
    if (directMatch) {
      effectId = directMatch.Id;
    }
  }

  if (!effectId) {
    _detailCache.set(gemId, null);
    return null;
  }

  // Finde den ActiveSkill-Eintrag
  const activeSkill = activeSkills.get(effectId.toLowerCase());
  if (!activeSkill) {
    _detailCache.set(gemId, null);
    return null;
  }

  // Tags aus ActiveSkillTypes extrahieren
  const tags: string[] = [];
  for (const typeRef of activeSkill.ActiveSkillTypes) {
    const tag = rowIndexToTag(typeRef.RowIndex);
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  const detail: SkillDetail = {
    nameDe: activeSkill.DisplayedName || "",
    description: activeSkill.Description || "",
    tags,
    requirements: {
      strength: skillGemEntry?.StrengthRequirementPercent ?? 0,
      dexterity: skillGemEntry?.DexterityRequirementPercent ?? 0,
      intelligence: skillGemEntry?.IntelligenceRequirementPercent ?? 0,
    },
    isManuallyCasted: activeSkill.IsManuallyCasted ?? true,
    inputStats: (activeSkill.Input_StatKeys || []).map((s) => s.Id),
    outputStats: (activeSkill.Output_StatKeys || []).map((s) => s.Id),
  };

  _detailCache.set(gemId, detail);
  return detail;
}

/**
 * Synchrone Dummy-Variante für schnelle Initial-Renderings.
 * Gibt null zurück, bis die Daten geladen sind.
 */
export function getSkillDetailCached(gemId: string): SkillDetail | null {
  if (!_detailCache) return null;
  const cached = _detailCache.get(gemId);
  return cached ?? null;
}

/**
 * Pre-loaded alle Skill-Details für eine Liste von Gem-IDs.
 * Nützlich, um Tooltips beim ersten Hover sofort anzuzeigen.
 */
export async function preloadSkillDetails(gemIds: string[]): Promise<void> {
  await Promise.all(gemIds.map((id) => getSkillDetail(id)));
}