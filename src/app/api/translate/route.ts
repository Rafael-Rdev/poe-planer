/**
 * /api/translate — Ruft die Mistral API auf und streamt die Übersetzung zurück.
 *
 * Akzeptiert POST mit JSON-Body:
 *   { type: "text", text: string }           → nutzt mistral-small-2506
 *   { type: "images", images: [...] }        → nutzt pixtral-12b (Vision)
 *
 * Mistral ist OpenAI-kompatibel: SSE-Streaming über chat/completions.
 *
 * Seit Juni 2026: Nach der Mistral-Antwort wird ein Dictionary-Post-Processing
 * durchgeführt, das alle englischen Begriffe aus scripts/poe2-translations.json
 * im übersetzten Text durch ihre deutschen Entsprechungen ersetzt.
 * Dies fängt Begriffe ab, die Mistral trotz Prompt-Vorgabe nicht übersetzt hat.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Limits ──────────────────────────────────────────────────────────────────

const MAX_TEXT_CHARS = 30_000;
const MAX_IMAGES = 5;

// K-2: Größen-Limits (Body-Header & pro Bild-base64)
const MAX_BODY_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_IMAGE_DATA_CHARS = 2 * 1024 * 1024; // 2 MB base64-String pro Bild
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// ─── K-1: Rate-Limiting (In-Memory, pro IP) ─────────────────────────────────
// Hinweis: In-Memory reicht für eine einzelne Instanz. Für Multi-Instance-
// Deployments (mehrere Serverless-Lambdas) sollte ein geteilter Store
// (z. B. Upstash/Vercel KV) genutzt werden.

const RATE_LIMIT_MAX = 10; // max. Requests
const RATE_LIMIT_WINDOW_MS = 60_000; // pro Minute

const _rateLimitHits = new Map<string, { count: number; windowStart: number }>();

function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Gibt true zurück, wenn der Request erlaubt ist; false bei Überschreitung. */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = _rateLimitHits.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    _rateLimitHits.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ─── Übersetzungs-Dictionary (einmalig auf Modul-Level cachen) ───────────────

interface TranslationDict {
  skills: Record<string, string>;
  stats: Record<string, string>;
  metadata?: {
    source: string;
    fetchedAt: string;
    skillCount: number;
    statCount: number;
    totalCount: number;
  };
}

interface CompiledDict {
  /** Eine kombinierte Regex über alle Begriffe (längere zuerst), case-insensitive. */
  pattern: RegExp | null;
  /** lowercase(englisch) → deutsch, für den Lookup im Replace-Callback. */
  map: Map<string, string>;
}

let _compiledDict: CompiledDict | null = null;

/**
 * Lädt das Dictionary einmalig und baut daraus eine EINZIGE kombinierte Regex
 * (Alternation aller Begriffe) plus eine Lookup-Map. Dadurch genügt pro Request
 * ein einziger `String.replace`-Durchlauf statt eines pro Eintrag.
 */
function getCompiledDict(): CompiledDict {
  if (_compiledDict !== null) return _compiledDict;

  try {
    const filePath = resolve(process.cwd(), "scripts", "poe2-translations.json");
    const raw = readFileSync(filePath, "utf-8");
    const dict: TranslationDict = JSON.parse(raw);

    const entries: Array<[string, string]> = [];
    if (dict.skills) {
      for (const [en, de] of Object.entries(dict.skills)) {
        entries.push([en, de]);
      }
    }
    if (dict.stats) {
      for (const [en, de] of Object.entries(dict.stats)) {
        if (!dict.skills || !(en in dict.skills)) {
          entries.push([en, de]);
        }
      }
    }

    // Nach Länge absteigend sortieren: längere Phrasen zuerst in der Alternation,
    // damit z.B. "Lightning Arrow" vor "Arrow" gematcht wird (Regex-Alternation
    // ist greedy von links und nimmt die erste passende Alternative).
    entries.sort((a, b) => b[0].length - a[0].length);

    const map = new Map<string, string>();
    for (const [en, de] of entries) {
      const key = en.toLowerCase();
      if (!map.has(key)) map.set(key, de);
    }

    const pattern =
      entries.length > 0
        ? new RegExp(
            "\\b(" + entries.map(([en]) => escapeRegex(en)).join("|") + ")\\b",
            "gi"
          )
        : null;

    _compiledDict = { pattern, map };
  } catch (err) {
    console.warn(
      "[translate/route] Dictionary laden fehlgeschlagen:",
      err instanceof Error ? err.message : err
    );
    _compiledDict = { pattern: null, map: new Map() };
  }

  return _compiledDict;
}

const SYSTEM_PROMPT = `Du bist ein Übersetzer für Path of Exile 2 Build-Guides. Übersetze den folgenden englischen Text ins Deutsche. Übersetze natürlichsprachliche Beschreibungen, behalte aber Spielbegriffe (Skill-Namen, Item-Namen, Stats) möglichst im englischen Original – die werden später automatisch ersetzt. Antworte NUR mit der deutschen Übersetzung, ohne Erklärungen.`;

const BUILD_GUIDE_SYSTEM_PROMPT = `Du bist ein Path of Exile 2 Experte. Schreibe einen deutschen Spielguide basierend auf diesen Build-Daten.
Struktur (nutze Markdown-Überschriften ## und ###):
## Build-Überblick
3 Sätze: was macht der Build, warum ist er stark, für wen geeignet.

## Skills & Gems
Für jeden Skill einen eigenen ### Abschnitt: wann einsetzen + welche Support-Gems einsockeln + warum diese Kombination.

## Rotation
Schritt-für-Schritt wie man den Build spielt (als nummerierte Liste oder Fließtext).

## Top 5 Passive-Punkte
Welche zuerst holen und warum – priorisiert nach Impact.

Schreibe klar und verständlich für jemanden der den Build noch nicht kennt.
Nutze die deutschen Begriffe die in den Build-Daten stehen.
Antworte NUR mit dem Guide, ohne Vorbemerkungen oder Erklärungen.`;

// ─── Regex-Hilfsfunktionen ──────────────────────────────────────────────────

/**
 * Escaped Regex-Sonderzeichen in einem String, damit er sicher
 * als Literal in einem RegExp verwendet werden kann.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Überträgt die Groß-/Kleinschreibung des originalen Matches
 * auf die Übersetzung:
 * - "FIREBALL" → "FEUERBALL" (all-caps)
 * - "Fireball" → "Feuerball"  (title case)
 * - "fireball" → "feuerball"  (lowercase)
 */
function applyCapitalization(translation: string, original: string): string {
  if (original === original.toUpperCase()) {
    return translation.toUpperCase();
  }
  if (
    original.length > 0 &&
    original[0] === original[0].toUpperCase() &&
    original.slice(1) === original.slice(1).toLowerCase()
  ) {
    return translation.charAt(0).toUpperCase() + translation.slice(1);
  }
  return translation;
}

// ─── Dictionary-Post-Processing ─────────────────────────────────────────────

/**
 * Wendet das gecachte Übersetzungs-Dictionary auf einen bereits übersetzten Text an.
 *
 * - Nur exakte Wort-Matches (case-insensitive, mit Wortgrenzen `\b`)
 * - Längere Begriffe zuerst (beim ersten Aufruf einmalig geladen und sortiert)
 * - Bewahrt originale Groß-/Kleinschreibung des Matches
 *
 * @returns Den korrigierten Text und eine Liste der vorgenommenen Ersetzungen.
 */
function applyDictionaryPostProcessing(
  translatedText: string
): { result: string; replacements: string[] } {
  const { pattern, map } = getCompiledDict();

  if (!pattern || map.size === 0) {
    return { result: translatedText, replacements: [] };
  }

  // Einziger Durchlauf über den Text mit der kombinierten Regex.
  const replacedSet = new Set<string>();

  const result = translatedText.replace(pattern, (match) => {
    const german = map.get(match.toLowerCase());
    if (german === undefined) return match;
    replacedSet.add(`${match} → ${german}`);
    return applyCapitalization(german, match);
  });

  return { result, replacements: [...replacedSet] };
}

// ─── POST-Handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "MISTRAL_API_KEY nicht gesetzt. Bitte in .env.local eintragen." },
      { status: 500 }
    );
  }

  // K-1: Rate-Limit pro IP
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "Zu viele Anfragen. Bitte kurz warten und erneut versuchen." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // K-2: Body-Größe VOR dem Parsen anhand des Content-Length-Headers prüfen
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json(
      { error: "Anfrage zu groß (max. 8 MB)." },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  // Modell und Messages je nach Request-Typ bauen
  let model: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messages: Array<{ role: string; content: any }>;

  if (payload.type === "text") {
    const userText = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!userText) {
      return Response.json({ error: "Kein Text übermittelt." }, { status: 400 });
    }
    // K1: Text-Längen-Limit
    if (userText.length > MAX_TEXT_CHARS) {
      return Response.json(
        { error: `Text zu lang (max. ${MAX_TEXT_CHARS.toLocaleString("de-DE")} Zeichen).` },
        { status: 400 }
      );
    }
    model = "mistral-small-2506";
    messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userText },
    ];
  } else if (payload.type === "images") {
    const images = payload.images as Array<{ data: string; mediaType: string }> | undefined;
    if (!images || images.length === 0) {
      return Response.json({ error: "Keine Bilder übermittelt." }, { status: 400 });
    }
    // K2: Bild-Limit
    if (images.length > MAX_IMAGES) {
      return Response.json(
        { error: `Maximal ${MAX_IMAGES} Bilder erlaubt.` },
        { status: 400 }
      );
    }
    // K-2: Pro Bild Größe & MediaType validieren
    for (const img of images) {
      if (!img || typeof img.data !== "string" || img.data.length === 0) {
        return Response.json({ error: "Ungültige Bilddaten." }, { status: 400 });
      }
      if (img.data.length > MAX_IMAGE_DATA_CHARS) {
        return Response.json(
          { error: "Bild zu groß (max. 2 MB pro Bild)." },
          { status: 413 }
        );
      }
      if (!ALLOWED_MEDIA_TYPES.has(img.mediaType)) {
        return Response.json(
          { error: "Ungültiger Bildtyp. Nur JPEG, PNG oder WebP." },
          { status: 400 }
        );
      }
    }
    model = "pixtral-12b";
    // Mistral Vision: Bilder als base64 Data-URLs im content-Array, ohne detail-Parameter
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: "Analysiere die Screenshots und erstelle daraus einen strukturierten Build-Guide.",
      },
    ];
    for (const img of images) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${img.mediaType};base64,${img.data}` },
      });
    }
    // H-1: Bilder sollen einen Guide erzeugen → BUILD_GUIDE_SYSTEM_PROMPT
    messages = [
      { role: "system", content: BUILD_GUIDE_SYSTEM_PROMPT },
      { role: "user", content },
    ];
  } else if (payload.type === "build") {
    const buildData = typeof payload.buildData === "string" ? payload.buildData.trim() : "";
    if (!buildData) {
      return Response.json({ error: "Keine Build-Daten übermittelt." }, { status: 400 });
    }
    if (buildData.length > MAX_TEXT_CHARS) {
      return Response.json(
        { error: `Build-Daten zu groß (max. ${MAX_TEXT_CHARS.toLocaleString("de-DE")} Zeichen).` },
        { status: 400 }
      );
    }
    model = "mistral-small-2506";
    messages = [
      { role: "system", content: BUILD_GUIDE_SYSTEM_PROMPT },
      { role: "user", content: buildData },
    ];
  } else {
    return Response.json({ error: "Unbekannter Request-Typ." }, { status: 400 });
  }

  // ─── 1. Mistral-Antwort sammeln (nicht direkt streamen) ──────────────────

  let fullText: string;

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        stream: true,
        messages,
      }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => response.statusText);
      // H-3: Details nur serverseitig loggen, dem Client nur eine generische Meldung
      console.error(
        `[translate/route] Mistral API Fehler ${response.status}:`,
        errText
      );
      return Response.json(
        { error: "Übersetzungsdienst momentan nicht verfügbar." },
        { status: 502 }
      );
    }

    // SSE-Stream lesen und vollständigen Text sammeln
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    fullText = "";

    // H1: streamDone-Flag statt break in innerer Schleife
    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices?: { delta?: { content?: string | null } }[];
          };
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) {
            fullText += text;
          }
        } catch {
          // Ungültiges JSON in SSE-Zeile — ignorieren
        }
      }
    }
  } catch (err) {
    // H-3: Details nur serverseitig loggen
    console.error(
      "[translate/route] Fehler bei der Übersetzung:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      { error: "Übersetzungsdienst momentan nicht verfügbar." },
      { status: 500 }
    );
  }

  // ─── 2. Dictionary-Post-Processing ───────────────────────────────────────

  const { result, replacements } = applyDictionaryPostProcessing(fullText);

  // Logging auf der Server-Konsole
  console.log(
    `[translate/route] Dictionary-Post-Processing: ${replacements.length} Ersetzungen vorgenommen`
  );
  if (replacements.length > 0) {
    console.log(
      `[translate/route] Erste ${Math.min(10, replacements.length)} Ersetzungen:`,
      replacements.slice(0, 10)
    );
  }

  // ─── 3. Ergebnis zurückgeben ─────────────────────────────────────────────

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(result));
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    }
  );
}
