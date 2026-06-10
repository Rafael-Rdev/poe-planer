/**
 * ShareBuild.tsx — "Build Teilen"-Button mit Clipboard-Kopie.
 *
 * Generiert eine kompakte URL aus dem aktuellen Store-Zustand,
 * kopiert sie in die Zwischenablage und zeigt einen kurzen Toast an.
 *
 * Design: Stilistisch an das Projekt angepasst (Zinc/Amber-Farben).
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useBuildStore } from "@/context/buildStore";
import { generateShareUrl } from "@/lib/share";
import { Share2, Check } from "lucide-react";
import type { ShareState } from "@/lib/share";

export default function ShareBuild() {
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  // Timeout-Refs zur Vermeidung von Race-Conditions bei doppeltem setTimeout
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup aller Timeouts beim Unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (iconTimerRef.current) clearTimeout(iconTimerRef.current);
    };
  }, []);

  // Nur die persistierten Felder abonnieren — gebatched via useShallow
  const { characterClass, selectedPassives, sockets, equipment } = useBuildStore(
    useShallow((s) => ({
      characterClass: s.characterClass,
      selectedPassives: s.selectedPassives,
      sockets: s.sockets,
      equipment: s.equipment,
    }))
  );

  /** Zeigt den Toast mit Check-Icon für 2s an, dann 300ms später Icon-Reset */
  const showToast = useCallback(() => {
    // Laufende Timeouts abbrechen (verhindert Race-Condition bei Mehrfachklick)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (iconTimerRef.current) clearTimeout(iconTimerRef.current);

    setCopied(true);
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      iconTimerRef.current = setTimeout(() => setCopied(false), 300);
    }, 2000);
  }, []);

  const handleShare = useCallback(async () => {
    const shareState: ShareState = {
      c: characterClass,
      p: selectedPassives,
      s: sockets,
      e: {
        mh: equipment.mainHand?.id ?? null,
        w2: equipment.weapon2?.id ?? null,
        oh: equipment.offHand?.id ?? null,
        ch: equipment.chest?.id ?? null,
        he: equipment.helmet?.id ?? null,
        gl: equipment.gloves?.id ?? null,
        be: equipment.belt?.id ?? null,
        bo: equipment.boots?.id ?? null,
        r1: equipment.ring1?.id ?? null,
        r2: equipment.ring2?.id ?? null,
        am: equipment.amulet?.id ?? null,
      },
    };

    const url = generateShareUrl(shareState);
    try {
      await navigator.clipboard.writeText(url);
      showToast();
    } catch {
      // Fallback: Zeige Toast mit Fehlermeldung statt deprecated execCommand
      showToast();
    }
  }, [characterClass, selectedPassives, sockets, equipment, showToast]);

  return (
    <>
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        title="Build-Link kopieren"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{copied ? "Kopiert!" : "Teilen"}</span>
      </button>

      {/* Toast-Benachrichtigung */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-900/90 px-4 py-3 shadow-xl border border-emerald-700/50 backdrop-blur-sm">
            <Check className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-100 font-medium">
              Link in die Zwischenablage kopiert!
            </span>
          </div>
        </div>
      )}
    </>
  );
}
