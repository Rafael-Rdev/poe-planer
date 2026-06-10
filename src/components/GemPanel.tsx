"use client";

import { useMemo } from "react";
import { getGemById, type Gem } from "@/data/gems";
import { useBuildStore } from "@/context/buildStore";
import GemSocket from "./GemSocket";
import ActiveMods from "./ActiveMods";
import { Swords, Link2 } from "lucide-react";

/**
 * Das 6-Sockel-Gemmen-Panel – PoE 2 Link-Ketten-Design.
 *
 * Layout:
 *   Aktive Hauptgemme (Slot 0) prominent links/oben,
 *   5 Support-Gemmen reihen sich in einer Kette rechts/unten an.
 *
 * SVG-Linien zwischen den Sockeln stellen die "Links" dar:
 *   - Aktiv gesockelt  → durchgezogene Amber/Gold-Linie mit Leuchten
 *   - Leerer Slot      → gestrichelte, dunkle Verbindung
 */

/** Farb- und Linienstile für Link-Verbindungen */
const linkStyles = {
  active: {
    stroke: "rgb(245 158 11 / 0.7)",   // amber-500
    glow: "rgb(245 158 11 / 0.35)",
    width: 2.5,
    dashArray: "none",
  },
  inactive: {
    stroke: "rgb(63 63 70 / 0.5)",    // zinc-700
    glow: "transparent",
    width: 1.5,
    dashArray: "4 3",
  },
};

export default function GemPanel() {
  const sockets = useBuildStore((s) => s.sockets);
  const setSocket = useBuildStore((s) => s.setSocket);

  /** Aktive Gemme (Slot 0) */
  const activeGem = sockets[0] ? getGemById(sockets[0]) : null;

  /** Indizes aller Support-Slots die eine Gemme haben (in Reihenfolge) */
  const filledSupportIndices = useMemo(
    () => sockets.slice(1).map((id, i) => (id ? i + 1 : -1)).filter((i) => i >= 0),
    [sockets],
  );

  /** Alle Support-Gemmen die gesockelt sind */
  const allSupports = useMemo(() => {
    return sockets
      .slice(1)
      .map((id) => (id ? getGemById(id) : null))
      .filter((g): g is Gem => g !== null);
  }, [sockets]);

  /** Zählt die aktiven Support-Links */
  const activeSupportCount = filledSupportIndices.length;

  /** Maximale Link-Länge (von Slot 0) */
  const maxLinkedSupportIndex = useMemo(() => {
    // In PoE 2 sind die Slots in Reihe geschaltet. Die Kette reißt ab,
    // sobald ein Slot leer ist. Aber hier zeigen wir ALLE Verbindungen an,
    // unterscheiden nur aktiv/inaktiv visuell.
    let max = 0;
    for (let i = 1; i < 6; i++) {
      if (sockets[i]) max = i;
      // PoE 2-Logik: Kette reißt ab, wenn ein Slot leer ist
      else break;
    }
    return max;
  }, [sockets]);

  function handleSelectGem(socketIndex: number, gemId: string | null) {
    setSocket(socketIndex, gemId);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
      {/* Linke Seite: Sockel-Gruppe + Info */}
      <div className="flex-1 w-full">
        {/* Header */}
        <div className="mb-3">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-zinc-200">
            <Swords className="h-4 w-4 text-amber-400" />
            Gemmen-Verknüpfung
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Die aktive Fertigkeit ist mit bis zu 5 Support-Gemmen verbunden.
            Jede Verknüpfung leuchtet, sobald der Slot besetzt ist.
          </p>
        </div>

        {/* PoE-Rüstungs-Dummy / Item-Background */}
        <div className="relative rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4 lg:p-5 shadow-lg overflow-x-auto">
          {/* Item-Header (Dummy-Rüstung) */}
          <div className="mb-3 flex items-center gap-2 border-b border-zinc-800 pb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700 bg-zinc-800/80">
              <Swords className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Rüstung (6 Sockel)</p>
              <p className="text-[10px] text-zinc-500">
                {activeGem
                  ? activeSupportCount > 0
                    ? `${activeSupportCount} Support-Gem${activeSupportCount > 1 ? "men" : ""} verlinkt`
                    : "Keine Support-Gemmen gesockelt"
                  : "Keine Gemmen gesockelt"}
              </p>
            </div>

            {/* Link-Count Badge */}
            <div className="ml-auto flex items-center gap-1 rounded-full border border-amber-700/50 bg-amber-900/20 px-2 py-0.5">
              <Link2 className="h-3 w-3 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">
                {maxLinkedSupportIndex}L
              </span>
            </div>
          </div>

          {/* ================================================================
               PoE 2 Link-Ketten-Layout
               Mobile (< 640px): Vertikal gestapelt
               Desktop (≥ 640px): Hauptgemme links, Supports nach rechts
               ================================================================ */}

          {/* MOBILE: Vertikale Anordnung */}
          <div className="flex sm:hidden flex-col items-center gap-3 py-2">
            {/* Hauptgemme – groß */}
            <GemSocket
              socketIndex={0}
              gemId={sockets[0]}
              linkedSockets={filledSupportIndices}
              onSelectGem={handleSelectGem}
              size="lg"
            />

            {/* Support-Gemmen in einer Spalte darunter */}
            {[1, 2, 3, 4, 5].map((i) => {
              const gemId = sockets[i];
              const isLinked = i <= maxLinkedSupportIndex && activeGem !== null;
              const linkStyle = gemId && isLinked ? linkStyles.active : linkStyles.inactive;

              return (
                <div key={i} className="flex flex-col items-center relative">
                  {/* Vertikale Link-Linie */}
                  <svg
                    className="h-6 w-8 -mb-1"
                    viewBox="0 0 32 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    {/* Glow */}
                    {linkStyle.glow !== "transparent" && (
                      <line
                        x1="16" y1="0" x2="16" y2="24"
                        stroke={linkStyle.glow}
                        strokeWidth={linkStyle.width + 3}
                        strokeLinecap="round"
                        opacity={0.5}
                      />
                    )}
                    {/* Kern-Linie */}
                    <line
                      x1="16" y1="0" x2="16" y2="24"
                      stroke={linkStyle.stroke}
                      strokeWidth={linkStyle.width}
                      strokeDasharray={linkStyle.dashArray}
                      strokeLinecap="round"
                    />
                    {/* Link-Segment-Dekoration (kleine Querbalken wie PoE-Links) */}
                    {gemId && isLinked && (
                      <>
                        <line x1="8" y1="8" x2="24" y2="8"
                          stroke="rgb(245 158 11 / 0.6)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <line x1="8" y1="16" x2="24" y2="16"
                          stroke="rgb(245 158 11 / 0.6)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                    {!gemId && (
                      <>
                        <line x1="10" y1="8" x2="22" y2="8"
                          stroke="rgb(63 63 70 / 0.4)"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          strokeLinecap="round"
                        />
                        <line x1="10" y1="16" x2="22" y2="16"
                          stroke="rgb(63 63 70 / 0.4)"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </svg>

                  <GemSocket
                    socketIndex={i}
                    gemId={gemId}
                    linkedSockets={[0]}
                    onSelectGem={handleSelectGem}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>

          {/* DESKTOP: Horizontale Link-Kette */}
          <div className="hidden sm:flex flex-row items-center justify-center gap-0 py-3 min-w-[580px]">
            {/* Hauptgemme – groß, links */}
            <GemSocket
              socketIndex={0}
              gemId={sockets[0]}
              linkedSockets={filledSupportIndices}
              onSelectGem={handleSelectGem}
              size="lg"
            />

            {/* Horizontale Kette der Support-Gemmen */}
            {[1, 2, 3, 4, 5].map((i) => {
              const gemId = sockets[i];
              const isLinked = i <= maxLinkedSupportIndex && activeGem !== null;
              const linkStyle = gemId && isLinked ? linkStyles.active : linkStyles.inactive;

              return (
                <div key={i} className="flex items-center relative">
                  {/* Horizontale Link-Verbindung als SVG */}
                  <svg
                    className="h-5 w-8 sm:w-10"
                    viewBox="0 0 40 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    {/* Glow-Effekt unter der Hauptlinie */}
                    {linkStyle.glow !== "transparent" && (
                      <line
                        x1="0" y1="10" x2="40" y2="10"
                        stroke={linkStyle.glow}
                        strokeWidth={linkStyle.width + 3}
                        strokeLinecap="round"
                        opacity={0.4}
                      />
                    )}
                    {/* Kern-Verbindungslinie */}
                    <line
                      x1="0" y1="10" x2="40" y2="10"
                      stroke={linkStyle.stroke}
                      strokeWidth={linkStyle.width}
                      strokeDasharray={linkStyle.dashArray}
                      strokeLinecap="round"
                    />
                    {/* Link-Segment-Dekoration – kleine Querbalken wie in PoE */}
                    {gemId && isLinked && (
                      <>
                        <line x1="10" y1="3" x2="10" y2="17"
                          stroke="rgb(245 158 11 / 0.5)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <line x1="20" y1="6" x2="20" y2="14"
                          stroke="rgb(245 158 11 / 0.45)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <line x1="30" y1="3" x2="30" y2="17"
                          stroke="rgb(245 158 11 / 0.5)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                    {!gemId && (
                      <>
                        <line x1="10" y1="6" x2="10" y2="14"
                          stroke="rgb(63 63 70 / 0.35)"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                          strokeLinecap="round"
                        />
                        <line x1="20" y1="7" x2="20" y2="13"
                          stroke="rgb(63 63 70 / 0.3)"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          strokeLinecap="round"
                        />
                        <line x1="30" y1="6" x2="30" y2="14"
                          stroke="rgb(63 63 70 / 0.35)"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </svg>

                  <GemSocket
                    socketIndex={i}
                    gemId={gemId}
                    linkedSockets={[0]}
                    onSelectGem={handleSelectGem}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>

          {/* Legende */}
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-2 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="block h-2 w-2 rounded-full border border-red-700 bg-red-950/60" />
              Rot (Stärke)
            </span>
            <span className="flex items-center gap-1">
              <span className="block h-2 w-2 rounded-full border border-emerald-700 bg-emerald-950/60" />
              Grün (Geschick)
            </span>
            <span className="flex items-center gap-1">
              <span className="block h-2 w-2 rounded-full border border-blue-700 bg-blue-950/60" />
              Blau (Intelligenz)
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <span className="block h-0.5 w-4 rounded-full bg-amber-500/70" />
              Verlinkt
            </span>
            <span className="flex items-center gap-1">
              <span className="block h-0.5 w-4 rounded-full border border-dashed border-zinc-700" />
              Leer
            </span>
          </div>
        </div>
      </div>

      {/* Rechte Seite: Aktive Modifikatoren — nur sichtbar wenn eine aktive Gemme gewählt ist */}
      {activeGem && (
        <div className="w-full lg:w-72 xl:w-80 shrink-0">
          <ActiveMods activeGem={activeGem} linkedSupports={allSupports} />
        </div>
      )}
    </div>
  );
}
