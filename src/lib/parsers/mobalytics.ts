/**
 * Mobalytics-Parser — extrahiert Build-Daten aus mobalytics.gg Planner-URLs.
 *
 * Ruft die Seite per Proxy ab und sucht nach:
 * 1. window.__staticRouterHydrationData JSON
 * 2. JSON in <script type="application/json"> Tags
 * 3. Fallback: HTML-Text-Extraktion
 */

import type { BuildParser, ParsedBuildResult } from "@/types/parser";
import { emptyBuildResult } from "@/types/parser";
import { parseFullBuild } from "@/lib/parser";
import { textBuildParser } from "./textBuild";

const MOBALYTICS_DOMAINS = ["mobalytics.gg", "moba.iytc.xyz"] as const;

export const mobalyticsParser: BuildParser = {
  name: "mobalytics",

  canParse(input: string): boolean {
    const trimmed = input.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;
    try {
      const url = new URL(trimmed);
      return MOBALYTICS_DOMAINS.some((d) => url.hostname.endsWith(d));
    } catch {
      return false;
    }
  },

  async parse(input: string): Promise<ParsedBuildResult> {
    const url = input.trim();
    const html = await fetchPageContent(url);

    // 1. __staticRouterHydrationData
    const staticRouterMatch = /<script[^>]*>window\.__staticRouterHydrationData\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i.exec(html);
    if (staticRouterMatch?.[1]) {
      try {
        const json = JSON.parse(staticRouterMatch[1]);
        const buildText = findBuildTextRecursive(json);
        if (buildText && buildText.length > 20) {
          return textBuildParser.parse(buildText);
        }
      } catch { /* JSON parse fehlgeschlagen */ }
    }

    // 2. JSON Script-Tags
    const scriptJsonRegex = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = scriptJsonRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        const buildText = findBuildTextRecursive(json);
        if (buildText && buildText.length > 20) {
          return textBuildParser.parse(buildText);
        }
      } catch { /* kein JSON */ }
    }

    // 3. Fallback: HTML-Text
    const textOnly = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (textOnly.length > 50) {
      const result = parseFullBuild(textOnly.substring(0, 5000));
      if (hasAnyData(result)) return result;
    }

    throw new Error(
      "Auf der Mobalytics-Seite konnten keine Build-Daten gefunden werden."
    );
  },
};

// ─── Hilfsfunktionen ──────────────────────────────────────────────

async function fetchPageContent(url: string): Promise<string> {
  const proxyUrl = `/api/fetch-url?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err = errBody as { error?: string; targetStatus?: number };
    // 403 Forbidden: Mobalytics blockiert direkte Zugriffe
    if (res.status === 403 || err.targetStatus === 403) {
      throw new Error(
        "Mobalytics blockiert direkte Links. " +
        "Bitte kopiere stattdessen den PoB-Code oder Pobb.in-Link aus dem Guide!"
      );
    }
    throw new Error(
      err.error ||
      `Die Seite konnte nicht geladen werden (Status ${res.status}).`
    );
  }
  const result = await res.json();
  return result.text || "";
}

function hasAnyData(result: ParsedBuildResult): boolean {
  return !!(
    result.characterClass ||
    result.sockets.some((s) => s !== null) ||
    result.selectedPassives.length > 0 ||
    Object.values(result.equipment).some((v) => v !== null)
  );
}

function findBuildTextRecursive(obj: unknown, depth = 0): string | null {
  if (depth > 10) return null;
  if (typeof obj === "string") {
    return looksLikeBuildText(obj) ? obj : null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findBuildTextRecursive(item, depth + 1);
      if (found) return found;
    }
  } else if (obj && typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    const prioritized = [
      "buildData", "build", "planner", "skills", "data", "loaderData",
    ];
    const sorted = entries.sort(([a], [b]) => {
      const aP = prioritized.some((k) => a.toLowerCase().includes(k)) ? 0 : 1;
      const bP = prioritized.some((k) => b.toLowerCase().includes(k)) ? 0 : 1;
      return aP - bP;
    });
    for (const [, value] of sorted) {
      const found = findBuildTextRecursive(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function looksLikeBuildText(text: string): boolean {
  return (
    /skill gem/i.test(text) ||
    /support gem/i.test(text) ||
    /passive/i.test(text) ||
    /ascendancy/i.test(text) ||
    /\b(lightning|ice|fire|chaos|physical)\b.*\b(arrow|bolt|strike)\b/i.test(text) ||
    /\b(ranger|mercenary|monk|witch|sorceress|warrior)\b/i.test(text) ||
    text.length > 100
  );
}