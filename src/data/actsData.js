// ============================================================
// Statische Daten: Akte-Fahrplan (alle PoE-Begriffe bewahrt)
// ============================================================

export const INITIAL_ACTS = [
  {
    id: 1,
    act: 'Akt 1',
    title: 'Witch Mule & Magmakugel',
    done: false,
    steps: [
      'MULE-TRICK: Erstelle eine <span class="text-purple-400 font-bold">Hexe</span>. Mache Quests bis Lvl 4.',
      'Kaufe mit Hexe: <span class="text-white font-bold">Magmakugel</span>, Frostspurt, Arkane Woge, Flammenwand & <span class="text-blue-400 font-bold">Elementare Ausweitung</span>. Lege alles in die Truhe!',
      '<span class="text-red-500 font-black uppercase">WICHTIG (Magmakugel):</span> Hexe darf sie NICHT leveln (Lvl 1 lassen). Sobald der Marodeur sie hat, levelt er sie bis max Lvl 8–10!',
      'Marodeur Start: Kaufe zwei <span class="text-orange-400 font-bold">Ziegenhorn</span> beim Händler!',
      'Skill: <span class="text-white font-bold">Magmakugel</span> + <span class="text-blue-300">Entzünden</span> + <span class="text-blue-300">Elementare Ausweitung</span>.',
    ],
  },
  {
    id: 2,
    act: 'Akt 2',
    title: 'Rubinring & RF Vorbereitung',
    done: false,
    steps: [
      'Rezept: <span class="text-white font-bold">Eisenring</span> + roter Gem = <span class="text-orange-400 font-bold">Rubinring</span> (2x machen!).',
      'Nach Fidelitas: Kaufe <span class="text-orange-400 font-bold">Gerechtes Feuer</span> (RF) bei Yeena.',
      'Aura: <span class="text-yellow-400 font-bold">Herold des Donners</span> boostet deine <span class="text-white font-bold">Magmakugel</span>.',
      'Waffe: Nutze ein <span class="text-orange-400 font-bold">ZEPTER</span> + Schild für <span class="text-white font-bold">Schildsturm</span>.',
      'Banditen: <span class="text-orange-400 font-bold">Kraityn helfen</span> (Lauftempo) ODER <span class="text-red-400 font-black">Alle Töten</span> (+1 Skillpunkt).',
    ],
  },
  {
    id: 3,
    act: 'Akt 3–4',
    title: 'Der RF Swap & Lab 1',
    done: false,
    steps: [
      'Meisterschaft: <span class="text-orange-400 font-bold">Regeneration pro 1% ungedecktem Feuerwiderstand</span>.',
      'Ziel: <span class="text-red-400 font-black">Mind. 120 Feuerwiderstand</span> (durch Crafting an der Werkbank).',
      'Sobald 120 erreicht: <span class="text-orange-500 font-bold">Zünde Gerechtes Feuer!</span>',
      'Bibliothek: Kaufe <span class="text-orange-400 font-bold">Feuerfalle</span>. Level sie im 2. Waffenset!',
      'Labyrinth 1: Wähle <span class="text-orange-400 font-bold">HÄUPTLING</span> (Tasalio, reinigendes Wasser).',
    ],
  },
  {
    id: 4,
    act: 'Akt 5–10',
    title: 'Labyrinthe & Verteidigung',
    done: false,
    steps: [
      'Golem: Hole <span class="text-white font-bold">Steingolem beschwören</span>.',
      'Automatik: <span class="text-white font-bold">Auslösung bei erlittenem Schaden</span> (Lvl 1) + <span class="text-white font-bold">Geschmolzener Panzer</span> (Lvl 10).',
      'Labyrinth 2: Skille <span class="text-orange-400 font-bold">Valako, Umarmung des Sturms</span>.',
      'Labyrinth 3: Skille <span class="text-orange-400 font-bold">Ramako, Licht der Sonne</span>.',
      'Labyrinth 4 (Endgame): Skille <span class="text-orange-400 font-bold">Hinekora, Wut des Todes</span> für Explosionen!',
    ],
  },
];

// Tab-Reihenfolge für Swipe-Gesten
export const TAB_ORDER = ['leveling', 'setups', 'shop', 'stops', 'tips'];
