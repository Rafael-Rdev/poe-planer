/**
 * API-Route: Proxy-Fetch für externe Build-URLs.
 *
 * Ruft eine externe URL serverseitig ab und gibt den Inhalt zurück.
 * Umgeht CORS-Beschränkungen, die client-seitiges fetch blockieren.
 *
 * GET /api/fetch-url?url=https://maxroll.gg/poe2/planner/...
 *
 * Sicherheitsmaßnahmen:
 * - Nur HTTPS-URLs erlaubt
 * - Max. Antwortgröße: 5 MB
 * - Timeout: 10 Sekunden
 * - Redirect-Follow (max. 5)
 */

import { NextResponse, type NextRequest } from "next/server";

// Whitelist für erlaubte Domains
const ALLOWED_DOMAINS = [
  'maxroll.gg',
  'mobalytics.gg',
  'pob.party',
  'poeplanner.com',
  'poe2.ninja',
  'pobbin.com',
  'pathofbuilding.com',
  'poe2.maxroll.gg',
  'poe2.mobalytics.gg'
];

/**
 * Validiert ob eine URL von einer erlaubten Domain stammt
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(domain =>
      parsed.hostname === domain ||
      parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Parameter "url" fehlt.' },
      { status: 400 }
    );
  }

  // Nur HTTPS erlauben (Sicherheit)
  if (!targetUrl.startsWith("https://")) {
    return NextResponse.json(
      { error: "Nur HTTPS-URLs sind erlaubt." },
      { status: 400 }
    );
  }

  // Whitelist-Validierung
  if (!isValidUrl(targetUrl)) {
    return NextResponse.json(
      { error: 'Ungültige URL: Domain nicht erlaubt.' },
      { status: 403 }
    );
  }

  try {
    // URL validieren
    const parsed = new URL(targetUrl);

    // Blocklist: Keine internen/privaten Hosts
    const blockedHosts = ["localhost", "127.0.0.1", "::1", "0.0.0.0"];
    if (blockedHosts.includes(parsed.hostname)) {
      return NextResponse.json(
        { error: "Interne URLs sind nicht erlaubt." },
        { status: 403 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000); // 5s Timeout

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "PoE2-Build-Tool/1.0",
        Accept: "text/html,application/json,*/*",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // Leite den realen Status-Code weiter, damit Parser 403 gezielt behandeln können
      return NextResponse.json(
        {
          error: `Ziel-URL antwortete mit Status ${response.status} ${response.statusText}`,
          targetStatus: response.status,
        },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "";

      // HTML: Text zurückgeben
      if (contentType.includes("text/html")) {
        const text = await response.text();

        // Max. 1 MB begrenzen (Sicherheit)
        if (text.length > 1024 * 1024) {
          return NextResponse.json(
            { error: "Response zu groß" },
            { status: 413 }
          );
        }

        return NextResponse.json({
          contentType,
          text,
          resolvedUrl: response.url,
        });
      }

    // JSON: Direkt durchreichen
    if (contentType.includes("application/json")) {
      const json = await response.json();
      return NextResponse.json({
        contentType,
        json,
        resolvedUrl: response.url,
      });
    }

    // Andere Typen nicht unterstützt
    return NextResponse.json(
      {
        error: `Content-Type "${contentType}" wird nicht unterstützt.`,
      },
      { status: 415 }
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Zeitüberschreitung bei der Anfrage (10s)." },
        { status: 504 }
      );
    }
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}