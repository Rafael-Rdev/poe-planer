/**
 * LocalSaveSlots.tsx — Lokale Build-Slots (Browser-Speicher).
 *
 * Ermöglicht das Speichern und Laden von bis zu 3 Builds im Browser.
 * Zeigt ein Eingabefeld zum Benennen und eine Liste der gespeicherten Builds.
 *
 * Sicherheits- & UX-Polishing:
 * - Validiert leere Namen (nur Leerzeichen)
 * - Überschreiben-Bestätigung bei existierendem Namen
 * - Klares Limit von 3 Speicherständen mit Fehlermeldung
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { Save, FolderOpen, Trash2, Check, AlertCircle, AlertTriangle, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useBuildStore } from "@/context/buildStore";

export default function LocalSaveSlots() {
  const {
    savedBuilds,
    saveLocalBuild,
    loadLocalBuild,
    deleteLocalBuild,
  } = useBuildStore(
    useShallow((s) => ({
      savedBuilds: s.savedBuilds,
      saveLocalBuild: s.saveLocalBuild,
      loadLocalBuild: s.loadLocalBuild,
      deleteLocalBuild: s.deleteLocalBuild,
    })),
  );

  // Einzelner zusammengefasster Selector für Build-Daten-Validierung
  const hasBuildData = useBuildStore(
    (s) =>
      s.characterClass !== null ||
      s.selectedPassives.length > 0 ||
      s.sockets.some((id) => id !== null) ||
      Object.values(s.equipment).some((item) => item !== null),
  );

  const [buildName, setBuildName] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<string | null>(null);

  // Toast-Timer-Ref für Cleanup bei Unmount (verhindert State-Leak)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const buildCount = Object.keys(savedBuilds).length;
  const maxSlots = 3;

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  function handleSave() {
    const name = buildName.trim();
    if (!name) {
      showToast("error", "Bitte gib einen Namen für den Build ein.");
      return;
    }
    // Prüfen, ob bereits ein Build mit diesem Namen existiert → Bestätigung einholen
    if (savedBuilds[name]) {
      setConfirmOverwrite(name);
      return;
    }
    if (buildCount >= maxSlots) {
      showToast("error", `Maximal ${maxSlots} Speicherstände möglich. Lösche zuerst einen alten Build, um Platz zu schaffen.`);
      return;
    }
    if (!hasBuildData) {
      showToast("error", "Der aktuelle Build ist leer. Erstelle zuerst einen Build.");
      return;
    }

    saveLocalBuild(name);
    setBuildName("");
    showToast("success", `"${name}" gespeichert!`);
  }

  function handleConfirmOverwrite() {
    if (!confirmOverwrite) return;

    saveLocalBuild(confirmOverwrite);
    setBuildName("");
    setConfirmOverwrite(null);
    showToast("success", `"${confirmOverwrite}" überschrieben!`);
  }

  function handleLoad(name: string) {
    loadLocalBuild(name);
    showToast("success", `"${name}" geladen!`);
  }

  function handleDelete(name: string) {
    deleteLocalBuild(name);
    showToast("success", `"${name}" gelöscht!`);
  }

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50">
      {/* Header */}
      <div className="border-b border-zinc-700/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Save className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">
            Builds speichern
          </h2>
          <span className="ml-auto text-xs text-zinc-500">
            {buildCount}/{maxSlots}
          </span>
        </div>
      </div>

      {/* Speichern-Formular */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={buildName}
            onChange={(e) => setBuildName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder="z.B. Mein Ranger Level 50"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-colors"
            maxLength={40}
          />
          <button
            onClick={handleSave}
            disabled={!buildName.trim() || !hasBuildData}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            Speichern
          </button>
        </div>
      </div>

      {/* Gespeicherte Builds */}
      {buildCount > 0 && (
        <div className="border-t border-zinc-700/50 px-4 py-3">
          <div className="space-y-1.5">
            {Object.entries(savedBuilds).map(([name]) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 transition-colors hover:border-zinc-700"
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
                <span className="flex-1 truncate text-sm text-zinc-300">
                  {name}
                </span>
                <button
                  onClick={() => handleLoad(name)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  title="Build laden"
                >
                  Laden
                </button>
                <button
                  onClick={() => handleDelete(name)}
                  className="rounded-md p-1 text-zinc-600 transition-colors hover:bg-red-900/30 hover:text-red-400"
                  title="Build löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast-Benachrichtigung */}
      {toast && (
        <div
          className={`mx-4 mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            toast.type === "success"
              ? "bg-emerald-900/60 text-emerald-200"
              : "bg-red-900/60 text-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          {toast.text}
        </div>
      )}

      {/* Überschreiben-Bestätigungsdialog */}
      {confirmOverwrite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmOverwrite(null)}
          />

          {/* Dialog */}
          <div className="relative mx-4 w-full max-w-sm rounded-xl border border-zinc-700/50 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-900/40">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    Build überschreiben?
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Der Speicherplatz <span className="font-medium text-zinc-300">&bdquo;{confirmOverwrite}&rdquo;</span> existiert bereits. Möchtest du ihn mit dem aktuellen Build überschreiben?
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmOverwrite(null)}
                className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOverwrite(null)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmOverwrite}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
              >
                Überschreiben
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
