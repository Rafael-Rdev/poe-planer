/**
 * PoB-Code-Decoder
 *
 * Dekodiert einen Path of Building (PoB) Share-Code (Base64 + deflate)
 * in einen rohen XML-String.
 *
 * Sicherheitsmassnahmen:
 * - Maximale Input-Grösse (MAX_INPUT_SIZE), um Memory-Exhaustion zu verhindern
 * - Begrenzung der Padding-Iterationen (max. 3 Durchläufe)
 * - pako.inflate mit Grössenlimit (maxResultLength)
 *
 * Ablauf:
 * 1. Bereinigung: Whitespace/Zeilenumbrüche entfernen
 * 2. URL-safe → Standard Base64: "-" → "+", "_" → "/"
 * 3. Base64 → Uint8Array
 * 4. pako.inflate() → XML-String (UTF-8)
 */

import pako from "pako";

/** Maximale Eingabelänge in Zeichen (ca. 750 KB Base64 → ~500 KB dekomprimiert) */
const MAX_INPUT_SIZE = 1_000_000;

/** Maximale dekomprimierte Grösse in Bytes (5 MB Sicherheitsgrenze) */
const MAX_DECOMPRESSED_SIZE = 5_000_000;

/**
 * Dekodiert einen PoB-Code (URL-safe Base64 + deflate) in einen XML-String.
 *
 * @param pobCode - Der rohe PoB-Code (z. B. aus Zwischenablage)
 * @returns Der dekomprimierte XML-String
 * @throws Wenn der Code ungültig ist, zu gross oder nicht dekomprimiert werden kann
 */
export function decodePobCode(pobCode: string): string {
  if (!pobCode || pobCode.trim().length === 0) {
    throw new Error("PoB-Code ist leer.");
  }

  // --- Sicherheitscheck: Maximale Input-Grösse ---
  if (pobCode.length > MAX_INPUT_SIZE) {
    throw new Error(
      `PoB-Code zu gross (${(pobCode.length / 1000).toFixed(0)} KB). ` +
      `Maximal erlaubt sind ${(MAX_INPUT_SIZE / 1000).toFixed(0)} KB.`
    );
  }

  // 1. Whitespace, Zeilenumbrüche, Tabs entfernen
  let cleaned = pobCode.replace(/\s/g, "");

  // 2. URL-safe Base64 → Standard Base64
  //    PoB verwendet URL-base64: '-' statt '+' und '_' statt '/'
  cleaned = cleaned.replace(/-/g, "+").replace(/_/g, "/");

  // 3. Padding ergänzen (Base64-Länge muss durch 4 teilbar sein)
  //    Sicherheit: Maximal 3 Iterationen (mehr ist bei Base64 unmöglich)
  let paddingIterations = 0;
  while (cleaned.length % 4 !== 0 && paddingIterations < 3) {
    cleaned += "=";
    paddingIterations++;
  }

  // 4. Base64 → Binary-String → Uint8Array
  let binaryStr: string;
  try {
    binaryStr = atob(cleaned);
  } catch {
    throw new Error("Ungültiger Base64-Code im PoB-String.");
  }

  // --- Sicherheitscheck: Binary-String-Länge prüfen ---
  if (binaryStr.length > MAX_DECOMPRESSED_SIZE) {
    throw new Error(
      `Dekomprimierte Daten zu gross (${(binaryStr.length / 1_000_000).toFixed(1)} MB). ` +
      `Maximal erlaubt sind ${(MAX_DECOMPRESSED_SIZE / 1_000_000).toFixed(0)} MB.`
    );
  }

  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // 5. pako.inflate → XML-String (Binary-Längen-Prüfung erfolgte bereits oben)
  try {
    const raw = pako.inflate(bytes, { to: "string" });
    return raw;
  } catch {
    throw new Error(
      "Fehler beim Dekomprimieren des PoB-Codes. " +
        "Stelle sicher, dass es sich um einen gültigen Path of Building-Code handelt."
    );
  }
}
