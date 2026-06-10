/**
 * share.ts — Utility-Funktionen zum Exportieren und Importieren
 * von Builds als kompakte URL (Base64-kodiert).
 *
 * Die Funktionen serialisieren den Store-State in ein kurzes,
 * URL-sicheres Format und stellen ihn aus einer URL wieder her.
 */
import type { BuildState, EquipmentSlots } from "@/context/buildStore";
import { getItemById } from "@/data/items";

/**
 * Kompakte Serialisierungs-Struktur für die URL.
 * Verwendet kurze Keys, um die URL klein zu halten.
 */
export interface ShareState {
  /** Charakter-Klasse */
  c: string | null;
  /** Aktivierte Passive (IDs) */
  p: string[];
  /** Gesockelte Gemmen (IDs oder null) */
  s: (string | null)[];
  /** Ausrüstung (nur Item-IDs) */
  e: {
    mh: string | null; // mainHand
    w2: string | null; // weapon2
    oh: string | null; // offHand
    ch: string | null; // chest
    he: string | null; // helmet
    gl: string | null; // gloves
    be: string | null; // belt
    bo: string | null; // boots
    r1: string | null; // ring1
    r2: string | null; // ring2
    am: string | null; // amulet
  };
}

/**
 * Typwächter: Prüft, ob ein unbekannter Wert ein gültiges ShareState ist.
 */
function isShareState(value: unknown): value is ShareState {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  if (obj.c !== null && typeof obj.c !== "string") return false;
  if (!Array.isArray(obj.p) || !obj.p.every((id) => typeof id === "string")) return false;
  if (!Array.isArray(obj.s) || !obj.s.every((id) => id === null || typeof id === "string")) return false;
  if (typeof obj.e !== "object" || obj.e === null) return false;

  const e = obj.e as Record<string, unknown>;
  if (e.mh !== null && typeof e.mh !== "string") return false;
  if (e.w2 !== null && typeof e.w2 !== "string") return false;
  if (e.oh !== null && typeof e.oh !== "string") return false;
  if (e.ch !== null && typeof e.ch !== "string") return false;
  if (e.he !== null && typeof e.he !== "string") return false;
  if (e.gl !== null && typeof e.gl !== "string") return false;
  if (e.be !== null && typeof e.be !== "string") return false;
  if (e.bo !== null && typeof e.bo !== "string") return false;
  if (e.r1 !== null && typeof e.r1 !== "string") return false;
  if (e.r2 !== null && typeof e.r2 !== "string") return false;
  if (e.am !== null && typeof e.am !== "string") return false;

  return true;
}

/**
 * Konvertiert den aktuellen Store-State in ein kompaktes ShareState-Objekt.
 * Ausrüstungs-Items werden auf ihre IDs reduziert, um die URL klein zu halten.
 */
export function buildToShareState(state: BuildState): ShareState {
  return {
    c: state.characterClass,
    p: state.selectedPassives,
    s: state.sockets,
    e: {
      mh: state.equipment.mainHand?.id ?? null,
      w2: state.equipment.weapon2?.id ?? null,
      oh: state.equipment.offHand?.id ?? null,
      ch: state.equipment.chest?.id ?? null,
      he: state.equipment.helmet?.id ?? null,
      gl: state.equipment.gloves?.id ?? null,
      be: state.equipment.belt?.id ?? null,
      bo: state.equipment.boots?.id ?? null,
      r1: state.equipment.ring1?.id ?? null,
      r2: state.equipment.ring2?.id ?? null,
      am: state.equipment.amulet?.id ?? null,
    },
  };
}

/**
 * Stellt aus einem ShareState-Objekt die vollständigen Equipment-Objekte her,
 * indem die Item-IDs aus der Datenbank (availableItems) aufgelöst werden.
 */
export function shareStateToEquipment(share: ShareState): EquipmentSlots {
  const lookup = (id: string | null) =>
    id ? getItemById(id) ?? null : null;

  return {
    mainHand: lookup(share.e.mh),
    weapon2: lookup(share.e.w2),
    offHand: lookup(share.e.oh),
    chest: lookup(share.e.ch),
    helmet: lookup(share.e.he),
    gloves: lookup(share.e.gl),
    belt: lookup(share.e.be),
    boots: lookup(share.e.bo),
    ring1: lookup(share.e.r1),
    ring2: lookup(share.e.r2),
    amulet: lookup(share.e.am),
  };
}

/**
 * Kodiert einen ShareState in einen URL-sicheren, kompakten Base64-String.
 * Verwendet: JSON.stringify → Base64 (btoa) → URL-sicher.
 */
export function encodeBuildToBase64(state: ShareState): string {
  const json = JSON.stringify(state);
  // btoa mit UTF-8-Unterstützung via encodeURIComponent-Trick
  const encoded = btoa(encodeURIComponent(json));
  return encoded;
}

/**
 * Dekodiert einen Base64-String zurück in ein ShareState-Objekt.
 * Gibt null zurück, wenn die Dekodierung fehlschlägt oder das Format ungültig ist.
 */
export function decodeBuildFromBase64(encoded: string): ShareState | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed: unknown = JSON.parse(json);

    if (!isShareState(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Generiert die vollständige Share-URL für den aktuellen Build.
 * Baut die URL aus window.location.origin + ?build=<encoded>.
 */
export function generateShareUrl(state: ShareState): string {
  const encoded = encodeBuildToBase64(state);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://poe2-build-planer.app";
  return `${origin}/?build=${encoded}`;
}

/**
 * Extrahiert den ?build= Parameter aus einer URL.
 * Sucht sowohl in window.location.search als auch in einem übergebenen URL-String.
 */
export function extractBuildFromUrl(url?: string): string | null {
  const searchParams = url
    ? new URL(url, "https://localhost").searchParams
    : typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  if (!searchParams) return null;
  return searchParams.get("build");
}
