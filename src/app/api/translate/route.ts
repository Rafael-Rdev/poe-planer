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

let _dictEntries: Array<[string, string]> | null = null;

function getDictEntries(): Array<[string, string]> {
  if (_dictEntries !== null) return _dictEntries;

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

    // Nach Länge absteigend sortieren: längere Phrasen zuerst ersetzen,
    // damit z.B. "Lightning Arrow" vor "Arrow" gematcht wird.
    entries.sort((a, b) => b[0].length - a[0].length);
    _dictEntries = entries;
  } catch (err) {
    console.warn(
      "[translate/route] Dictionary laden fehlgeschlagen:",
      err instanceof Error ? err.message : err
    );
    _dictEntries = [];
  }

  return _dictEntries;
}

const SYSTEM_PROMPT = `Du bist ein Übersetzer für Path of Exile 2 Build-Guides. Übersetze den folgenden englischen Text ins Deutsche. Übersetze natürlichsprachliche Beschreibungen, behalte aber Spielbegriffe (Skill-Namen, Item-Namen, Stats) möglichst im englischen Original – die werden später automatisch ersetzt. Antworte NUR mit der deutschen Übersetzung, ohne Erklärungen.`;

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
  const replacements: string[] = [];
  const entries = getDictEntries();

  if (entries.length === 0) {
    return { result: translatedText, replacements: [] };
  }

  let result = translatedText;

  for (const [english, german] of entries) {
    // Nur exakte Wort-Matches mit Wortgrenzen, case-insensitive
    const regex = new RegExp("\\b" + escapeRegex(english) + "\\b", "gi");

    let wasReplaced = false;

    result = result.replace(regex, (match) => {
      wasReplaced = true;
      return applyCapitalization(german, match);
    });

    if (wasReplaced) {
      replacements.push(`${english} → ${german}`);
    }
  }

  return { result, replacements };
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
    messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
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
      return Response.json(
        { error: `Mistral API Fehler ${response.status}: ${errText}` },
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
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    return Response.json(
      { error: `Fehler bei der Übersetzung: ${msg}` },
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
