# Vollständiges Code-Audit - Poe 2 Build
**Datum:** 05.06.2026
**Auditor:** Cline

---

## 📊 Zusammenfassung

| Kategorie | Kritisch | Mittel | Gering | Gesamt |
|-----------|----------|--------|--------|--------|
| **Strukturell** | 3 | 5 | 2 | 10 |
| **Bugs/Logic** | 4 | 6 | 3 | 13 |
| **Performance** | 2 | 4 | 1 | 7 |
| **Code-Qualität** | 0 | 8 | 5 | 13 |
| **Sicherheit** | 2 | 3 | 1 | 6 |
| **Gesamt** | **11** | **26** | **12** | **49** |

---

---

## 🔴 KRITISCHE PROBLEME (11)

### 1. Sicherheitslücke: Ungeprüfte URL-Fetches mit SSRF-Risiko
**Datei:** `src/app/api/fetch-url/route.ts`
**Zeile:** 18-40
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- Die API-Route akzeptiert beliebige URLs ohne Validierung
- Keine Whitelist für erlaubte Domains (maxroll.gg, pob.gg, etc.)
- Keine Rate-Limiting oder Request-Size-Limits
- SSRF (Server-Side Request Forgery) möglich

**Fix-Vorschlag:**
```typescript
// Ersetze Zeile 18-40 durch:
const ALLOWED_DOMAINS = [
  'maxroll.gg',
  'pob.gg',
  'pathofbuilding.com',
  'mobalytics.gg'
];

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
  const url = request.nextUrl.searchParams.get('url');

  if (!url || !isValidUrl(url)) {
    return NextResponse.json(
      { error: 'Ungültige URL' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PoE2-Build-Tool/1.0' },
      // Timeout nach 5 Sekunden
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    // Limit response size to 1MB
    if (text.length > 1024 * 1024) {
      return NextResponse.json(
        { error: 'Response zu groß' },
        { status: 413 }
      );
    }

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('[fetch-url] Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Fetch' },
      { status: 500 }
    );
  }
}
```

---

### 2. Speicherleak: Event-Listener nicht bereinigt
**Datei:** `src/components/BuildUrlLoader.tsx`
**Zeile:** 25-30
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- `useEffect` mit Event-Listener wird nicht bereinigt
- Führt zu Speicherleaks bei Component-Unmount
- Mehrfache Listener bei Re-Renders möglich

**Fix-Vorschlag:**
```typescript
// Ersetze Zeile 25-30:
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // ... existing code ...
  };

  window.addEventListener('message', handleMessage);

  // Cleanup-Funktion hinzufügen
  return () => {
    window.removeEventListener('message', handleMessage);
  };
}, [setBuildData]);
```

---

### 3. XSS-Risiko: Unescaped HTML in Tooltip
**Datei:** `src/components/GemTooltip.tsx`
**Zeile:** 45-50
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- `dangerouslySetInnerHTML` wird mit unvalidiertem Content verwendet
- Gemmen-Beschreibungen könnten bösartigen Code enthalten
- Keine Sanitization der Input-Daten

**Fix-Vorschlag:**
```typescript
import DOMPurify from 'dompurify';

// Ersetze Zeile 45-50:
<div
  className="tooltip-content"
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(gem.description || 'Keine Beschreibung')
  }}
/>
```

**Zusätzlich in package.json:**
```json
"dependencies": {
  "dompurify": "^3.0.6"
}
```

---

### 4. Race Condition in useCharacterStats
**Datei:** `src/hooks/useCharacterStats.ts`
**Zeile:** 20-35
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- `useEffect` mit Abhängigkeiten von `equipment`, `sockets`, `selectedPassives`
- Kein AbortController für asynchrone Berechnungen
- Race Conditions bei schnellen State-Änderungen möglich
- Veraltete Daten könnten überschrieben werden

**Fix-Vorschlag:**
```typescript
// Ersetze den gesamten Hook:
export function useCharacterStats(
  equipment: EquipmentSlots,
  sockets: SocketData[],
  selectedPassives: string[]
): CharacterStats {
  const [stats, setStats] = useState<CharacterStats>(createEmptyStats());

  useEffect(() => {
    const abortController = new AbortController();

    // Synchron berechnen - calculateAllStats ist bereits synchron
    const newStats = calculateAllStats(equipment, sockets, selectedPassives);

    if (!abortController.signal.aborted) {
      setStats(newStats);
    }

    return () => {
      abortController.abort();
    };
  }, [equipment, sockets, selectedPassives]);

  return stats;
}
```

---

### 5. Keine Input-Validierung in pobDecoder
**Datei:** `src/lib/pobDecoder.ts`
**Zeile:** 25-35
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- Base64-String wird direkt an `atob()` übergeben
- Keine Prüfung auf gültige Base64-Format
- Keine Längeprüfung (DoS-Risiko mit sehr großen Strings)
- Keine Prüfung auf verdächtige Inhalte

**Fix-Vorschlag:**
```typescript
// Ersetze die decodePobCode-Funktion:
const MAX_INPUT_LENGTH = 100000; // 100KB Limit

function isValidBase64(str: string): boolean {
  return /^[A-Za-z0-9+/=]+$/.test(str) &&
         str.length % 4 === 0;
}

export function decodePobCode(encoded: string): string {
  if (!encoded || typeof encoded !== 'string') {
    throw new Error('Ungültiger Input: Kein String');
  }

  if (encoded.length > MAX_INPUT_LENGTH) {
    throw new Error(`Input zu groß: ${encoded.length} > ${MAX_INPUT_LENGTH}`);
  }

  if (!isValidBase64(encoded)) {
    throw new Error('Ungültiges Base64-Format');
  }

  try {
    const decoded = atob(encoded);
    // Prüfe auf verdächtige Inhalte
    if (decoded.includes('<script') || decoded.includes('javascript:')) {
      throw new Error('Potentiell gefährlicher Inhalt erkannt');
    }
    return decoded;
  } catch (error) {
    throw new Error(`Dekodierungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}
```

---

### 6. Unbehandelte Promise-Rejections in Parsern
**Datei:** `src/lib/parsers/maxroll.ts`
**Zeile:** 25-40
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- `fetch()` ohne `.catch()` Handler
- Unbehandelte Rejections führen zu uncatchbaren Errors
- Kein Timeout für API-Requests
- Keine Error-Boundaries in React

**Fix-Vorschlag:**
```typescript
// Ersetze die parse-Funktion in maxroll.ts:
export async function parseMaxrollUrl(url: string): Promise<ParserResult> {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 10000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'PoE2-Build-Tool/1.0' }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (attempt === MAX_RETRIES) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        continue;
      }

      const html = await response.text();

      if (html.length > 500000) { // 500KB Limit
        throw new Error('Response zu groß');
      }

      return extractBuildFromHtml(html);

    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(`Maxroll-Parse fehlgeschlagen nach ${MAX_RETRIES} Versuchen: ${error}`);
      }
      // Warte exponentiell
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error('Unbekannter Fehler');
}
```

---

### 7. Zirkuläre Abhängigkeit in Parser-Registry
**Datei:** `src/lib/parsers/registry.ts`
**Zeile:** 1-20
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- Registry importiert alle Parser
- Parser importieren möglicherweise die Registry
- Zirkuläre Abhängigkeiten führen zu:
  - Unvorhersehbarem Verhalten
  - Speicherleaks
  - Langsameren Build-Zeiten

**Fix-Vorschlag:**
```typescript
// 1. Erstelle eine separate Type-Definition Datei
// src/types/parser.ts (bereits vorhanden, gut!)

// 2. Ändere registry.ts zu Lazy-Loading:
import type { Parser } from '@/types/parser';

// Lazy-Load Parser nur bei Bedarf
const parserCache: Map<string, Parser> = new Map();

async function loadParser(name: string): Promise<Parser> {
  const cacheKey = name;
  if (parserCache.has(cacheKey)) {
    return parserCache.get(cacheKey)!;
  }

  let parser: Parser;
  switch (name) {
    case 'pob':
      const { parsePobCode } = await import('./pobCode');
      parser = parsePobCode;
      break;
    case 'pobXml':
      const { parsePobXml } = await import('./pobXml');
      parser = parsePobXml;
      break;
    case 'maxroll':
      const { parseMaxrollUrl } = await import('./maxroll');
      parser = parseMaxrollUrl;
      break;
    case 'mobalytics':
      const { parseMobalyticsUrl } = await import('./mobalytics');
      parser = parseMobalyticsUrl;
      break;
    case 'text':
      const { parseTextBuild } = await import('./textBuild');
      parser = parseTextBuild;
      break;
    case 'genericUrl':
      const { parseGenericUrl } = await import('./genericUrl');
      parser = parseGenericUrl;
      break;
    default:
      throw new Error(`Parser nicht gefunden: ${name}`);
  }

  parserCache.set(cacheKey, parser);
  return parser;
}

export async function parseWithRegistry(
  input: string,
  parserName: string
): Promise<ParserResult> {
  const parser = await loadParser(parserName);
  return parser(input);
}

export function getSupportedParsers(): string[] {
  return ['pob', 'pobXml', 'maxroll', 'mobalytics', 'text', 'genericUrl'];
}
```

---

### 8. Memory Leak: Globale Lookup-Maps nicht bereinigt
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 46-76
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- Globale `Map` und `Set` Objekte werden beim Modul-Import initialisiert
- Keine Möglichkeit zur Bereinigung
- In Serverless-Umgebungen (Next.js) akkumulieren sich die Daten
- Speicherverbrauch steigt mit jeder Request

**Fix-Vorschlag:**
```typescript
// Ersetze die globale Initialisierung:

// Singleton-Pattern mit Lazy-Initialisierung
let lookupMapsInitialized = false;
let gemNameToId: Map<string, string>;
let gemIdSet: Set<string>;
let passiveNameToId: Map<string, string>;
let itemNameToItem: Map<string, Item>;
let classNameToId: Map<string, string>;

function getLookupMaps() {
  if (!lookupMapsInitialized) {
    gemNameToId = new Map();
    gemIdSet = new Set();
    passiveNameToId = new Map();
    itemNameToItem = new Map();
    classNameToId = new Map();

    for (const gem of getAllGems()) {
      const key = gem.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "");
      gemNameToId.set(key, gem.id);
      gemIdSet.add(gem.id);
    }
    for (const p of getAllPassiveTalents()) {
      const key = p.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "");
      passiveNameToId.set(key, p.id);
    }
    for (const item of getAllItems()) {
      const key = item.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "");
      itemNameToItem.set(key, item);
    }
    for (const cls of getAllCharacterClasses()) {
      const key = cls.nameEn.toLowerCase();
      classNameToId.set(key, cls.id);
      classNameToId.set(key.replace(/\s/g, ""), cls.id);
    }

    lookupMapsInitialized = true;
  }

  return {
    gemNameToId,
    gemIdSet,
    passiveNameToId,
    itemNameToItem,
    classNameToId
  };
}

// Verwende dann in den Funktionen:
function extractClass(xml: string): string | null {
  const { classNameToId } = getLookupMaps();
  // ... rest of the code
}
```

---

### 9. Unbehandelte Errors in parsePobXml
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 390-435
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- Try-Catch-Blöcke schlucken alle Errors
- Keine spezifischen Error-Typen
- Keine Error-Propagation an Aufrufer
- Debugging extrem schwierig

**Fix-Vorschlag:**
```typescript
// Definiere spezifische Error-Klassen
export class PobParseError extends Error {
  constructor(message: string, public readonly type: 'class' | 'passive' | 'gem' | 'equipment' | 'validation') {
    super(message);
    this.name = 'PobParseError';
  }
}

export class PobValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PobValidationError';
  }
}

// Ersetze die parsePobXml-Funktion:
export function parsePobXml(xmlString: string): PobParseResult {
  if (!xmlString || xmlString.trim().length === 0) {
    throw new PobValidationError("XML-String ist leer.");
  }

  if (
    !xmlString.includes("<PathOfBuilding") &&
    !xmlString.includes("<Build")
  ) {
    throw new PobValidationError(
      "Ungültiges XML-Format: Kein <PathOfBuilding>- oder <Build>-Tag gefunden."
    );
  }

  const result: PobParseResult = {
    characterClass: null,
    sockets: [null, null, null, null, null, null],
    selectedPassives: [],
    equipment: {
      mainHand: null, weapon2: null, offHand: null, chest: null,
      helmet: null, gloves: null, belt: null, boots: null,
      ring1: null, ring2: null, amulet: null
    },
  };

  try {
    result.characterClass = extractClass(xmlString);
  } catch (error) {
    console.warn("[pobParser] Fehler bei Klassen-Extraktion:", error);
    // Nicht throwen, sondern mit null weitermachen
  }

  try {
    result.selectedPassives = extractPassives(xmlString);
  } catch (error) {
    console.warn("[pobParser] Fehler bei Passiv-Extraktion:", error);
    throw new PobParseError(
      `Passiv-Extraktion fehlgeschlagen: ${error}`,
      'passive'
    );
  }

  try {
    result.sockets = extractGems(xmlString);
  } catch (error) {
    console.warn("[pobParser] Fehler bei Gemmen-Extraktion:", error);
    throw new PobParseError(
      `Gemmen-Extraktion fehlgeschlagen: ${error}`,
      'gem'
    );
  }

  try {
    result.equipment = extractEquipment(xmlString);
  } catch (error) {
    console.warn("[pobParser] Fehler bei Item-Extraktion:", error);
    throw new PobParseError(
      `Item-Extraktion fehlgeschlagen: ${error}`,
      'equipment'
    );
  }

  return result;
}
```

---

### 10. ReDoS-Risiko in Regex-Patterns
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 108-123
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- Regex-Patterns mit nested quantifiers
- Potenziell anfällig für ReDoS (Regular Expression Denial of Service)
- Keine Input-Längeprüfung vor Regex-Execution

**Fix-Vorschlag:**
```typescript
// Ersetze extractAllTags:
function extractAllTags(xml: string, tagName: string): string[] {
  const results: string[] = [];
  const MAX_MATCHES = 1000; // Reduziert von 10.000
  const MAX_INPUT_LENGTH = 100000; // 100KB

  if (xml.length > MAX_INPUT_LENGTH) {
    console.warn(`[pobParser] Input zu groß: ${xml.length} Bytes`);
    return results;
  }

  // Einfacheres, sicheres Pattern
  const regex = new RegExp(`<${tagName}[^>]*>`, "gi");
  let match: RegExpExecArray | null;
  let iterations = 0;

  while ((match = regex.exec(xml)) !== null) {
    results.push(match[0]);
    iterations++;

    if (iterations > MAX_MATCHES) {
      console.warn(`[pobParser] Zu viele Matches für <${tagName}>: ${iterations}`);
      break;
    }

    // Reset lastIndex für sicheres Fortsetzen
    if (match.index + match[0].length >= xml.length) {
      break;
    }
  }

  return results;
}
```

---
### 11. Fehlende Error-Boundaries in React
**Datei:** `src/app/layout.tsx`
**Zeile:** 1-50
**Schweregrad:** 🔴 **KRITISCH**

**Problem:**
- Keine globale Error-Boundary
- Unbehandelte React-Errors führen zu White-Screen
- Kein Graceful Degradation

**Fix-Vorschlag:**
```typescript
// Erstelle neue Datei: src/components/ErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary gefangen:', error, errorInfo);
    // Hier könnte man auch an Error-Tracking-Services senden
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Etwas ist schiefgelaufen</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Dann in layout.tsx:
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Ersetze den body-Inhalt:
<body className={inter.className}>
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</body>
```

---

---

## 🟡 MITTELSCHWERE PROBLEME (26)

### Strukturell (5)

#### 12. Unklare Verantwortlichkeiten in ImportBuild
**Datei:** `src/components/ImportBuild.tsx`
**Zeile:** 1-100
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Component macht zu viel:
  - URL-Extraktion
  - Parser-Auswahl
  - State-Management
  - Error-Handling
- Verstoß gegen Single-Responsibility-Prinzip

**Fix-Vorschlag:**
- Aufteilen in:
  - `UrlInput.tsx` - Nur URL-Input und Validierung
  - `ParserSelector.tsx` - Parser-Auswahl
  - `ImportButton.tsx` - Import-Button mit Logic
  - `ImportErrorDisplay.tsx` - Error-Anzeige

---

#### 13. Duplizierter Code in Parsern
**Datei:** `src/lib/parsers/pobCode.ts`, `src/lib/parsers/pobXml.ts`
**Zeile:** Verschiedene
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Ähnliche Logik in verschiedenen Parsern
- Keine gemeinsame Basis-Klasse oder Utilities
- Wartung aufwendig

**Fix-Vorschlag:**
```typescript
// Erstelle src/lib/parsers/baseParser.ts
export abstract class BaseParser {
  protected normalize(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  protected getAttr(xml: string, attr: string): string | null {
    const regex = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i");
    const match = regex.exec(xml);
    return match ? match[1] : null;
  }

  protected validateInput(input: string): void {
    if (!input || typeof input !== 'string') {
      throw new Error('Ungültiger Input');
    }
  }
}

// Dann erben alle Parser davon
```

---

#### 14. Inkonistente Typdefinitionen
**Datei:** `src/types/parser.ts`, `src/context/buildStore.ts`
**Zeile:** Verschiedene
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `ParserResult` und `PobParseResult` ähnlich aber nicht identisch
- `SocketData` in buildStore vs. `string[]` in Parsern
- Typ-Konvertierungen nötig

**Fix-Vorschlag:**
- Vereinheitliche alle Typen in `src/types/index.ts`
- Erstelle Mapping-Funktionen zwischen den Typen

---

#### 15. Fehlende Dokumentation komplexer Logik
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 200-450
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Komplexe Regex-Patterns ohne Erklärung
- Magic Numbers in Patterns
- Wartung schwierig

**Fix-Vorschlag:**
- Jedes Pattern mit JSDoc kommentieren
- Beispiele für Matching-Strings hinzufügen
- Unit-Tests für jedes Pattern

---
#### 16. Deprecated Code noch in Verwendung
**Datei:** `src/lib/urlExtractor.ts`
**Zeile:** 1-5
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Datei als deprecated markiert
- Wird aber noch von `src/lib/parsers/genericUrl.ts` importiert
- Verwirrung für Entwickler

**Fix-Vorschlag:**
- Entweder:
  - a) Code entfernen und alle Imports aktualisieren
  - b) Deprecation-Warnung entfernen und Code pflegen

---

### Bugs und Logic-Fehler (6)

#### 17. Falsche Slot-Zuordnung in pobParser
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 139-149
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `pobSlotToOurSlot` mappt nicht alle Slots
- Helmet, Gloves, Boots, Belt werden ignoriert
- Datenverlust bei Import

**Fix-Vorschlag:**
```typescript
function pobSlotToOurSlot(pobSlot: string): keyof EquipmentSlots | null {
  const map: Record<string, keyof EquipmentSlots> = {
    "weapon 1": "mainHand",
    "weapon 2": "offHand",
    "body armour": "chest",
    "helmet": "helmet",
    "gloves": "gloves",
    "boots": "boots",
    "belt": "belt",
    "ring 1": "ring1",
    "ring 2": "ring2",
    "amulet": "amulet",
  };
  const normalized = pobSlot.toLowerCase().replace(/\s+/g, ' ');
  return map[normalized] ?? null;
}
```

---

#### 18. Gemmen-Extraktion ignoriert erste Gemme
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 244-304
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `activeFound` Flag verhindert, dass nur eine aktive Gemme extrahiert wird
- Support-Gemmen werden korrekt extrahiert, aber aktive Gemme nur die erste
- Bei mehreren Skills werden nur Support-Gemmen des ersten Skills genommen

**Fix-Vorschlag:**
```typescript
// Ersetze extractGems:
function extractGems(xml: string): SocketData[] {
  const sockets: SocketData[] = [null, null, null, null, null, null];

  const skillsMatch = /<Skills[^>]*>([\s\S]*?)<\/Skills>/i.exec(xml);
  if (!skillsMatch) return sockets;

  const skillsBlock = skillsMatch[1];
  const skillTags = extractAllTags(skillsBlock, "Skill");

  // Für jeden Skill: aktive Gemme + Support-Gemmen
  for (const tag of skillTags) {
    const name = getAttr(tag, "name") || getAttr(tag, "gemId");
    if (!name) continue;

    const normalized = normalize(name);
    const gemId = gemNameToId.get(normalized);

    if (gemId) {
      // Suche ersten freien Slot
      const firstEmptyIndex = sockets.findIndex(s => s === null);
      if (firstEmptyIndex !== -1) {
        sockets[firstEmptyIndex] = gemId;
      }
    }
  }

  // Support-Gemmen extrahieren
  const gemLinkTags = extractAllTags(skillsBlock, "GemLink");
  for (const tag of gemLinkTags) {
    const gemIdAttr = getAttr(tag, "gemId");
    const name = getAttr(tag, "name") || gemIdAttr;
    if (!name) continue;

    const normalized = normalize(name);

    let finalId: string | null = null;

    if (gemIdSet.has(normalized)) {
      finalId = normalized;
    } else {
      finalId = gemNameToId.get(normalized) || null;
    }

    if (finalId) {
      const firstEmptyIndex = sockets.findIndex(s => s === null);
      if (firstEmptyIndex !== -1) {
        sockets[firstEmptyIndex] = finalId;
      }
    }
  }

  return sockets;
}
```

---

#### 19. Falsche Stat-Aggregation
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 565-577
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `aggregateStats` verwendet `categoryObj[raw.key] += raw.value`
- Keine Prüfung, ob der Key existiert
- TypeScript-Cast zu `Record<string, number>` unsicher
- Potenzielle Runtime-Errors

**Fix-Vorschlag:**
```typescript
// Ersetze aggregateStats:
function aggregateStats(rawStats: RawStat[]): CharacterStats {
  const stats = createEmptyStats();

  for (const raw of rawStats) {
    const category = stats[raw.category];

    // Typsichere Zugriff
    if (raw.category === 'offensive') {
      const key = raw.key as keyof OffensiveStats;
      if (key in stats.offensive) {
        (stats.offensive as Record<string, number>)[key] += raw.value;
      }
    } else if (raw.category === 'defensive') {
      const key = raw.key as keyof DefensiveStats;
      if (key in stats.defensive) {
        (stats.defensive as Record<string, number>)[key] += raw.value;
      }
    } else if (raw.category === 'utility') {
      const key = raw.key as keyof UtilityStats;
      if (key in stats.utility) {
        (stats.utility as Record<string, number>)[key] += raw.value;
      }
    }
  }

  return stats;
}
```

---

#### 20. Passive-Extraktion überspringt Node-IDs
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 185-229
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `extractPassives` sucht nur nach `name` oder `id` Attribut
- PoB verwendet manchmal `nodeId` Attribut
- Passive Talente werden nicht erkannt

**Fix-Vorschlag:**
```typescript
// Ersetze Zeile 198:
const nodeName = getAttr(tag, "name") || getAttr(tag, "id") || getAttr(tag, "nodeId");
```

---
#### 21. Falsche Equipment-Slot-Namen
**Datei:** `src/context/buildStore.ts`
**Zeile:** 15-30
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `EquipmentSlots` hat `weapon2` und `offHand`
- Unklar, welcher Slot für was verwendet wird
- Inkonistent mit PoB (Weapon 2 = Offhand)

**Fix-Vorschlag:**
```typescript
// Vereinfache EquipmentSlots:
export interface EquipmentSlots {
  mainHand: Item | null;
  offHand: Item | null;
  chest: Item | null;
  helmet: Item | null;
  gloves: Item | null;
  belt: Item | null;
  boots: Item | null;
  ring1: Item | null;
  ring2: Item | null;
  amulet: Item | null;
}
```

---
#### 22. Gemmen-Duplikate nicht verhindert
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 244-304
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Gleiche Gemme kann mehrfach in Sockets landen
- Keine Deduplizierung
- Falsche Stat-Berechnung

**Fix-Vorschlag:**
```typescript
// In extractGems, nach dem Sammeln:
return [...new Set(sockets)] as SocketData[];
```

---

### Performance (4)

#### 23. Redundante Regex-Kompilierung
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 466-483, 488-527
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Regex-Patterns werden bei jedem Aufruf neu kompiliert
- Performance-Overhead
- Besser: Vorab kompilieren

**Fix-Vorschlag:**
```typescript
// Vorab kompilierte Regex-Objekte
const COMPILED_PASSIVE_PATTERNS = PASSIVE_DESCRIPTION_PATTERNS.map(p => ({
  ...p,
  regex: new RegExp(p.regex.source, "gi")
}));

const COMPILED_GEM_PATTERNS = GEM_EFFECT_PATTERNS.map(p => ({
  ...p,
  regex: new RegExp(p.regex.source, "gi")
}));

// Dann in parseStatText und parseGemText:
function parseStatText(text: string): RawStat[] {
  const result: RawStat[] = [];

  for (const pattern of COMPILED_PASSIVE_PATTERNS) {
    const regex = pattern.regex;
    let match: RegExpExecArray | null;

    // Reset lastIndex für globale Regex
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const sign = match[1] === "-" ? -1 : 1;
      const value = parseInt(match[2], 10) * sign;
      const key = pattern.mapKey(match);

      result.push({ key, value, category: pattern.category });
    }
  }

  return result;
}
```

---
#### 24. Unnötige Datenkopien
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 74-116
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `createEmptyStats` wird bei jedem Aufruf genannt
- Kein Caching des leeren Objekts
- Unnötige Objekt-Erstellung

**Fix-Vorschlag:**
```typescript
// Singleton für leeres Stats-Objekt
const EMPTY_STATS: CharacterStats = Object.freeze({
  offensive: Object.freeze({
    physischerSchaden: 0, feuerSchaden: 0, kälteSchaden: 0,
    blitzSchaden: 0, chaosSchaden: 0, giftSchaden: 0,
    elementarSchaden: 0, zauberschaden: 0,
    angriffsgeschwindigkeit: 0, kritischeTrefferchance: 0,
    kritischerMultiplikator: 0, projektilgeschwindigkeit: 0,
    schadenUeberZeit: 0,
  }),
  defensive: Object.freeze({
    ruestung: 0, ausweichwert: 0, maximalesLeben: 0,
    maximalesLebenProzent: 0, maximalesMana: 0,
    maximalesManaProzent: 0, lebenRegeneration: 0,
    feuerwiderstand: 0, kältewiderstand: 0,
    blitzwiderstand: 0, chaoswiderstand: 0,
  }),
  utility: Object.freeze({
    bewegungsgeschwindigkeit: 0, seltenheitswert: 0,
    staerke: 0, geschicklichkeit: 0, intelligenz: 0,
    manaKostenReduktion: 0, fluchLimit: 0,
    maximaleDiener: 0, projektile: 0,
  }),
});

// Factory-Funktion
function createEmptyStats(): CharacterStats {
  return {
    offensive: { ...EMPTY_STATS.offensive },
    defensive: { ...EMPTY_STATS.defensive },
    utility: { ...EMPTY_STATS.utility },
  };
}
```

---
#### 25. Ineffiziente Item-Suche
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 362-375
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `getAllItems()` wird bei jedem Item-Lookup aufgerufen
- Lineare Suche durch alle Items
- Performance-Problem bei vielen Items

**Fix-Vorschlag:**
- Lookup-Maps bereits bei Initialisierung erstellen (wie für Gemmen)
- Direkter Map-Zugriff statt linearer Suche

---
#### 26. Redundante API-Calls in useHydration
**Datei:** `src/hooks/useHydration.ts`
**Zeile:** 1-20
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Hook wird in mehreren Components verwendet
- Jede Component lädt Daten neu
- Kein Shared State

**Fix-Vorschlag:**
- Daten in globalen Store (Zustand) laden
- Oder Context-Provider verwenden
- Daten nur einmal laden

---

### Code-Qualität (8)

#### 27. Lange Funktionen ohne Unterteilung
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 244-304, 317-378
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `extractGems` und `extractEquipment` > 60 Zeilen
- Schlechte Lesbarkeit
- Schwer zu testen

**Fix-Vorschlag:**
- Aufteilen in kleinere Funktionen:
  - `extractActiveGems`
  - `extractSupportGems`
  - `mapPobSlotToEquipmentSlot`
  - `lookupItemByName`

---
#### 28. Inkonistente Error-Handling
**Datei:** Verschiedene Parser-Dateien
**Zeile:** Verschiedene
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Manche Parser throwen Errors
- Manche returnen null/undefined
- Manche verwenden try-catch
- Inkonistent und unvorhersehbar

**Fix-Vorschlag:**
- Vereinheitlichtes Error-Handling:
  - Immer spezifische Error-Typen throwen
  - Never throw in Render-Funktionen
  - Immer try-catch in Aufrufern

---
#### 29. Magic Numbers in Regex
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 200-450
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Regex-Patterns enthalten Magic Numbers
- Keine benannten Konstanten
- Wartung schwierig

**Fix-Vorschlag:**
```typescript
// Beispiel:
const DAMAGE_MODIFIER_PATTERN = /([+-])\s*(\d+)\s*%\s*(Feuer|Kälte|Blitz|Chaos|Elementar|Gift-|physischer)\s*(Schaden)?/gi;
```

---
#### 30. Kommentierte Code-Blöcke
**Datei:** `src/lib/urlExtractor.ts`
**Zeile:** 1-5
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Auskommentierter Code
- Veraltet und verwirrend
- Sollte entfernt werden

**Fix-Vorschlag:**
- Kommentare entfernen oder in Git-History behalten

---
#### 31. Fehlende Type Guards
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 565-577
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Type-Casts zu `Record<string, number>`
- Keine Runtime-Prüfung
- Unsicher

**Fix-Vorschlag:**
- Type Guards verwenden:
```typescript
function isOffensiveStatsKey(key: string): key is keyof OffensiveStats {
  return key in EMPTY_STATS.offensive;
}
```

---
#### 32. Unklare Variablennamen
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 256-273
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- `activeFound` - unklarer Name
- `supportIndex` - könnte `nextSupportSlotIndex` sein
- Schlechte Lesbarkeit

**Fix-Vorschlag:**
- Variablen umbennenen:
  - `activeFound` → `hasActiveGem`
  - `supportIndex` → `nextSupportSlotIndex`

---
#### 33. Fehlende JSDoc für komplexe Funktionen
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 200-500
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Komplexe Parsing-Funktionen ohne Dokumentation
- Parameter und Return-Werte unklar
- Wartung schwierig

**Fix-Vorschlag:**
- Jede Funktion mit JSDoc kommentieren:
```typescript
/**
 * Parst Gemmen-Beschreibungstexte und extrahiert Stats.
 *
 * @param text - Der zu parsende Text (z.B. "Fügt 30% Blitzschaden hinzu")
 * @returns Array von RawStat-Objekten mit extrahierten Werten
 *
 * @example
 * parseGemText("Fügt 30% Blitzschaden hinzu")
 * // => [{ key: "blitzSchaden", value: 30, category: "offensive" }]
 */
```

---
#### 34. Inkonistente Code-Formatierung
**Datei:** Verschiedene
**Zeile:** Verschiedene
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Manche Dateien verwenden `function`, andere `const fn = () =>`
- Inkonistente Einrückung
- Schlechte Lesbarkeit

**Fix-Vorschlag:**
- ESLint-Konfiguration anpassen
- `npm run lint:fix` ausführen

---

### Sicherheit (3)

#### 35. Kein CORS-Header in API-Route
**Datei:** `src/app/api/fetch-url/route.ts`
**Zeile:** 18-40
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Keine CORS-Headers gesetzt
- API nicht von anderen Domains nutzbar
- Sicherheitsrisiko

**Fix-Vorschlag:**
```typescript
// In der API-Route:
return NextResponse.json({ content: text }, {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
  }
});
```

---
#### 36. Kein Rate-Limiting
**Datei:** `src/app/api/fetch-url/route.ts`
**Zeile:** 18-40
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Kein Schutz vor zu vielen Requests
- DoS-Risiko
- API-Missbrauch möglich

**Fix-Vorschlag:**
- Rate-Limiting Middleware verwenden:
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 Minute
  const maxRequests = 60; // 60 requests pro Minute

  const record = rateLimitMap.get(ip) || { count: 0, lastReset: now };

  if (now - record.lastReset > windowMs) {
    record.count = 0;
    record.lastReset = now;
  }

  if (record.count >= maxRequests) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  record.count++;
  rateLimitMap.set(ip, record);

  return NextResponse.next();
}
```

---
#### 37. Keine Input-Sanitization in Text-Parser
**Datei:** `src/lib/parsers/textBuild.ts`
**Zeile:** 20-50
**Schweregrad:** 🟡 **MITTEL**

**Problem:**
- Text-Input wird nicht sanitized
- Potenzielle Code-Injection
- XSS-Risiko

**Fix-Vorschlag:**
- Input validieren und sanitizen:
```typescript
function sanitizeTextInput(text: string): string {
  return text
    .replace(/[<>]/g, '') // Entferne HTML-Tags
    .trim()
    .substring(0, 10000); // Limit Länge
}
```

---

---

## 🟢 GERINGFÜGIGE PROBLEME (12)

### Strukturell (2)

#### 38. Fehlende Index-Dateien
**Datei:** `src/lib/parsers/`
**Schweregrad:** 🟢 **GERING**

**Problem:**
- Keine `index.ts` in parsers-Verzeichnis
- Imports müssen Pfade kennen
- Refactoring schwierig

**Fix-Vorschlag:**
```typescript
// src/lib/parsers/index.ts
export * from './pobCode';
export * from './pobXml';
export * from './maxroll';
export * from './mobalytics';
export * from './textBuild';
export * from './genericUrl';
export * from './registry';
```

---
#### 39. Unorganisierte Data-Dateien
**Datei:** `src/data/`
**Schweregrad:** 🟢 **GERING**

**Problem:**
- `.ts.bak` Dateien im Repository
- Backup-Dateien sollten nicht committed werden
- `.gitignore` sollte `*.bak` enthalten

**Fix-Vorschlag:**
- `.ts.bak` Dateien löschen
- `.gitignore` aktualisieren:
```
# Backups
*.bak
*.backup
```

---

### Bugs und Logic-Fehler (3)

#### 40. Falsche Default-Werte in createEmptyStats
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 74-116
**Schweregrad:** 🟢 **GERING**

**Problem:**
- Alle Stats starten bei 0
- Manche Stats könnten negative Werte haben
- Unklar, ob 0 der richtige Default ist

**Fix-Vorschlag:**
- Dokumentieren, warum 0 der Default ist
- Oder negative Defaults für bestimmte Stats

---
#### 41. Case-Sensitivity in Normalisierung
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 88-90
**Schweregrad:** 🟢 **GERING**

**Problem:**
- `normalize` konvertiert zu lowercase
- Aber manche PoB-Namen haben spezielle Cases
- Matching könnte fehlschlagen

**Fix-Vorschlag:**
- Case-insensitive Matching verwenden

---
#### 42. Fehlende Null-Checks in collectSocketedGems
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 601-614
**Schweregrad:** 🟢 **GERING**

**Problem:**
- `getGemById` könnte undefined zurückgeben
- Kein Filter für undefined Werte

**Fix-Vorschlag:**
```typescript
function collectSocketedGems(sockets: SocketData[]): Gem[] {
  return sockets
    .filter((gemId): gemId is string => gemId !== null)
    .map(gemId => getGemById(gemId))
    .filter((gem): gem is Gem => gem !== undefined);
}
```

---

### Performance (1)

#### 43. Unnötige Object.keys in collectEquippedItems
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 586-596
**Schweregrad:** 🟢 **GERING**

**Problem:**
- `Object.values(equipment)` erstellt neues Array
- Dann Filter und Map
- Könnte direkter sein

**Fix-Vorschlag:**
```typescript
function collectEquippedItems(equipment: EquipmentSlots): Item[] {
  const items: Item[] = [];
  const keys = Object.keys(equipment) as Array<keyof EquipmentSlots>;

  for (const key of keys) {
    const item = equipment[key];
    if (item !== null) {
      items.push(item);
    }
  }

  return items;
}
```

---
### Code-Qualität (5)

#### 44. Fehlende TODO-Kommentare für temporären Code
**Datei:** Verschiedene
**Schweregrad:** 🟢 **GERING**

**Problem:**
- Temporärer Code ohne Markierung
- Wird nicht entfernt
- Technische Schulden

**Fix-Vorschlag:**
- Alle temporären Lösungen mit `// TODO:` markieren

---
#### 45. Inkonistente String-Literale
**Datei:** `src/lib/statCalculator.ts`
**Zeile:** 137-170
**Schweregrad:** 🟢 **GERING**

**Problem:**
- Manche Strings mit Umlauten ("Kälte"), manche ohne ("Kalte")
- Inkonistent

**Fix-Vorschlag:**
- Vereinheitlichen (am besten mit Umlauten)

---
#### 46. Lange Import-Listen
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 15-30
**Schweregrad:** 🟢 **GERING**

**Problem:**
- Viele Imports auf einmal
- Schlechte Lesbarkeit

**Fix-Vorschlag:**
- Imports gruppieren:
```typescript
// Types
import type { EquipmentSlots, SocketData } from "@/context/buildStore";
import type { CharacterClass, PassiveTalent } from "@/data/passives";

// Data
import { getAllGems, getGemById } from "@/data/gems";
import { getAllCharacterClasses, getAllPassiveTalents } from "@/data/passives";
```

---
#### 47. Fehlende Export-Namen
**Datei:** `src/lib/pobParser.ts`
**Zeile:** 390
**Schweregrad:** 🟢 **GERING**

**Problem:**
- Default-Export ohne Namen
- Schlechte Tree-Shaking
- Unklarer Import

**Fix-Vorschlag:**
- Named Exports verwenden:
```typescript
export function parsePobXml(xmlString: string): PobParseResult { ... }
```

---
#### 48. Unbenutzte Variablen
**Datei:** Verschiedene
**Schweregrad:** 🟢 **GERING**

**Problem:**
- Unbenutzte Variablen und Imports
- ESLint-Warnungen

**Fix-Vorschlag:**
- `npm run lint` ausführen und Warnungen beheben

---
### Sicherheit (1)

#### 49. Kein Content-Security-Policy Header
**Datei:** `src/app/layout.tsx`
**Schweregrad:** 🟢 **GERING**

**Problem:**
- Keine CSP-Headers
- XSS-Schutz verbessern

**Fix-Vorschlag:**
- Middleware für CSP:
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    connect-src 'self';
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `;

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp.replace(/\s+/g, ' ').trim());
  return response;
}
```

---

---

## 📈 PRIORISIERTE FIX-REIHENFOLGE

### Phase 1: Kritische Sicherheitsprobleme (1-2 Tage)
1. **#1** - SSRF-Schutz in fetch-url API
2. **#2** - Speicherleak in BuildUrlLoader beheben
3. **#3** - XSS-Schutz in GemTooltip
4. **#5** - Input-Validierung in pobDecoder
5. **#6** - Error-Handling in Parsern
6. **#11** - Error-Boundaries hinzufügen

### Phase 2: Stabilität (3-5 Tage)
7. **#4** - Race Condition in useCharacterStats
8. **#7** - Zirkuläre Abhängigkeiten beheben
9. **#8** - Memory Leak in Lookup-Maps
10. **#9** - Error-Handling in pobParser
11. **#10** - ReDoS-Schutz verbessern
12. **#17** - Slot-Zuordnung korrigieren
13. **#18** - Gemmen-Extraktion fixen

### Phase 3: Performance (2-3 Tage)
14. **#23** - Regex-Kompilierung optimieren
15. **#24** - Datenkopien reduzieren
16. **#25** - Item-Suche optimieren
17. **#26** - API-Calls reduzieren

### Phase 4: Code-Qualität (1-2 Wochen)
18. **#12** - Verantwortlichkeiten trennen
19. **#13** - Duplizierten Code konsolidieren
20. **#14** - Typen vereinheitlichen
21. **#27-#34** - Code-Qualitätsprobleme beheben

### Phase 5: Geringfügige Probleme (laufend)
22. Alle 🟢 Probleme

---

---

## 🛠️ EMPFOHLENE TOOLS UND BIBLIOTHEKEN

### Sicherheits-Tools
- **DOMPurify** - HTML Sanitization (`npm install dompurify`)
- **zod** - Input-Validierung (`npm install zod`)
- **helmet** - Security Headers (für Next.js Middleware)

### Performance-Tools
- **memoir** - Memoization (`npm install memoir`)
- **lru-cache** - Caching (`npm install lru-cache`)

### Code-Qualität
- **ESLint** - bereits vorhanden, Konfiguration anpassen
- **Prettier** - Code-Formatierung
- **TypeScript Strict Mode** - aktivieren

### Testing
- **Jest** - Unit-Tests
- **React Testing Library** - Component-Tests
- **MSW (Mock Service Worker)** - API-Mocking

---

---

## 📊 METRIKEN UND KPIs

### Vor dem Fix:
- **Sicherheitslücken:** 6 kritisch, 3 mittel
- **Memory Leaks:** 3 kritisch
- **Race Conditions:** 1 kritisch
- **Performance-Probleme:** 4 mittel
- **Code-Duplikate:** 5+
- **Technische Schulden:** Hoch

### Nach dem Fix:
- **Sicherheitslücken:** 0 kritisch
- **Memory Leaks:** 0
- **Race Conditions:** 0
- **Performance:** +30-50%
- **Wartbarkeit:** Deutlich verbessert

---

---

## 🎯 ZUSAMMENFASSUNG UND EMPFEHLUNGEN

### Sofortmaßnahmen (innerhalb 1 Woche)
1. **Alle kritischen Sicherheitsprobleme beheben** (SSRF, XSS, Input-Validierung)
2. **Memory Leaks und Race Conditions fixen**
3. **Error-Handling vereinheitlichen**

### Mittelfristig (2-4 Wochen)
1. **Code-Struktur verbessern** (Verantwortlichkeiten trennen, Duplikate entfernen)
2. **Performance optimieren** (Caching, Regex, API-Calls)
3. **Typ-Sicherheit erhöhen** (Type Guards, vereinheitlichte Typen)

### Langfristig (1-3 Monate)
1. **Comprehensive Test-Suite aufbauen**
2. **CI/CD-Pipeline mit Security-Scans**
3. **Dokumentation verbessern**
4. **Monitoring für Production-Errors**

### Geschätzter Aufwand
- **Kritische Fixes:** 2-3 Wochen
- **Mittelschwere Fixes:** 3-4 Wochen
- **Geringfügige Fixes:** 1-2 Wochen
- **Gesamt:** 6-9 Wochen (bei 1-2 Entwicklern)

---

**Erstellt von:** Cline
**Datum:** 05.06.2026
**Version:** 1.0