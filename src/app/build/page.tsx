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
 * Farbpalette: Hintergrund #1a1a2e, Akzente #c8a96e (PoE-Gold).
 * Alle Übersetzungen aus App-Datenbanken (gems, passives) und
 * poe2-translations.json. KEIN Mistral/API-Aufruf.
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
          <div
            className="h-32 rounded-2xl border"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderColor: "rgba(200, 169, 110, 0.1)",
            }}
          />
          <div
            className="h-48 rounded-2xl border"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderColor: "rgba(200, 169, 110, 0.1)",
            }}
          />
          <div
            className="h-32 rounded-2xl border"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderColor: "rgba(200, 169, 110, 0.1)",
            }}
          />
        </div>
      </div>
    );
  }

  // Leerer Zustand – kein Build geladen
  if (!hasBuildData) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed mb-5"
            style={{
              background: "rgba(26, 26, 46, 0.6)",
              borderColor: "rgba(200, 169, 110, 0.2)",
            }}
          >
            <Swords className="h-7 w-7" style={{ color: "rgba(200, 169, 110, 0.4)" }} />
          </div>
          <h1
            className="text-xl font-bold mb-2"
            style={{ color: "#c8c8d0" }}
          >
            Kein Build geladen
          </h1>
          <p
            className="text-sm max-w-md leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.3)" }}
          >
            Importiere einen Build über die{" "}
            <a
              href="/import"
              className="underline hover:opacity-80"
              style={{ color: "#c8a96e" }}
            >
              Import-Seite
            </a>
            {" "}oder erstelle einen neuen Build im{" "}
            <a
              href="/gemmen"
              className="underline hover:opacity-80"
              style={{ color: "#c8a96e" }}
            >
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
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderColor: "rgba(200, 169, 110, 0.15)",
            }}
          >
            <div
              className="px-5 py-3.5"
              style={{
                borderBottom: "1px solid rgba(200, 169, 110, 0.1)",
                background: "rgba(0, 0, 0, 0.15)",
              }}
            >
              <h2
                className="flex items-center gap-2 text-base font-semibold"
                style={{ color: "#f0e6d3" }}
              >
                <Shield className="h-4 w-4" style={{ color: "#c8a96e" }} />
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
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          borderColor: "rgba(200, 169, 110, 0.15)",
        }}
      >
        <div
          className="px-5 py-3.5"
          style={{
            borderBottom: "1px solid rgba(200, 169, 110, 0.1)",
            background: "rgba(0, 0, 0, 0.15)",
          }}
        >
          <h2
            className="flex items-center gap-2 text-base font-semibold"
            style={{ color: "#f0e6d3" }}
          >
            <Sparkles className="h-4 w-4" style={{ color: "#c8a96e" }} />
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
