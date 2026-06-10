/**
 * useHydration.ts — Stellt sicher, dass der Zustand-Store aus dem Local Storage
 * hydriert wird, nachdem die React-Komponente auf dem Client gemountet ist.
 *
 * Da wir in buildStore.ts `skipHydration: true` setzen, müssen wir manuell
 * `rehydrate()` aufrufen. Das verhindert Hydration-Mismatches mit Next.js SSR.
 */
"use client";

import { useEffect, useState } from "react";
import { useBuildStore } from "@/context/buildStore";

export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void useBuildStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  return hydrated;
}
