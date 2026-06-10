/**
 * GlobalStatsPanel.tsx — Charakter-Übersicht im RPG-Stil.
 *
 * Zeigt die berechneten Gesamtwerte aus allen Quellen (Items, Gemmen, Passives)
 * in Kategorien organisiert an. Kann als Sidebar oder Offcanvas-Drawer genutzt werden.
 *
 * Design: Schmale Sidebar am rechten Rand, die auf jeder Route sichtbar ist.
 */

"use client";

import { useState, useMemo } from "react";
import { useCharacterStats } from "@/hooks/useCharacterStats";
import type { CharacterStats, OffensiveStats, DefensiveStats, UtilityStats } from "@/lib/statCalculator";

// ============================================================
// KONFIGURATION: Welche Stats werden unter welcher Überschrift
// angezeigt, mit Label, Key und optionaler Einheit.
// ============================================================

interface StatDef {
  label: string;
  key: string;
  unit?: string;
  invertColor?: boolean; // true = negative Werte sind "gut" (z. B. Manakosten-Reduktion)
}

const OFFENSIVE_STATS: StatDef[] = [
  { label: "Physischer Schaden", key: "physischerSchaden", unit: "%" },
  { label: "Feuerschaden", key: "feuerSchaden", unit: "%" },
  { label: "Kälteschaden", key: "kälteSchaden", unit: "%" },
  { label: "Blitzschaden", key: "blitzSchaden", unit: "%" },
  { label: "Chaosschaden", key: "chaosSchaden", unit: "%" },
  { label: "Giftschaden", key: "giftSchaden", unit: "%" },
  { label: "Elementarschaden", key: "elementarSchaden", unit: "%" },
  { label: "Zauberschaden", key: "zauberschaden", unit: "%" },
  { label: "Angriffsgeschwindigkeit", key: "angriffsgeschwindigkeit", unit: "%" },
  { label: "Krit. Trefferchance", key: "kritischeTrefferchance", unit: "%" },
  { label: "Krit. Multiplikator", key: "kritischerMultiplikator", unit: "%" },
  { label: "Projektilgeschwindigkeit", key: "projektilgeschwindigkeit", unit: "%" },
  { label: "Schaden über Zeit", key: "schadenUeberZeit", unit: "%" },
];

const DEFENSIVE_STATS: StatDef[] = [
  { label: "Rüstung", key: "ruestung" },
  { label: "Ausweichwert", key: "ausweichwert" },
  { label: "Maximales Leben", key: "maximalesLeben" },
  { label: "Max. Leben (Prozent)", key: "maximalesLebenProzent", unit: "%" },
  { label: "Maximales Mana", key: "maximalesMana" },
  { label: "Max. Mana (Prozent)", key: "maximalesManaProzent", unit: "%" },
  { label: "Leben-Regeneration", key: "lebenRegeneration", unit: "%" },
  { label: "Feuerwiderstand", key: "feuerwiderstand", unit: "%" },
  { label: "Kältewiderstand", key: "kältewiderstand", unit: "%" },
  { label: "Blitzwiderstand", key: "blitzwiderstand", unit: "%" },
  { label: "Chaoswiderstand", key: "chaoswiderstand", unit: "%" },
];

const UTILITY_STATS: StatDef[] = [
  { label: "Bewegungsgeschwindigkeit", key: "bewegungsgeschwindigkeit", unit: "%" },
  { label: "Seltenheitswert", key: "seltenheitswert" },
  { label: "Stärke", key: "staerke" },
  { label: "Geschicklichkeit", key: "geschicklichkeit" },
  { label: "Intelligenz", key: "intelligenz" },
  { label: "Manakosten-Reduktion", key: "manaKostenReduktion", unit: "%", invertColor: true },
  { label: "Fluch-Limit", key: "fluchLimit", unit: " Stk." },
  { label: "Max. Diener", key: "maximaleDiener", unit: " Stk." },
  { label: "Zusätzliche Projektile", key: "projektile", unit: " Stk." },
];

// ============================================================
// HILFSKOMPONENTE: Ein einzelner Stat-Eintrag
// ============================================================

function StatRow({ label, value, unit, invertColor }: { label: string; value: number; unit?: string; invertColor?: boolean }) {
  if (value === 0) return null; // Null-Werte ausblenden

  const isPositive = value > 0;
  const isBeneficial = invertColor ? !isPositive : isPositive;

  const colorClass = isBeneficial ? "text-emerald-400" : "text-red-400";
  const prefix = isPositive ? "+" : "";

  return (
    <div className="flex justify-between items-center gap-2 text-sm py-0.5 px-1 rounded hover:bg-zinc-800/50 transition-colors">
      <span className="text-zinc-400 truncate">{label}</span>
      <span className={`font-mono tabular-nums whitespace-nowrap ${colorClass}`}>
        {prefix}{value}{unit ?? ""}
      </span>
    </div>
  );
}

// ============================================================
// HILFSKOMPONENTE: Stat-Kategorie mit Überschrift
// ============================================================

function StatCategory({
  title,
  icon,
  stats,
  data,
}: {
  title: string;
  icon: string;
  stats: StatDef[];
  data: OffensiveStats | DefensiveStats | UtilityStats;
}) {
  // Typsicherer Zugriff auf Zahlenwerte (die konkreten Interfaces haben keine Index-Signatur)
  // Der doppelte Cast ist nötig, weil die konkreten Typen keine string-Index-Signatur haben
  const d = data as unknown as Record<string, number>;

  // Prüfen, ob es überhaupt anzuzeigende Werte gibt
  const hasAny = stats.some((s) => d[s.key] !== 0);
  if (!hasAny) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs uppercase tracking-widest font-semibold text-amber-500/80 mb-2 flex items-center gap-1.5 px-1">
        <span className="text-base">{icon}</span>
        {title}
      </h3>
      <div className="space-y-0.5">
        {stats.map((stat) => (
          <StatRow
            key={stat.key}
            label={stat.label}
            value={d[stat.key]}
            unit={stat.unit}
            invertColor={stat.invertColor}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// HAUPTKOMPONENTE
// ============================================================

export default function GlobalStatsPanel() {
  const stats = useCharacterStats();
  const [isOpen, setIsOpen] = useState(true);

  // Zähle aktive Stats für das Badge – memoized, da stats sich nur bei echten Änderungen bewegt
  const totalMods = useMemo(() => {
    const countNonZero = <T,>(obj: T) =>
      Object.values(obj as Record<string, number>).filter((v) => v !== 0).length;
    return (
      countNonZero(stats.offensive) +
      countNonZero(stats.defensive) +
      countNonZero(stats.utility)
    );
  }, [stats]);

  return (
    <>
      {/* Toggle-Button — immer sichtbar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed top-20 right-0 z-50
          flex items-center gap-1.5
          px-2 py-2 rounded-l-md
          bg-zinc-900/90 border border-r-0 border-zinc-700/50
          text-zinc-400 hover:text-amber-400 hover:border-amber-700/50
          transition-all duration-200
          shadow-lg
          ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}
        title="Charakter-Statistiken anzeigen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M3 3.5A1.5 1.5 0 014.5 2h1.745a1.5 1.5 0 011.371.922l1.758 3.95a1.5 1.5 0 01-.275 1.61L7.157 10.63a6.003 6.003 0 003.213 3.213l2.148-1.942a1.5 1.5 0 011.61-.275l3.95 1.758A1.5 1.5 0 0118 14.755V16.5a1.5 1.5 0 01-1.5 1.5h-.5A13.5 13.5 0 012.5 4.5v-.5A1.5 1.5 0 014 3.5h-.5z"
            clipRule="evenodd"
          />
        </svg>
        {totalMods > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {totalMods}
          </span>
        )}
      </button>

      {/* Panel selbst — als schmale rechte Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 z-40 h-full
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          w-64
          bg-zinc-900/95 backdrop-blur-sm
          border-l border-zinc-800/80
          shadow-2xl shadow-black/50
          flex flex-col
          overflow-hidden
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <h2 className="text-sm font-bold text-amber-400 tracking-wide flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M3 3.5A1.5 1.5 0 014.5 2h1.745a1.5 1.5 0 011.371.922l1.758 3.95a1.5 1.5 0 01-.275 1.61L7.157 10.63a6.003 6.003 0 003.213 3.213l2.148-1.942a1.5 1.5 0 011.61-.275l3.95 1.758A1.5 1.5 0 0118 14.755V16.5a1.5 1.5 0 01-1.5 1.5h-.5A13.5 13.5 0 012.5 4.5v-.5A1.5 1.5 0 014 3.5h-.5z"
                clipRule="evenodd"
              />
            </svg>
            Charakter-Stats
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            title="Schließen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Scrollbarer Inhalt */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {totalMods === 0 ? (
            <div className="text-center text-zinc-600 text-sm mt-8">
              <p className="mb-2">📊</p>
              <p>Noch keine aktiven Modifikatoren.</p>
              <p className="text-xs mt-1">
                Rüste Items aus, wähle Gemmen oder aktiviere Talente.
              </p>
            </div>
          ) : (
            <>
              <StatCategory
                title="Offensive"
                icon="⚔️"
                stats={OFFENSIVE_STATS}
                data={stats.offensive}
              />
              <StatCategory
                title="Defensive"
                icon="🛡️"
                stats={DEFENSIVE_STATS}
                data={stats.defensive}
              />
              <StatCategory
                title="Utility"
                icon="🔧"
                stats={UTILITY_STATS}
                data={stats.utility}
              />
            </>
          )}
        </div>

        {/* Footer mit Quellen-Info */}
        <div className="px-3 py-2 border-t border-zinc-800 text-[10px] text-zinc-600 shrink-0 text-center">
          Items · Gemmen · Passive
        </div>
      </aside>
    </>
  );
}
