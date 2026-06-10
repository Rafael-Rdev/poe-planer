/**
 * Maxroll .build File Parser
 *
 * Parst den JSON-Inhalt einer von Maxroll exportierten .build-Datei
 * und mappt die enthaltenen Daten auf unsere lokale Datenbank.
 *
 * Extrahiert:
 *  - Build-Name (Feld "name")
 *  - Charakterklasse (Feld "ascendancy", z.B. "Monk1" → "monk")
 *  - Level (Feld "level" falls vorhanden)
 *  - Passive Talente (Feld "passives", Array mit {id, ...})
 *  - Gemmen/Skills (Feld "skills" oder "gems", verschiedene Strukturen)
 */

import { getAllGems } from "@/data/gems";
import { getAllPassiveTalents } from "@/data/passives";
import type { SocketData, EquipmentSlots } from "@/context/buildStore";

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface MaxrollBuildStats {
  passivesTotal: number;
  passivesRecognized: number;
  gemsTotal: number;
  gemsRecognized: number;
}

export interface MaxrollBuildParseResult {
  buildName: string | null;
  characterClass: string | null;
  level: number | undefined;
  sockets: SocketData[];
  selectedPassives: string[];
  equipment: EquipmentSlots;
  stats: MaxrollBuildStats;
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

const EMPTY_EQUIPMENT: EquipmentSlots = {
  mainHand: null, weapon2: null, offHand: null,
  chest: null, helmet: null, gloves: null,
  belt: null, boots: null, ring1: null, ring2: null, amulet: null,
};

/**
 * Mappt Maxroll-Ascendancy-Strings auf unsere Klassen-IDs.
 * Maxroll verwendet Klasse + Ziffer, z.B. "Monk1", "Warrior2".
 * Strategie: Ziffern am Ende entfernen, lowercasen, direkt matchen.
 * Die Map deckt unregelmäßige Fälle ab.
 */
const ASCENDANCY_TO_CLASS: Record<string, string> = {
  // Direkte Klassen-Namen (ohne Ziffer)
  monk: "monk",
  warrior: "warrior",
  witch: "witch",
  sorceress: "sorceress",
  ranger: "ranger",
  huntress: "huntress",
  mercenary: "mercenary",
  druid: "druid",
  templar: "templar",
  duelist: "duelist",
  shadow: "shadow",
  marauder: "marauder",
};

// ─── Haupt-Funktion ───────────────────────────────────────────────────────────

/**
 * Parst den Textinhalt einer Maxroll .build-Datei.
 *
 * @param fileContent - Roher String-Inhalt der .build-Datei
 * @throws Error wenn das JSON ungültig ist oder kein .build-Format erkannt wird
 */
export function parseMaxrollBuildFile(fileContent: string): MaxrollBuildParseResult {
  let json: unknown;
  try {
    json = JSON.parse(fileContent);
  } catch {
    throw new Error("Ungültige Datei – kein gültiges JSON.");
  }

  if (!json || typeof json !== "object") {
    throw new Error("Ungültiges .build-Format: Kein JSON-Objekt.");
  }

  const data = json as Record<string, unknown>;

  // Mindest-Validierung: muss wie eine Maxroll-Datei aussehen
  if (!("ascendancy" in data) && !("passives" in data) && !("name" in data)) {
    throw new Error(
      "Keine gültige .build-Datei. Erwartete Felder (name, ascendancy, passives) fehlen."
    );
  }

  const buildName = typeof data.name === "string" ? data.name : null;
  const characterClass = extractClass(data);
  const level = extractLevel(data);
  const { selectedPassives, passivesTotal, passivesRecognized } = extractPassives(data);
  const { sockets, gemsTotal, gemsRecognized } = extractGems(data);

  return {
    buildName,
    characterClass,
    level,
    sockets,
    selectedPassives,
    equipment: { ...EMPTY_EQUIPMENT },
    stats: {
      passivesTotal,
      passivesRecognized,
      gemsTotal,
      gemsRecognized,
    },
  };
}

// ─── Klassen-Extraktion ───────────────────────────────────────────────────────

function extractClass(data: Record<string, unknown>): string | null {
  const raw = data.ascendancy ?? data.class ?? data.className;
  if (typeof raw !== "string" || !raw) return null;

  // "Monk1" → "monk", "Warrior2" → "warrior"
  const base = raw.replace(/\d+$/, "").toLowerCase().trim();

  if (ASCENDANCY_TO_CLASS[base]) return ASCENDANCY_TO_CLASS[base];

  // Partial match fallback (z.B. "MonkOfTheOrder" → "monk")
  for (const [key, classId] of Object.entries(ASCENDANCY_TO_CLASS)) {
    if (base.startsWith(key)) return classId;
  }

  return null;
}

// ─── Level-Extraktion ─────────────────────────────────────────────────────────

function extractLevel(data: Record<string, unknown>): number | undefined {
  const raw = data.level ?? data.characterLevel;
  if (typeof raw === "number" && raw >= 1 && raw <= 100) {
    return Math.round(raw);
  }
  if (typeof raw === "string") {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) return parsed;
  }
  return undefined;
}

// ─── Passiv-Extraktion ────────────────────────────────────────────────────────

function extractPassives(data: Record<string, unknown>): {
  selectedPassives: string[];
  passivesTotal: number;
  passivesRecognized: number;
} {
  const rawPassives = data.passives ?? data.passive_nodes ?? data.nodes;
  if (!Array.isArray(rawPassives)) {
    return { selectedPassives: [], passivesTotal: 0, passivesRecognized: 0 };
  }

  // Lazy-initialisierte Lookup-Map: normalisierter Name → ID
  const passiveByNormalizedName = new Map<string, string>();
  const passiveById = new Map<string, string>();
  for (const p of getAllPassiveTalents()) {
    passiveById.set(p.id, p.id);
    passiveById.set(p.id.toLowerCase(), p.id);
    passiveByNormalizedName.set(normalize(p.nameEn), p.id);
    passiveByNormalizedName.set(normalize(p.id), p.id);
  }

  const selected: string[] = [];
  let total = 0;

  for (const entry of rawPassives) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;

    // Rohe ID aus dem Eintrag extrahieren
    const rawId = e.id ?? e.nodeId ?? e.passive_id ?? e.name;
    if (rawId === undefined || rawId === null) continue;

    const idStr = String(rawId);
    total++;

    // 1. Direkter ID-Match
    if (passiveById.has(idStr)) {
      selected.push(passiveById.get(idStr)!);
      continue;
    }
    // 2. Normalisierter Match
    const normalized = normalize(idStr);
    if (passiveByNormalizedName.has(normalized)) {
      selected.push(passiveByNormalizedName.get(normalized)!);
      continue;
    }
    // 3. Numerische IDs ignorieren (kein Match möglich ohne ID-Tabelle)
    // — wird als unrecognized gezählt
  }

  return {
    selectedPassives: selected,
    passivesTotal: total,
    passivesRecognized: selected.length,
  };
}

// ─── Gem-Extraktion ───────────────────────────────────────────────────────────

function extractGems(data: Record<string, unknown>): {
  sockets: SocketData[];
  gemsTotal: number;
  gemsRecognized: number;
} {
  const sockets: SocketData[] = [null, null, null, null, null, null];

  const gemById = new Map<string, string>();
  const gemByNormalizedName = new Map<string, string>();
  for (const g of getAllGems()) {
    gemById.set(g.id, g.id);
    gemById.set(g.id.toLowerCase(), g.id);
    gemByNormalizedName.set(normalize(g.nameEn), g.id);
    gemByNormalizedName.set(normalize(g.id), g.id);
  }

  // Alle möglichen Gem-Rohdaten sammeln
  const rawGemIds: string[] = [];
  collectGemIds(data, rawGemIds);

  let recognized = 0;
  let slotIndex = 0;

  for (const rawId of rawGemIds) {
    if (slotIndex >= 6) break;

    // 1. Direkter ID-Match
    let matched: string | undefined = gemById.get(rawId) ?? gemById.get(rawId.toLowerCase());
    // 2. Normalisierter Match
    if (!matched) matched = gemByNormalizedName.get(normalize(rawId));

    if (matched) {
      sockets[slotIndex] = matched;
      slotIndex++;
      recognized++;
    }
  }

  return {
    sockets,
    gemsTotal: rawGemIds.length,
    gemsRecognized: recognized,
  };
}

/**
 * Durchsucht die Dateistruktur nach Gem-IDs in verschiedenen Formaten.
 *
 * Unterstützte Strukturen:
 * - skills: [{id: "..."}, ...]                — flache Liste
 * - skills: [{gems: [{id: "..."}]}, ...]      — Skill-Gruppen mit Gems
 * - gems: [{id: "..."}, ...]                  — direkte Gems-Liste
 * - activeSkills / skillGems als Alternative
 */
function collectGemIds(data: Record<string, unknown>, out: string[]): void {
  // Mögliche Top-Level-Schlüssel (Priorität: spezifischer → allgemeiner)
  const sources = [
    data.skills,
    data.gems,
    data.activeSkills,
    data.skillGems,
    data.skill_gems,
  ];

  for (const source of sources) {
    if (!Array.isArray(source)) continue;

    for (const entry of source) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;

      // Direkte Gem-Einträge: {id: "..."} oder {gemId: "..."} oder {name: "..."}
      const directId = e.id ?? e.gemId ?? e.gem_id ?? e.name ?? e.skillId;
      if (typeof directId === "string" && directId.length > 0) {
        out.push(directId);
        continue;
      }

      // Skill-Gruppen mit gems-Array: {gems: [{id: "..."}, ...]}
      if (Array.isArray(e.gems)) {
        for (const gem of e.gems) {
          if (!gem || typeof gem !== "object") continue;
          const g = gem as Record<string, unknown>;
          const gId = g.id ?? g.gemId ?? g.name;
          if (typeof gId === "string" && gId.length > 0) {
            out.push(gId);
          }
        }
      }

      // Verschachtelte skills-Felder
      if (Array.isArray(e.skills)) {
        for (const s of e.skills) {
          if (!s || typeof s !== "object") continue;
          const sid = (s as Record<string, unknown>).id ?? (s as Record<string, unknown>).name;
          if (typeof sid === "string" && sid.length > 0) out.push(sid);
        }
      }
    }
  }
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}
