/**
 * savedBuildsStore.ts — Zustand-Store für gespeicherte Build-Übersetzungen.
 *
 * Speichert bis zu 5 übersetzte Build-Guides lokal im Browser (localStorage).
 * Jeder Eintrag enthält Name, den übersetzten Markdown-Inhalt und Erstellungsdatum.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedBuild {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

interface SavedBuildsState {
  builds: SavedBuild[];
  /** Speichert einen Build. Gibt die neue ID zurück. Ältester wird entfernt wenn > 5. */
  saveBuild: (name: string, content: string) => string;
  deleteBuild: (id: string) => void;
  updateBuildName: (id: string, name: string) => void;
}

export const useSavedBuildsStore = create<SavedBuildsState>()(
  persist(
    (set) => ({
      builds: [],

      saveBuild: (name, content) => {
        const id = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        set((state) => {
          const newBuild: SavedBuild = { id, name, content, createdAt: Date.now() };
          const updated = [newBuild, ...state.builds];
          // Max 5 Builds — älteste werden entfernt
          return { builds: updated.slice(0, 5) };
        });
        return id;
      },

      deleteBuild: (id) =>
        set((state) => ({ builds: state.builds.filter((b) => b.id !== id) })),

      updateBuildName: (id, name) =>
        set((state) => ({
          builds: state.builds.map((b) => (b.id === id ? { ...b, name } : b)),
        })),
    }),
    {
      name: "poe2-saved-builds",
      version: 1,
      skipHydration: true,
    }
  )
);
