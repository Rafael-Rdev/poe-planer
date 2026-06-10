/**
 * Generischer URL-Parser — Fallback für alle Build-Planner-URLs,
 * die keinen spezifischen Parser haben (pob.party, poeplanner, poe2.ninja etc.).
 *
 * Versucht verschiedene Strategien:
 * 1. data-build-text Script-Attribut
 * 2. Versteckte Textarea/Div mit Build-Daten
 * 3. JSON in <script type="application/json"> Tags
 * 4. window.__NUXT__ / __INITIAL_STATE__ / __remixContext
 * 5. URL-Hash / Query-Parameter (Base64)
 * 6. Fallback: HTML-Text-Extraktion
 */

import type { BuildParser, ParsedBuildResult } from "@/types/parser";
import { emptyBuildResult } from "@/types/parser";
import { parseFullBuild } from "@/lib/parser";
import { textBuildParser } from "./textBuild";

const GENERIC_DOMAINS = [
  "pob.party",
  "poeplanner.com",
  "pobb.in",
  "poe.ninja",
  "poe2.ninja",
  "pathofexile.com",
  "poe2.app",
  "poe2db.tw",
  "poe2skills.com",
  "poe2.dantan.us",
  "poevault.com",
] as const;

export const genericUrlParser: BuildParser = {
  name: "genericUrl",

  canParse(input: string): boolean {
    const trimmed = input.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;
    try {
      const url = new URL(trimmed);
      return GENERIC_DOMAINS.some((d) => url.hostname.endsWith(d));
    } catch {
      return false;
    }
  },

  async parse(input: string): Promise<ParsedBuildResult> {
    const url = input.trim();

    // 0. Direkt aus URL extrahieren
    const directResult = extractFromUrl(url);
    if (hasAnyData(directResult)) return directResult;

    // HTML abrufen
    const html = await fetchPageContent(url);

    // 1. data-build-text
    const buildTextMatch = /<script[^>]*data-build-text=["']([^"']+)["']/i.exec(html);
    if (buildTextMatch?.[1] && buildTextMatch[1].length > 10) {
      return textBuildParser.parse(buildTextMatch[1]);
    }

    // 2. Versteckte Textarea/Div
    const textareaMatch = /<textarea[^>]*id=["']build-data["'][^>]*>([\s\S]*?)<\/textarea>/i.exec(html);
    if (textareaMatch?.[1] && textareaMatch[1].trim().length > 10) {
      return textBuildParser.parse(textareaMatch[1].trim());
    }
    const hiddenDiv = /<div[^>]*id=["']build-content["'][^>]*>([\s\S]*?)<\/div>/i.exec(html);
    if (hiddenDiv?.[1] && hiddenDiv[1].trim().length > 10) {
      return textBuildParser.parse(hiddenDiv[1].trim());
    }

    // 3. JSON Script-Tags
    const jsonScriptRegex = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = jsonScriptRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        const buildText = findBuildTextRecursive(json);
        if (buildText && buildText.length > 20) {
          return textBuildParser.parse(buildText);
        }
      } catch { /* kein JSON */ }
    }

    // 4. window.__NUXT__ / __INITIAL_STATE__ / __remixContext
    const stateRegex = /window\.__(?:NUXT__|INITIAL)(?:\w*)__\s*=\s*({[\s\S]*?});/gi;
    while ((match = stateRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[3] || match[1]);
        const buildText = findBuildTextRecursive(json);
        if (buildText && buildText.length > 20) {
          return textBuildParser.parse(buildText);
        }
      } catch { /* kein JSON */ }
    }
    const remixMatch = /window\.__remixContext\s*=\s*({[\s\S]*?});\s*(?:\n|$)/.exec(html);
    if (remixMatch?.[1]) {
      try {
        const json = JSON.parse(remixMatch[1]);
        const buildText = findBuildTextRecursive(json);
        if (buildText && buildText.length > 20) {
          return textBuildParser.parse(buildText);
        }
      } catch { /* kein JSON */ }
    }

    // 5. HTML-Meta
    const metaMatch = /<meta[^>]*name="description"[^>]*content="([^"]*)"/i.exec(html);
    if (metaMatch?.[1] && metaMatch[1].length > 20) {
      const parsed = parseFullBuild(metaMatch[1]);
      if (hasAnyData(parsed)) return parsed;
    }
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (titleMatch?.[1] && titleMatch[1].length > 5) {
      const parsed = parseFullBuild(titleMatch[1]);
      if (hasAnyData(parsed)) return parsed;
    }

    // 6. Fallback: HTML-Text
    const textOnly = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ").trim();
    if (textOnly.length > 50) {
      const parsed = parseFullBuild(textOnly.substring(0, 8000));
      if (hasAnyData(parsed)) return parsed;
    }

    throw new Error(
      "Auf der Seite konnten keine Build-Daten gefunden werden. " +
      "Bitte kopiere den Build-Text manuell."
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
    // 403 Forbidden: Viele Builder-Planner blockieren direkte Zugriffe
    if (res.status === 403 || err.targetStatus === 403) {
      throw new Error(
        "Die Build-Seite blockiert direkte Links. " +
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

function extractFromUrl(url: string): ParsedBuildResult {
  try {
    const parsed = new URL(url);

    // Hash-basierte Daten
    const hash = parsed.hash.replace(/^#/, "");
    if (hash) {
      try {
        const decoded = atob(hash.replace(/-/g, "+").replace(/_/g, "/"));
        if (decoded && decoded.length > 5) return parseFullBuild(decoded);
      } catch { /* kein Base64 */ }
    }

    // Query-Parameter
    const buildParam =
      parsed.searchParams.get("build") ||
      parsed.searchParams.get("code") ||
      parsed.searchParams.get("data");
    if (buildParam) {
      try {
        const decoded = atob(buildParam.replace(/-/g, "+").replace(/_/g, "/"));
        if (decoded && decoded.length > 5) return parseFullBuild(decoded);
      } catch {
        if (buildParam.length > 10 && /\s/.test(buildParam)) {
          return parseFullBuild(buildParam);
        }
      }
    }

    // Pfad-Last-Part als Base64
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 10 && /^[A-Za-z0-9\-_=]+$/.test(lastPart)) {
        try {
          const decoded = atob(lastPart.replace(/-/g, "+").replace(/_/g, "/"));
          if (decoded && decoded.length > 5) return parseFullBuild(decoded);
        } catch { /* kein Base64 */ }
      }
    }
  } catch { /* URL parse fehlgeschlagen */ }

  return emptyBuildResult();
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
      "buildData", "build", "planner", "skills", "data",
      "pageProps", "props", "loaderData", "state",
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
    /\b(lightning|ice|fire|chaos|physical)\b.*\b(arrow|bolt|strike|blast|nova|orb|wave)\b/i.test(text) ||
    /\b(ranger|mercenary|monk|witch|sorceress|warrior|huntress|druid|templar|duelist|shadow|marauder)\b/i.test(text) ||
    text.length > 100
  );
}