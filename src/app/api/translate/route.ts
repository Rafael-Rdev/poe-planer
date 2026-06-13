/**
 * /api/translate — Ruft die Mistral API auf und streamt die Übersetzung zurück.
 *
 * Akzeptiert POST mit JSON-Body:
 *   { type: "text", text: string }           → nutzt mistral-small-2506
 *   { type: "images", images: [...] }        → nutzt pixtral-12b (Vision)
 *
 * Mistral ist OpenAI-kompatibel: SSE-Streaming über chat/completions.
 */

const SYSTEM_PROMPT = `Übersetze NUR was auf den Screenshots sichtbar ist. Erfinde keine fehlenden Details. Wenn etwas nicht erkennbar ist, schreibe: (nicht sichtbar im Screenshot)`;

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

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Mistral Chat Completions — OpenAI-kompatibles SSE-Streaming
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
          throw new Error(`Mistral API Fehler ${response.status}: ${errText}`);
        }

        // SSE-Stream lesen und Text-Deltas extrahieren
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Letzte (möglicherweise unvollständige) Zeile zurückbehalten
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              done = true;
              break;
            }

            try {
              const parsed = JSON.parse(data) as {
                choices?: { delta?: { content?: string | null } }[];
              };
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // Ungültiges JSON in SSE-Zeile — ignorieren
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
        controller.enqueue(
          encoder.encode(`\n\n**Fehler bei der Übersetzung:** ${msg}`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
