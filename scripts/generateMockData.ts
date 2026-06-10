/**
 * Mock-Daten Generator
 *
 * Generiert zusätzliche Einträge für gems.ts, passives.ts und items.ts
 * und fügt sie direkt in die Record-Strukturen ein.
 *
 * Verwendung:
 *   npx tsx scripts/generateMockData.ts
 */
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Hilfsfunktionen
// ============================================================

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================
// Daten-Pools
// ============================================================

const prefixes = [
  "Sengende", "Eisige", "Giftige", "Arkan", "Blitzende", "Düstere",
  "Glühende", "Schatten", "Blutige", "Heilige", "Verderbte", "Kristall",
  "Wilde", "Stählerne", "Flüsternde", "Donnernde", "Schimmernde",
  "Neblige", "Feurige", "Ewige",
];

const gemNames = [
  "Feuerball", "Eispfeil", "Blitzschlag", "Giftwolke", "Flammensäule",
  "Frostnova", "Kettenschlag", "Finsternis", "Lichtstrahl", "Schattenstoß",
  "Plasmakugel", "Eissplitter", "Magieraktschuß", "Seelenpeitsche",
  "Vulkanausbruch", "Blizzard", "Gewittersturm", "Chaosorkan",
  "Schutzgeist", "Knochenschild", "Blutpakt", "Seelenopfer",
  "Meteorregen", "Mondlicht", "Sternenfall", "Windmesser",
  "Erdpfeiler", "Gletscher", "Flammenwand", "Schocknova",
];

const gemEffects = [
  "Feuerschaden", "Kälteschaden", "Blitzschaden", "Chaosschaden",
  "physischer Schaden", "Giftschaden", "Feuerschaden über Zeit",
  "Kälteschaden über Zeit", "Blitzschaden über Zeit",
  "Chaosschaden über Zeit",
];

const supportGemNames = [
  "Mehrfachprojektile", "Durchschlag", "Verbrennung", "Vergiftung",
  "Betäubung", "Konzentration", "Magnitude", "Verlangsamung",
  "Ketten", "Durchbruch", "Verstärkung", "Fokus",
  "Berserker", "Zerfleischen", "Splitterung", "Rückstoß",
  "Erhöhte Dauer", "Verkürzte Dauer", "Flächeneffekt", "Präzision",
];

const colors = ["red", "green", "blue"] as const;
const gemTypes = ["active", "support"] as const;

const talentNames = [
  "Stählerner Wille", "Unnachgiebigkeit", "Zorn der Wildnis",
  "Gefrorene Seele", "Schockwelle", "Giftige Sporen",
  "Arkaner Schutz", "Manaentzug", "Blutrausch", "Knochenpanzer",
  "Dämmerung", "Zwielichtmantel", "Feuerläufer", "Eisgolem",
  "Blitzbringer", "Chaosschleier", "Seelenfänger", "Schattenhüpfer",
  "Phönixasche", "Wyrmblut", "Zorn des Zentauren", "Medusa-Gaze",
  "Hydra-Gift", "Chimären-Flügel", "Greifen-Kralle", "Basilisk-Auge",
  "Kraken-Arm", "Drachenatem", "Phönixfeder", "Chimären-Schuppen",
];

const talentDescriptions = [
  "+15 % erhöhter Schaden",
  "+10 % Angriffsgeschwindigkeit",
  "+20 % kritische Trefferchance",
  "+25 % Elementarwiderstand",
  "+8 % maximale Leben",
  "+12 % maximale Mana",
  "+5 % Bewegungsgeschwindigkeit",
  "+30 % Rüstung",
  "+20 % Ausweichwert",
  "+15 % Fluch-Wirksamkeit",
  "+10 % Diener-Schaden",
  "+1 Diener-Limit",
  "+3 % Leben pro Treffer",
  "+2 % Mana pro Treffer",
  "+25 % Schaden über Zeit",
  "+15 % Flächenschaden",
  "+20 % Projektilgeschwindigkeit",
  "+10 % Blockchance",
  "+30 % kritischer Schadensmultiplikator",
  "+5 % Erfahrungsgewinn",
];

const itemQuality = [
  "Verstärkt", "Makellos", "Massiv", "Fein", "Robust",
  "Glänzend", "Düster", "Leuchtend", "Schattig", "Massiv",
  "Geschmiedet", "Gewebt", "Geläutert", "Verzaubert", "Runenbesetzt",
];

const itemBases: Record<string, string[]> = {
  bow: ["Reflexbogen", "Langbogen", "Kurzbogen", "Jagdbogen", "Kriegsbogen"],
  sword: ["Langschwert", "Breitschwert", "Kurzschwert", "Krummsäbel", "Rapier"],
  shield: ["Rundschild", "Turmchild", "Kiteschild", "Metallschild", "Knochenschild"],
  quiver: ["Federköcher", "Jagdköcher", "Magieköcher", "Lederköcher", "Runenköcher"],
  chest: ["Plattenpanzer", "Kettenhemd", "Lederweste", "Seidengewand", "Runenrüstung"],
  ring: ["Goldring", "Silberring", "Kupferring", "Platinring", "Obsidianring"],
  amulet: ["Goldamulett", "Silberamulett", "Kristallamulett", "Runenamulett", "Knochenamulett"],
};

const itemTypes = ["bow", "sword", "shield", "quiver", "chest", "ring", "amulet"] as const;

const statNames = [
  "Angriffsgeschwindigkeit", "Physischer Schaden", "Rüstung",
  "Bewegungsgeschwindigkeit", "Projektilgeschwindigkeit", "Feuerwiderstand",
  "Kältewiderstand", "Blitzwiderstand", "Chaoswiderstand", "Maximale Leben",
  "Maximale Mana", "Seltenheitswert", "Stärke", "Geschicklichkeit", "Intelligenz",
  "Ausweichwert", "Zauberschaden", "Elementarschaden", "Leben pro Treffer",
  "Mana pro Treffer", "Leben pro Sekunde", "Mana pro Sekunde",
];

// ============================================================
// Generatoren — geben Record-Einträge als String zurück
// ============================================================

function generateGems(count: number): string {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `mock-gem-${String(i + 1).padStart(3, "0")}`;
    const type = i % 3 === 0 ? "active" : "support";
    const name = type === "active" ? randomElement(gemNames) : randomElement(supportGemNames);
    const prefix = randomElement(prefixes);
    const nameDe = `${prefix} ${name}`;
    const nameEn = `${prefix} ${name}`;
    const color = randomElement(colors);
    const description = `${capitalize(type === "active" ? "Wirkt" : "Unterstützt")} ${randomElement(gemEffects)}`;
    const effect =
      type === "active"
        ? `+${Math.floor(Math.random() * 30 + 10)} % ${randomElement(gemEffects)}`
        : `Unterstützt: ${Math.floor(Math.random() * 20 + 5)} % mehr ${randomElement(gemEffects)}`;

    lines.push(`  "${id}": {
    id: "${id}",
    nameDe: "${nameDe}",
    nameEn: "${nameEn}",
    type: "${type}",
    color: "${color}",
    description: "${description}",
    effect: "${effect}",
  },`);
  }
  return lines.join("\n");
}

function generatePassives(count: number): string {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `mock-passive-${String(i + 1).padStart(3, "0")}`;
    const name = `${randomElement(prefixes)} ${randomElement(talentNames)}`;
    const description = randomElement(talentDescriptions);
    const effect = `+${Math.floor(Math.random() * 20 + 5)} % ${randomElement(gemEffects)}`;

    lines.push(`  "${id}": {
    id: "${id}",
    nameDe: "${name}",
    nameEn: "Mock ${name}",
    description: "${description}",
    effect: "${effect}",
  },`);
  }
  return lines.join("\n");
}

function generateItems(count: number): string {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `mock-item-${String(i + 1).padStart(3, "0")}`;
    const type = itemTypes[i % itemTypes.length];
    const base = randomElement(itemBases[type]);
    const quality = randomElement(itemQuality);
    const nameDe = `${quality} ${base}`;
    const nameEn = `${quality} ${base}`;

    const statCount = Math.floor(Math.random() * 3) + 1;
    const stats: { name: string; value: number }[] = [];
    const usedStats = new Set<string>();
    for (let j = 0; j < statCount; j++) {
      let statName: string;
      do { statName = randomElement(statNames); } while (usedStats.has(statName));
      usedStats.add(statName);
      stats.push({ name: statName, value: Math.floor(Math.random() * 30 + 5) });
    }

    const statsStr = stats.map((s) => `      { name: "${s.name}", value: ${s.value} }`).join(",\n");

    lines.push(`  "${id}": {
    id: "${id}",
    nameDe: "${nameDe}",
    nameEn: "${nameEn}",
    type: "${type}",
    stats: [
${statsStr}
    ],
  },`);
  }
  return lines.join("\n");
}

// ============================================================
// File-Patching: Insert generated records before the closing "};"
// ============================================================

function insertIntoFile(filePath: string, generatedRecords: string): void {
  const fullPath = path.resolve(__dirname, "..", filePath);
  let content = fs.readFileSync(fullPath, "utf-8");

  // Find the last closing "};" of the record (before helper functions)
  const marker = "\n};\n\n/**";
  const insertPos = content.lastIndexOf(marker);

  if (insertPos === -1) {
    console.error(`❌ Konnte Marker "${marker}" in ${filePath} nicht finden.`);
    return;
  }

  // Insert before the closing "};"
  const before = content.slice(0, insertPos + 1); // include the newline before /** ?
  // Actually, let's find the exact position. The pattern is:
  //   },  ← last record entry
  // };   ← closing of Record
  // \n/** ... helper functions
  // We want to insert before the "};"
  const insertAt = content.lastIndexOf("\n};");
  if (insertAt === -1) {
    console.error(`❌ Konnte "};" in ${filePath} nicht finden.`);
    return;
  }

  const newContent = content.slice(0, insertAt) + "\n" + generatedRecords + content.slice(insertAt);
  fs.writeFileSync(fullPath, newContent, "utf-8");
  console.log(`✅ ${filePath} aktualisiert (Daten eingefügt vor Zeile ${content.slice(0, insertAt).split("\n").length})`);
}

// ============================================================
// Main
// ============================================================

const GEM_COUNT = 50;
const PASSIVE_COUNT = 100;
const ITEM_COUNT = 50;

console.log("=".repeat(60));
console.log("MOCK-DATEN GENERATOR");
console.log("=".repeat(60));
console.log();

try {
  console.log(`Generiere ${GEM_COUNT} Gems, ${PASSIVE_COUNT} Passives und ${ITEM_COUNT} Items…`);

  const gems = generateGems(GEM_COUNT);
  insertIntoFile("src/data/gems.ts", gems);

  const passives = generatePassives(PASSIVE_COUNT);
  insertIntoFile("src/data/passives.ts", passives);

  const items = generateItems(ITEM_COUNT);
  insertIntoFile("src/data/items.ts", items);

  console.log();
  console.log("✅ Fertig! Alle Mock-Daten wurden in die Data-Files eingefügt.");
  console.log("   Führe nun 'npm run build' oder 'npm run dev' aus, um die TypeScript-Typen zu prüfen.");
} catch (err) {
  console.error("❌ Fehler beim Generieren der Mock-Daten:", err);
  process.exit(1);
}
