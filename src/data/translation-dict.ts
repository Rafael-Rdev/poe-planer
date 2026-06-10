/**
 * Übersetzungs-Wörterbuch: Englisch → Deutsch (PS5-Terminologie)
 *
 * Dieses Dictionary dient als Mapping-Tabelle für den Parser.
 * Es werden englische Begriffe (Gems, Passive Nodes, Items, etc.)
 * auf ihre deutschen PS5-Entsprechungen gemappt.
 */

export type TranslationDict = Record<string, string>;

/**
 * Sortiert nach Länge absteigend (längere Phrasen zuerst),
 * damit der Parser exaktere Matches vor allgemeineren findet.
 */
export const translationDict: TranslationDict = {
  // ========================
  // GEM NAMES (Skill Gems)
  // ========================
  "Lightning Arrow": "Blitzpfeil",
  "Elemental Damage with Attacks": "Elementarschaden mit Angriffen",
  "Elemental Damage": "Elementarschaden",
  "Fury of the Storm": "Furie des Sturms",
  "Piercing Force": "Durchdringende Kraft",
  "Heavy Draw": "Schwerer Zug",
  "Thunderous Salvo": "Donnernde Salve",
  "Lightning Rod": "Blitzstab",
  "Ice Shot": "Eisschuss",
  "Tornado Shot": "Tornadoschuss",
  "Rain of Arrows": "Pfeilregen",
  "Galvanic Shards": "Galvanische Splitter",
  "Fragmentation Rounds": "Fragmentierungsgeschosse",
  "Explosive Grenade": "Explosivgranate",
  "Flame Wall": "Flammenwall",
  "Orb of Storms": "Kugel der Stürme",
  "Firestorm": "Feuersturm",
  "Contagion": "Ansteckung",
  "Essence Drain": "Essenzentzug",
  "Summon Raging Spirits": "Wütende Geister beschwören",
  "Raise Zombie": "Zombie erwecken",
  "Despair": "Verzweiflung",

  // ========================
  // SUPPORT GEMS
  // ========================
  "Added Lightning": "Hinzugefügter Blitzschaden",
  "Added Cold": "Hinzugefügter Kälteschaden",
  "Added Fire": "Hinzugefügter Feuerschaden",
  "Added Chaos": "Hinzugefügter Chaos-Schaden",
  "Greater Multiple Projectiles": "Größere Mehrfachprojektile",
  "Lesser Multiple Projectiles": "Geringere Mehrfachprojektile",
  "Chain": "Kette",
  "Fork": "Gabelung",
  "Pierce": "Durchdringen",
  "Elemental Focus": "Elementarfokus",
  "Critical Strikes": "Kritische Treffer",
  "Critical Damage": "Kritischer Schaden",
  "Increased Critical": "Erhöhte Kritische",
  "Inspiration": "Inspiration",

  // ========================
  // ASCENDANCY NODES
  // ========================
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

  // ========================
  // PASSIVE TREE KEYWORDS
  // ========================
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

  // ========================
  // SKILL / BUFF KEYWORDS
  // ========================
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

  // ========================
  // ITEM TYPES
  // ========================
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

  // ========================
  // CURRENCY & ITEMS
  // ========================
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
};

/**
 * Gibt eine nach Länge absteigend sortierte Liste der
 * englischen Schlüssel zurück (längere Matches zuerst).
 */
export function getSortedKeys(): string[] {
  return Object.keys(translationDict).sort(
    (a, b) => b.length - a.length
  );
}