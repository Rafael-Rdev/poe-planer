/**
 * Maxroll-Parser — extrahiert Build-Daten aus maxroll.gg Planner-URLs.
 *
 * Ruft die Seite per Proxy ab und sucht nach:
 * 1. Eingebettetem __NEXT_DATA__ JSON (Next.js Hydration)
 * 2. data-poe2-profile / data-poe2-variant Attributen
 * 3. Maxroll Backend-API (backend.maxroll.gg/poe2/planner/:id)
 * 4. Fallback: HTML-Text-Extraktion
 */

import type { BuildParser, ParsedBuildResult } from "@/types/parser";
import { emptyBuildResult } from "@/types/parser";
import { parseFullBuild } from "@/lib/parser";
import { textBuildParser } from "./textBuild";

const MAXROLL_DOMAINS = ["maxroll.gg"] as const;

export const maxrollParser: BuildParser = {
  name: "maxroll",

  canParse(input: string): boolean {
    const trimmed = input.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;
    try {
      const url = new URL(trimmed);
      return MAXROLL_DOMAINS.some((d) => url.hostname.endsWith(d));
    } catch {
      return false;
    }
  },

  async parse(input: string): Promise<ParsedBuildResult> {
    const url = input.trim();
    const html = await fetchPageContent(url);

    // 1. __NEXT_DATA__ JSON
    const nextDataMatch = /<script[^>]*id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
    if (nextDataMatch?.[1]) {
      try {
        const json = JSON.parse(nextDataMatch[1]);
        const buildText = findBuildTextRecursive(json);
        if (buildText && buildText.length > 20) {
          return textBuildParser.parse(buildText);
        }
      } catch { /* JSON parse fehlgeschlagen, weiter */ }
    }

    // 2. data-poe2-profile Attribute → Backend-API
    const plannerRegex = /data-poe2-profile="([^"]+)"[^>]*data-poe2-variant="([^"]+)"/g;
    let match: RegExpExecArray | null;
    const profiles: string[] = [];
    while ((match = plannerRegex.exec(html)) !== null) {
      profiles.push(match[1]);
    }

    for (const profileId of profiles) {
      try {
        const apiUrl = `https://backend.maxroll.gg/poe2/planner/${profileId}`;
        const apiResponse = await fetch(
          `/api/fetch-url?url=${encodeURIComponent(apiUrl)}`
        );
        if (apiResponse.ok) {
          const apiResult = await apiResponse.json();
          if (apiResult.json) {
            const plannerResult = extractPlannerFromApi(apiResult.json);
            if (hasAnyData(plannerResult)) return plannerResult;
          }
        }
      } catch { /* API-Abruf fehlgeschlagen */ }
    }

    // 3. Fallback: HTML-Text-Extraktion
    const textResult = extractFromHtml(html);
    if (hasAnyData(textResult)) return textResult;

    throw new Error(
      "Auf der Maxroll-Seite konnten keine Build-Daten gefunden werden."
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
      "pageProps", "props",
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

function extractPlannerFromApi(apiJson: unknown): ParsedBuildResult {
  const result = emptyBuildResult();
  try {
    const data = apiJson as Record<string, unknown>;
    const plannerData = (data.data || data) as Record<string, unknown>;

    const classMap: Record<string, string> = {
      StrOne: "Warrior", StrTwo: "Marauder",
      DexOne: "Ranger", DexTwo: "Monk",
      DexThree: "Huntress", DexFour: "Mercenary",
      DexFourb: "Huntress",
      IntOne: "Witch", IntTwo: "Sorceress",
      StrInt: "Templar", DexInt: "Shadow",
      StrDex: "Duelist", StrDexInt: "Druid",
    };
    if (typeof plannerData.class === "string") {
      const mapped = classMap[plannerData.class];
      if (mapped) result.characterClass = mapped;
    }

    if (typeof plannerData.data === "object" && plannerData.data) {
      const profileData = plannerData.data as Record<string, unknown>;
      if (Array.isArray(profileData.profiles)) {
        const profiles = profileData.profiles as Record<string, unknown>[];
        const idx = typeof profileData.activeProfile === "number" ? profileData.activeProfile : 0;
        const profile = profiles[idx] || profiles[0];
        if (profile) {
          if (typeof profile.skills === "object" && profile.skills) {
            const sk = profile.skills as Record<string, unknown>;
            if (Array.isArray(sk.steps)) {
              const steps = sk.steps as Array<Record<string, unknown>>;
              const stepIdx = typeof sk.step === "number" ? sk.step : 0;
              if (steps[stepIdx]?.skills) {
                const groups = steps[stepIdx].skills as Array<{ gems: Array<{ id: string }> }>;
                for (const group of groups) {
                  if (Array.isArray(group.gems) && group.gems.length > 0) {
                    const gemId = group.gems[0].id;
                    if (gemId && typeof gemId === "string") {
                      for (let i = 0; i < 6; i++) {
                        if (!result.sockets[i]) { result.sockets[i] = gemId; break; }
                      }
                    }
                  }
                }
              }
            }
          }
          if (typeof profile.passives === "object" && profile.passives) {
            const ps = profile.passives as Record<string, unknown>;
            if (Array.isArray(ps.variants)) {
              const variants = ps.variants as Array<Record<string, unknown>>;
              const vIdx = typeof ps.active === "number" ? ps.active : 0;
              if (variants[vIdx]?.history) {
                result.selectedPassives = (variants[vIdx].history as number[])
                  .map((n) => String(n));
              }
            }
          }
        }
      }
    }
  } catch { /* ignorieren */ }
  return result;
}

function extractFromHtml(html: string): ParsedBuildResult {
  const metaMatch = /<meta[^>]*name="description"[^>]*content="([^"]*)"/i.exec(html);
  if (metaMatch?.[1] && metaMatch[1].length > 20) {
    return parseFullBuild(metaMatch[1]);
  }
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleMatch?.[1] && titleMatch[1].length > 5) {
    return parseFullBuild(titleMatch[1]);
  }
  // Text-only fallback
  const textOnly = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (textOnly.length > 50) {
    return parseFullBuild(textOnly.substring(0, 5000));
  }
  return emptyBuildResult();
}