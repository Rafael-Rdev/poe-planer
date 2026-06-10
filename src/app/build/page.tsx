"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { Upload, TreePine, Zap, Shield, Settings2, ChevronRight } from "lucide-react";

import { useBuildStore } from "@/context/buildStore";
import { getCharacterClassById, getPassiveTalentById } from "@/data/passives";
import { getGemById, type Gem } from "@/data/gems";
import { useCharacterStats } from "@/hooks/useCharacterStats";
import { useHydration } from "@/hooks/useHydration";
import GemPanel from "@/components/GemPanel";
import ActiveMods from "@/components/ActiveMods";

// ─── Farb-Mappings ────────────────────────────────────────────────

const CLASS_COLORS: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  warrior:   { border: "border-red-700/60",     bg: "bg-red-950/30",     text: "text-red-300",     badge: "bg-red-900/50 text-red-200" },
  witch:     { border: "border-purple-700/60",  bg: "bg-purple-950/30",  text: "text-purple-300",  badge: "bg-purple-900/50 text-purple-200" },
  sorceress: { border: "border-blue-700/60",    bg: "bg-blue-950/30",    text: "text-blue-300",    badge: "bg-blue-900/50 text-blue-200" },
  ranger:    { border: "border-emerald-700/60", bg: "bg-emerald-950/30", text: "text-emerald-300", badge: "bg-emerald-900/50 text-emerald-200" },
  huntress:  { border: "border-green-700/60",   bg: "bg-green-950/30",   text: "text-green-300",   badge: "bg-green-900/50 text-green-200" },
  mercenary: { border: "border-orange-700/60",  bg: "bg-orange-950/30",  text: "text-orange-300",  badge: "bg-orange-900/50 text-orange-200" },
  monk:      { border: "border-cyan-700/60",    bg: "bg-cyan-950/30",    text: "text-cyan-300",    badge: "bg-cyan-900/50 text-cyan-200" },
};
const DEFAULT_COLOR = { border: "border-amber-700/60", bg: "bg-amber-950/20", text: "text-amber-300", badge: "bg-amber-900/50 text-amber-200" };

// ─── Stat-Definitionen für die Build-Seite ────────────────────────

const KEY_OFFENSIVE = [
  { label: "Physischer Schaden", key: "physischerSchaden", unit: "%" },
  { label: "Elementarschaden",   key: "elementarSchaden",  unit: "%" },
  { label: "Blitzschaden",       key: "blitzSchaden",      unit: "%" },
  { label: "Feuerschaden",       key: "feuerSchaden",      unit: "%" },
  { label: "Kälteschaden",       key: "kälteSchaden",      unit: "%" },
  { label: "Chaosschaden",       key: "chaosSchaden",      unit: "%" },
  { label: "Angriffsgesch.",     key: "angriffsgeschwindigkeit", unit: "%" },
  { label: "Krit. Chance",       key: "kritischeTrefferchance",  unit: "%" },
  { label: "Krit. Multipli.",    key: "kritischerMultiplikator", unit: "%" },
  { label: "Projektile",         key: "projektile",        unit: " Stk." },
];
const KEY_DEFENSIVE = [
  { label: "Max. Leben",         key: "maximalesLeben",    unit: "" },
  { label: "Max. Mana",          key: "maximalesMana",     unit: "" },
  { label: "Rüstung",            key: "ruestung",          unit: "" },
  { label: "Ausweichen",         key: "ausweichwert",      unit: "" },
  { label: "Feuerwiderstand",    key: "feuerwiderstand",   unit: "%" },
  { label: "Kältewiderstand",    key: "kältewiderstand",   unit: "%" },
  { label: "Blitzwiderstand",    key: "blitzwiderstand",   unit: "%" },
  { label: "Chaoswiderstand",    key: "chaoswiderstand",   unit: "%" },
  { label: "Leben-Regen.",       key: "lebenRegeneration", unit: "%" },
];
const KEY_UTILITY = [
  { label: "Bewegungsgesch.",    key: "bewegungsgeschwindigkeit", unit: "%" },
  { label: "Stärke",             key: "staerke",           unit: "" },
  { label: "Geschicklichkeit",   key: "geschicklichkeit",  unit: "" },
  { label: "Intelligenz",        key: "intelligenz",       unit: "" },
  { label: "Max. Diener",        key: "maximaleDiener",    unit: " Stk." },
  { label: "Mana-Reduktion",     key: "manaKostenReduktion", unit: "%" },
];

// ─── Hilfskomponenten ─────────────────────────────────────────────

function SectionCard({ title, icon, children, className = "" }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-5 py-3.5">
        <span className="text-amber-400">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatBlock({
  title,
  icon,
  defs,
  data,
}: {
  title: string;
  icon: React.ReactNode;
  defs: { label: string; key: string; unit: string }[];
  data: Record<string, number>;
}) {
  const visible = defs.filter((d) => data[d.key] !== 0);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-amber-400/80">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500/80">{title}</h3>
      </div>
      <div className="space-y-1">
        {visible.map(({ label, key, unit }) => {
          const val = data[key];
          const positive = val > 0;
          return (
            <div key={key} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-zinc-800/50 transition-colors">
              <span className="text-xs text-zinc-400">{label}</span>
              <span className={`font-mono text-xs tabular-nums font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
                {positive ? "+" : ""}{val}{unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PassiveCard({ id }: { id: string }) {
  const talent = getPassiveTalentById(id);
  if (!talent) return null;
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition-all hover:border-amber-700/40 hover:bg-zinc-800/60">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-700/30 bg-amber-950/40 text-base">
        🌟
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-100 group-hover:text-amber-300 transition-colors">
          {talent.nameDe}
        </p>
        {talent.description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">
            {talent.description}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-zinc-700 bg-zinc-900/60">
        <Shield className="h-8 w-8 text-zinc-600" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-zinc-300">Kein Build geladen</h2>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">
        Importiere einen Build aus Mobalytics, Maxroll oder als PoB-Code um die Übersicht zu sehen.
      </p>
      <Link
        href="/import"
        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-900/30 transition-all hover:bg-amber-500 hover:shadow-amber-900/50"
      >
        <Upload className="h-4 w-4" />
        Build importieren
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────

export default function BuildPage() {
  const hydrated = useHydration();

  const { characterClass, sockets, selectedPassives, level, setLevel } = useBuildStore(
    useShallow((s) => ({
      characterClass: s.characterClass,
      sockets: s.sockets,
      selectedPassives: s.selectedPassives,
      level: s.level,
      setLevel: s.setLevel,
    }))
  );

  const stats = useCharacterStats();

  const classData = useMemo(
    () => (characterClass ? getCharacterClassById(characterClass) : null),
    [characterClass]
  );

  const activeGem = useMemo(
    (): Gem | null => (sockets[0] ? getGemById(sockets[0]) ?? null : null),
    [sockets]
  );

  const linkedSupports = useMemo(
    (): Gem[] =>
      sockets
        .slice(1)
        .map((id) => (id ? getGemById(id) ?? null : null))
        .filter((g): g is Gem => g !== null),
    [sockets]
  );

  const hasSockets = sockets.some((s) => s !== null);
  const hasPassives = selectedPassives.length > 0;
  const hasClass = !!characterClass;
  const hasAnything = hasSockets || hasPassives || hasClass;

  const statsOffensive = stats.offensive as unknown as Record<string, number>;
  const statsDefensive = stats.defensive as unknown as Record<string, number>;
  const statsUtility   = stats.utility   as unknown as Record<string, number>;

  const hasStats =
    KEY_OFFENSIVE.some((d) => statsOffensive[d.key] !== 0) ||
    KEY_DEFENSIVE.some((d) => statsDefensive[d.key] !== 0) ||
    KEY_UTILITY.some((d)   => statsUtility[d.key]   !== 0);

  const colorTheme = classData
    ? (CLASS_COLORS[classData.id] ?? DEFAULT_COLOR)
    : DEFAULT_COLOR;

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  if (!hasAnything) {
    return <EmptyState />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">

      {/* ── KLASSEN-HERO ─────────────────────────────────────────── */}
      {classData && (
        <div className={`mb-8 flex items-center gap-5 rounded-2xl border ${colorTheme.border} ${colorTheme.bg} px-6 py-5`}>
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${colorTheme.border} bg-zinc-900/60 text-4xl shadow-lg`}>
            {classData.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className={`text-2xl font-bold tracking-tight ${colorTheme.text}`}>
                {classData.nameDe}
              </h1>
              <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${colorTheme.badge}`}>
                {classData.nameEn}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-sm text-zinc-400">{classData.description}</p>
              <label className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/70 px-2 py-1">
                <span className="text-xs text-zinc-400">Lvl</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="w-12 bg-transparent text-center text-sm font-bold text-zinc-100 focus:outline-none"
                />
              </label>
            </div>
          </div>
          <Link
            href="/import"
            className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:border-amber-700/50 hover:text-amber-300 sm:flex"
          >
            <Upload className="h-3.5 w-3.5" />
            Build wechseln
          </Link>
        </div>
      )}

      {/* ── HAUPT-GRID: Gems + Passives ──────────────────────────── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">

        {/* Gems-Spalte */}
        <div className="flex flex-col gap-6">
          {hasSockets && (
            <SectionCard
              title="Gemmen"
              icon={<Zap className="h-4 w-4" />}
            >
              <GemPanel />
            </SectionCard>
          )}

          {hasSockets && (
            <ActiveMods activeGem={activeGem} linkedSupports={linkedSupports} />
          )}
        </div>

        {/* Passives-Spalte */}
        {hasPassives && (
          <SectionCard
            title={`Passive Talente (${selectedPassives.length})`}
            icon={<TreePine className="h-4 w-4" />}
          >
            <div className="grid gap-2 sm:grid-cols-1 xl:grid-cols-2">
              {selectedPassives.map((id) => (
                <PassiveCard key={id} id={id} />
              ))}
            </div>
            {selectedPassives.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Link
                  href="/skilltree"
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-400 transition-colors"
                >
                  <TreePine className="h-3.5 w-3.5" />
                  Im Skilltree bearbeiten
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </SectionCard>
        )}

        {/* Fallback wenn keine Passives aber auch kein Gems: leere Passives-Info */}
        {!hasPassives && hasSockets && (
          <SectionCard
            title="Passive Talente"
            icon={<TreePine className="h-4 w-4" />}
          >
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <TreePine className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">Noch keine Talente ausgewählt.</p>
              <Link
                href="/skilltree"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-400 transition-all hover:border-amber-700/50 hover:text-amber-300"
              >
                <TreePine className="h-3.5 w-3.5" />
                Zum Skilltree
              </Link>
            </div>
          </SectionCard>
        )}
      </div>

      {/* ── STATS-GRID ───────────────────────────────────────────── */}
      {hasStats && (
        <SectionCard
          title="Charakter-Stats"
          icon={<Shield className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatBlock
              title="Angriff"
              icon={<Zap className="h-3.5 w-3.5" />}
              defs={KEY_OFFENSIVE}
              data={statsOffensive}
            />
            <StatBlock
              title="Verteidigung"
              icon={<Shield className="h-3.5 w-3.5" />}
              defs={KEY_DEFENSIVE}
              data={statsDefensive}
            />
            <StatBlock
              title="Utility"
              icon={<Settings2 className="h-3.5 w-3.5" />}
              defs={KEY_UTILITY}
              data={statsUtility}
            />
          </div>
        </SectionCard>
      )}

      {/* ── KEINE STATS-HINWEIS ──────────────────────────────────── */}
      {!hasStats && hasAnything && (
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-6 text-center">
          <Settings2 className="mx-auto mb-2 h-6 w-6 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            Noch keine Stats berechnet — rüste Items aus oder wähle Passives aus um Werte zu sehen.
          </p>
        </div>
      )}

    </div>
  );
}
