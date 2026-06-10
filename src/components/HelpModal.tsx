/**
 * HelpModal.tsx — PS5 & PoB Info-Guide (Modal).
 *
 * Öffnet ein elegantes Modal mit einer deutschen Anleitung für PS5-Spieler.
 * Wird über ein Fragezeichen-Icon (?) in der Navbar geöffnet.
 */
"use client";

import { X, HelpCircle, BookOpenText, Download, Gamepad2 } from "lucide-react";
import { useEffect, useCallback } from "react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Stack-basierter Overflow-Counter: verhindert Konflikte bei mehreren Overlays
let overlayCount = 0;
let savedOverflow = "";

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  // Schließen mit Escape-Taste
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      overlayCount++;
      if (overlayCount === 1) {
        savedOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);
      } else if (overlayCount > 1) {
        document.addEventListener("keydown", handleKeyDown);
      }
    }
    return () => {
      if (isOpen) {
        overlayCount--;
        document.removeEventListener("keydown", handleKeyDown);
        if (overlayCount === 0) {
          document.body.style.overflow = savedOverflow;
        }
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-lg rounded-xl border border-zinc-700/50 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-900/40">
              <HelpCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                PS5 & PoB-Guide
              </h2>
              <p className="text-xs text-zinc-500">
                Hilfreiche Tipps für die Nutzung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inhalt */}
        <div className="space-y-5">
          {/* Eintrag 1 */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <BookOpenText className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-200">
                Warum dieser Planer?
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              PS5-Spieler spielen oft auf Deutsch, die meisten Tools im Netz
              sind jedoch nur auf Englisch verfügbar. Dieser Planer übersetzt
              komplexe Builds, Items und Skills automatisch ins Deutsche – mit
              der offiziellen PS5-Terminologie!
            </p>
          </div>

          {/* Eintrag 2 */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Download className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-200">
                Wie importiere ich?
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              Kopiere einfach den englischen PoB-Code (Path of Building) oder
              einen Text-Build aus Foren, füge ihn auf der{" "}
              <span className="font-medium text-zinc-300">Import</span>-Seite
              ein und klicke auf <span className="font-medium text-zinc-300">
                Importieren
              </span>
              . Der Planer erkennt automatisch, was du eingefügt hast, und
              übersetzt alles.
            </p>
          </div>

          {/* Eintrag 3 */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-200">
                PS5-Tipp
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              Lass die App auf deinem Smartphone oder Tablet neben dem Fernseher
              offen, während du auf der PS5 spielst! So hast du alle
              Übersetzungen, Skill-Informationen und Build-Details immer
              griffbereit.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-zinc-800 pt-4 text-center">
          <p className="text-xs text-zinc-600">
            PoE 2 Build-Planer v1.0 — Für die deutsche PS5-Community ❤️
          </p>
        </div>
      </div>
    </div>
  );
}
