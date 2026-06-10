/**
 * @deprecated Verwende stattdessen das Strategy-Pattern aus src/lib/parsers/.
 *
 * Die Logik wurde in einzelne Parser-Strategien aufgeteilt:
 * - src/lib/parsers/maxroll.ts       → Maxroll-spezifische Extraktion
 * - src/lib/parsers/mobalytics.ts    → Mobalytics-spezifische Extraktion
 * - src/lib/parsers/genericUrl.ts    → Generische URL-Extraktion (pob.party etc.)
 * - src/lib/parsers/registry.ts      → Zentrale Parser-Auswahl (findParser, parseBuild)
 *
 * Neue Importe:
 *   import { parseBuild, isBuildUrl, findParser } from "@/lib/parsers";
 *
 * urlExtractor.ts — Extrahiert Build-Daten aus Build-Planner-URLs
 * (maxroll.gg, pob.party, poeplanner.com etc.)
 */

import { parseFullBuild, type ParsedBuildResult } from "./parser";

export function isBuildUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    const knownHosts = [
      "maxroll.gg", "pob.party", "poeplanner.com", "pobb.in",
      "poe.ninja", "pathofexile.com", "poe2.app", "poe2db.tw",
      "mobalytics.gg", "poevault.com",
    ];
    return knownHosts.some((h) => url.hostname.endsWith(h));
  } catch {
    return false;
  }
}

export async function extractBuildFromUrl(url: string): Promise<ParsedBuildResult> {
  const urlDirect = extractFromUrlDirect(url);
  if (hasAnyData(urlDirect)) return urlDirect;

  let htmlText: string;
  let jsonData: unknown | null = null;

  try {
    const proxyUrl = `/api/fetch-url?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(
        (errBody as { error?: string }).error || `HTTP ${response.status}`
      );
    }
    const result = await response.json();
    if (result.json) {
      jsonData = result.json;
      htmlText = "";
    } else {
      htmlText = result.text || "";
    }
  } catch (err) {
    throw new Error(
      `Konnte URL nicht abrufen: ${err instanceof Error ? err.message : "Netzwerkfehler"}`
    );
  }

  if (htmlText) {
    const scriptResult = extractFromScriptTags(htmlText);
    if (hasAnyData(scriptResult)) return scriptResult;

    const profileIds = (scriptResult as unknown as Record<string, unknown>)
      .__plannerProfiles as string[] | undefined;
    if (profileIds && profileIds.length > 0) {
      const [profileId] = profileIds;
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
      } catch {
        // API-Abruf fehlgeschlagen
      }
    }

    const textResult = extractFromHtmlText(htmlText);
    if (hasAnyData(textResult)) return textResult;
  }

  if (jsonData) {
    const jsonResult = extractFromJsonData(jsonData);
    if (hasAnyData(jsonResult)) return jsonResult;
  }

  throw new Error(
    "Keine Build-Daten auf der Seite gefunden. Bitte kopiere den Build-Text manuell."
  );
}

function hasAnyData(result: ParsedBuildResult): boolean {
  return !!(
    result.characterClass ||
    result.sockets.some((s) => s !== null) ||
    result.selectedPassives.length > 0 ||
    Object.values(result.equipment).some((v) => v !== null)
  );
}

// ================================================================
function extractFromUrlDirect(url: string): ParsedBuildResult {
  const result = emptyResult();
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.replace(/^#/, "");
    if (hash) {
      const hashResult = tryDecodeHash(hash);
      if (hashResult) return hashResult;
    }
    const buildParam =
      parsed.searchParams.get("build") ||
      parsed.searchParams.get("code") ||
      parsed.searchParams.get("data");
    if (buildParam) {
      const decoded = tryDecodeBuildParam(buildParam);
      if (decoded) return decoded;
    }
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 10 && /^[A-Za-z0-9\-_=]+$/.test(lastPart)) {
        const decoded = tryDecodeBuildParam(lastPart);
        if (decoded) return decoded;
      }
    }
  } catch { /* ignorieren */ }
  return result;
}

function tryDecodeHash(hash: string): ParsedBuildResult | null {
  try {
    const decoded = atob(hash.replace(/-/g, "+").replace(/_/g, "/"));
    if (decoded) return parseFullBuild(decoded);
  } catch { /* kein Base64 */ }
  return null;
}

function tryDecodeBuildParam(param: string): ParsedBuildResult | null {
  try {
    const decoded = atob(param.replace(/-/g, "+").replace(/_/g, "/"));
    if (decoded && decoded.length > 5) return parseFullBuild(decoded);
  } catch {
    if (param.length > 10 && /\s/.test(param)) return parseFullBuild(param);
  }
  return null;
}

// ================================================================
function extractFromScriptTags(html: string): ParsedBuildResult {
  const scriptRegex = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const result = extractFromJsonData(json);
      if (hasAnyData(result)) return result;
    } catch { /* kein JSON */ }
  }

  const nextDataRegex = /<script[^>]*id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i;
  const nextMatch = nextDataRegex.exec(html);
  if (nextMatch) {
    try {
      const json = JSON.parse(nextMatch[1]);
      const result = extractFromJsonData(json);
      if (hasAnyData(result)) return result;
    } catch { /* kein JSON */ }
  }

  const stateRegex = /window\.__(\w+STATE\w*|NUXT__|INITIAL)__\s*=\s*({[\s\S]*?});/gi;
  while ((match = stateRegex.exec(html)) !== null) {
    try {
      const jsonStr = match[2];
      if (jsonStr) {
        const json = JSON.parse(jsonStr);
        const result = extractFromJsonData(json);
        if (hasAnyData(result)) return result;
      }
    } catch { /* kein JSON */ }
  }

  const remixRegex = /window\.__remixContext\s*=\s*({[\s\S]*?});\s*(?:\n|$)/;
  const remixMatch = remixRegex.exec(html);
  if (remixMatch) {
    try {
      const json = JSON.parse(remixMatch[1]);
      const result = extractFromJsonData(json);
      if (hasAnyData(result)) return result;
    } catch { /* kein JSON */ }
  }

  const plannerEmbedRegex = /data-poe2-profile="([^"]+)"[^>]*data-poe2-variant="([^"]+)"/g;
  let embedMatch: RegExpExecArray | null;
  const profileIds = new Set<string>();
  while ((embedMatch = plannerEmbedRegex.exec(html)) !== null) {
    profileIds.add(embedMatch[1]);
  }
  if (profileIds.size > 0) {
    const result = emptyResult();
    (result as unknown as Record<string, unknown>).__plannerProfiles = Array.from(profileIds);
    return result;
  }

  return emptyResult();
}

// ================================================================
function extractFromJsonData(data: unknown, depth = 0): ParsedBuildResult {
  if (depth > 10) return emptyResult();
  if (typeof data === "string") {
    if (data.length > 20) return parseFullBuild(data);
    return emptyResult();
  }
  if (Array.isArray(data)) {
    const merged = emptyResult();
    for (const item of data) mergeResults(merged, extractFromJsonData(item, depth + 1));
    return merged;
  }
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    const result = emptyResult();
    const classKeys = ["className", "class", "characterClass", "ascendancy", "ascendancyClass"];
    const skillKeys = ["skills", "gems", "skillGems", "activeSkills", "mainSkill"];
    const passiveKeys = ["passives", "passiveSkills", "nodes", "allocatedNodes"];
    const itemKeys = ["items", "equipment", "gear"];
    for (const key of classKeys) {
      const val = obj[key];
      if (typeof val === "string" && val.length > 1) {
        const parsed = parseFullBuild(`Class: ${val}`);
        if (parsed.characterClass) { result.characterClass = parsed.characterClass; break; }
      }
    }
    for (const key of skillKeys) {
      const val = obj[key];
      if (typeof val === "string" && val.length > 3) mergeResults(result, parseFullBuild(val));
      else if (val && typeof val === "object") mergeResults(result, extractFromJsonData(val, depth + 1));
    }
    for (const key of passiveKeys) {
      const val = obj[key];
      if (Array.isArray(val)) mergeResults(result, extractFromJsonData(val, depth + 1));
      else if (typeof val === "string" && val.length > 3) mergeResults(result, parseFullBuild(val));
    }
    for (const key of itemKeys) {
      const val = obj[key];
      if (val && typeof val === "object") mergeResults(result, extractFromJsonData(val, depth + 1));
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string" && val.length > 30 && /\s/.test(val)) mergeResults(result, parseFullBuild(val));
    }
    if (!hasAnyData(result)) {
      for (const val of Object.values(obj)) {
        if (typeof val === "object" && val !== null) mergeResults(result, extractFromJsonData(val, depth + 1));
      }
    }
    return result;
  }
  return emptyResult();
}

// ================================================================
function extractFromHtmlText(html: string): ParsedBuildResult {
  const metaMatch = /<meta[^>]*name="description"[^>]*content="([^"]*)"/i.exec(html);
  if (metaMatch && metaMatch[1].length > 20) {
    const parsed = parseFullBuild(metaMatch[1]);
    if (hasAnyData(parsed)) return parsed;
  }
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleMatch && titleMatch[1].length > 5) {
    const parsed = parseFullBuild(titleMatch[1]);
    if (hasAnyData(parsed)) return parsed;
  }
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (bodyMatch) {
    const bodyText = bodyMatch[1]
      .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
      .replace(/&/g, "&").replace(/</g, "<")
      .replace(/>/g, ">").replace(/"/g, '"')
      .replace(/\s+/g, " ").trim();
    if (bodyText.length > 50) {
      const parsed = parseFullBuild(bodyText);
      if (hasAnyData(parsed)) return parsed;
      const truncated = bodyText.substring(0, 5000);
      if (truncated !== bodyText) {
        const parsed2 = parseFullBuild(truncated);
        if (hasAnyData(parsed2)) return parsed2;
      }
    }
  }
  return emptyResult();
}

// ================================================================
function extractPlannerFromApi(apiJson: unknown): ParsedBuildResult {
  const result = emptyResult();
  try {
    const data = (apiJson as Record<string, unknown>);
    const plannerData = (data.data || data) as Record<string, unknown>;

    if (plannerData.class && typeof plannerData.class === "string") {
      const classMap: Record<string, string> = {
        "StrOne": "Warrior", "StrTwo": "Marauder",
        "DexOne": "Ranger", "DexTwo": "Monk",
        "DexThree": "Huntress", "DexFour": "Mercenary",
        "DexFourb": "Huntress",
        "IntOne": "Witch", "IntTwo": "Sorceress",
        "StrInt": "Templar", "DexInt": "Shadow",
        "StrDex": "Duelist", "StrDexInt": "Druid",
      };
      const mapped = classMap[plannerData.class as string];
      if (mapped) result.characterClass = mapped as ParsedBuildResult["characterClass"];
    }

    if (plannerData.data && typeof plannerData.data === "object") {
      const profileData = plannerData.data as Record<string, unknown>;
      if (Array.isArray(profileData.profiles)) {
        const profiles = profileData.profiles as Record<string, unknown>[];
        const activeProfile = typeof profileData.activeProfile === "number" ? profileData.activeProfile : 0;
        const profile = profiles[activeProfile] || profiles[0];
        if (profile) {
          if (profile.skills && typeof profile.skills === "object" &&
            Array.isArray((profile.skills as Record<string, unknown>).steps)) {
            const skillsObj = profile.skills as Record<string, unknown>;
            const steps = skillsObj.steps as Array<Record<string, unknown>>;
            const activeStep = typeof skillsObj.step === "number" ? skillsObj.step : 0;
            if (steps[activeStep] && Array.isArray(steps[activeStep].skills)) {
              const skillGroups = steps[activeStep].skills as Array<{ gems: Array<{ id: string }> }>;
              for (const group of skillGroups) {
                if (Array.isArray(group.gems) && group.gems.length > 0) {
                  const gemId = group.gems[0].id;
                  if (gemId && typeof gemId === "string") {
                    for (let i = 0; i < result.sockets.length; i++) {
                      if (result.sockets[i] === null) {
                        result.sockets[i] = gemId;
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
          if (profile.passives && typeof profile.passives === "object" &&
            Array.isArray((profile.passives as Record<string, unknown>).variants)) {
            const passivesObj = profile.passives as Record<string, unknown>;
            const variants = passivesObj.variants as Array<Record<string, unknown>>;
            const activeVariant = typeof passivesObj.active === "number" ? passivesObj.active : 0;
            if (variants[activeVariant]) {
              const history = variants[activeVariant].history;
              if (Array.isArray(history)) {
                result.selectedPassives = history
                  .filter((n): n is number => typeof n === "number")
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

// ================================================================
function emptyResult(): ParsedBuildResult {
  return {
    characterClass: null,
    sockets: [null, null, null, null, null, null],
    selectedPassives: [],
    equipment: {
      mainHand: null,
      weapon2: null,
      offHand: null,
      chest: null,
      helmet: null,
      gloves: null,
      belt: null,
      boots: null,
      ring1: null,
      ring2: null,
      amulet: null,
    },
  };
}

function mergeResults(target: ParsedBuildResult, source: ParsedBuildResult): void {
  if (!target.characterClass && source.characterClass) target.characterClass = source.characterClass;
  for (let i = 0; i < 6; i++) {
    if (!target.sockets[i] && source.sockets[i]) target.sockets[i] = source.sockets[i];
  }
  for (const p of source.selectedPassives) {
    if (!target.selectedPassives.includes(p)) target.selectedPassives.push(p);
  }
  const eqSlots: (keyof ParsedBuildResult["equipment"])[] = ["mainHand", "weapon2", "offHand", "chest", "helmet", "gloves", "belt", "boots", "ring1", "ring2", "amulet"];
  for (const slot of eqSlots) {
    if (!target.equipment[slot] && source.equipment[slot]) target.equipment[slot] = source.equipment[slot];
  }
}