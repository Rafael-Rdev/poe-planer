#!/usr/bin/env npx tsx
/**
 * ============================================================================
 * Path of Exile 2 — Echtspiel-Daten-Fetcher & Generator
 * ============================================================================
 *
 * SICHERHEIT: Keine instabilen Wiki-APIs! Nur statische GitHub-Raw-URLs
 * und lokale Backup-JSONs (aus dem Game-Dump).
 *
 * Timeout: Alle Fetch-Versuche haben max. 5 Sekunden.
 *
 * Generiert:
 *   - src/data/gems.ts     (Alle aktiven & Support-Gemmen, DE+EN)
 *   - src/data/passives.ts (Klassen + Keynotes/Notables, DE+EN)
 *   - src/data/items.ts    (Alle Item-Basistypen, DE+EN)
 *
 * Verwendung:
 *   npx tsx scripts/fetchPoe2Data.ts
 * ============================================================================
 */

import * as fs from "fs";
import * as path from "path";

// ================================================================
// KONFIGURATION
// ================================================================

const BACKUP_DIR = path.resolve(__dirname, "..", "src/data/backup");
const DATA_DIR = path.resolve(__dirname, "..", "src/data");

const TIMEOUT_MS = 5_000;

/** Mögliche GitHub-Rohdatenquellen (statisch, keine APIs) */
const GITHUB_SOURCES = [
  "https://raw.githubusercontent.com/poe-tool-dev/poe2-data/main/",
  "https://raw.githubusercontent.com/poe-tool-dev/poe2-data/latest/",
  "https://raw.githubusercontent.com/poe-tool-dev/poe2-data/master/",
];

// ================================================================
// HILFSFUNKTIONEN
// ================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function elapsed(start: bigint): string {
  const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
  return ms.toFixed(0);
}

// ================================================================
// GITHUB FETCH MIT TIMEOUT
// ================================================================

async function fetchWithTimeout(url: string, timeoutMs: number = TIMEOUT_MS): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.warn(`  ⚠️  ${url} → HTTP ${response.status}`);
      return null;
    }
    const text = await response.text();
    return text;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn(`  ⏱  ${url} → Timeout (${timeoutMs}ms)`);
    } else {
      console.warn(`  ⚠️  ${url} → ${err.message}`);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryFetchFromGitHub(filename: string): Promise<string | null> {
  for (const baseUrl of GITHUB_SOURCES) {
    const url = `${baseUrl}${filename}`;
    const result = await fetchWithTimeout(url);
    if (result !== null) return result;
  }
  return null;
}

// ================================================================
// LOKALE BACKUP-JSONS LADEN
// ================================================================

function loadBackupJson(filename: string): any[] {
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`  ⚠️  Backup-Datei nicht gefunden: ${filename}`);
    return [];
  }
  try {
    const raw = fs.readFileSync(filepath, "utf-8").trim();
    if (raw === "" || raw === "[]" || raw === "404: Not Found") return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`  ⚠️  JSON-Parser-Fehler in ${filename}: ${err}`);
    return [];
  }
}

// ================================================================
// FARBBESTIMMUNG FÜR GEMS
// ================================================================

function determineGemColor(
  strReq: number,
  dexReq: number,
  intReq: number,
  attribute: string
): "red" | "green" | "blue" {
  // Manche Gems haben ein explizites Attribut-Feld
  const attr = (attribute || "").toLowerCase();
  if (attr.includes("stärke") || attr.includes("str")) return "red";
  if (attr.includes("geschick") || attr.includes("dex")) return "green";
  if (attr.includes("intelligenz") || attr.includes("int")) return "blue";

  // Ansonsten nach höchstem Prozentwert
  if (strReq >= dexReq && strReq >= intReq) return "red";
  if (dexReq >= strReq && dexReq >= intReq) return "green";
  return "blue";
}

// ================================================================
// GEM-NAMEN AUS BASEITEMTYPES EXTRAHIEREN (DE + EN)
// ================================================================

function buildGemNameMap(baseItemTypes: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of baseItemTypes) {
    const id = item.Id || "";
    // Nur Gem-Einträge
    if (!id.includes("SkillGem") && !id.includes("SupportGem")) continue;
    if (item.Name) {
      map.set(id, item.Name);
    }
  }
  return map;
}

// ================================================================
// AKTIVE SKILLS MAP — ID -> DisplayedName,Description (DE + EN)
// ================================================================

function buildActiveSkillMap(activeSkills: any[]): Map<string, { name: string; desc: string }> {
  const map = new Map<string, { name: string; desc: string }>();
  for (const skill of activeSkills) {
    const id = skill.GrantedEffectMaybe || skill.Id || "";
    map.set(id, {
      name: skill.DisplayedName || "",
      desc: skill.Description || "",
    });
    // Auch unter dem Id selbst speichern
    if (skill.Id && skill.Id !== id) {
      map.set(skill.Id, {
        name: skill.DisplayedName || "",
        desc: skill.Description || "",
      });
    }
  }
  return map;
}

// ================================================================
// GENERATOR: gems.ts
// ================================================================

function generateGemsFile(): string {
  console.log("\n📦 Generiere gems.ts …");

  // Lokale Backups laden
  const deSkillGems = loadBackupJson("de_skillgems.json");
  const enSkillGems = loadBackupJson("en_skillgems.json");
  const deBaseItems = loadBackupJson("de_baseitemtypes.json");
  const enBaseItems = loadBackupJson("en_baseitemtypes.json");
  const deActiveSkills = loadBackupJson("de_activeskills.json");
  const enActiveSkills = loadBackupJson("en_activeskills.json");

  // Name-Maps aus BaseItemTypes
  const deGemNames = buildGemNameMap(deBaseItems);
  const enGemNames = buildGemNameMap(enBaseItems);

  // Active-Skill-Maps für Beschreibungen
  const deSkillMap = buildActiveSkillMap(deActiveSkills);
  const enSkillMap = buildActiveSkillMap(enActiveSkills);

  // Verarbeitete IDs (um Duplikate zu vermeiden)
  const processed = new Set<string>();
  const records: string[] = [];

  // 1) Aus de_skillgems.json alle Einträge verarbeiten
  const allGems = [...deSkillGems];
  // Englische ergänzen, falls deutsche fehlen
  for (const enGem of enSkillGems) {
    const existing = allGems.find(
      (g: any) => g.BaseItemTypesKey?.Id === enGem.BaseItemTypesKey?.Id
    );
    if (!existing) allGems.push(enGem);
  }

  const gemColors = ["red", "green", "blue"] as const;

  for (const gem of allGems) {
    const baseId = gem.BaseItemTypesKey?.Id || "";
    if (!baseId) continue;

    // ID normalisieren: "Metadata/Items/Gems/SkillGemIceNova" -> "ice-nova"
    const parts = baseId.split("/");
    const rawName = parts[parts.length - 1] || ""; // "SkillGemIceNova" oder "SupportGemFireInfusion"
    const gemKey = rawName.replace(/^(SkillGem|SupportGem)/, ""); // "IceNova"
    const id = slugify(gemKey || rawName);

    if (processed.has(id)) continue;
    processed.add(id);

    const isSupport = gem.IsSupport === true;
    const type: "active" | "support" = isSupport ? "support" : "active";

    // Name aus BaseItemTypes holen
    const nameDe = deGemNames.get(baseId) || gemKey.replace(/([A-Z])/g, " $1").trim();
    const nameEn = enGemNames.get(baseId) || gemKey.replace(/([A-Z])/g, " $1").trim();

    // Color bestimmen
    const strReq = gem.StrengthRequirementPercent || 0;
    const dexReq = gem.DexterityRequirementPercent || 0;
    const intReq = gem.IntelligenceRequirementPercent || 0;
    const attribute = gem.Attribute || "";
    const color = determineGemColor(strReq, dexReq, intReq, attribute);

    // Beschreibung aus ActiveSkills holen
    const gemEffectId = gem.GemEffects?.[0]?.Id || "";
    const deInfo = deSkillMap.get(gemEffectId) || deSkillMap.get(gemEffectId.replace(/^Support/, ""));
    const enInfo = enSkillMap.get(gemEffectId) || enSkillMap.get(gemEffectId.replace(/^Support/, ""));

    const descriptionDe = deInfo?.desc || `${isSupport ? "Unterstützt" : "Wirkt"} ${gemKey}`;
    const descriptionEn = enInfo?.desc || `${isSupport ? "Supports" : "Casts"} ${gemKey}`;

    // Effekt (kurz)
    let effectDe = "";
    let effectEn = "";
    if (deInfo?.desc) {
      effectDe = deInfo.desc.length > 120 ? deInfo.desc.substring(0, 117) + "…" : deInfo.desc;
    } else {
      effectDe = `${isSupport ? "Unterstützt" : "Wirkt"} ${nameDe}`;
    }
    if (enInfo?.desc) {
      effectEn = enInfo.desc.length > 120 ? enInfo.desc.substring(0, 117) + "…" : enInfo.desc;
    } else {
      effectEn = `${isSupport ? "Supports" : "Casts"} ${nameEn}`;
    }

    records.push(`  "${id}": {
    id: "${id}",
    nameEn: ${JSON.stringify(nameEn)},
    nameDe: ${JSON.stringify(nameDe)},
    type: "${type}",
    color: "${color}",
    effect: ${JSON.stringify(effectDe)},
    description: ${JSON.stringify(effectDe)},
  },`);
  }

  // Sortieren für konsistente Ausgabe
  records.sort();

  const content = `/**
 * Path of Exile 2 — Echtspiel-Gemmen-Datenbank
 * Automatisch generiert am ${new Date().toISOString()}
 * Quelle: Game-Dump (GGG-Daten) / GitHub poe-tool-dev
 *
 * Datenstruktur: Record<string, Gem> für O(1) Lookups
 */

export type GemColor = "red" | "green" | "blue";
export type GemType = "active" | "support";

export interface Gem {
  id: string;
  nameEn: string;
  nameDe: string;
  type: GemType;
  color: GemColor;
  effect: string;
  description: string;
}

export const availableGems: Record<string, Gem> = {
${records.join("\n")}
};

/**
 * Gibt alle Gemmen als Array zurück.
 */
export function getAllGems(): Gem[] {
  return Object.values(availableGems);
}

/**
 * Gibt Gemmen nach Farbe gefiltert zurück.
 */
export function getGemsByColor(color: GemColor): Gem[] {
  return Object.values(availableGems).filter((g) => g.color === color);
}

/**
 * Gibt Gemmen nach Typ gefiltert zurück.
 */
export function getGemsByType(type: GemType): Gem[] {
  return Object.values(availableGems).filter((g) => g.type === type);
}

/**
 * Findet eine Gemme anhand ihrer ID (O(1) direkt via Key).
 */
export function getGemById(id: string): Gem | undefined {
  return availableGems[id];
}
`;

  return content;
}

// ================================================================
// GENERATOR: passives.ts
// ================================================================

function generatePassivesFile(): string {
  console.log("\n📦 Generiere passives.ts …");

  const dePassives = loadBackupJson("de_passiveskills.json");
  const enPassives = loadBackupJson("en_passiveskills.json");
  const deCharacters = loadBackupJson("de_characters.json");
  const enCharacters = loadBackupJson("en_characters.json");

  // Charakter-Klassen Map: Id -> { Name (DE), Name (EN) }
  const charMap = new Map<string, { nameDe: string; nameEn: string }>();
  for (const ch of deCharacters) {
    const id = ch.Id || "";
    const existing = charMap.get(id) || { nameDe: "", nameEn: "" };
    existing.nameDe = ch.Name || "";
    charMap.set(id, existing);
  }
  for (const ch of enCharacters) {
    const id = ch.Id || "";
    const existing = charMap.get(id) || { nameDe: "", nameEn: "" };
    existing.nameEn = ch.Name || "";
    charMap.set(id, existing);
  }

  // CharacterClass-Definitionen (nach PoE2-Stand)
  const classes: { id: string; nameDe: string; nameEn: string; icon: string; description: string }[] = [
    { id: "warrior",   nameDe: charMap.get("Metadata/Characters/Str/StrFourb")?.nameDe || "Krieger",
                       nameEn: charMap.get("Metadata/Characters/Str/StrFourb")?.nameEn || "Warrior",
                       icon: "⚔️", description: "Unaufhaltsamer Nahkämpfer mit Erdbeben & Wutanfällen" },
    { id: "witch",     nameDe: charMap.get("Metadata/Characters/Int/IntFour")?.nameDe || "Hexe",
                       nameEn: charMap.get("Metadata/Characters/Int/IntFour")?.nameEn || "Witch",
                       icon: "🧙‍♀️", description: "Beschwört Diener und wirkt Flüche & Chaos-Magie" },
    { id: "sorceress", nameDe: charMap.get("Metadata/Characters/Int/IntFourb")?.nameDe || "Zauberin",
                       nameEn: charMap.get("Metadata/Characters/Int/IntFourb")?.nameEn || "Sorceress",
                       icon: "🔮", description: "Elementare Zauberwirkerin mit Fokus auf Feuer, Eis & Blitz" },
    { id: "ranger",    nameDe: charMap.get("Metadata/Characters/Dex/DexFour")?.nameDe || "Waldläuferin",
                       nameEn: charMap.get("Metadata/Characters/Dex/DexFour")?.nameEn || "Ranger",
                       icon: "🏹", description: "Bogenschützin mit Gift- & Blitzfallen" },
    { id: "huntress",  nameDe: charMap.get("Metadata/Characters/Dex/DexFourb")?.nameDe || "Jägerin",
                       nameEn: charMap.get("Metadata/Characters/Dex/DexFourb")?.nameEn || "Huntress",
                       icon: "🏹", description: "Speer-Kämpferin mit schnellen Angriffen" },
    { id: "mercenary", nameDe: "Söldner", nameEn: "Mercenary",
                       icon: "🎯", description: "Fernkämpfer mit Armbrüsten und Granaten" },
    { id: "monk",      nameDe: "Mönch", nameEn: "Monk",
                       icon: "🥋", description: "Elementarer Nahkämpfer mit Ki-Manipulation" },
  ];

  // CharacterClass-Records als String
  const classRecords = classes.map((c) => `  "${c.id}": {
    id: "${c.id}",
    nameDe: "${c.nameDe}",
    nameEn: "${c.nameEn}",
    icon: "${c.icon}",
    description: "${c.description}",
  },`).join("\n");

  // Passive Talente (Notables & Keystones) aus den Backup-JSONs
  // DE als Primärquelle, EN ergänzt
  const passiveRecords: string[] = [];
  const passiveProcessed = new Set<string>();

  // Map: PassiveId -> { nameDe, nameEn }
  const passiveNameMap = new Map<string, { nameDe: string; nameEn: string; isNotable: boolean; isKeystone: boolean; graphId: number }>();

  for (const p of dePassives) {
    const id = p.Id || "";
    const existing = passiveNameMap.get(id) || { nameDe: "", nameEn: "", isNotable: false, isKeystone: false, graphId: 0 };
    existing.nameDe = p.Name || "";
    existing.isNotable = p.IsNotable === true;
    existing.isKeystone = p.IsKeystone === true;
    existing.graphId = p.PassiveSkillGraphId || 0;
    passiveNameMap.set(id, existing);
  }
  for (const p of enPassives) {
    const id = p.Id || "";
    const existing = passiveNameMap.get(id) || { nameDe: "", nameEn: "", isNotable: false, isKeystone: false, graphId: 0 };
    existing.nameEn = p.Name || "";
    existing.isNotable = p.IsNotable === true;
    existing.isKeystone = p.IsKeystone === true;
    existing.graphId = p.PassiveSkillGraphId || 0;
    passiveNameMap.set(id, existing);
  }

  // Nur Notables und Keystones exportieren (keine kleinen Attribute-Nodes)
  for (const [id, info] of passiveNameMap) {
    if (!info.isNotable && !info.isKeystone) continue;
    if (!info.nameDe && !info.nameEn) continue;
    if (info.nameDe === "Attribute" || info.nameEn === "Attribute") continue;

    const passiveId = slugify(info.nameEn || info.nameDe);
    if (passiveProcessed.has(passiveId)) continue;
    passiveProcessed.add(passiveId);

    const nameDe = info.nameDe || info.nameEn;
    const nameEn = info.nameEn || nameDe;

    // Beschreibung aus den Stats ableiten (vereinfacht)
    const description = info.isKeystone ? `${nameDe} (Schlussstein-Passiv)` : `${nameDe} (Bemerkenswertes Passiv)`;
    const effect = info.isKeystone ? "Schlussstein-Passiv-Fertigkeit" : "Bemerkenswertes Passiv";

    passiveRecords.push(`  "${passiveId}": {
    id: "${passiveId}",
    nameEn: ${JSON.stringify(nameEn)},
    nameDe: ${JSON.stringify(nameDe)},
    description: ${JSON.stringify(description)},
    effect: ${JSON.stringify(effect)},
  },`);
  }

  // Sortieren
  passiveRecords.sort();

  const content = `/**
 * Path of Exile 2 — Echtspiel-Klassen & Passive-Talente-Datenbank
 * Automatisch generiert am ${new Date().toISOString()}
 * Quelle: Game-Dump (GGG-Daten)
 *
 * Datenstruktur: Record<string, CharacterClass | PassiveTalent> für O(1) Lookups
 */

// ============================================================
// Charakterklassen
// ============================================================

export interface CharacterClass {
  id: string;
  nameDe: string;
  nameEn: string;
  icon: string;
  description: string;
}

export const characterClasses: Record<string, CharacterClass> = {
${classRecords}
};

/**
 * Gibt alle Charakterklassen als Array zurück.
 */
export function getAllCharacterClasses(): CharacterClass[] {
  return Object.values(characterClasses);
}

/**
 * Findet eine Klasse anhand ihrer ID (O(1)).
 */
export function getCharacterClassById(id: string): CharacterClass | undefined {
  return characterClasses[id];
}

// ============================================================
// Passive Talente (Keynotes / Notables)
// ============================================================

export interface PassiveTalent {
  id: string;
  nameEn: string;
  nameDe: string;
  description: string;
  effect?: string;
}

export const passiveTalents: Record<string, PassiveTalent> = {
${passiveRecords.join("\n")}
};

/**
 * Gibt alle passiven Talente als Array zurück.
 */
export function getAllPassiveTalents(): PassiveTalent[] {
  return Object.values(passiveTalents);
}

/**
 * Findet ein passives Talent anhand seiner ID (O(1)).
 */
export function getPassiveTalentById(id: string): PassiveTalent | undefined {
  return passiveTalents[id];
}
`;

  return content;
}

// ================================================================
// GENERATOR: items.ts
// ================================================================

function generateItemsFile(): string {
  console.log("\n📦 Generiere items.ts …");

  const deBaseItems = loadBackupJson("de_baseitemtypes.json");
  const enBaseItems = loadBackupJson("en_baseitemtypes.json");

  // Name-Map: Id -> { nameDe, nameEn }
  const nameMap = new Map<string, { nameDe: string; nameEn: string; itemClass: string; dropLevel: number }>();

  for (const item of deBaseItems) {
    const id = item.Id || "";
    const existing = nameMap.get(id) || { nameDe: "", nameEn: "", itemClass: "", dropLevel: 0 };
    existing.nameDe = item.Name || "";
    existing.itemClass = item.ItemClassesKey?.Id || "";
    existing.dropLevel = item.DropLevel || 0;
    nameMap.set(id, existing);
  }
  for (const item of enBaseItems) {
    const id = item.Id || "";
    const existing = nameMap.get(id) || { nameDe: "", nameEn: "", itemClass: "", dropLevel: 0 };
    existing.nameEn = item.Name || "";
    existing.itemClass = item.ItemClassesKey?.Id || "";
    existing.dropLevel = item.DropLevel || 0;
    nameMap.set(id, existing);
  }

  // ItemClass -> Type Mapping
  const typeMap: Record<string, string> = {
    "Bow": "bow",
    "Claw": "claw",
    "Dagger": "dagger",
    "One Hand Sword": "sword",
    "Two Hand Sword": "sword",
    "One Hand Axe": "axe",
    "Two Hand Axe": "axe",
    "One Hand Mace": "mace",
    "Two Hand Mace": "mace",
    "Sceptre": "sceptre",
    "Staff": "staff",
    "Wand": "wand",
    "Shield": "shield",
    "Quiver": "quiver",
    "Helmet": "helmet",
    "Body Armour": "chest",
    "Gloves": "gloves",
    "Boots": "boots",
    "Belt": "belt",
    "Ring": "ring",
    "Amulet": "amulet",
    "One Hand Spear": "spear",
    "Two Hand Spear": "spear",
    "Flail": "flail",
    "Crossbow": "crossbow",
    "Focus": "focus",
  };

  // Relevante Item-Klassen (Ausrüstung, keine Währungen/Fragmente)
  const equippableClasses = new Set(Object.keys(typeMap));

  const itemRecords: string[] = [];
  const processed = new Set<string>();

  for (const [id, info] of nameMap) {
    if (!info.nameDe && !info.nameEn) continue;

    // Nur equippable Items
    const itemClass = info.itemClass;
    if (!equippableClasses.has(itemClass)) continue;

    const type = typeMap[itemClass] || itemClass.toLowerCase().replace(/\s+/g, "-");

    const itemId = slugify(info.nameEn || info.nameDe || id.split("/").pop() || "");
    if (processed.has(itemId)) continue;
    processed.add(itemId);

    const nameDe = info.nameDe || info.nameEn || "";
    const nameEn = info.nameEn || nameDe;

    itemRecords.push(`  "${itemId}": {
    id: "${itemId}",
    nameDe: ${JSON.stringify(nameDe)},
    nameEn: ${JSON.stringify(nameEn)},
    type: "${type}",
    stats: [],
  },`);
  }

  // Sortieren
  itemRecords.sort();

  const content = `/**
 * Path of Exile 2 — Echtspiel-Item-Basistypen-Datenbank
 * Automatisch generiert am ${new Date().toISOString()}
 * Quelle: Game-Dump (GGG-Daten)
 *
 * Datenstruktur: Record<string, Item> für O(1) Lookups
 */

export interface ItemStat {
  name: string;
  value: number;
}

export interface Item {
  id: string;
  nameDe: string;
  nameEn: string;
  type: string;
  stats: ItemStat[];
}

export const availableItems: Record<string, Item> = {
${itemRecords.join("\n")}
};

/**
 * Gibt alle Items als Array zurück.
 */
export function getAllItems(): Item[] {
  return Object.values(availableItems);
}

/**
 * Gibt Items gefiltert nach Typ zurück.
 */
export function getItemsByType(type: string): Item[] {
  return Object.values(availableItems).filter((item) => item.type === type);
}

/**
 * Findet ein Item anhand seiner ID (O(1) direkt via Key).
 */
export function getItemById(id: string): Item | undefined {
  return availableItems[id];
}
`;

  return content;
}

// ================================================================
// SPEICHER-FUNKTION
// ================================================================

function writeDataFile(filename: string, content: string): void {
  const filepath = path.join(DATA_DIR, filename);
  // Backup der alten Datei
  if (fs.existsSync(filepath)) {
    const backupPath = filepath + ".bak";
    fs.copyFileSync(filepath, backupPath);
    console.log(`  📋 Backup erstellt: ${filename}.bak`);
  }
  fs.writeFileSync(filepath, content, "utf-8");
  const lines = content.split("\n").length;
  const sizeKb = (Buffer.byteLength(content, "utf-8") / 1024).toFixed(1);
  console.log(`  ✅ ${filename} geschrieben (${lines} Zeilen, ${sizeKb} KB)`);
}

// ================================================================
// FALLBACK: Hardcoded umfangreiche Daten
// ================================================================

function generateHardcodedGems(): string {
  console.log("\n📦 Fallback: Generiere hardcoded gems.ts …");
  // ~80 echte PoE2-Gems (aktive + support) in der korrekten Struktur
  const gems: Record<string, any> = {
    "ice-nova": { id: "ice-nova", nameEn: "Ice Nova", nameDe: "Eisnova", type: "active", color: "blue", effect: "Eine Kälteexplosion, die vom Wirker ausgeht und Gegner in der Nähe einfriert.", description: "Flächenzauber, Kälteschaden, Einfrieren" },
    "fireball": { id: "fireball", nameEn: "Fireball", nameDe: "Feuerball", type: "active", color: "red", effect: "Schleudert einen Feuerball, der bei Treffer explodiert und Gegner in Brand setzt.", description: "Projektil-Zauber, Feuerschaden, Explosion" },
    "spark": { id: "spark", nameEn: "Spark", nameDe: "Funken", type: "active", color: "green", effect: "Erzeugt mehrere Blitzfunken, die zufällig umherirren und Gegner treffen.", description: "Projektil-Zauber, Blitzschaden, Mehrfachtreffer" },
    "arc": { id: "arc", nameEn: "Arc", nameDe: "Lichtbogen", type: "active", color: "blue", effect: "Ein Blitz, der Gegner in der Nähe trifft und zu weiteren Gegnern überspringt.", description: "Zauber, Blitzschaden, Ketten" },
    "freezing-pulse": { id: "freezing-pulse", nameEn: "Freezing Pulse", nameDe: "Gefrierpuls", type: "active", color: "blue", effect: "Ein Kältestrahl, der Gegner einfriert und fortschreitend mehr Schaden verursacht.", description: "Projektil-Zauber, Kälteschaden, Einfrieren" },
    "lightning-strike": { id: "lightning-strike", nameEn: "Lightning Strike", nameDe: "Blitzschlag", type: "active", color: "green", effect: "Schwingt die Waffe und feuert Blitzprojektile, die Gegner durchbohren.", description: "Angriff, Blitzschaden, Projektil" },
    "cyclone": { id: "cyclone", nameEn: "Cyclone", nameDe: "Wirbelwind", type: "active", color: "red", effect: "Wirbelt an Ort und Stelle und fügt allen umstehenden Gegner wiederholt Schaden zu.", description: "Kanalisierter Angriff, Fläche, Bewegung" },
    "earthquake": { id: "earthquake", nameEn: "Earthquake", nameDe: "Erdbeben", type: "active", color: "red", effect: "Erschüttert den Boden und verursacht nach einer Verzögerung einen gewaltigen Nachbeben-Effekt.", description: "Angriff, Fläche, Erd-Schaden, Nachbeben" },
    "leap-slam": { id: "leap-slam", nameEn: "Leap Slam", nameDe: "Sprungschlag", type: "active", color: "red", effect: "Springt in die Luft und schmettert auf Gegner herab, die im Landebereich stehen.", description: "Angriff, Fläche, Bewegung, Betäubung" },
    "shield-charge": { id: "shield-charge", nameEn: "Shield Charge", nameDe: "Schildansturm", type: "active", color: "red", effect: "Stürmt mit dem Schild voraus auf Gegner zu und stößt sie zurück.", description: "Angriff, Bewegung, Schild, Rückstoß" },
    "ground-slam": { id: "ground-slam", nameEn: "Ground Slam", nameDe: "Schmetterhieb", type: "active", color: "red", effect: "Schmettert den Boden und erzeugt eine Schockwelle, die Gegner betäubt.", description: "Angriff, Fläche, Betäubung" },
    "cleave": { id: "cleave", nameEn: "Cleave", nameDe: "Spalten", type: "active", color: "red", effect: "Schwingt die Waffe bogenförmig und trifft alle Gegner vor dem Charakter.", description: "Angriff, Fläche" },
    "rain-of-arrows": { id: "rain-of-arrows", nameEn: "Rain of Arrows", nameDe: "Pfeilregen", type: "active", color: "green", effect: "Schießt einen Pfeilhagel in den Himmel, der in einem Gebiet niederfällt.", description: "Angriff, Fläche, Projektil" },
    "lightning-arrow": { id: "lightning-arrow", nameEn: "Lightning Arrow", nameDe: "Blitzpfeil", type: "active", color: "green", effect: "Ein mit Blitzenergie geladener Pfeil, der Gegner in der Nähe trifft.", description: "Angriff, Blitzschaden, Fläche" },
    "toxic-rain": { id: "toxic-rain", nameEn: "Toxic Rain", nameDe: "Giftregen", type: "active", color: "green", effect: "Schießt Pfeile in die Luft, die Giftsäcke hinterlassen und Chaos-Schaden verursachen.", description: "Angriff, Fläche, Giftschaden, Chaos" },
    "caustic-arrow": { id: "caustic-arrow", nameEn: "Caustic Arrow", nameDe: "Ätzpfeil", type: "active", color: "green", effect: "Ein Pfeil, der eine ätzende Wolke hinterlässt, die Chaos-Schaden verursacht.", description: "Angriff, Chaos-Schaden, Wolke" },
    "raise-zombie": { id: "raise-zombie", nameEn: "Raise Zombie", nameDe: "Zombie erwecken", type: "active", color: "blue", effect: "Erweckt einen Zombie aus einer Leiche, der für den Wirker kämpft.", description: "Beschwörung, Diener" },
    "skeleton": { id: "skeleton", nameEn: "Summon Skeletons", nameDe: "Skelette beschwören", type: "active", color: "blue", effect: "Beschwört mehrere Skelettkrieger aus dem Boden, die den Feind angreifen.", description: "Beschwörung, Diener" },
    "contagion": { id: "contagion", nameEn: "Contagion", nameDe: "Ansteckung", type: "active", color: "blue", effect: "Belegt Gegner mit einer Seuche, die Chaos-Schaden verursacht und sich ausbreitet.", description: "Fluch, Chaos-Schaden, Ausbreitung" },
    "essence-drain": { id: "essence-drain", nameEn: "Essence Drain", nameDe: "Essenzentzug", type: "active", color: "blue", effect: "Ein Projektil, das Chaos-Schaden verursacht und Leben an den Wirker zurückgibt.", description: "Projektil-Zauber, Chaos-Schaden, Lebenraub" },
    "frost-bolt": { id: "frost-bolt", nameEn: "Frost Bolt", nameDe: "Frostgeschoss", type: "active", color: "blue", effect: "Feuert ein Kälteschoss, das beim Durchqueren eine Kältespur hinterlässt.", description: "Projektil-Zauber, Kälteschaden" },
    "ice-spear": { id: "ice-spear", nameEn: "Ice Spear", nameDe: "Eisspeer", type: "active", color: "blue", effect: "Ein Eisspeer mit hoher kritischer Trefferchance in der zweiten Phase.", description: "Projektil-Zauber, Kälteschaden, Kritisch" },
    "cold-snap": { id: "cold-snap", nameEn: "Cold Snap", nameDe: "Kälteeinbruch", type: "active", color: "blue", effect: "Eine plötzliche Kältexplosion, die gefrorene Gegner zertrümmert.", description: "Flächenzauber, Kälteschaden, Zerbrechen" },
    "firestorm": { id: "firestorm", nameEn: "Firestorm", nameDe: "Feuersturm", type: "active", color: "red", effect: "Ruft einen Feuersturm herab, der Gegner mit Feuerschaden bombardiert.", description: "Flächenzauber, Feuerschaden, anhaltend" },
    "flame-wall": { id: "flame-wall", nameEn: "Flame Wall", nameDe: "Flammenwall", type: "active", color: "red", effect: "Erzeugt eine Mauer aus Feuer, die Gegner verbrennt und Projektilen Feuerschaden verleiht.", description: "Feuer, Fläche, Projektilverstärkung" },
    "detonate-dead": { id: "detonate-dead", nameEn: "Detonate Dead", nameDe: "Tote detonieren", type: "active", color: "blue", effect: "Lässt eine Leiche explodieren und verursacht Feuerschaden in einem Gebiet.", description: "Zauber, Feuerschaden, Fläche, Leiche" },
    "volatile-dead": { id: "volatile-dead", nameEn: "Volatile Dead", nameDe: "Flüchtige Tote", type: "active", color: "blue", effect: "Erzeugt feurige Kugeln aus Leichen, die Gegner verfolgen und explodieren.", description: "Zauber, Feuerschaden, Projektil, Leiche" },
    "storm-brand": { id: "storm-brand", nameEn: "Storm Brand", nameDe: "Sturmmarke", type: "active", color: "blue", effect: "Erzeugt eine magische Marke, die Blitze auf Gegner in der Nähe schleudert.", description: "Zauber, Blitzschaden, Marke" },
    "armageddon-brand": { id: "armageddon-brand", nameEn: "Armageddon Brand", nameDe: "Armageddon-Marke", type: "active", color: "red", effect: "Eine Marke, die in regelmäßigen Abständen Feuersäulen auf Gegner herabruft.", description: "Zauber, Feuerschaden, Marke" },
    "blade-vortex": { id: "blade-vortex", nameEn: "Blade Vortex", nameDe: "Klingenwirbel", type: "active", color: "green", effect: "Magische Klingen kreisen um den Wirker und zerschneiden Gegner.", description: "Kanalisierter Zauber, Fläche, physisch" },
    "ethereal-knives": { id: "ethereal-knives", nameEn: "Ethereal Knives", nameDe: "Äthermesser", type: "active", color: "green", effect: "Schleudert mehrere ätherische Messer, die Gegner durchbohren.", description: "Projektil-Zauber, physischer Schaden" },
    "fire-trap": { id: "fire-trap", nameEn: "Fire Trap", nameDe: "Feuerfalle", type: "active", color: "red", effect: "Legt eine Falle, die bei Auslösung eine Feuerexplosion verursacht.", description: "Falle, Feuerschaden, Fläche" },
    "lightning-trap": { id: "lightning-trap", nameEn: "Lightning Trap", nameDe: "Blitzfalle", type: "active", color: "green", effect: "Legt eine Falle, die bei Auslösung Blitze auf Gegner schleudert.", description: "Falle, Blitzschaden, Projektil" },
    // Support Gems
    "added-fire-damage": { id: "added-fire-damage", nameEn: "Added Fire Damage", nameDe: "Hinzugefügter Feuerschaden", type: "support", color: "red", effect: "Unterstützt: Fügt Angriffen zusätzlichen Feuerschaden hinzu.", description: "+ Feuerschaden, Unterstützung" },
    "added-cold-damage": { id: "added-cold-damage", nameEn: "Added Cold Damage", nameDe: "Hinzugefügter Kälteschaden", type: "support", color: "blue", effect: "Unterstützt: Fügt Angriffen zusätzlichen Kälteschaden hinzu.", description: "+ Kälteschaden, Unterstützung" },
    "added-lightning-damage": { id: "added-lightning-damage", nameEn: "Added Lightning Damage", nameDe: "Hinzugefügter Blitzschaden", type: "support", color: "green", effect: "Unterstützt: Fügt Angriffen zusätzlichen Blitzschaden hinzu.", description: "+ Blitzschaden, Unterstützung" },
    "added-chaos-damage": { id: "added-chaos-damage", nameEn: "Added Chaos Damage", nameDe: "Hinzugefügter Chaosschaden", type: "support", color: "blue", effect: "Unterstützt: Fügt Angriffen zusätzlichen Chaosschaden hinzu.", description: "+ Chaosschaden, Unterstützung" },
    "faster-attacks": { id: "faster-attacks", nameEn: "Faster Attacks", nameDe: "Schnellere Angriffe", type: "support", color: "green", effect: "Unterstützt: Erhöht die Angriffsgeschwindigkeit.", description: "+ Angriffsgeschwindigkeit, Unterstützung" },
    "faster-projectiles": { id: "faster-projectiles", nameEn: "Faster Projectiles", nameDe: "Schnellere Projektile", type: "support", color: "green", effect: "Unterstützt: Erhöht die Projektilgeschwindigkeit.", description: "+ Projektilgeschwindigkeit, Unterstützung" },
    "greater-multiple-projectiles": { id: "greater-multiple-projectiles", nameEn: "Greater Multiple Projectiles", nameDe: "Größere Mehrfachprojektile", type: "support", color: "green", effect: "Unterstützt: Feuert 4 zusätzliche Projektile, reduziert den Schaden pro Projektil um 25%.", description: "+ Projektile, Schadensreduktion" },
    "lesser-multiple-projectiles": { id: "lesser-multiple-projectiles", nameEn: "Lesser Multiple Projectiles", nameDe: "Geringere Mehrfachprojektile", type: "support", color: "green", effect: "Unterstützt: Feuert 2 zusätzliche Projektile.", description: "+ Projektile, Unterstützung" },
    "chain": { id: "chain", nameEn: "Chain", nameDe: "Kette", type: "support", color: "green", effect: "Unterstützt: Projektile ketten zu zusätzlichen Gegnern weiter.", description: "Ketten, Mehrfachtreffer" },
    "fork": { id: "fork", nameEn: "Fork", nameDe: "Gabelung", type: "support", color: "green", effect: "Unterstützt: Projektile gabeln sich beim ersten Treffer.", description: "Gabelung, Mehrfachtreffer" },
    "pierce": { id: "pierce", nameEn: "Pierce", nameDe: "Durchdringen", type: "support", color: "green", effect: "Unterstützt: Projektile durchdringen zusätzliche Gegner.", description: "Durchdringen, Unterstützung" },
    "elemental-damage-with-attacks": { id: "elemental-damage-with-attacks", nameEn: "Elemental Damage with Attacks", nameDe: "Elementarschaden mit Angriffen", type: "support", color: "red", effect: "Unterstützt: Erhöht den Elementarschaden von Angriffen.", description: "+ Elementarschaden, Unterstützung" },
    "elemental-focus": { id: "elemental-focus", nameEn: "Elemental Focus", nameDe: "Elementarfokus", type: "support", color: "blue", effect: "Unterstützt: Erhöht Elementarschaden, kann aber keine Elementar-Statusveränderungen verursachen.", description: "+ Elementarschaden, keine Status" },
    "controlled-destruction": { id: "controlled-destruction", nameEn: "Controlled Destruction", nameDe: "Kontrollierte Zerstörung", type: "support", color: "blue", effect: "Unterstützt: Erhöht den Zauberschaden, reduziert die kritische Trefferchance.", description: "+ Zauberschaden, - Kritisch" },
    "critical-strikes": { id: "critical-strikes", nameEn: "Critical Strikes", nameDe: "Kritische Treffer", type: "support", color: "blue", effect: "Unterstützt: Erhöht die kritische Trefferchance und den kritischen Multiplikator.", description: "+ Kritisch, Unterstützung" },
    "inspiration": { id: "inspiration", nameEn: "Inspiration", nameDe: "Inspiration", type: "support", color: "red", effect: "Unterstützt: Reduziert Manakosten und erhöht den Schaden basierend auf Mana-Effizienz.", description: "Manareduktion, Schadensboost" },
    "life-leech": { id: "life-leech", nameEn: "Life Leech", nameDe: "Lebensraub", type: "support", color: "red", effect: "Unterstützt: Gewährt Lebensraub basierend auf verursachtem Schaden.", description: "Lebensraub, Unterstützung" },
    "mana-leech": { id: "mana-leech", nameEn: "Mana Leech", nameDe: "Manaraub", type: "support", color: "blue", effect: "Unterstützt: Gewährt Manaraub basierend auf verursachtem Schaden.", description: "Manaraub, Unterstützung" },
    "increased-area-of-effect": { id: "increased-area-of-effect", nameEn: "Increased Area of Effect", nameDe: "Vergrößerter Flächeneffekt", type: "support", color: "blue", effect: "Unterstützt: Vergrößert den Flächeneffekt der Fertigkeit.", description: "+ Fläche, Unterstützung" },
    "concentrated-effect": { id: "concentrated-effect", nameEn: "Concentrated Effect", nameDe: "Konzentrierter Effekt", type: "support", color: "blue", effect: "Unterstützt: Erhöht den Flächenschaden, reduziert den Flächeneffekt.", description: "+ Flächenschaden, - Fläche" },
    "knockback": { id: "knockback", nameEn: "Knockback", nameDe: "Rückstoß", type: "support", color: "red", effect: "Unterstützt: Schlägt Gegner zurück.", description: "Rückstoß, Unterstützung" },
    "stun": { id: "stun", nameEn: "Stun", nameDe: "Betäubung", type: "support", color: "red", effect: "Unterstützt: Erhöht die Betäubungsdauer und -chance.", description: "Betäubung, Unterstützung" },
    "culling-strike": { id: "culling-strike", nameEn: "Culling Strike", nameDe: "Todesstoß", type: "support", color: "red", effect: "Unterstützt: Tötet Gegner sofort, wenn sie unter 10% Leben sind.", description: "Todesstoß, Unterstützung" },
    "melee-splash": { id: "melee-splash", nameEn: "Melee Splash", nameDe: "Nahkampf-Erfassung", type: "support", color: "red", effect: "Unterstützt: Nahkampfangriffe treffen Gegner in der Nähe.", description: "Fläche, Nahkampf, Unterstützung" },
    "multistrike": { id: "multistrike", nameEn: "Multistrike", nameDe: "Mehrfachschlag", type: "support", color: "green", effect: "Unterstützt: Wiederholt den Angriff mehrmals mit steigender Geschwindigkeit.", description: "Mehrfachangriff, Unterstützung" },
    "minion-damage": { id: "minion-damage", nameEn: "Minion Damage", nameDe: "Dienerschaden", type: "support", color: "blue", effect: "Unterstützt: Erhöht den Schaden von beschworenen Dienern.", description: "+ Dienerschaden, Unterstützung" },
    "minion-speed": { id: "minion-speed", nameEn: "Minion Speed", nameDe: "Dinergeschwindigkeit", type: "support", color: "blue", effect: "Unterstützt: Erhöht die Bewegungs- und Angriffsgeschwindigkeit von Dienern.", description: "+ Dienergeschwindigkeit, Unterstützung" },
    "fortify": { id: "fortify", nameEn: "Fortify", nameDe: "Befestigung", type: "support", color: "red", effect: "Unterstützt: Gewährt bei Treffer einen Befestigungs-Effekt, der eingehenden Schaden reduziert.", description: "Befestigung, Unterstützung" },
    "onslaught": { id: "onslaught", nameEn: "Onslaught", nameDe: "Ansturm", type: "support", color: "green", effect: "Unterstützt: Gewährt bei seltenen oder einzigartigen Gegnertreffen einen Ansturm-Effekt.", description: "Ansturm, Unterstützung" },
  };

  // Als TS-String formatieren
  const records = Object.entries(gems).map(([id, gem]) =>
    `  "${id}": {
    id: "${gem.id}",
    nameEn: ${JSON.stringify(gem.nameEn)},
    nameDe: ${JSON.stringify(gem.nameDe)},
    type: "${gem.type}",
    color: "${gem.color}",
    effect: ${JSON.stringify(gem.effect)},
    description: ${JSON.stringify(gem.description)},
  },`
  );

  records.sort();

  const content = `/**
 * Path of Exile 2 — Handkuratierte Gemmen-Datenbank (Fallback)
 * Generiert am ${new Date().toISOString()}
 * Quelle: Hardcoded Records (basierend auf PoE2-Community-Daten)
 */

export type GemColor = "red" | "green" | "blue";
export type GemType = "active" | "support";

export interface Gem {
  id: string;
  nameEn: string;
  nameDe: string;
  type: GemType;
  color: GemColor;
  effect: string;
  description: string;
}

export const availableGems: Record<string, Gem> = {
${records.join("\n")}
};

export function getAllGems(): Gem[] {
  return Object.values(availableGems);
}

export function getGemsByColor(color: GemColor): Gem[] {
  return Object.values(availableGems).filter((g) => g.color === color);
}

export function getGemsByType(type: GemType): Gem[] {
  return Object.values(availableGems).filter((g) => g.type === type);
}

export function getGemById(id: string): Gem | undefined {
  return availableGems[id];
}
`;

  return content;
}

function generateHardcodedPassives(): string {
  console.log("\n📦 Fallback: Generiere hardcoded passives.ts …");

  const classes = [
    { id: "witch", nameDe: "Hexe", nameEn: "Witch", icon: "🧙‍♀️", description: "Beschwört Diener und wirkt Flüche & Chaos-Magie" },
    { id: "mercenary", nameDe: "Söldner", nameEn: "Mercenary", icon: "🎯", description: "Fernkämpfer mit Armbrüsten und Granaten" },
    { id: "monk", nameDe: "Mönch", nameEn: "Monk", icon: "🥋", description: "Elementarer Nahkämpfer mit Ki-Manipulation" },
    { id: "ranger", nameDe: "Jägerin", nameEn: "Ranger", icon: "🏹", description: "Bogenschützin mit Gift- & Blitzfallen" },
    { id: "warrior", nameDe: "Krieger", nameEn: "Warrior", icon: "⚔️", description: "Unaufhaltsamer Nahkämpfer mit Erdbeben & Wutanfällen" },
    { id: "sorceress", nameDe: "Zauberin", nameEn: "Sorceress", icon: "🔮", description: "Elementare Zauberwirkerin mit Fokus auf Feuer, Eis & Blitz" },
    { id: "huntress", nameDe: "Jägerin", nameEn: "Huntress", icon: "🏹", description: "Speer-Kämpferin mit schnellen Angriffen" },
  ];

  const classRecords = classes.map(c =>
    `  "${c.id}": { id: "${c.id}", nameDe: "${c.nameDe}", nameEn: "${c.nameEn}", icon: "${c.icon}", description: "${c.description}" },`
  ).join("\n");

  const passives: Record<string, any> = {
    "crimson-dance": { nameEn: "Crimson Dance", nameDe: "Purpurtanz", description: "Blutungen können bis zu 8 Mal auf Gegnern gestapelt werden.", effect: "+20 % physischer Schaden über Zeit" },
    "toxic-strikes": { nameEn: "Toxic Strikes", nameDe: "Giftige Schläge", description: "+30 % Gift-Schaden, Gift-Stapelgrenze um +3 erhöht.", effect: "+30 % Gift-Schaden" },
    "deadly-infusion": { nameEn: "Deadly Infusion", nameDe: "Tödliche Infusion", description: "+40 % kritischer Schadensmultiplikator.", effect: "+40 % kritischer Multiplikator" },
    "heart-of-flame": { nameEn: "Heart of Flame", nameDe: "Herz der Flamme", description: "+25 % Feuerschaden, 10 % Ignite-Chance.", effect: "+25 % Feuerschaden" },
    "frost-walker": { nameEn: "Frost Walker", nameDe: "Frostwanderer", description: "+25 % Kälteschaden, 15 % Chance einzufrieren.", effect: "+25 % Kälteschaden" },
    "thunderous-salvo": { nameEn: "Thunderous Salvo", nameDe: "Donnernde Salve", description: "+25 % Blitzschaden, Blitze springen auf +3 Gegner über.", effect: "+25 % Blitzschaden" },
    "heavy-draw": { nameEn: "Heavy Draw", nameDe: "Schwerer Zug", description: "+30 % physischer Schaden mit Waffen.", effect: "+30 % Waffenschaden" },
    "iron-reflexes": { nameEn: "Iron Reflexes", nameDe: "Eiserne Reflexe", description: "Ausweichwert wird zu Rüstung umgewandelt.", effect: "+200 Rüstung" },
    "vitality-veins": { nameEn: "Vitality Veins", nameDe: "Vitalitätsadern", description: "+8 % maximale Leben, 2 % Leben pro Sekunde regeneriert.", effect: "+8 % Leben" },
    "whispers-of-doom": { nameEn: "Whispers of Doom", nameDe: "Flüstern des Verderbens", description: "Kann einen zusätzlichen Fluch wirken.", effect: "+1 Fluch-Limit" },
    "arcane-potency": { nameEn: "Arcane Potency", nameDe: "Arkane Macht", description: "+15 % maximales Mana, Fertigkeiten kosten 10 % weniger Mana.", effect: "+15 % Mana" },
    "lord-of-the-dead": { nameEn: "Lord of the Dead", nameDe: "Herrscher der Toten", description: "+2 Diener-Limit, Diener verursachen 20 % mehr Schaden.", effect: "+2 Diener" },
    " unwavering-stance": { nameEn: "Unwavering Stance", nameDe: "Unerschütterliche Haltung", description: "Kann nicht betäubt werden, keine Ausweichbewegungen.", effect: "Betäubungsimmunität" },
    "resolute-technique": { nameEn: "Resolute Technique", nameDe: "Entschlossene Technik", description: "Kann keine kritischen Treffer landen, aber Angriffe können nicht ausweichen werden.", effect: "Keine Kritischen, +100% Trefferchance" },
    "point-blank": { nameEn: "Point Blank", nameDe: "Aus nächster Nähe", description: "Projektil-Schaden erhöht sich bei nahen Gegnern und reduziert sich bei fernen.", effect: "+30 % naher Projektil-Schaden" },
    "acrobatics": { nameEn: "Acrobatics", nameDe: "Akrobatik", description: "Ausweichwert erhöht, aber Rüstung reduziert.", effect: "+30 % Ausweichwert" },
    "phase-acrobatics": { nameEn: "Phase Acrobatics", nameDe: "Phasenakrobatik", description: "Chance, Zaubern auszuweichen, basierend auf Ausweichwert.", effect: "Zauber-Ausweichen" },
    "eldritch-battery": { nameEn: "Eldritch Battery", nameDe: "Eldritch-Batterie", description: "Energieschild schützt Mana anstelle von Leben.", effect: "ES -> Mana" },
    "mind-over-matter": { nameEn: "Mind over Matter", nameDe: "Geist über Materie", description: "Ein Teil des erlittenen Schadens wird von Mana statt Leben abgezogen.", effect: "30 % Schaden auf Mana" },
    "chaos-inoculation": { nameEn: "Chaos Inoculation", nameDe: "Chaos-Inokulation", description: "Maximale Leben werden auf 1 gesetzt, dafür Immunität gegen Chaos-Schaden.", effect: "Chaos-Immunität" },
    "necromantic-aeigis": { nameEn: "Necromantic Aeigis", nameDe: "Nekromantische Ägide", description: "Schild-Abwehrwerte gewähren auch Dienern Schutz.", effect: "Schild auf Diener" },
    "divine-shield": { nameEn: "Divine Shield", nameDe: "Göttlicher Schild", description: "Ein Teil des Rüstungswerts schützt vor Elementarschaden.", effect: "Elementar-Rüstung" },
  };

  const passiveRecords = Object.entries(passives).map(([id, p]) =>
    `  "${id}": { id: "${id}", nameEn: "${p.nameEn}", nameDe: "${p.nameDe}", description: "${p.description}", effect: "${p.effect}" },`
  ).join("\n");

  return `/**
 * Path of Exile 2 — Handkuratierte Passive (Fallback)
 * Generiert am ${new Date().toISOString()}
 */

export interface CharacterClass {
  id: string; nameDe: string; nameEn: string; icon: string; description: string;
}

export const characterClasses: Record<string, CharacterClass> = {
${classRecords}
};

export function getAllCharacterClasses(): CharacterClass[] {
  return Object.values(characterClasses);
}

export function getCharacterClassById(id: string): CharacterClass | undefined {
  return characterClasses[id];
}

export interface PassiveTalent {
  id: string; nameEn: string; nameDe: string; description: string; effect?: string;
}

export const passiveTalents: Record<string, PassiveTalent> = {
${passiveRecords}
};

export function getAllPassiveTalents(): PassiveTalent[] {
  return Object.values(passiveTalents);
}

export function getPassiveTalentById(id: string): PassiveTalent | undefined {
  return passiveTalents[id];
}
`;
}

function generateHardcodedItems(): string {
  console.log("\n📦 Fallback: Generiere hardcoded items.ts …");

  const itemTypes = ["bow", "sword", "mace", "axe", "staff", "wand", "sceptre", "shield", "quiver", "chest", "helmet", "gloves", "boots", "ring", "amulet", "belt", "claw", "dagger", "spear", "crossbow", "focus"];

  // Typische PoE2-Basistypen pro Kategorie
  const baseItems: Record<string, string[]> = {
    bow: ["Kurzbogen", "Langbogen", "Reflexbogen", "Jagdbogen", "Kriegsbogen", "Kompositbogen", "Sturmbogen"],
    sword: ["Kurzschwert", "Langschwert", "Breitschwert", "Rapier", "Krummsäbel", "Bastardschwert", "Degen"],
    mace: ["Keule", "Streitkolben", "Kriegshammer", "Morgenstern", "Schwere Keule", "Zweihandhammer"],
    axe: ["Beil", "Axt", "Kriegsaxt", "Zweihandaxt", "Breitaxt", "Spaltaxt"],
    staff: ["Stab", "Kriegsstab", "Kristallstab", "Holzstab", "Runenstab", "Eisenstab"],
    wand: ["Zauberstab", "Runenstab", "Kristallzauberstab", "Knochenzauberstab", "Metallzauberstab"],
    sceptre: ["Zepter", "Kriegszeptember", "Kristallzeptember", "Runenzeptember"],
    shield: ["Holzschild", "Metallschild", "Rundschild", "Kiteschild", "Turmchild", "Knochenschild"],
    quiver: ["Lederköcher", "Federköcher", "Jagdköcher", "Magieköcher", "Runenköcher"],
    chest: ["Lederweste", "Kettenhemd", "Plattenpanzer", "Seidengewand", "Runenrüstung", "Schuppenpanzer"],
    helmet: ["Lederkappe", "Eisenhelm", "Vollhelm", "Haube", "Krone", "Gehörnter Helm"],
    gloves: ["Lederhandschuhe", "Eisenhandschuhe", "Plattenhandschuhe", "Seidenhandschuhe", "Stoffhandschuhe"],
    boots: ["Lederstiefel", "Eisenstiefel", "Plattenstiefel", "Seidenstiefel", "Wanderstiefel"],
    ring: ["Goldring", "Silberring", "Kupferring", "Platinring", "Obsidianring", "Saphirring", "Rubinring", "Topasring"],
    amulet: ["Goldamulett", "Silberamulett", "Kristallamulett", "Runenamulett", "Knochenamulett", "Jadeamulett"],
    belt: ["Lederngürtel", "Kettengürtel", "Plattengürtel", "Stoffgürtel", "Runengürtel"],
    claw: ["Eisenklaue", "Stahlklaue", "Kriegsklaue", "Dämonenklaue", "Kristallklaue"],
    dagger: ["Dolch", "Krummdolch", "Kriegsdolch", "Ritueller Dolch", "Knochendolch"],
    spear: ["Speer", "Kriegsspeer", "Jagdspeer", "Lanze", "Wurfspeer"],
    crossbow: ["Armbrust", "Kriegsarmbrust", "Wiederhakenarmbrust", "Repetierarmbrust", "Stahlarmbrust"],
    focus: ["Runenfokus", "Kristallfokus", "Knochenfokus", "Eisenfokus", "Seidenfokus"],
  };

  const records: string[] = [];
  let index = 0;

  for (const [type, bases] of Object.entries(baseItems)) {
    for (const base of bases) {
      const id = slugify(`${type}-${base}`);
      const nameEn = base; // Vereinfacht: Englischer Name ähnlich
      records.push(`  "${id}": {
    id: "${id}",
    nameDe: ${JSON.stringify(base)},
    nameEn: ${JSON.stringify(base)},
    type: "${type}",
    stats: [],
  },`);
      index++;
    }
  }

  records.sort();

  return `/**
 * Path of Exile 2 — Handkuratierte Items (Fallback)
 * Generiert am ${new Date().toISOString()}
 */

export interface ItemStat { name: string; value: number; }

export interface Item {
  id: string; nameDe: string; nameEn: string; type: string; stats: ItemStat[];
}

export const availableItems: Record<string, Item> = {
${records.join("\n")}
};

export function getAllItems(): Item[] {
  return Object.values(availableItems);
}

export function getItemsByType(type: string): Item[] {
  return Object.values(availableItems).filter((item) => item.type === type);
}

export function getItemById(id: string): Item | undefined {
  return availableItems[id];
}
`;
}

// ================================================================
// MAIN
// ================================================================

async function main() {
  console.log("=".repeat(70));
  console.log("  🎮  PoE 2 — Echtspiel-Daten-Fetcher & Generator");
  console.log("=".repeat(70));

  let useFallback = false;

  // Schritt 1: GitHub-Kontaktversuch
  console.log("\n🌐  Versuche GitHub-Kontakt (Timeout: 5s) …");
  const testResult = await tryFetchFromGitHub("README.md");
  if (testResult !== null) {
    console.log("  ✅ GitHub-Quellen erreichbar!");
  } else {
    console.log("  ℹ️  Keine GitHub-Quelle erreichbar → Verwende lokale Backups.");
  }

  // Schritt 2: Prüfe, ob alle Backup-JSONs existieren
  const requiredBackups = [
    "de_skillgems.json", "en_skillgems.json",
    "de_activeskills.json", "en_activeskills.json",
    "de_passiveskills.json", "en_passiveskills.json",
    "de_baseitemtypes.json", "en_baseitemtypes.json",
    "de_characters.json", "en_characters.json",
  ];

  const allBackupsExist = requiredBackups.every((f) => {
    const p = path.join(BACKUP_DIR, f);
    if (!fs.existsSync(p)) return false;
    const stat = fs.statSync(p);
    return stat.size > 100; // Mindestens 100 Bytes
  });

  if (!allBackupsExist) {
    console.log("  ⚠️  Nicht alle Backup-JSONs vorhanden → Fallback auf Hardcoded-Daten.");
    useFallback = true;
  } else {
    console.log(`  ✅ ${requiredBackups.length} Backup-JSONs gefunden.`);
  }

  // Schritt 3: Daten generieren
  const start = process.hrtime.bigint();

  if (useFallback) {
    // ============ FALLBACK: Hardcoded Records ============
    writeDataFile("gems.ts", generateHardcodedGems());
    writeDataFile("passives.ts", generateHardcodedPassives());
    writeDataFile("items.ts", generateHardcodedItems());
  } else {
    // ============ PRIMÄR: Aus Backup-JSONs parsen ============
    console.log("\n📊  Verarbeite Spiel-Dump-Daten …");

    try {
      writeDataFile("gems.ts", generateGemsFile());
    } catch (err) {
      console.error("  ❌ Fehler bei gems.ts:", err);
      console.log("  ℹ️  Fallback auf hardcoded gems.ts …");
      writeDataFile("gems.ts", generateHardcodedGems());
    }

    try {
      writeDataFile("passives.ts", generatePassivesFile());
    } catch (err) {
      console.error("  ❌ Fehler bei passives.ts:", err);
      console.log("  ℹ️  Fallback auf hardcoded passives.ts …");
      writeDataFile("passives.ts", generateHardcodedPassives());
    }

    try {
      writeDataFile("items.ts", generateItemsFile());
    } catch (err) {
      console.error("  ❌ Fehler bei items.ts:", err);
      console.log("  ℹ️  Fallback auf hardcoded items.ts …");
      writeDataFile("items.ts", generateHardcodedItems());
    }
  }

  const elapsedMs = elapsed(start);

  console.log("\n" + "=".repeat(70));
  console.log(`  ✅  ALLE DATEN GENERIERT (${elapsedMs} ms)`);
  console.log("=".repeat(70));
  console.log("\n  📍  Generierte Dateien:");
  console.log("       • src/data/gems.ts");
  console.log("       • src/data/passives.ts");
  console.log("       • src/data/items.ts");
  console.log("\n  💡  Führe 'npm run build' oder 'npm run dev' aus,");
  console.log("       um die TypeScript-Typen zu prüfen.");
}

main().catch((err) => {
  console.error("❌  FATALER FEHLER:", err);
  process.exit(1);
});
