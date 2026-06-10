/**
 * BuildUrlLoader.tsx — Client-Komponente, die den ?build= Parameter aus der URL
 * liest und den Store damit überschreibt.
 *
 * Wird in layout.tsx eingebunden und läuft nur auf dem Client,
 * sodass es keine Hydration-Mismatches mit SSR gibt.
 */
"use client";

import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useBuildStore } from "@/context/buildStore";
import { useHydration } from "@/hooks/useHydration";
import { extractBuildFromUrl, decodeBuildFromBase64, shareStateToEquipment } from "@/lib/share";

export default function BuildUrlLoader() {
  const hydrated = useHydration();
  const loaded = useRef(false);

  const { resetBuild, setClass, setPassives, setSockets, setAllEquipment } =
    useBuildStore(
      useShallow((s) => ({
        resetBuild: s.resetBuild,
        setClass: s.setClass,
        setPassives: s.setPassives,
        setSockets: s.setSockets,
        setAllEquipment: s.setAllEquipment,
      })),
    );

  useEffect(() => {
    // Warte auf Hydration und lade nur einmal
    if (!hydrated || loaded.current) return;

    const buildParam = extractBuildFromUrl();
    if (!buildParam) return;

    const shareState = decodeBuildFromBase64(buildParam);
    if (!shareState) {
      console.warn("[BuildUrlLoader] Ungültiger Build-Code in URL");
      return;
    }

    loaded.current = true;

    // Erst leeren, dann atomar neu setzen via Microtask-Queue
    // (resetBuild garantiert sauberen Ausgangszustand)
    resetBuild();

    // Alle Store-Updates in einer Microtask batchen —
    // React 18+ batched automatisch, aber explizit für Klarheit
    queueMicrotask(() => {
      if (shareState.c) {
        setClass(shareState.c);
      }
      if (shareState.p.length > 0) {
        setPassives(shareState.p);
      }
      if (shareState.s.length > 0) {
        setSockets(shareState.s);
      }
      const equipment = shareStateToEquipment(shareState);
      setAllEquipment(equipment);
    });
  }, [hydrated, resetBuild, setClass, setPassives, setSockets, setAllEquipment]);

  // Diese Komponente rendert nichts
  return null;
}
