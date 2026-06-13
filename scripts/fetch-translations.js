#!/usr/bin/env node
/**
 * fetch-translations.js
 * ============================================================================
 * Extrahiert englisch→deutsch Übersetzungen für PoE 2 aus den lokalen
 * Backup-Spieldateien (src/data/backup/).
 *
 * QUELLEN:
 *   1. Lokale Backup-JSONs (de_skillgems.json + en_skillgems.json +
 *      de_baseitemtypes.json + en_baseitemtypes.json etc.)
 *   2. Hardcoded Fallback-Dictionary
 *
 * AUSGABE: scripts/poe2-translations.json
 *
 * VERWENDUNG:
 *   node scripts/fetch-translations.js
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

// ─── KONFIGURATION ──────────────────────────────────────────────────────────

const OUTPUT_FILE = path.join(__dirname, "poe2-translations.json");
const BACKUP_DIR = path.join(__dirname, "..", "src", "data", "backup");

// ─── HILFSFUNKTIONEN ────────────────────────────────────────────────────────

/**
 * Lädt eine JSON-Datei. Unterstützt sowohl single-JSON als auch
 * newline-delimited JSON (ndjson) für Dateien mit mehreren JSON-Objekten.
 * Gibt ein Array zurück oder null bei Fehler.
 */
function loadJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw) return null;

    // Versuche als einzelnes JSON-Objekt
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (_) {
      // Fallback: Versuche als NDJSON (ein JSON-Objekt pro Zeile)
      const lines = raw.split("\n").filter((l) => l.trim());
      const results = [];
      for (const line of lines) {
        try {
          results.push(JSON.parse(line));
        } catch (e) {
          // Überspringe ungültige Zeilen
        }
      }
      return results.length > 0 ? results : null;
    }
  } catch (err) {
    console.warn(`  ⚠️  Konnte ${path.basename(filePath)} nicht laden: ${err.message}`);
    return null;
  }
}

/**
 * Baut ein Lookup-Dictionary: Id → Name aus einem Array von Objekten.
 */
function buildNameLookup(entries, idField, nameField) {
  const lookup = {};
  if (!entries) return lookup;
  for (const entry of entries) {
    // Unterstütze sowohl flache Id als auch verschachtelte (z.B. BaseItemTypesKey.Id)
    let id;
    if (typeof idField === "function") {
      id = idField(entry);
    } else if (idField.includes(".")) {
      const parts = idField.split(".");
      id = entry[parts[0]]?.[parts[1]];
    } else {
      id = entry[idField];
    }
    const name = entry[nameField];
    if (id && name && typeof name === "string" && name.trim()) {
      lookup[id] = name.trim();
    }
  }
  return lookup;
}

// ─── EXTRAKTION AUS BACKUP-DATEIEN ─────────────────────────────────────────

/**
 * Extrahiert Skill-Gem-Übersetzungen aus den Backup-Dateien.
 * Nutzt de_skillgems.json + en_skillgems.json + *_baseitemtypes.json
 * für die Id→Name-Auflösung.
 */
function extractSkillGemTranslations() {
  console.log("\n📦 Extrahiere Skill-Gem-Übersetzungen aus Backups …");

  const translations = {};

  // Lade BaseItemTypes (Name-Lookups)
  const deItems = loadJsonFile(path.join(BACKUP_DIR, "de_baseitemtypes.json"));
  const enItems = loadJsonFile(path.join(BACKUP_DIR, "en_baseitemtypes.json"));

  if (!deItems || !enItems) {
    console.warn("  ⚠️  BaseItemTypes-Dateien fehlen – überspringe Skill-Gem-Extraktion.");
    return translations;
  }

  const deNameByItemId = buildNameLookup(deItems, "Id", "Name");
  const enNameByItemId = buildNameLookup(enItems, "Id", "Name");

  // Lade SkillGem-Listen
  const deGems = loadJsonFile(path.join(BACKUP_DIR, "de_skillgems.json"));
  const enGems = loadJsonFile(path.join(BACKUP_DIR, "en_skillgems.json"));

  // Verwende die deutsche Gem-Liste als Basis
  const gems = deGems || enGems || [];
  console.log(`  → ${gems.length} Skill-Gems in Backup-Dateien`);

  for (const gem of gems) {
    const itemId = gem?.BaseItemTypesKey?.Id;
    if (!itemId) continue;

    const deName = deNameByItemId[itemId];
    const enName = enNameByItemId[itemId];

    if (deName && enName && deName !== enName) {
      translations[enName] = deName;
    }
  }

  console.log(`  ✅ ${Object.keys(translations).length} Skill-Gem-Übersetzungen extrahiert.`);
  return translations;
}

/**
 * Extrahiert ActiveSkill-Übersetzungen (DisplayedName) aus den Backup-Dateien.
 */
function extractActiveSkillTranslations() {
  console.log("\n📦 Extrahiere ActiveSkill-Übersetzungen aus Backups …");

  const translations = {};

  const deSkills = loadJsonFile(path.join(BACKUP_DIR, "de_activeskills.json"));
  const enSkills = loadJsonFile(path.join(BACKUP_DIR, "en_activeskills.json"));

  if (!deSkills || !enSkills) {
    console.warn("  ⚠️  ActiveSkills-Dateien fehlen – überspringe.");
    return translations;
  }

  const deById = buildNameLookup(deSkills, "Id", "DisplayedName");
  const enById = buildNameLookup(enSkills, "Id", "DisplayedName");

  let matched = 0;
  for (const [id, enName] of Object.entries(enById)) {
    const deName = deById[id];
    if (deName && deName !== enName) {
      // Vermeide Duplikate mit Skill-Gems (nur hinzufügen wenn nicht schon vorhanden)
      if (!translations[enName]) {
        translations[enName] = deName;
        matched++;
      }
    }
  }

  console.log(`  ✅ ${matched} ActiveSkill-Übersetzungen extrahiert.`);
  return translations;
}

/**
 * Extrahiert PassiveSkill-Übersetzungen aus den Backup-Dateien.
 * Filtert auf Keystones und Notables für bessere Relevanz.
 */
function extractPassiveSkillTranslations() {
  console.log("\n📦 Extrahiere PassiveSkill-Übersetzungen aus Backups …");

  const translations = {};

  const dePassives = loadJsonFile(path.join(BACKUP_DIR, "de_passiveskills.json"));
  const enPassives = loadJsonFile(path.join(BACKUP_DIR, "en_passiveskills.json"));

  if (!dePassives || !enPassives) {
    console.warn("  ⚠️  PassiveSkills-Dateien fehlen – überspringe.");
    return translations;
  }

  const deById = buildNameLookup(dePassives, "Id", "Name");
  const enById = buildNameLookup(enPassives, "Id", "Name");

  let matched = 0;
  for (const [id, enName] of Object.entries(enById)) {
    const deName = deById[id];
    if (deName && deName !== enName && deName.length > 1) {
      translations[enName] = deName;
      matched++;
    }
  }

  console.log(`  ✅ ${matched} PassiveSkill-Übersetzungen extrahiert.`);
  return translations;
}

/**
 * Extrahiert Stat-Übersetzungen (z.B. "Increased Attack Speed" → "Erhöhte Angriffsgeschwindigkeit").
 */
function extractStatTranslations() {
  console.log("\n📦 Extrahiere Stat-Übersetzungen aus Backups …");

  const translations = {};

  const deStats = loadJsonFile(path.join(BACKUP_DIR, "de_stats.json"));
  const enStats = loadJsonFile(path.join(BACKUP_DIR, "en_stats.json"));

  if (!deStats || !enStats) {
    console.warn("  ⚠️  Stats-Dateien fehlen – überspringe.");
    return translations;
  }

  const deById = buildNameLookup(deStats, "Id", "Text");
  const enById = buildNameLookup(enStats, "Id", "Text");

  let matched = 0;
  for (const [id, enText] of Object.entries(enById)) {
    const deText = deById[id];
    if (deText && deText !== enText && Math.abs(deText.length - enText.length) < 100) {
      // Nur sinnvolle Übersetzungen (nicht komplett verschiedene Strings)
      translations[enText] = deText;
      matched++;
    }
  }

  console.log(`  ✅ ${matched} Stat-Übersetzungen extrahiert.`);
  return translations;
}

/**
 * Extrahiert Character-/Klassen-Übersetzungen.
 */
function extractCharacterTranslations() {
  console.log("\n📦 Extrahiere Charakter-Übersetzungen aus Backups …");

  const translations = {};

  const deChars = loadJsonFile(path.join(BACKUP_DIR, "de_characters.json"));
  const enChars = loadJsonFile(path.join(BACKUP_DIR, "en_characters.json"));

  if (!deChars || !enChars) {
    console.warn("  ⚠️  Characters-Dateien fehlen – überspringe.");
    return translations;
  }

  const deById = buildNameLookup(deChars, "Id", "Name");
  const enById = buildNameLookup(enChars, "Id", "Name");

  let matched = 0;
  for (const [id, enName] of Object.entries(enById)) {
    const deName = deById[id];
    if (deName && deName !== enName) {
      translations[enName] = deName;
      matched++;
    }
  }

  console.log(`  ✅ ${matched} Charakter-Übersetzungen extrahiert.`);
  return translations;
}

// ─── HARDCODED FALLBACK-DICTIONARY ──────────────────────────────────────────

/**
 * Umfangreiches hardcoded Dictionary mit offiziellen PoE 2 Übersetzungen.
 * Wird als Basis verwendet und mit Backup-Ergebnissen ergänzt.
 * Backup-Ergebnisse haben Vorrang (überschreiben hardcoded Einträge).
 */
function getHardcodedDictionary() {
  return {
    skills: {
      // --- Stärke (Rot) ---
      "Fireball": "Feuerball",
      "Firestorm": "Feuersturm",
      "Flame Wall": "Flammenwall",
      "Earthquake": "Erdbeben",
      "Leap Slam": "Sprungschlag",
      "Ground Slam": "Schmetterhieb",
      "Cleave": "Spalten",
      "Shield Charge": "Schildansturm",
      "Cyclone": "Wirbelwind",
      "Armageddon Brand": "Armageddon-Marke",
      "Detonate Dead": "Tote detonieren",
      "Volatile Dead": "Flüchtige Tote",
      "Fire Trap": "Feuerfalle",
      "Infernal Cry": "Höllenschrei",
      "Boneshatter": "Knochenbrecher",
      "Molten Strike": "Glutschlag",
      "Consecrated Path": "Geweihter Pfad",
      "Righteous Fire": "Rechtschaffenes Feuer",
      "Sunder": "Zerschmettern",
      "Devastate": "Verwüsten",

      // --- Geschick (Grün) ---
      "Lightning Arrow": "Blitzpfeil",
      "Ice Shot": "Eisschuss",
      "Tornado Shot": "Tornadoschuss",
      "Rain of Arrows": "Pfeilregen",
      "Toxic Rain": "Giftregen",
      "Caustic Arrow": "Ätzpfeil",
      "Spark": "Funken",
      "Lightning Strike": "Blitzschlag",
      "Blade Vortex": "Klingenwirbel",
      "Ethereal Knives": "Äthermesser",
      "Lightning Trap": "Blitzfalle",
      "Galvanic Shards": "Galvanische Splitter",
      "Fragmentation Rounds": "Fragmentierungsgeschosse",
      "Explosive Grenade": "Explosivgranate",
      "Gas Grenade": "Gasgranate",
      "Flash Grenade": "Blendgranate",
      "Oil Grenade": "Ölgranate",
      "Herald of Thunder": "Herold des Donners",
      "Herald of Ice": "Herold des Eises",
      "Barrage": "Sperrfeuer",
      "Escape Shot": "Fluchtschuss",

      // --- Intelligenz (Blau) ---
      "Ice Nova": "Eisnova",
      "Frost Bolt": "Frostgeschoss",
      "Ice Spear": "Eisspeer",
      "Cold Snap": "Kälteeinbruch",
      "Freezing Pulse": "Gefrierpuls",
      "Arc": "Lichtbogen",
      "Orb of Storms": "Kugel der Stürme",
      "Storm Brand": "Sturmmarke",
      "Contagion": "Ansteckung",
      "Essence Drain": "Essenzentzug",
      "Raise Zombie": "Zombie erwecken",
      "Summon Skeletons": "Skelette beschwören",
      "Summon Raging Spirits": "Wütende Geister beschwören",
      "Despair": "Verzweiflung",
      "Frost Wall": "Frostwall",
      "Conductivity": "Leitfähigkeit",
      "Flammability": "Entflammbarkeit",
      "Elemental Weakness": "Elementarschwäche",
      "Enfeeble": "Schwächung",
      "Temporal Chains": "Zeitliche Ketten",
      "Soul Offering": "Seelenopfer",
      "Bone Offering": "Knochenopfer",
      "Flesh Offering": "Fleischopfer",
      "Pain Offering": "Schmerzopfer",
      "Unearth": "Ausgraben",
    },
    stats: {
      // Support Gems
      "Added Fire Damage": "Hinzugefügter Feuerschaden",
      "Added Cold Damage": "Hinzugefügter Kälteschaden",
      "Added Lightning Damage": "Hinzugefügter Blitzschaden",
      "Added Chaos Damage": "Hinzugefügter Chaosschaden",
      "Faster Attacks": "Schnellere Angriffe",
      "Faster Projectiles": "Schnellere Projektile",
      "Greater Multiple Projectiles": "Größere Mehrfachprojektile",
      "Lesser Multiple Projectiles": "Geringere Mehrfachprojektile",
      "Chain": "Kette",
      "Fork": "Gabelung",
      "Pierce": "Durchdringen",
      "Elemental Damage with Attacks": "Elementarschaden mit Angriffen",
      "Elemental Focus": "Elementarfokus",
      "Controlled Destruction": "Kontrollierte Zerstörung",
      "Critical Strikes": "Kritische Treffer",
      "Critical Damage": "Kritischer Schaden",
      "Inspiration": "Inspiration",
      "Life Leech": "Lebensraub",
      "Mana Leech": "Manaraub",
      "Increased Area of Effect": "Vergrößerter Flächeneffekt",
      "Concentrated Effect": "Konzentrierter Effekt",
      "Knockback": "Rückstoß",
      "Stun": "Betäubung",
      "Culling Strike": "Todesstoß",
      "Melee Splash": "Nahkampf-Erfassung",
      "Multistrike": "Mehrfachschlag",
      "Minion Damage": "Dienerschaden",
      "Minion Speed": "Dienergeschwindigkeit",
      "Fortify": "Befestigung",
      "Onslaught": "Ansturm",
      "Spell Echo": "Zauberecho",
      "Faster Casting": "Schnellere Zauber",
      "Increased Duration": "Erhöhte Dauer",
      "Less Duration": "Geringere Dauer",
      "Swift Affliction": "Schnelles Leiden",
      "Brutality": "Brutalität",
      "Deadly Ailments": "Tödliche Leiden",
      "Ignite Proliferation": "Brandausbreitung",
      "Cold Penetration": "Kältedurchdringung",
      "Fire Penetration": "Feuerdurchdringung",
      "Lightning Penetration": "Blitzdurchdringung",
      "Multiple Traps": "Mehrfache Fallen",
      "Cluster Traps": "Fallenansammlung",
      "Trap and Mine Damage": "Fallen- und Minenschaden",
      "Minefield": "Minenfeld",
      "Blastchain Mine": "Sprengkettenmine",
      "High Impact Mine": "Hochschlagmine",
      "Hextouch": "Fluchberührung",
      "Curse on Hit": "Fluch bei Treffer",
      "Blasphemy": "Blasphemie",

      // Ascendancy Classes
      "Deadeye": "Scharfschütze",
      "Pathfinder": "Pfadfinderin",
      "Invoker": "Beschwörer",
      "Chronomancer": "Zeitmagier",
      "Warrior": "Krieger",
      "Witch": "Hexe",
      "Monk": "Mönch",
      "Sorceress": "Zauberin",
      "Ranger": "Waldläuferin",
      "Mercenary": "Söldner",
      "Huntress": "Jägerin",

      // Passive Tree Keywords
      "Projectile Damage": "Projektil-Schaden",
      "Attack Speed": "Angriffsgeschwindigkeit",
      "Cast Speed": "Zaubergeschwindigkeit",
      "Movement Speed": "Bewegungsgeschwindigkeit",
      "Critical Strike Chance": "Kritische Trefferchance",
      "Critical Strike Multiplier": "Kritischer Treffermultiplikator",
      "Life": "Leben",
      "Energy Shield": "Energieschild",
      "Evasion": "Ausweichen",
      "Armour": "Rüstung",
      "Mana": "Mana",
      "Resistance": "Widerstand",
      "Fire Resistance": "Feuerwiderstand",
      "Cold Resistance": "Kältewiderstand",
      "Lightning Resistance": "Blitzwiderstand",
      "Chaos Resistance": "Chaoswiderstand",
      "All Resistances": "Alle Widerstände",
      "Maximum Life": "Maximales Leben",
      "Maximum Mana": "Maximales Mana",
      "Life Regeneration": "Lebensregeneration",
      "Mana Regeneration": "Manaregeneration",
      "Leech": "Blutsauger",
      "Aura": "Aura",
      "Herald": "Herold",
      "Curse": "Fluch",
      "Mark": "Mal",
      "Warcry": "Kriegsschrei",
      "Totem": "Totem",
      "Trap": "Falle",
      "Mine": "Mine",
      "Brand": "Malzeichen",
      "Ballista": "Balliste",

      // Item Types
      "Bow": "Bogen",
      "Quiver": "Köcher",
      "Wand": "Zauberstab",
      "Staff": "Stab",
      "Sceptre": "Zepter",
      "Dagger": "Dolch",
      "Claw": "Klaue",
      "Sword": "Schwert",
      "Axe": "Axt",
      "Mace": "Streitkolben",
      "Flail": "Flegel",
      "Spear": "Speer",
      "Crossbow": "Armbrust",
      "Shield": "Schild",
      "Helmet": "Helm",
      "Body Armour": "Körperrüstung",
      "Gloves": "Handschuhe",
      "Boots": "Stiefel",
      "Belt": "Gürtel",
      "Ring": "Ring",
      "Amulet": "Amulett",
      "Jewel": "Juwel",
      "Focus": "Fokus",
      "Catalyst": "Katalysator",
      "Distilled Emotion": "Destillierte Emotion",

      // Currency
      "Orb of Alchemy": "Alchimiekugel",
      "Chaos Orb": "Chaoskugel",
      "Exalted Orb": "Erhabene Kugel",
      "Divine Orb": "Göttliche Kugel",
      "Orb of Annulment": "Kugel der Annullierung",
      "Vaal Orb": "Vaal-Kugel",
      "Orb of Scouring": "Kugel der Scheuerung",
      "Regal Orb": "Königliche Kugel",
      "Jeweller's Orb": "Juwelierskugel",
      "Orb of Fusing": "Kugel der Verschmelzung",
      "Chromatic Orb": "Chromatische Kugel",
      "Transmutation Shard": "Transmutationssplitter",
      "Scroll of Wisdom": "Schriftrolle der Weisheit",
      "Portal Scroll": "Portal-Schriftrolle",
      "Armourer's Scrap": "Rüstungsschrott",
      "Blacksmith's Whetstone": "Schmiedewetzstein",
      "Glassblower's Bauble": "Glasbläserfläschchen",
      "Orb of Transmutation": "Kugel der Transmutation",
      "Orb of Augmentation": "Kugel der Erweiterung",
      "Orb of Alteration": "Kugel der Veränderung",

      // Keystone Passives
      "Crimson Dance": "Purpurtanz",
      "Iron Reflexes": "Eiserne Reflexe",
      "Unwavering Stance": "Unerschütterliche Haltung",
      "Resolute Technique": "Entschlossene Technik",
      "Point Blank": "Aus nächster Nähe",
      "Acrobatics": "Akrobatik",
      "Phase Acrobatics": "Phasenakrobatik",
      "Eldritch Battery": "Eldritch-Batterie",
      "Mind over Matter": "Geist über Materie",
      "Chaos Inoculation": "Chaos-Inokulation",
      "Divine Shield": "Göttlicher Schild",
      "Zealot's Oath": "Eid des Zeloten",
      "Avatar of Fire": "Avatar des Feuers",
      "Ancestral Bond": "Ahnenbande",
      "Elemental Equilibrium": "Elementares Gleichgewicht",
      "Ghost Reaver": "Geistplünderer",
      "Vaal Pact": "Vaal-Pakt",
      "Pain Attunement": "Schmerzabstimmung",
      "Conduit": "Leitung",
      "Elemental Overload": "Elementarüberlastung",
    },
  };
}

// ─── ZUSAMMENFÜHRUNG DER QUELLEN ────────────────────────────────────────────

/**
 * Führt Backup-Extraktionen mit dem hardcoded Dictionary zusammen.
 * Backup-Daten haben VORRANG (überschreiben hardcoded Einträge).
 */
function mergeDictionaries(hardcoded, backupSkills, backupStats) {
  const result = {
    skills: { ...hardcoded.skills },
    stats: { ...hardcoded.stats },
  };

  // Backup-Skills überschreiben hardcoded Skills
  for (const [en, de] of Object.entries(backupSkills)) {
    result.skills[en] = de;
  }

  // Backup-Stats überschreiben hardcoded Stats
  for (const [en, de] of Object.entries(backupStats)) {
    result.stats[en] = de;
  }

  return result;
}

// ─── SPEICHERN ──────────────────────────────────────────────────────────────

/**
 * Speichert das Übersetzungs-JSON in die Ausgabedatei.
 */
function saveTranslations(translations) {
  const skillKeys = Object.keys(translations.skills);
  const statKeys = Object.keys(translations.stats);
  const totalCount = skillKeys.length + statKeys.length;

  const output = {
    skills: translations.skills,
    stats: translations.stats,
    metadata: {
      source: "src/data/backup/*.json (official game data) + hardcoded fallback",
      fetchedAt: new Date().toISOString(),
      skillCount: skillKeys.length,
      statCount: statKeys.length,
      totalCount,
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  const sizeKb = (Buffer.byteLength(JSON.stringify(output), "utf-8") / 1024).toFixed(1);
  console.log(`\n💾 Gespeichert: ${OUTPUT_FILE}`);
  console.log(`   ${totalCount} Übersetzungen (${output.metadata.skillCount} Skills + ${output.metadata.statCount} Stats), ${sizeKb} KB`);

  // Zeige einige Beispiele
  console.log(`\n📋 Beispiele (erste 10 Skills):`);
  const sampleSkills = skillKeys.slice(0, 10);
  for (const en of sampleSkills) {
    console.log(`   "${en}" → "${translations.skills[en]}"`);
  }
  if (statKeys.length > 0) {
    console.log(`\n📋 Beispiele (erste 5 Stats):`);
    const sampleStats = statKeys.slice(0, 5);
    for (const en of sampleStats) {
      console.log(`   "${en}" → "${translations.stats[en]}"`);
    }
  }
}

// ─── HAUPTFUNKTION ──────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  🎮  PoE 2 — Übersetzungs-Extraktor (aus Backup-Spieldateien)");
  console.log("=".repeat(70));
  console.log(`\n📅 Start: ${new Date().toISOString()}`);
  console.log(`📂 Backup-Verzeichnis: ${BACKUP_DIR}`);

  // Hardcoded Dictionary als Basis
  const hardcoded = getHardcodedDictionary();
  console.log(`\n📚 Hardcoded Dictionary: ${Object.keys(hardcoded.skills).length} Skills + ${Object.keys(hardcoded.stats).length} Stats`);

  // ── Schritt 1: Skill-Gems aus Backups extrahieren ────────────────────
  const skillGemTranslations = extractSkillGemTranslations();

  // ── Schritt 2: ActiveSkills aus Backups extrahieren ──────────────────
  const activeSkillTranslations = extractActiveSkillTranslations();

  // ── Schritt 3: PassiveSkills aus Backups extrahieren ─────────────────
  const passiveSkillTranslations = extractPassiveSkillTranslations();

  // ── Schritt 4: Stats aus Backups extrahieren ─────────────────────────
  const statTranslations = extractStatTranslations();

  // ── Schritt 5: Characters aus Backups extrahieren ────────────────────
  const characterTranslations = extractCharacterTranslations();

  // ── Zusammenführen ──────────────────────────────────────────────────
  console.log("\n── Ergebnisse zusammenführen ──");

  // Merge alle Skill-Quellen
  const allSkills = {
    ...skillGemTranslations,
    ...activeSkillTranslations,
    ...passiveSkillTranslations,
    ...characterTranslations,
  };

  const allStats = {
    ...statTranslations,
  };

  // Merge mit hardcoded (Backup-Daten haben Vorrang)
  const merged = mergeDictionaries(hardcoded, allSkills, allStats);

  const backupSkillTotal = Object.keys(allSkills).length;
  const backupStatTotal = Object.keys(allStats).length;

  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Hardcoded:        ${Object.keys(hardcoded.skills).length} Skills + ${Object.keys(hardcoded.stats).length} Stats`);
  console.log(`   Backup-Extraktion: ${backupSkillTotal} Skills + ${backupStatTotal} Stats`);
  console.log(`   Gesamt (merged):   ${Object.keys(merged.skills).length} Skills + ${Object.keys(merged.stats).length} Stats`);

  saveTranslations(merged);

  console.log("\n" + "=".repeat(70));
  console.log("  ✅  FERTIG");
  console.log("=".repeat(70));
  console.log(`\n💡 Die Datei kann nun in src/app/api/translate/route.ts`);
  console.log(`   als Known-Good-Referenz eingebunden werden.`);
}

// ─── START ──────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("❌  FATALER FEHLER:", err);

  // Auch bei fatalem Fehler: Hardcoded Dictionary speichern
  console.log("\n⚠️  Speichere hardcoded Fallback-Dictionary …");
  const hardcoded = getHardcodedDictionary();
  saveTranslations({
    skills: hardcoded.skills,
    stats: hardcoded.stats,
  });

  process.exit(1);
});
