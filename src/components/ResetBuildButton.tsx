/**
 * ResetBuildButton.tsx — "Build zurücksetzen" Button.
 *
 * Zeigt eine Mülltonnen-Grafik und öffnet einen Bestätigungs-Dialog.
 * Kann wahlweise als Icon-Button (navbar) oder als Text-Button (Dashboard) verwendet werden.
 */
"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { useBuildStore } from "@/context/buildStore";

interface ResetBuildButtonProps {
  /** Button-Variante: "icon" für die Navbar, "full" für das Dashboard */
  variant?: "icon" | "full";
}

export default function ResetBuildButton({ variant = "icon" }: ResetBuildButtonProps) {
  const resetBuild = useBuildStore((s) => s.resetBuild);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleReset() {
    resetBuild();
    setShowConfirm(false);
    // Entferne den ?build= Query-Parameter aus der URL,
    // damit der alte Build nicht versehentlich neu hydriert wird.
    window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <>
      {/* Auslöser-Button */}
      {variant === "icon" ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors text-zinc-500 hover:bg-red-900/30 hover:text-red-400"
          title="Build zurücksetzen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-red-800/50 hover:bg-red-950/30 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
          Build zurücksetzen
        </button>
      )}

      {/* Bestätigungs-Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />

          {/* Dialog */}
          <div className="relative mx-4 w-full max-w-sm rounded-xl border border-zinc-700/50 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-900/40">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    Build zurücksetzen?
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Alle Sockets, Items, Talente und die Klasse werden gelöscht.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
