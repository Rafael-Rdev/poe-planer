/**
 * PoB-XML-Parser
 *
 * Parst den dekomprimierten Path of Building (PoB) XML-String
 * und extrahiert:
 *   - Charakterklasse
 *   - Gelernte passive Talente (Nodes)
 *   - Aktive Gemmen + Support-Gemmen (Skills)
 *   - Ausgerüstete Items (Ausrüstungs-Slots)
 *
 * Alle extrahierten Werte werden auf die IDs unserer lokalen
 * Datenbank (gems.ts, passives.ts, items.ts) gemappt.
 */

import {
  getAllGems,
  type Gem,
} from "@/data/gems";
import {
  getAllCharacterClasses,
  getAllPassiveTalents,
  type CharacterClass,
  type PassiveTalent,
} from "@/data/passives";
import {
  getAllItems,
  type Item,
} from "@/data/items";
import type { SocketData, EquipmentSlots } from "@/context/buildStore";

// ============================================================
// Ergebnis-Typ
// ============================================================

export interface PobParseResult {
  characterClass: string | null;
  sockets: SocketData[];
  selectedPassives: string[];
  equipment: EquipmentSlots;
}

// ============================================================
// Lookup-Maps (name → id) für effizientes Matching
// Lazy-Initialisierung mit Singleton-Pattern zur Speicheroptimierung
// ============================================================

// Singleton-Pattern mit Lazy-Initialisierung
let lookupMapsInitialized = false;
let gemNameToId: Map<string, string>;
let gemIdSet: Set<string>;
let passiveNameToId: Map<string, string>;
let itemNameToItem: Map<string, Item>;
let classNameToId: Map<string, string>;

/**
 * Gibt die initialisierten Lookup-Maps zurück oder initialisiert sie bei Bedarf.
 * Verwendet Lazy-Initialisierung, um Speicherleaks in Serverless-Umgebungen zu vermeiden.
 */
function getLookupMaps() {
  if (!lookupMapsInitialized) {
    gemNameToId = new Map();
    gemIdSet = new Set();
    passiveNameToId = new Map();
    itemNameToItem = new Map();
    classNameToId = new Map();

    for (const gem of getAllGems()) {
      const key = gem.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "");
      gemNameToId.set(key, gem.id);
      gemIdSet.add(gem.id);
    }
    for (const p of getAllPassiveTalents()) {
      const key = p.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "");
      passiveNameToId.set(key, p.id);
    }
    for (const item of getAllItems()) {
      const key = item.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "");
      itemNameToItem.set(key, item);
    }
    for (const cls of getAllCharacterClasses()) {
      const key = cls.nameEn.toLowerCase();
      classNameToId.set(key, cls.id);
      classNameToId.set(key.replace(/\s/g, ""), cls.id);
    }

    lookupMapsInitialized = true;
  }

  return {
    gemNameToId,
    gemIdSet,
    passiveNameToId,
    itemNameToItem,
    classNameToId
  };
}

// ============================================================
// Hilfsfunktionen
// ============================================================

/**
 * Normalisiert einen Namen für den Lookup:
 * - Kleinbuchstaben
 * - Entfernt alle Nicht-Alphanumerischen Zeichen
 *   (sodass "Lightning Arrow" → "lightningarrow")
 */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Setzt die Lookup-Maps zurück. Kann bei Bedarf aufgerufen werden,
 * um Speicher freizugeben (z.B. in Serverless-Umgebungen).
 */
export function resetLookupMaps(): void {
  gemNameToId?.clear();
  gemIdSet?.clear();
  passiveNameToId?.clear();
  itemNameToItem?.clear();
  classNameToId?.clear();
  lookupMapsInitialized = false;
}

/**
 * Extrahiert ein XML-Attribut per Regex.
 * Beispiel: getAttr('name="Lightning Arrow"', "name") → "Lightning Arrow"
 * Sicherheit: Einfaches, nicht-nestbares Pattern zur Vermeidung von ReDoS
 */
function getAttr(xml: string, attr: string): string | null {
  // Einfaches, sicheres Pattern ohne nested quantifiers
  const regex = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i");
  const match = regex.exec(xml);
  return match ? match[1] : null;
}

/**
 * Extrahiert alle Vorkommen eines Tags inkl. Inhalt.
 * Unterstützt sowohl Self-Closing- als auch Opening-Tags.
 * Sicherheit: Abbruch bei übermässig vielen Matches und Input-Längeprüfung
 * um ReDoS (Regular Expression Denial of Service) zu verhindern.
 */
function extractAllTags(xml: string, tagName: string): string[] {
  const results: string[] = [];
  const MAX_MATCHES = 1000; // Reduziert von 10.000 für bessere Sicherheit
  const MAX_INPUT_LENGTH = 100000; // 100KB Limit

  if (xml.length > MAX_INPUT_LENGTH) {
    console.warn(`[pobParser] Input zu groß: ${xml.length} Bytes`);
    return results;
  }

  // Einfacheres, sicheres Pattern ohne nested quantifiers
  const regex = new RegExp(`<${tagName}[^>]*>`, "gi");
  let match: RegExpExecArray | null;
  let iterations = 0;

  while ((match = regex.exec(xml)) !== null) {
    results.push(match[0]);
    iterations++;

    if (iterations > MAX_MATCHES) {
      console.warn(`[pobParser] Zu viele Matches für <${tagName}>: ${iterations}`);
      break;
    }

    // Reset lastIndex für sicheres Fortsetzen
    if (match.index + match[0].length >= xml.length) {
      break;
    }
  }

  return results;
}

/**
 * Slot-Mapping: PoB-Slot-Namen → unsere EquipmentSlots-Keys
 *
 * Typische PoB-Slot-Namen:
 *   "Weapon 1"        → mainHand
 *   "Weapon 2"        → offHand (oder mainHand 2 – wir nutzen offHand)
 *   "Body Armour"     → chest
 *   "Helmet"          → (wird nicht im Store geführt – ignorieren)
 *   "Gloves"          → (wird nicht im Store geführt – ignorieren)
 *   "Boots"           → (wird nicht im Store geführt – ignorieren)
 *   "Ring 1"          → ring1
 *   "Ring 2"          → ring2
 *   "Amulet"          → amulet
 */
function pobSlotToOurSlot(pobSlot: string): keyof EquipmentSlots | null {
  const map: Record<string, keyof EquipmentSlots> = {
    "weapon 1": "mainHand",
    "weapon 2": "offHand",
    "body armour": "chest",
    "ring 1": "ring1",
    "ring 2": "ring2",
    amulet: "amulet",
  };
  return map[pobSlot.toLowerCase()] ?? null;
}

// ============================================================
// Extraktions-Funktionen
// ============================================================

/**
 * Extrahiert die Charakterklasse aus dem <Build>-Tag.
 * Sucht nach className="Name" und matched auf unsere DB.
 */
function extractClass(xml: string): string | null {
  const { classNameToId } = getLookupMaps();
  const className = getAttr(xml, "className");
  if (!className) return null;

  // 1. Direkter Lookup (case-insensitive)
  const key = className.toLowerCase();
  if (classNameToId.has(key)) {
    return classNameToId.get(key)!;
  }

  // 2. Normalisiert (ohne Sonderzeichen)
  const normalized = normalize(className);
  for (const [nk, id] of classNameToId) {
    if (normalize(nk) === normalized) {
      return id;
    }
  }

  return null;
}

/**
 * Extrahiert passive Talente aus dem <Spec>-Bereich.
 * Sucht nach <AllocatedNodes> mit <Node>-Elementen,
 * oder nach direkten Node-IDs im <Spec>-Tag.
 */
function extractPassives(xml: string): string[] {
  const { passiveNameToId } = getLookupMaps();
  const found: string[] = [];

  // Suche nach <AllocatedNodes>...</AllocatedNodes>
  const allocMatch = /<AllocatedNodes[^>]*>([\s\S]*?)<\/AllocatedNodes>/i.exec(
    xml
  );
  if (allocMatch) {
    const block = allocMatch[1];

    // Extrahiere alle <Node>-Tags
    const nodeTags = extractAllTags(block, "Node");
    for (const tag of nodeTags) {
      // Fix: Auch nodeId Attribut prüfen
      const nodeName = getAttr(tag, "name") || getAttr(tag, "id") || getAttr(tag, "nodeId");
      if (!nodeName) continue;

      // Normalisiert matchen
      const normalized = normalize(nodeName);
      if (passiveNameToId.has(normalized)) {
        found.push(passiveNameToId.get(normalized)!);
      } else {
        // Fallback: Versuche direkten ID-Match (nodeName ist bereits eine ID)
        const allPassives = getAllPassiveTalents();
        const direct = allPassives.find(
          (p) => normalize(p.id) === normalized
        );
        if (direct) found.push(direct.id);
      }
    }
  }

  // Fallback: Suche nach <Spec nodeId="..."> direkt
  const specMatch = /<Spec[^>]*nodeId\s*=\s*"([^"]*)"/i.exec(xml);
  if (specMatch) {
    const nodeIds = specMatch[1].split(/[\s,]+/);
    for (const nid of nodeIds) {
      if (nid && passiveNameToId.has(normalize(nid))) {
        const id = passiveNameToId.get(normalize(nid))!;
        if (!found.includes(id)) found.push(id);
      }
    }
  }

  return found;
}

/**
 * Extrahiert Gemmen aus dem <Skills>-Bereich.
 *
 * PoB-XML-Struktur (vereinfacht):
 * <Skill name="Lightning Arrow" gemId="..." ...>
 *   <GemLink gemId="..." .../>
 *   <GemLink gemId="..." .../>
 * </Skill>
 *
 * Wir suchen nach:
 * - <Skill>-Tags mit name-Attribut → aktive Gemme (Slot 0)
 * - <GemLink>-Tags → Support-Gemmen (Slots 1-5)
 */
function extractGems(xml: string): SocketData[] {
  const { gemNameToId, gemIdSet } = getLookupMaps();
  const sockets: SocketData[] = [null, null, null, null, null, null];

  // Extrahiere den <Skills>-Block
  const skillsMatch = /<Skills[^>]*>([\s\S]*?)<\/Skills>/i.exec(xml);
  if (!skillsMatch) return sockets;

  const skillsBlock = skillsMatch[1];

  // Alle aktiven Skills (<Skill name="..." .../>)
  const skillTags = extractAllTags(skillsBlock, "Skill");

  let supportIndex = 0;

  // Zuerst alle aktiven Gemmen extrahieren
  for (const tag of skillTags) {
    const name = getAttr(tag, "name") || getAttr(tag, "gemId");
    if (!name) continue;

    const normalized = normalize(name);
    const gemId = gemNameToId.get(normalized);

    if (gemId) {
      // Suche ersten freien Slot
      const firstEmptyIndex = sockets.findIndex(s => s === null);
      if (firstEmptyIndex !== -1) {
        sockets[firstEmptyIndex] = gemId;
      }
    }
  }

  // Extrahiere Support-Gemmen via <GemLink>
  const gemLinkTags = extractAllTags(skillsBlock, "GemLink");
  for (const tag of gemLinkTags) {
    if (supportIndex > 5) break;

    const gemIdAttr = getAttr(tag, "gemId");
    // PoB kann auch "name" oder "id" Attribut haben
    const name = getAttr(tag, "name") || gemIdAttr;
    if (!name) continue;

    const normalized = normalize(name);

    // Ist es eine direkte ID in unserer DB?
    if (gemIdSet.has(normalized)) {
      const firstEmptyIndex = sockets.findIndex(s => s === null);
      if (firstEmptyIndex !== -1) {
        sockets[firstEmptyIndex] = normalized;
      }
      continue;
    }

    // Oder ein Name → Lookup
    const gemId = gemNameToId.get(normalized);
    if (gemId) {
      const firstEmptyIndex = sockets.findIndex(s => s === null);
      if (firstEmptyIndex !== -1) {
        sockets[firstEmptyIndex] = gemId;
      }
    }
  }

  return sockets;
}

/**
 * Extrahiert Ausrüstungsgegenstände aus dem <Items>-Bereich.
 *
 * PoB-Struktur:
 * <Item id="..." slot="Weapon 1" ...>
 *   ...
 * </Item>
 *
 * Oder als Self-Closing:
 * <Item id="..." slot="Body Armour" .../>
 */
function extractEquipment(xml: string): EquipmentSlots {
  const { itemNameToItem } = getLookupMaps();
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

  // Extrahiere den <Items>-Block
  const itemsMatch = /<Items[^>]*>([\s\S]*?)<\/Items>/i.exec(xml);
  if (!itemsMatch) return equipment;

  const itemsBlock = itemsMatch[1];

  // Alle <Item>-Tags (auch self-closing)
  const itemTags = extractAllTags(itemsBlock, "Item");

  for (const tag of itemTags) {
    const slot = getAttr(tag, "slot");
    if (!slot) continue;

    const ourSlot = pobSlotToOurSlot(slot);
    if (!ourSlot) continue;

    // Bereits belegt? Überspringen (first-match)
    if (equipment[ourSlot] !== null) continue;

    // Item-Name aus verschiedenen Quellen versuchen:
    //   name="..." oder id="..." oder baseType="..."
    let itemName =
      getAttr(tag, "name") ||
      getAttr(tag, "baseType") ||
      getAttr(tag, "id");
    if (!itemName) continue;

    const normalized = normalize(itemName);

    // Lookup in unserer Item-DB
    if (itemNameToItem.has(normalized)) {
      equipment[ourSlot] = itemNameToItem.get(normalized)!;
      continue;
    }

    // Fallback: Teilstring-Matching (falls PoB-Namen leicht abweichen)
    const allItems = getAllItems();
    const matched = allItems.find(
      (item) => normalize(item.nameEn) === normalized
    );
    if (matched) {
      equipment[ourSlot] = matched;
    }
  }

  return equipment;
}

// ============================================================
// Hauptfunktion
// ============================================================

/**
 * Parst einen PoB-XML-String und gibt ein PobParseResult zurück.
 *
 * @param xmlString - Der dekomprimierte XML-String aus pobDecoder
 * @returns Strukturierte Build-Daten (Klasse, Gemmen, Talente, Items)
 */
export function parsePobXml(xmlString: string): PobParseResult {
  if (!xmlString || xmlString.trim().length === 0) {
    throw new Error("XML-String ist leer.");
  }

  // Einfacher Plausibilitäts-Check: Der String sollte ein
  // PathOfBuilding- oder Build-Tag enthalten.
  if (
    !xmlString.includes("<PathOfBuilding") &&
    !xmlString.includes("<Build")
  ) {
    throw new Error(
      "Ungültiges XML-Format: Kein <PathOfBuilding>- oder <Build>-Tag gefunden."
    );
  }

  // Eigentliche Extraktion aus dem Roh-String (robuster gegen Namespaces)
  // Jede Extraktion einzeln in Try-Catch, damit ein Teilfehler nicht alles blockiert
  let characterClass: string | null = null;
  try { characterClass = extractClass(xmlString); } catch {
    console.warn("[pobParser] Fehler bei Klassen-Extraktion, ignoriert.");
  }

  let selectedPassives: string[] = [];
  try { selectedPassives = extractPassives(xmlString); } catch {
    console.warn("[pobParser] Fehler bei Passiv-Extraktion, ignoriert.");
  }

  let sockets: SocketData[] = [null, null, null, null, null, null];
  try { sockets = extractGems(xmlString); } catch {
    console.warn("[pobParser] Fehler bei Gemmen-Extraktion, ignoriert.");
  }

  let equipment: EquipmentSlots;
  try { equipment = extractEquipment(xmlString); } catch {
    console.warn("[pobParser] Fehler bei Item-Extraktion, ignoriert.");
    equipment = { mainHand: null, weapon2: null, offHand: null, chest: null, helmet: null, gloves: null, belt: null, boots: null, ring1: null, ring2: null, amulet: null };
  }

  return {
    characterClass,
    sockets,
    selectedPassives,
    equipment,
  };

}
