"use client";

import { TreePine, Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useBuildStore } from "@/context/buildStore";
import { getAllCharacterClasses, getAllPassiveTalents, getCharacterClassById, getPassiveTalentById } from "@/data/passives";

const ALL_CHARACTER_CLASSES = getAllCharacterClasses();
const ALL_PASSIVE_TALENTS = getAllPassiveTalents();

/** Mapping von Talent-ID zu Emoji-Icon – sauber als Record statt if-else-Kette */
const TALENT_ICONS: Record<string, string> = {
  "crimson-dance": "🩸",
  "toxic-strikes": "☠️",
  "deadly-infusion": "⚡",
  "heart-of-flame": "🔥",
  "frost-walker": "❄️",
  "thunderous-salvo": "⚡",
  "heavy-draw": "🏹",
  "iron-reflexes": "🛡️",
  "vitality-veins": "❤️",
  "whispers-of-doom": "👁️",
  "arcane-potency": "💎",
  "lord-of-the-dead": "💀",
};

export default function SkilltreePage() {
  const {
    characterClass,
    setClass,
    selectedPassives,
    togglePassive,
    setPassives,
  } = useBuildStore(
    useShallow((s) => ({
      characterClass: s.characterClass,
      setClass: s.setClass,
      selectedPassives: s.selectedPassives,
      togglePassive: s.togglePassive,
      setPassives: s.setPassives,
    })),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* ============================================================ */}
      {/* HEADER                                                       */}
      {/* ============================================================ */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3">
          <TreePine className="h-8 w-8 text-amber-500" />
          <h1 className="text-3xl font-bold tracking-tight text-amber-400 sm:text-4xl">
            Skilltree
          </h1>
        </div>
        <p className="mt-2 text-zinc-400">
          Wähle deine Klasse und aktiviere die passiven Talente für deinen Build.
        </p>
      </div>

      {/* ============================================================ */}
      {/* BEREICH 1: KLASSENAUSWAHL                                     */}
      {/* ============================================================ */}
      <section className="mb-16">
        <h2 className="mb-6 text-xl font-semibold text-zinc-200">
          1. Klasse wählen
        </h2>

        {/* Grid der 6 Klassenkarten */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {ALL_CHARACTER_CLASSES.map((cls) => {
            const isSelected = characterClass === cls.id;

            return (
              <button
                key={cls.id}
                onClick={() => setClass(isSelected ? null : cls.id)}
                className={`
                  group relative flex flex-col items-center rounded-xl border-2 p-4 text-center
                  transition-all duration-200
                  ${
                    isSelected
                      ? "border-amber-400 bg-amber-900/20 shadow-[0_0_20px_-5px] shadow-amber-600/50"
                      : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500 hover:bg-zinc-800/40"
                  }
                `}
              >
                {/* Icon */}
                <span className="mb-2 text-3xl transition-transform duration-200 group-hover:scale-110">
                  {cls.icon}
                </span>

                {/* Deutscher Name */}
                <span
                  className={`text-sm font-bold ${
                    isSelected ? "text-amber-300" : "text-zinc-200"
                  }`}
                >
                  {cls.nameDe}
                </span>

                {/* Englischer Name (klein) */}
                <span className="mt-0.5 text-[11px] text-zinc-500">
                  {cls.nameEn}
                </span>

                {/* Beschreibung (nur auf hover/ausgewählt sichtbar) */}
                <p className="mt-2 text-[11px] leading-tight text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
                  {cls.description}
                </p>

                {/* Ausgewählt-Badge */}
                {isSelected && (
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white shadow-lg">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Info-Badge: gewählte Klasse */}
        {characterClass && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-300">
            <Sparkles className="h-4 w-4" />
            Gewählte Klasse:{" "}
            <strong>
              {getCharacterClassById(characterClass)?.nameDe ?? characterClass}
            </strong>
            <button
              onClick={() => setClass(null)}
              className="ml-2 rounded-md px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Zurücksetzen
            </button>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* BEREICH 2: PASSIVE TALENTE (KEYNOTES / NOTABLES)              */}
      {/* ============================================================ */}
      <section>
        <h2 className="mb-6 text-xl font-semibold text-zinc-200">
          2. Passive Talente auswählen
        </h2>

        <p className="mb-6 text-sm text-zinc-500">
          Klicke auf einen Knoten, um das Talent zu aktivieren. Nochmaliges
          Klicken deaktiviert es. Aktive Talente leuchten golden.
        </p>

        {/* Gewählte Talente zählen */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
            {selectedPassives.length} / {ALL_PASSIVE_TALENTS.length} Talente aktiv
          </span>

          {selectedPassives.length > 0 && (
            <button
              onClick={() => setPassives([])}
              className="rounded-md px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            >
              Alle deaktivieren
            </button>
          )}
        </div>

        {/* Talent-Knoten im flexiblen Raster */}
        <div className="flex flex-wrap justify-center gap-6">
          {ALL_PASSIVE_TALENTS.map((talent) => {
            const isActive = selectedPassives.includes(talent.id);

            return (
              <button
                key={talent.id}
                onClick={() => togglePassive(talent.id)}
                className={`
                  group relative flex w-36 flex-col items-center text-center
                  transition-all duration-200
                `}
              >
                {/* Der kreisförmige Knoten */}
                <div
                  className={`
                    mb-2 flex h-20 w-20 items-center justify-center rounded-full
                    border-2 transition-all duration-300
                    ${
                      isActive
                        ? "border-amber-400 bg-amber-900/30 shadow-[0_0_25px_-3px] shadow-amber-500/60"
                        : "border-zinc-600 bg-zinc-800/60 shadow-[0_0_0_0] shadow-transparent hover:border-zinc-400 hover:bg-zinc-700/60"
                    }
                  `}
                >
                  {/* Inhalt des Knotens */}
                  <span
                    className={`text-2xl transition-transform duration-200 ${
                      isActive ? "scale-110" : "scale-100 group-hover:scale-110"
                    }`}
                  >
                    {/* Icon aus Mapping-Tabelle (erweiterbar ohne Code-Änderung) */}
                    {TALENT_ICONS[talent.id] ?? "⭐"}
                  </span>
                </div>

                {/* Name (Deutsch) */}
                <span
                  className={`text-xs font-semibold leading-tight transition-colors ${
                    isActive ? "text-amber-300" : "text-zinc-300"
                  }`}
                >
                  {talent.nameDe}
                </span>

                {/* Englischer Name (klein) */}
                <span className="mt-0.5 text-[10px] text-zinc-600">
                  {talent.nameEn}
                </span>

                {/* Hover-Tooltip mit Beschreibung */}
                <div className="pointer-events-none absolute -bottom-2 left-1/2 z-10 w-52 -translate-x-1/2 translate-y-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-left opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  <p className="text-xs font-semibold text-amber-300">
                    {talent.nameDe}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-300">
                    {talent.description}
                  </p>
                  {talent.effect && (
                    <p className="mt-1 text-[10px] italic text-zinc-500">
                      {talent.effect}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* ZUSAMMENFASSUNG (Build-Übersicht)                              */}
      {/* ============================================================ */}
      {(characterClass || selectedPassives.length > 0) && (
        <section className="mt-16 rounded-xl border border-zinc-700 bg-zinc-900/40 p-6">
          <h2 className="mb-4 text-lg font-semibold text-amber-400">
            Build-Zusammenfassung
          </h2>

          <div className="space-y-3 text-sm">
            {/* Klasse */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Klasse:</span>
              <span className="font-medium text-zinc-200">
                {characterClass
                  ? getCharacterClassById(characterClass)?.nameDe ??
                    characterClass
                  : "—"}
              </span>
            </div>

            {/* Aktive Talente */}
            <div>
              <span className="text-zinc-500">Aktive Talente:</span>
              {selectedPassives.length === 0 ? (
                <span className="ml-2 text-zinc-500">—</span>
              ) : (
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  {selectedPassives.map((id) => {
                    const talent = getPassiveTalentById(id);
                    if (!talent) return null;
                    return (
                      <li key={id} className="text-zinc-300">
                        <span className="font-medium text-amber-300">
                          {talent.nameDe}
                        </span>
                        <span className="text-zinc-500">
                          {" — "}
                          {talent.description}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
