/**
 * useCharacterStats.ts — React-Hook für den Zugriff auf die Rechen-Engine.
 *
 * Abonniert den Zustand-Store und berechnet bei jeder Änderung
 * die aktuellen Charakter-Stats neu.
 */

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useBuildStore } from "@/context/buildStore";
import { calculateAllStats, type CharacterStats } from "@/lib/statCalculator";

export function useCharacterStats(): CharacterStats {
  // Gezielt nur die drei relevanten Felder abonnieren,
  // useShallow sorgt für flachen Vergleich → kein Rerender
  // bei Änderungen an anderen Store-Feldern (z. B. savedBuilds).
  const [equipment, sockets, selectedPassives] = useBuildStore(
    useShallow((s) => [s.equipment, s.sockets, s.selectedPassives] as const)
  );

  // Nur neu berechnen, wenn sich einer der drei Werte ändert
  return useMemo(() => {
    return calculateAllStats(equipment, sockets, selectedPassives);
  }, [equipment, sockets, selectedPassives]);
}
