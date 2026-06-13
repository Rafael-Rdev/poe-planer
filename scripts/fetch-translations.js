#!/usr/bin/env node
/**
 * fetch-translations.js
 * ============================================================================
 * Scraped das deutsche PoE 2 Wiki (pathofexile.fandom.com/de) nach
 * englisch→deutsch Übersetzungen für Skill-Gems, Stats und andere Begriffe.
 *
 * ABHÄNGIGKEITEN: Keine. Nur Node.js Built-ins: fs, path, fetch (Node 18+)
 *
 * QUELLEN (in Reihenfolge):
 *   1. MediaWiki API von pathofexile.fandom.com/de
 *   2. Fallback: poe2wiki.net API
 *   3. Fallback: Umfangreiches hardcoded Dictionary (150+ Einträge)
 *
 * RATE-LIMITING: 500ms zwischen Requests
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
const DELAY_MS = 500;
const TIMEOUT_MS = 10_000;

// MediaWiki API-Endpunkte
const WIKI_API_DE = "https://pathofexile.fandom.com/de/api.php";
const WIKI_API_EN = "https://pathofexile.fandom.com/api.php";
const POE2WIKI_API = "https://www.poe2wiki.net/api.php";

// Deutsche Wiki-Kategorien für Skill-Gems (verschiedene mögliche Namen)
const SKILL_CATEGORIES = [
  "Kategorie:Fertigkeitengemmen",
  "Kategorie:Unterstützungsgemmen",
  "Kategorie:Fertigkeiten",
  "Kategorie:PoE2-Fertigkeiten",
  "Kategorie:PoE2-Fertigkeitengemmen",
  "Kategorie:Aktive_Fertigkeiten",
  "Kategorie:Zauber",
  "Kategorie:Angriffe",
  "Kategorie:Aktive_Fertigkeitengemmen",
];

// Deutsche Wiki-Kategorien für Stats/Attribute
const STAT_CATEGORIES = [
  "Kategorie:Passive_Fertigkeiten",
  "Kategorie:Attribute",
  "Kategorie:Spielmechaniken",
];

// Kategorie für Passive Skills (Keystones, Notables)
const PASSIVE_CATEGORIES = [
  "Kategorie:Schlussstein-Passivfertigkeiten",
  "Kategorie:Bemerkenswerte_Passivfertigkeiten",
  "Kategorie:Passive_Fertigkeiten",
];

// ─── HILFSFUNKTIONEN ────────────────────────────────────────────────────────

/**
 * Verzögert die Ausführung um `ms` Millisekunden.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Führt einen fetch()-Request mit Timeout durch.
 * Gibt das geparste JSON zurück oder null bei Fehler/Timeout.
 * Bei HTTP 429 (Rate-Limit) wird ein exponentieller Backoff angewendet.
 */
async function fetchJson(url, retryCount = 0) {
  const MAX_RETRIES = 3;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (response.status === 429 && retryCount < MAX_RETRIES) {
      // Exponentieller Backoff: 2s, 4s, 8s
      const backoffMs = 2000 * Math.pow(2, retryCount);
      console.warn(`  ⚠️  HTTP 429 (Rate-Limit) – warte ${backoffMs / 1000}s vor Retry ${retryCount + 1}/${MAX_RETRIES}`);
      await sleep(backoffMs);
      return fetchJson(url, retryCount + 1);
    }

    if (response.status === 429) {
      console.warn(`  ⚠️  HTTP 429 für ${url.split("?")[0]} (max. Retries erreicht)`);
      return null;
    }

    if (!response.ok) {
      console.warn(`  ⚠️  HTTP ${response.status} für ${url.split("?")[0]}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn(`  ⏱  Timeout (${TIMEOUT_MS}ms) für ${url.split("?")[0]}`);
    } else {
      console.warn(`  ⚠️  Fehler bei ${url.split("?")[0]}: ${err.message}`);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Baut eine MediaWiki-API-URL mit Query-Parametern.
 */
function buildWikiUrl(baseUrl, params) {
  const searchParams = new URLSearchParams({ format: "json", ...params });
  return `${baseUrl}?${searchParams.toString()}`;
}

// ─── WIKI-SCRAPING: KATEGORIE-MITGLIEDER ────────────────────────────────────

/**
 * Ruft alle Seiten in einer Kategorie ab (via MediaWiki categorymembers API).
 * Nutzt `cmcontinue` für Paginierung.
 */
async function fetchCategoryMembers(apiBase, categoryTitle) {
  console.log(`\n  📂 Durchsuche Kategorie: ${categoryTitle}`);

  const members = [];
  let cmcontinue = null;

  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle: categoryTitle,
      cmlimit: "500",
      cmtype: "page",
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;

    const url = buildWikiUrl(apiBase, params);
    const data = await fetchJson(url);

    if (!data || !data.query || !data.query.categorymembers) {
      console.warn(`     → Keine Ergebnisse (oder Fehler).`);
      break;
    }

    const pages = data.query.categorymembers;
    members.push(...pages);

    cmcontinue = data.continue?.cmcontinue || null;

    if (cmcontinue) {
      await sleep(DELAY_MS);
    }
  } while (cmcontinue);

  console.log(`     → ${members.length} Seiten gefunden.`);
  return members;
}

// ─── WIKI-SCRAPING: LANGLINKS (ENGLISCHER SEITENTITEL) ──────────────────────

/**
 * Ruft den englischen Seitentitel für eine deutsche Wiki-Seite ab.
 * Nutzt die langlinks-Property der MediaWiki-API.
 *
 * Beispiel: "Feuerball" (de) → "Fireball" (en)
 */
async function fetchEnglishTitle(apiBase, germanTitle) {
  const url = buildWikiUrl(apiBase, {
    action: "query",
    titles: germanTitle,
    prop: "langlinks",
    lllang: "en",
  });

  const data = await fetchJson(url);
  if (!data || !data.query || !data.query.pages) return null;

  const pages = data.query.pages;
  const page = Object.values(pages)[0];
  if (!page || !page.langlinks || page.langlinks.length === 0) return null;

  return page.langlinks[0]["*"] || null;
}

// ─── WIKI-SCRAPING: SEITENINHALT (FALLBACK-METHODE) ─────────────────────────

/**
 * Falls langlinks nicht verfügbar sind: Versuche den englischen Namen
 * aus dem Wikitext-Infobox zu extrahieren.
 *
 * Viele deutsche Wiki-Seiten haben eine Vorlage wie:
 *   {{Infobox Fertigkeit
 *   | name_en = Fireball
 *   }}
 */
async function fetchEnglishFromInfobox(apiBase, germanTitle) {
  const url = buildWikiUrl(apiBase, {
    action: "query",
    titles: germanTitle,
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
  });

  const data = await fetchJson(url);
  if (!data || !data.query || !data.query.pages) return null;

  const pages = data.query.pages;
  const page = Object.values(pages)[0];
  if (!page || !page.revisions || page.revisions.length === 0) return null;

  const wikitext = page.revisions[0].slots?.main?.["*"] || "";
  if (!wikitext) return null;

  // Verschiedene Muster für englische Namen in Infoboxen
  const patterns = [
    /\|\s*name_en\s*=\s*([^\n|]+)/i,
    /\|\s*Englischer Name\s*=\s*([^\n|]+)/i,
    /\|\s*english_name\s*=\s*([^\n|]+)/i,
    /\|\s*Name\s*=\s*([^\n|]+)/i,  // manchmal ist Name der englische
  ];

  for (const pattern of patterns) {
    const match = wikitext.match(pattern);
    if (match) {
      return match[1].trim().replace(/\[\[([^\]|]+)\]\]/g, "$1")
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
    }
  }

  return null;
}

// ─── WIKI-SCRAPING: HAUPTLOGIK ──────────────────────────────────────────────

/**
 * Sammelt Übersetzungen aus einer Wiki-Quelle.
 *
 * Strategie:
 *   1. Alle Seiten in Skill-Kategorien finden
 *   2. Für jede Seite den englischen Titel via langlinks ermitteln
 *   3. Bei Fehlschlag: Infobox-Methode als Fallback
 */
async function scrapeWikiTranslations(apiBase, categories, label) {
  console.log(`\n🌐 Scrape ${label} …`);

  const translations = {};

  for (const category of categories) {
    const members = await fetchCategoryMembers(apiBase, category);

    for (const member of members) {
      const germanTitle = member.title;

      // Überspringe Kategorie-Seiten, Vorlagen, etc.
      if (
        germanTitle.startsWith("Kategorie:") ||
        germanTitle.startsWith("Vorlage:") ||
        germanTitle.startsWith("Datei:") ||
        germanTitle.startsWith("Hilfe:") ||
        germanTitle.includes("/")
      ) {
        continue;
      }

      await sleep(DELAY_MS);

      // Methode 1: langlinks
      let englishTitle = await fetchEnglishTitle(apiBase, germanTitle);
      if (!englishTitle) {
        // Methode 2: Infobox
        englishTitle = await fetchEnglishFromInfobox(apiBase, germanTitle);
      }

      if (englishTitle && englishTitle !== germanTitle) {
        // Bereinige Wiki-Markup
        englishTitle = englishTitle
          .replace(/\[\[([^\]|]+)\]\]/g, "$1")
          .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
          .trim();
        const cleanDe = germanTitle
          .replace(/\[\[([^\]|]+)\]\]/g, "$1")
          .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
          .trim();

        if (englishTitle !== cleanDe && englishTitle.length > 1 && cleanDe.length > 1) {
          translations[englishTitle] = cleanDe;
        }
      }

      // Fortschritt anzeigen
      if (Object.keys(translations).length % 20 === 0 && Object.keys(translations).length > 0) {
        console.log(`     → ${Object.keys(translations).length} Übersetzungen gesammelt …`);
      }
    }
  }

  console.log(`  ✅ ${Object.keys(translations).length} Übersetzungen aus ${label} gesammelt.`);
  return translations;
}

// ─── POE2WIKI.NET FALLBACK ──────────────────────────────────────────────────

/**
 * Versucht, Übersetzungen von poe2wiki.net zu extrahieren.
 * poe2wiki.net ist primär englischsprachig, könnte aber
 * langlinks zu deutschen Seiten haben.
 */
async function scrapePoe2Wiki() {
  console.log("\n🌐 Versuche poe2wiki.net …");

  const translations = {};

  // Kategorien auf poe2wiki.net (englisch)
  const categories = [
    "Category:Skill_gems",
    "Category:Active_skill_gems",
    "Category:Support_gems",
    "Category:Spell_skill_gems",
    "Category:Attack_skill_gems",
  ];

  for (const category of categories) {
    const members = await fetchCategoryMembers(POE2WIKI_API, category);

    for (const member of members) {
      const englishTitle = member.title;

      if (
        englishTitle.startsWith("Category:") ||
        englishTitle.startsWith("Template:") ||
        englishTitle.startsWith("File:") ||
        englishTitle.includes("/")
      ) {
        continue;
      }

      await sleep(DELAY_MS);

      // Versuche, den deutschen Titel via langlinks zu bekommen
      const germanTitle = await fetchEnglishTitle(POE2WIKI_API, englishTitle);
      // Achtung: Hier rufen wir langlinks mit llang=de auf, aber unsere
      // fetchEnglishTitle-Funktion ist hart auf "en" kodiert.
      // → Wir bauen den Request manuell.

      const url = buildWikiUrl(POE2WIKI_API, {
        action: "query",
        titles: englishTitle,
        prop: "langlinks",
        lllang: "de",
      });

      const data = await fetchJson(url);
      if (!data || !data.query || !data.query.pages) continue;

      const pages = data.query.pages;
      const page = Object.values(pages)[0];
      if (!page || !page.langlinks || page.langlinks.length === 0) continue;

      const deTitle = page.langlinks[0]["*"];
      if (deTitle && deTitle !== englishTitle) {
        translations[englishTitle] = deTitle;
      }
    }
  }

  console.log(`  ✅ ${Object.keys(translations).length} Übersetzungen von poe2wiki.net.`);
  return translations;
}

// ─── HARDCODED FALLBACK-DICTIONARY ──────────────────────────────────────────

/**
 * Umfangreiches hardcoded Dictionary mit offiziellen PoE 2 Übersetzungen.
 * Wird als Basis verwendet und mit Wiki-Ergebnissen ergänzt.
 * Wiki-Ergebnisse haben Vorrang (überschreiben hardcoded Einträge).
 */
function getHardcodedDictionary() {
  return {
    // ============================================================
    // AKTIVE SKILL GEMS (PoE 2)
    // ============================================================
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

    // ============================================================
    // SUPPORT GEMS
    // ============================================================
    stats: {
      // Support Gems – diese werden oft auch als "Skill" betrachtet
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

      // ============================================================
      // ASCENDANCY CLASSES
      // ============================================================
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

      // ============================================================
      // PASSIVE TREE KEYWORDS
      // ============================================================
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

      // ============================================================
      // ITEM TYPES
      // ============================================================
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

      // ============================================================
      // CURRENCY
      // ============================================================
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

      // ============================================================
      // KEYSTONE PASSIVES
      // ============================================================
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
 * Führt Wiki-Ergebnisse mit dem hardcoded Dictionary zusammen.
 * Wiki-Ergebnisse haben VORRANG (überschreiben hardcoded Einträge).
 */
function mergeDictionaries(hardcoded, wikiSkills, wikiStats) {
  const result = {
    skills: { ...hardcoded.skills },
    stats: { ...hardcoded.stats },
  };

  // Wiki-Skills überschreiben hardcoded Skills
  for (const [en, de] of Object.entries(wikiSkills)) {
    result.skills[en] = de;
  }

  // Wiki-Stats überschreiben hardcoded Stats
  for (const [en, de] of Object.entries(wikiStats)) {
    result.stats[en] = de;
  }

  return result;
}

// ─── SPEICHERN ──────────────────────────────────────────────────────────────

/**
 * Speichert das Übersetzungs-JSON in die Ausgabedatei.
 */
function saveTranslations(translations) {
  const totalCount =
    Object.keys(translations.skills).length +
    Object.keys(translations.stats).length;

  const output = {
    skills: translations.skills,
    stats: translations.stats,
    metadata: {
      source: "pathofexile.fandom.com/de + poe2wiki.net + hardcoded fallback",
      fetchedAt: new Date().toISOString(),
      skillCount: Object.keys(translations.skills).length,
      statCount: Object.keys(translations.stats).length,
      totalCount,
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  const sizeKb = (Buffer.byteLength(JSON.stringify(output), "utf-8") / 1024).toFixed(1);
  console.log(`\n💾 Gespeichert: ${OUTPUT_FILE}`);
  console.log(`   ${totalCount} Übersetzungen (${output.metadata.skillCount} Skills + ${output.metadata.statCount} Stats), ${sizeKb} KB`);
}

// ─── HAUPTFUNKTION ──────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  🎮  PoE 2 — Wiki-Übersetzungs-Scraper");
  console.log("=".repeat(70));
  console.log(`\n📅 Start: ${new Date().toISOString()}`);
  console.log(`⏱  Rate-Limit: ${DELAY_MS}ms zwischen Requests`);
  console.log(`⏱  Timeout: ${TIMEOUT_MS}ms pro Request`);

  // Hardcoded Dictionary als Basis
  const hardcoded = getHardcodedDictionary();
  console.log(`\n📚 Hardcoded Dictionary: ${Object.keys(hardcoded.skills).length} Skills + ${Object.keys(hardcoded.stats).length} Stats`);

  // ── Schritt 1: Deutsches Fandom-Wiki scrapen ─────────────────────
  let wikiSkillTranslations = {};
  let wikiStatTranslations = {};

  console.log("\n── Schritt 1: pathofexile.fandom.com/de ──");

  try {
    wikiSkillTranslations = await scrapeWikiTranslations(
      WIKI_API_DE,
      SKILL_CATEGORIES,
      "Fandom DE (Skills)"
    );
  } catch (err) {
    console.warn(`  ⚠️  Skill-Scraping fehlgeschlagen: ${err.message}`);
  }

  try {
    wikiStatTranslations = await scrapeWikiTranslations(
      WIKI_API_DE,
      [...STAT_CATEGORIES, ...PASSIVE_CATEGORIES],
      "Fandom DE (Stats/Passives)"
    );
  } catch (err) {
    console.warn(`  ⚠️  Stat-Scraping fehlgeschlagen: ${err.message}`);
  }

  // ── Schritt 2: poe2wiki.net Fallback ─────────────────────────────
  console.log("\n── Schritt 2: poe2wiki.net (Fallback) ──");

  let poe2wikiTranslations = {};
  try {
    poe2wikiTranslations = await scrapePoe2Wiki();
    // Merge poe2wiki Ergebnisse in wikiSkillTranslations
    for (const [en, de] of Object.entries(poe2wikiTranslations)) {
      if (!wikiSkillTranslations[en]) {
        wikiSkillTranslations[en] = de;
      }
    }
  } catch (err) {
    console.warn(`  ⚠️  poe2wiki.net-Scraping fehlgeschlagen: ${err.message}`);
  }

  // ── Schritt 3: Zusammenführen & Speichern ────────────────────────
  console.log("\n── Schritt 3: Ergebnisse zusammenführen ──");

  const merged = mergeDictionaries(
    hardcoded,
    wikiSkillTranslations,
    wikiStatTranslations
  );

  const wikiTotal =
    Object.keys(wikiSkillTranslations).length +
    Object.keys(wikiStatTranslations).length;

  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Hardcoded:   ${Object.keys(hardcoded.skills).length} Skills + ${Object.keys(hardcoded.stats).length} Stats`);
  console.log(`   Wiki-Scrape: ${wikiTotal} neue Übersetzungen`);
  console.log(`   Gesamt:      ${Object.keys(merged.skills).length} Skills + ${Object.keys(merged.stats).length} Stats`);

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
