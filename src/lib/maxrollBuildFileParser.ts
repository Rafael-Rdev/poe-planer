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
 *
 * ─── ID-Mapping Strategie ───────────────────────────────────────────────────
 *
 * Maxroll und unsere passives.ts verwenden unterschiedliche ID-Schemata:
 *
 *  Maxroll                  | Typ                | Unsere DB
 *  ─────────────────────────|────────────────────|─────────────────────────────
 *  attack_speed25           | small stat node    | — (kein Eintrag in unserer DB)
 *  attack_damage3           | small stat node    | — (kein Eintrag)
 *  intelligence10           | small stat node    | — (kein Eintrag)
 *  shadow_monk_notable1     | class notable      | dnt-shadow1notable1
 *  monk_invoker_notable2    | class notable      | dnt-monk1notable2
 *  acceleration_1           | named notable      | acceleration
 *  attack_speed_notable     | generic notable    | dnt-attack-speed-notable
 *
 * Unsere DB enthält NUR Notables und Keystones, KEINE kleinen Stat-Knoten.
 * "Small stat nodes" (z.B. attack_speed25) werden als solche erkannt und
 * separat gezählt — sie gelten nicht als "Parser-Fehler".
 */

import { getAllGems } from "@/data/gems";
import { getAllPassiveTalents } from "@/data/passives";
import type { SocketData, EquipmentSlots } from "@/context/buildStore";

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface MaxrollBuildStats {
  passivesTotal: number;
  passivesRecognized: number;
  /** Kleine Stat-Knoten (z.B. "+25% Angriffsgeschwindigkeit"), die nicht in
   *  unserer Datenbank sind — kein Bug, die DB enthält nur Notables. */
  passivesSmallNodes: number;
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

const ASCENDANCY_TO_CLASS: Record<string, string> = {
  monk: "monk", warrior: "warrior", witch: "witch",
  sorceress: "sorceress", ranger: "ranger", huntress: "huntress",
  mercenary: "mercenary", druid: "druid", templar: "templar",
  duelist: "duelist", shadow: "shadow", marauder: "marauder",
};

// ─── Haupt-Funktion ───────────────────────────────────────────────────────────

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

  if (!("ascendancy" in data) && !("passives" in data) && !("name" in data)) {
    throw new Error(
      "Keine gültige .build-Datei. Erwartete Felder (name, ascendancy, passives) fehlen."
    );
  }

  const buildName = typeof data.name === "string" ? data.name : null;
  const characterClass = extractClass(data);
  const level = extractLevel(data);
  const { selectedPassives, passivesTotal, passivesRecognized, passivesSmallNodes } = extractPassives(data);
  const { sockets, gemsTotal, gemsRecognized } = extractGems(data);

  return {
    buildName,
    characterClass,
    level,
    sockets,
    selectedPassives,
    equipment: { ...EMPTY_EQUIPMENT },
    stats: { passivesTotal, passivesRecognized, passivesSmallNodes, gemsTotal, gemsRecognized },
  };
}

// ─── Klassen-Extraktion ───────────────────────────────────────────────────────

function extractClass(data: Record<string, unknown>): string | null {
  const raw = data.ascendancy ?? data.class ?? data.className;
  if (typeof raw !== "string" || !raw) return null;
  const base = raw.replace(/\d+$/, "").toLowerCase().trim();
  if (ASCENDANCY_TO_CLASS[base]) return ASCENDANCY_TO_CLASS[base];
  for (const [key, classId] of Object.entries(ASCENDANCY_TO_CLASS)) {
    if (base.startsWith(key)) return classId;
  }
  return null;
}

// ─── Level-Extraktion ─────────────────────────────────────────────────────────

function extractLevel(data: Record<string, unknown>): number | undefined {
  const raw = data.level ?? data.characterLevel;
  if (typeof raw === "number" && raw >= 1 && raw <= 100) return Math.round(raw);
  if (typeof raw === "string") {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) return parsed;
  }
  return undefined;
}

// ─── Passiv-Extraktion ────────────────────────────────────────────────────────

/**
 * Erkennt ob eine Maxroll-ID ein kleiner Stat-Knoten ist.
 *
 * Merkmale: nur Buchstaben + Unterstriche, gefolgt von Ziffern,
 * KEIN "_notable" im Bezeichner → z.B. "attack_speed25", "intelligence10"
 */
function isSmallStatNode(id: string): boolean {
  return /^[a-z][a-z_]*\d+$/i.test(id) && !id.toLowerCase().includes("notable");
}

/**
 * Versucht eine Maxroll-Passive-ID auf eine ID aus unserer DB zu mappen.
 *
 * Auflösungs-Reihenfolge:
 * 1. Exakter Match (case-insensitive)
 * 2. Normalisierter Match (alle Nicht-Buchstaben/Ziffern entfernt)
 * 3. Ziffern am Ende abschneiden + Unterstriche → Bindestriche
 *    → "attack_speed25" → "attack-speed" → direkt in DB
 * 4. Klassen-Notable-Muster: "{klasse}_{...}_notable{n}"
 *    → "shadow_monk_notable1" → "dnt-shadow1notable1"
 * 5. Generisches DNT-Notable-Muster: "{stat}_notable"
 *    → "attack_speed_notable" → "dnt-attack-speed-notable"
 */
function resolveMaxrollPassiveId(
  rawId: string,
  byId: Map<string, string>,
  byNorm: Map<string, string>
): string | null {
  const lower = rawId.toLowerCase();

  // Step 1: Exakter Match
  if (byId.has(lower)) return byId.get(lower)!;

  // Step 2: Normalisierter Match (entfernt alle Sonderzeichen)
  const rawNorm = norm(lower);
  if (byNorm.has(rawNorm)) return byNorm.get(rawNorm)!;

  // Step 3: Ziffern am Ende abschneiden, _ → -
  // "attack_speed25" → strip "25" → "attack_speed" → "attack-speed"
  const stripped = lower.replace(/_?\d+$/, "").replace(/_/g, "-");
  if (stripped) {
    if (byId.has(stripped)) return byId.get(stripped)!;
    const strNorm = norm(stripped);
    if (byNorm.has(strNorm)) return byNorm.get(strNorm)!;
  }

  // Step 4: Klassen-Notable-Muster: {words}_notable{n}
  // "shadow_monk_notable1" → dnt-shadow1notable1 (oder dnt-monk1notable1)
  const classNotableRx = /^(.+)_notable(\d+)$/.exec(lower);
  if (classNotableRx) {
    const [, prefix, numStr] = classNotableRx;
    const n = parseInt(numStr, 10);
    const words = prefix.split("_").filter(Boolean);

    const candidates: string[] = [];
    for (const w of words) {
      // dnt-{word}1notable{n} … dnt-{word}3notable{n}
      for (let v = 1; v <= 3; v++) candidates.push(`dnt-${w}${v}notable${n}`);
      // dnt-{word}notable{n} (kein Variant-Suffix)
      candidates.push(`dnt-${w}notable${n}`);
    }
    // Benachbarte Wort-Kombos: dnt-{w1w2}1notable{n}
    for (let i = 0; i < words.length - 1; i++) {
      const combo = words.slice(i, i + 2).join("");
      for (let v = 1; v <= 3; v++) candidates.push(`dnt-${combo}${v}notable${n}`);
    }

    for (const c of candidates) {
      if (byId.has(c)) return byId.get(c)!;
    }
  }

  // Step 5: Generisches DNT-Notable: "{stat}_notable" → "dnt-{stat}-notable"
  // Auch stripped-Base → "dnt-{stripped}-notable"
  const genNotableRx = /^(.+)_notable$/.exec(lower);
  if (genNotableRx) {
    const base = genNotableRx[1].replace(/_/g, "-");
    const candidate = `dnt-${base}-notable`;
    if (byId.has(candidate)) return byId.get(candidate)!;
  }
  if (stripped) {
    const dntCandidate = `dnt-${stripped}-notable`;
    if (byId.has(dntCandidate)) return byId.get(dntCandidate)!;
  }

  return null;
}

function extractPassives(data: Record<string, unknown>): {
  selectedPassives: string[];
  passivesTotal: number;
  passivesRecognized: number;
  passivesSmallNodes: number;
} {
  const rawPassives = data.passives ?? data.passive_nodes ?? data.nodes;
  if (!Array.isArray(rawPassives)) {
    return { selectedPassives: [], passivesTotal: 0, passivesRecognized: 0, passivesSmallNodes: 0 };
  }

  // Lookup-Maps aufbauen
  const byId = new Map<string, string>();
  const byNorm = new Map<string, string>();
  for (const p of getAllPassiveTalents()) {
    byId.set(p.id, p.id);
    byId.set(p.id.toLowerCase(), p.id);
    byNorm.set(norm(p.nameEn), p.id);
    byNorm.set(norm(p.id), p.id);
  }

  const selected: string[] = [];
  const seen = new Set<string>();
  let total = 0;
  let smallNodes = 0;

  for (const entry of rawPassives) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const rawId = e.id ?? e.nodeId ?? e.passive_id ?? e.name;
    if (rawId === undefined || rawId === null) continue;

    const idStr = String(rawId);
    total++;

    // Kleiner Stat-Knoten → zählen, aber nicht versuchen zu matchen
    if (isSmallStatNode(idStr)) {
      smallNodes++;
      continue;
    }

    const resolved = resolveMaxrollPassiveId(idStr, byId, byNorm);
    if (resolved && !seen.has(resolved)) {
      selected.push(resolved);
      seen.add(resolved);
    }
  }

  return {
    selectedPassives: selected,
    passivesTotal: total,
    passivesRecognized: selected.length,
    passivesSmallNodes: smallNodes,
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
  const gemByNorm = new Map<string, string>();
  for (const g of getAllGems()) {
    gemById.set(g.id, g.id);
    gemById.set(g.id.toLowerCase(), g.id);
    gemByNorm.set(norm(g.nameEn), g.id);
    gemByNorm.set(norm(g.id), g.id);
  }

  const rawGemIds: string[] = [];
  collectGemIds(data, rawGemIds);

  let recognized = 0;
  let slotIndex = 0;

  for (const rawId of rawGemIds) {
    if (slotIndex >= 6) break;
    const lo = rawId.toLowerCase();
    const matched =
      gemById.get(rawId) ??
      gemById.get(lo) ??
      gemByNorm.get(norm(rawId));

    if (matched) {
      sockets[slotIndex] = matched;
      slotIndex++;
      recognized++;
    }
  }

  return { sockets, gemsTotal: rawGemIds.length, gemsRecognized: recognized };
}

function collectGemIds(data: Record<string, unknown>, out: string[]): void {
  const sources = [data.skills, data.gems, data.activeSkills, data.skillGems, data.skill_gems];
  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const entry of source) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const directId = e.id ?? e.gemId ?? e.gem_id ?? e.name ?? e.skillId;
      if (typeof directId === "string" && directId.length > 0) { out.push(directId); }
      if (Array.isArray(e.gems)) {
        for (const gem of e.gems) {
          if (!gem || typeof gem !== "object") continue;
          const gId = (gem as Record<string, unknown>).id ?? (gem as Record<string, unknown>).gemId ?? (gem as Record<string, unknown>).name;
          if (typeof gId === "string" && gId.length > 0) out.push(gId);
        }
      }
      if (Array.isArray(e.skills)) {
        for (const s of e.skills) {
          if (!s || typeof s !== "object") continue;
          const sid = (s as Record<string, unknown>).id ?? (s as Record<string, unknown>).name;
          if (typeof sid === "string" && sid.length > 0) out.push(sid);
        }
      }
      // support_skills: Array von { id: "Metadata/..." } Objekten
      if (Array.isArray(e.support_skills)) {
        for (const ss of e.support_skills) {
          if (!ss || typeof ss !== "object") continue;
          const ssId = (ss as Record<string, unknown>).id;
          if (typeof ssId === "string" && ssId.length > 0) out.push(ssId);
        }
      }
    }
  }
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function norm(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}
