"use client";

import { useEffect, useState } from "react";
import { useBuildStore } from "@/context/buildStore";
import BuildHeader from "@/components/BuildHeader";
import SkillsByAct from "@/components/SkillsByAct";
import PassiveNotables from "@/components/PassiveNotables";
import GemPanel from "@/components/GemPanel";
import GlobalStatsPanel from "@/components/GlobalStatsPanel";
import { Swords, Shield, Sparkles } from "lucide-react";

/**
 * Build-Tab – Maxroll-ähnliche Build-Übersicht.
 *
 * Zeigt Build-Header, Skills nach Akt, Passive Notables und
 * das Gemmen-Panel in einer strukturierten deutschen Ansicht.
 *
 * Alle Übersetzungen kommen AUSSCHLIESSLICH aus
 * `scripts/poe2-translations.json` – KEINE Mistral-API-Aufrufe.
 */
export default function BuildPage() {
  const [hydrated, setHydrated] = useState(false);

  // Hydration abwarten (Zustand persist)
  useEffect(() => {
    void useBuildStore.persist.rehydrate();
    // Kurzer Timeout damit der Store initialisiert ist
    const t = setTimeout(() => setHydrated(true), 50);
    return () => clearTimeout(t);
  }, []);

  const hasBuildData = useBuildStore((s) => {
    return (
      s.buildName !== "" ||
      s.author !== "" ||
      s.ascendancy !== "" ||
      s.description !== "" ||
      s.skillsByAct.length > 0 ||
      s.selectedPassives.length > 0 ||
      s.sockets.some((socket) => socket !== null) ||
      s.characterClass !== null
    );
  });

  // Lade-Zustand während der Hydration
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
          <div className="h-48 rounded-xl bg-zinc-900 border border-zinc-800" />
          <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
        </div>
      </div>
    );
  }

  // Leerer Zustand – kein Build geladen
  if (!hasBuildData) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-zinc-700 bg-zinc-900 mb-5">
            <Swords className="h-7 w-7 text-zinc-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-300 mb-2">
            Kein Build geladen
          </h1>
          <p className="text-sm text-zinc-500 max-w-md leading-relaxed">
            Importiere einen Build über die{" "}
            <a href="/import" className="text-amber-400 hover:text-amber-300 underline">
              Import-Seite
            </a>
            {" "}oder erstelle einen neuen Build im{" "}
            <a href="/gemmen" className="text-amber-400 hover:text-amber-300 underline">
              Gemmen-Tab
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Build-Header: Name, Autor, Ascendancy, Beschreibung */}
      <BuildHeader />

      {/* Hauptinhalt: 2-Spalten-Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Spalte: Skills & Passives */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skills nach Akt */}
          <SkillsByAct />

          {/* Passive Notables */}
          <PassiveNotables />
        </div>

        {/* Rechte Spalte: Stats & Ausrüstung */}
        <div className="space-y-6">
          {/* Globale Stats */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800/50 bg-zinc-900/50">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-200">
                <Shield className="h-4 w-4 text-amber-400" />
                Charakter-Statistiken
              </h2>
            </div>
            <div className="p-4">
              <GlobalStatsPanel />
            </div>
          </div>
        </div>
      </div>

      {/* Gemmen-Panel (volle Breite) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800/50 bg-zinc-900/50">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-200">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Gemmen-Verknüpfung
          </h2>
        </div>
        <div className="p-4">
          <GemPanel />
        </div>
      </div>
    </div>
  );
}
