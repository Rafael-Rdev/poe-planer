import GemPanel from "@/components/GemPanel";
import { Gem } from "lucide-react";

export default function GemmenPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Gem className="h-8 w-8 text-amber-400" />
          <h1 className="text-3xl font-bold tracking-tight text-amber-400 sm:text-4xl">
            Gemmen-System
          </h1>
        </div>
        <p className="mx-auto max-w-2xl text-zinc-400">
          Wähle eine aktive Fertigkeit und verlinke sie mit Unterstützungs-Gemmen.
          Benachbarte Sockel sind automatisch verlinkt – die aktiven Modifikatoren
          werden live rechts angezeigt.
        </p>
      </div>

      {/* Gemmen-Panel */}
      <GemPanel />
    </div>
  );
}