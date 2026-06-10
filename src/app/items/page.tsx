"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useBuildStore, type EquipmentSlots } from "@/context/buildStore";
import ResetBuildButton from "@/components/ResetBuildButton";
import { getAllItems, type Item } from "@/data/items";
import {
  ChevronDown,
  X,
  Shield,
  Sword,
  Shirt,
  Gem,
  CircleDot,
  Search,
  Footprints,
  HandMetal,
  Crown,
  Crosshair,
} from "lucide-react";

// ============================================================
// RPG-Grid Slot-Konfiguration
// ============================================================
interface SlotConfig {
  key: keyof EquipmentSlots;
  label: string;
  icon: React.ReactNode;
  allowedTypes: string[];
  gridArea: string;
  /** Größerer Slot (body armour) für visuelle Dominanz */
  large?: boolean;
}

const SLOTS: SlotConfig[] = [
  {
    key: "helmet",
    label: "Helm",
    icon: <Crown className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["helmet"],
    gridArea: "helmet",
  },
  {
    key: "mainHand",
    label: "Waffe 1",
    icon: <Sword className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["bow", "sword", "wand", "staff", "flail", "mace", "axe", "dagger", "spear", "crossbow", "sceptre"],
    gridArea: "weapon1",
  },
  {
    key: "chest",
    label: "Rüstung",
    icon: <Shirt className="h-5 w-5 sm:h-6 sm:w-6" />,
    allowedTypes: ["chest"],
    gridArea: "chest",
    large: true,
  },
  {
    key: "offHand",
    label: "Nebenhand",
    icon: <Shield className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["shield", "quiver", "focus"],
    gridArea: "offhand",
  },
  {
    key: "weapon2",
    label: "Waffe 2",
    icon: <Sword className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["bow", "sword", "wand", "staff", "flail", "mace", "axe", "dagger", "spear", "crossbow", "sceptre"],
    gridArea: "weapon2",
  },
  {
    key: "gloves",
    label: "Handschuhe",
    icon: <HandMetal className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["gloves"],
    gridArea: "gloves",
  },
  {
    key: "belt",
    label: "Gürtel",
    icon: <Gem className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["belt"],
    gridArea: "belt",
  },
  {
    key: "boots",
    label: "Stiefel",
    icon: <Footprints className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["boots"],
    gridArea: "boots",
  },
  {
    key: "ring1",
    label: "Ring 1",
    icon: <CircleDot className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["ring"],
    gridArea: "ring1",
  },
  {
    key: "amulet",
    label: "Amulett",
    icon: <Gem className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["amulet"],
    gridArea: "amulet",
  },
  {
    key: "ring2",
    label: "Ring 2",
    icon: <CircleDot className="h-4 w-4 sm:h-5 sm:w-5" />,
    allowedTypes: ["ring"],
    gridArea: "ring2",
  },
];

// ============================================================
// Rarität anhand Stat-Anzahl ermitteln (visueller Indikator)
// ============================================================
function getRarityTier(statsCount: number): "normal" | "magic" | "rare" | "unique" {
  if (statsCount >= 5) return "unique";
  if (statsCount >= 3) return "rare";
  if (statsCount >= 1) return "magic";
  return "normal";
}


// ============================================================
// Items pro Slot-Typ einmalig cachen (Modul-Level)
// ============================================================
const ALL_ITEMS_CACHE = getAllItems();
const SLOT_ITEMS_CACHE = new Map<string, Item[]>();

function getCachedSlotItems(allowedTypes: string[]): Item[] {
  const key = allowedTypes.sort().join(",");
  if (!SLOT_ITEMS_CACHE.has(key)) {
    SLOT_ITEMS_CACHE.set(key, ALL_ITEMS_CACHE.filter((item) => allowedTypes.includes(item.type)));
  }
  return SLOT_ITEMS_CACHE.get(key)!;
}

/** Debounce-Zeit in ms für die Suchfilterung */
const ITEM_SEARCH_DEBOUNCE_MS = 120;

// ============================================================
// Einzelner Ausrüstungs-Slot (kompakte Card mit Dropdown)
// ============================================================
function EquipmentSlotCard({
  slot,
  equipped,
  onEquip,
  onUnequip,
}: {
  slot: SlotConfig;
  equipped: Item | null;
  onEquip: (item: Item) => void;
  onUnequip: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce für die Suche
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, ITEM_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Gefilterte Items (useMemo-stabilisiert)
  const slotItems = useMemo(
    () => {
      const all = getCachedSlotItems(slot.allowedTypes);
      const q = debouncedSearch.trim().toLowerCase();
      if (!q) return all;
      return all.filter(
        (item) =>
          item.nameDe.toLowerCase().includes(q) ||
          item.nameEn.toLowerCase().includes(q)
      );
    },
    [slot.allowedTypes, debouncedSearch],
  );

  const totalItems = getCachedSlotItems(slot.allowedTypes);

  // Stabilisierte Callbacks
  const handleEquip = useCallback(
    (item: Item) => {
      onEquip(item);
      setOpen(false);
      setSearch("");
    },
    [onEquip],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const rarityTier = equipped ? getRarityTier(equipped.stats.length) : "normal";
  const isEmpty = !equipped && slot.allowedTypes.includes("belt") && totalItems.length === 0;
  const isLarge = slot.large === true;

  // Raritäts-Rahmenfarbe
  const rarityBorder = () => {
    if (!equipped) return "border-zinc-600/40";
    switch (rarityTier) {
      case "unique": return "border-amber-600/70";
      case "rare": return "border-amber-500/40";
      case "magic": return "border-blue-800/50";
      default: return "border-zinc-600/40";
    }
  };

  // Raritäts-Glow-Effekt (Box-Shadow)
  const rarityGlow = () => {
    if (!equipped) return "";
    switch (rarityTier) {
      case "unique":
        return "shadow-[0_0_18px_3px_rgba(245,158,11,0.25)]";
      case "rare":
        return "shadow-[0_0_10px_2px_rgba(245,158,11,0.12)]";
      case "magic":
        return "shadow-[0_0_6px_1px_rgba(59,130,246,0.10)]";
      default:
        return "";
    }
  };

  return (
    <div
      className={`
        rpg-slot group relative flex flex-col
        border-2 ${rarityBorder()}
        bg-linear-to-b from-zinc-800/60 via-zinc-900/80 to-zinc-950/90
        backdrop-blur-xs
        ${isLarge ? "p-3 sm:p-4" : "p-2.5 sm:p-3"}
        min-h-0 cursor-default
        ${rarityGlow()}
      `}
      style={{ gridArea: slot.gridArea }}
    >
      {/* Diablo-artige Eckornamente */}
      <span className="slot-corner slot-corner-tl" />
      <span className="slot-corner slot-corner-tr" />
      <span className="slot-corner slot-corner-bl" />
      <span className="slot-corner slot-corner-br" />

      {/* Innenrahmen-Linie (dünner, hellerer Strich innen) */}
      <div className="absolute inset-1 rounded-sm border border-zinc-700/30 pointer-events-none" />

      {/* Slot Header mit Trennlinie */}
      <div className={`
        relative flex items-center gap-1.5 pb-1.5 mb-2
        border-b border-zinc-700/40
        ${isLarge ? "text-[11px] sm:text-xs" : "text-[10px] sm:text-[11px]"}
        font-bold uppercase tracking-[0.15em] text-zinc-400
      `}>
        <span className="text-amber-500/80 shrink-0">{slot.icon}</span>
        <span className="truncate">{slot.label}</span>
      </div>

      {/* Equipped Item oder Platzhalter */}
      {equipped ? (
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <span
                className={`item-name-rarity rarity-${rarityTier} ${
                  isLarge ? "text-sm" : "text-xs"
                } font-semibold truncate leading-tight`}
              >
                {equipped.nameDe}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onUnequip(); }}
                className="shrink-0 rounded p-0.5 text-zinc-600 hover:text-red-400/80 transition-all duration-150 opacity-0 group-hover:opacity-100 hover:bg-red-950/30"
                title="Ablegen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {equipped.stats.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {equipped.stats.slice(0, isLarge ? 4 : 3).map((stat, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] sm:text-[11px] text-magic leading-tight truncate flex items-center gap-1"
                  >
                    <span className="inline-block w-1 h-1 rounded-full bg-magic/60 shrink-0" />
                    +{stat.value}% {stat.name}
                  </div>
                ))}
                {equipped.stats.length > (isLarge ? 4 : 3) && (
                  <div className="text-[10px] text-zinc-500 pl-2">
                    +{equipped.stats.length - (isLarge ? 4 : 3)} weitere
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-zinc-700 italic text-center">bald verfügbar</span>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] sm:text-[11px] text-zinc-600 italic tracking-wide">
            — leer —
          </span>
        </div>
      )}

      {/* Dropdown-Button mit RPG-Stil */}
      {!isEmpty && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
            if (open) setSearch("");
          }}
          className={`
            mt-2 flex items-center justify-center gap-1
            border border-zinc-600/50 bg-zinc-800/70
            px-2 py-1 text-[10px] sm:text-[11px]
            text-zinc-500 font-medium uppercase tracking-wider
            transition-all duration-200
            hover:border-amber-700/50 hover:bg-amber-950/40 hover:text-amber-400
            group-hover:border-zinc-500/60
            ${isLarge ? "py-1.5" : "py-1"}
          `}
        >
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          {equipped ? "Wechseln" : "Ausrüsten"}
        </button>
      )}

      {/* Dropdown-Menü */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={handleClose}
          />
          <div className="absolute left-0 right-0 top-full z-20 mt-1.5 border-2 border-zinc-600/60 bg-zinc-900 shadow-2xl min-w-[200px]">
            {/* Diablo-artige Eckornamente für Dropdown */}
            <span className="slot-corner slot-corner-tl" />
            <span className="slot-corner slot-corner-tr" />
            <span className="slot-corner slot-corner-bl" />
            <span className="slot-corner slot-corner-br" />

            {/* Suchfeld */}
            <div className="relative border-b border-zinc-700 px-2 py-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Item suchen…"
                className="w-full border border-zinc-700 bg-zinc-800 py-1.5 pl-7 pr-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-colors"
                autoFocus
              />
            </div>

            {/* Item-Liste */}
            <div className="max-h-48 overflow-y-auto p-1">
              {slotItems.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-zinc-600">
                  {search.trim()
                    ? "Kein Item gefunden."
                    : "Keine Items verfügbar"}
                </div>
              ) : (
                slotItems.map((item) => {
                  const itemRarity = getRarityTier(item.stats.length);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleEquip(item)}
                      className={`w-full px-2 py-1.5 text-left text-xs transition-colors hover:bg-amber-900/30 hover:text-amber-200 border-l-2 border-transparent hover:border-amber-600/60 ${
                        itemRarity === "unique" ? "text-unique" :
                        itemRarity === "rare" ? "text-rare" :
                        "text-zinc-300"
                      }`}
                    >
                      <div className="font-medium truncate">{item.nameDe}</div>
                      {item.stats.length > 0 && (
                        <div className="flex flex-wrap gap-x-2 text-[10px] text-magic mt-0.5">
                          {item.stats.slice(0, 2).map((s, i) => (
                            <span key={i}>
                              +{s.value}% {s.name}
                            </span>
                          ))}
                          {item.stats.length > 2 && (
                            <span className="text-zinc-500">+{item.stats.length - 2}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Counter */}
            <div className="border-t border-zinc-700 px-2 py-1 text-[10px] text-zinc-600 text-center">
              {slotItems.length} / {totalItems.length} Items
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Hauptseite — RPG-Inventar-Grid
// ============================================================
export default function ItemsPage() {
  const { equipment, setEquipment } = useBuildStore(
    useShallow((s) => ({
      equipment: s.equipment,
      setEquipment: s.setEquipment,
    }))
  );

  // Slot-Map für schnellen Lookup
  const slotMap = useMemo(() => {
    const map = new Map<keyof EquipmentSlots, SlotConfig>();
    for (const slot of SLOTS) {
      map.set(slot.key, slot);
    }
    return map;
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <Crosshair className="mx-auto mb-3 h-10 w-10 text-amber-600" />
        <h1 className="text-3xl font-bold tracking-tight text-amber-400">
          Ausrüstung
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Rüste deinen Charakter aus – RPG-Inventar
        </p>
      </div>

      {/* ================================================================
          RPG INVENTAR GRID
          
          Desktop (>=640px): 3-spaltig mit Helm zentriert oben,
          Rüstung mittig, Waffen links, Offhand rechts.
            [  Helm  ]
            [W1][Chest][Off]
            [W2][Hand ][Belt]
            [  ][Boots][  ]
            [R1][Amu  ][R2]
          
          Mobil (<640px): 2-spaltig, kompakt untereinander.
          ================================================================ */}
      <div className="inventory-grid">
        {SLOTS.map((slot) => (
          <EquipmentSlotCard
            key={slot.key}
            slot={slot}
            equipped={equipment[slot.key]}
            onEquip={(item) => setEquipment(slot.key, item)}
            onUnequip={() => setEquipment(slot.key, null)}
          />
        ))}
      </div>

      {/* Alle ausgerüsteten Stats (Übersicht) */}
      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-zinc-300 flex items-center gap-2">
          <span className="text-amber-500">◆</span>
          Aktive Modifikatoren
        </h2>
        <EquippedStatsSummary equipment={equipment} />
      </div>

      {/* Zurücksetzen */}
      <div className="mt-6 flex justify-center">
        <ResetBuildButton variant="full" />
      </div>
    </div>
  );
}

// ============================================================
// Übersicht aller aktiven Modifikatoren
// ============================================================
function EquippedStatsSummary({
  equipment,
}: {
  equipment: EquipmentSlots;
}) {
  // Sammle alle Stats aus allen ausgerüsteten Items
  const statsMap = new Map<string, number>();

  for (const slot of Object.values(equipment)) {
    if (slot) {
      for (const stat of slot.stats) {
        const current = statsMap.get(stat.name) ?? 0;
        statsMap.set(stat.name, current + stat.value);
      }
    }
  }

  const stats = [...statsMap.entries()];

  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700/50 px-4 py-8 text-center text-sm text-zinc-600">
        Keine Gegenstände ausgerüstet. Wähle Items aus, um ihre Modifikatoren
        hier zu sehen.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/50 p-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([name, total]) => (
          <div key={name} className="flex items-center justify-between text-sm">
            <span className="text-zinc-400 truncate mr-2">{name}</span>
            <span className="font-medium text-magic whitespace-nowrap">
              {total > 0 ? "+" : ""}{total}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}