# Poe 2 Build — Code Audit
**Datum:** 10.06.2026 | **Basis:** `~/Poe 2 Build` (Next.js 16, Turbopack)

---

## Gesamtbild

Die App ist strukturell solide. TypeScript, Zustand, saubere Komponentenaufteilung, echte GGG-Daten (570 Gems, ~5.600 Items, ~8.100 Passives) — das Fundament stimmt. Die größten Probleme liegen nicht in der Architektur, sondern in drei konkreten Stellen: dem `textBuildParser.canParse()`-Check, der zu restriktiven Erkennungslogik für Gem-Listen, und einem fehlenden `/import`-Redirect.

---

## ✅ Was funktioniert

**Routing & Pages**
- `/` → zeigt `ImportBuild`-Komponente korrekt
- `/build` → vollständige Build-Übersicht mit Klasse, Gems, Passives, Stats
- `/gemmen` → 6-Sockel-Panel mit Link-Ketten-SVG, funktioniert auf Mobile und Desktop
- `/items` → Equipment-Slots mit RPG-Grid-Layout, Suchfilter, alle 11 Slots
- `/skilltree` → Klassenauswahl + Passive-Toggle, korrekt mit Store verbunden

**State-Management (buildStore.ts)**
- Zustand v5 + `persist` mit localStorage läuft fehlerfrei
- Schema-Migration (v2→v3): Item-Objekte → IDs; `sanitizeSavedBuilds` verhindert Korruption
- `skipHydration: true` + `useHydration`-Hook verhindert SSR-Hydration-Mismatch
- Bis zu 3 lokale Build-Slots speicherbar

**Parser-System**
- Strategy-Pattern mit Registry ist sauber aufgebaut
- PoB-Code/XML-Parser: vorhanden
- Maxroll/Mobalytics-Parser: vorhanden
- `fetch-url`-API-Route: hat Whitelist, HTTPS-only, 5s-Timeout, 1MB-Limit — **besser als der alte Audit behauptet**

**Datenqualität**
- Alle Gems bilingual (EN/DE), auto-generiert aus GGG-Dumps (02.06.2026)
- `extractGemsFromText()` sortiert nach Namenslänge → längste Matches zuerst, korrekt
- `statCalculator.ts` (662 Zeilen) rechnet Items + Gems + Passives zusammen

---

## 🔴 Kritisch (sofort fixen)

### 1. `textBuildParser.canParse()` — zu enge Bedingungen

**Das ist der Kern-Bug für „Parser erkennt keine einfachen Gem-Listen".**

Die Funktion hat vier Bedingungen. Keine davon greift für kurze Gem-Listen:

```typescript
// AKTUELL — versagt bei allen folgenden Inputs:
// "Infernal Cry\nEnduring Cry"          → length 25, <50
// "Bone Shatter\nArmour Explosion"      → kein Element-Keyword
// "Herald of Thunder\nHerald of Ice"    → length 37, <50
// "Summon Raging Spirits\nMinion Damage"→ kein Klassen-Keyword

(trimmed.includes('\n') && trimmed.length > 50) // ← Hauptproblem: 50-char-Hürde
```

**Fix — füge zwei Bedingungen hinzu:**

```typescript
canParse(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < 10) return false;

  // NEU: Gem-Namen direkt erkennen (eine Zeile pro Gem, keine URL/PoB)
  const looksLikeGemList =
    trimmed.includes('\n') &&                        // mehrzeilig
    !trimmed.startsWith('http') &&                   // keine URL
    !/^[A-Za-z0-9+/=]{20,}$/.test(trimmed.replace(/\s/g, '')) && // kein PoB-Code
    trimmed.split('\n').every(line => line.trim().length > 0 && line.trim().length < 60);

  return (
    /[Ss]kill [Gg]em|[Ss]upport [Gg]em|[Cc]lass[: ]|[Pp]assive|[Aa]scendancy/i.test(trimmed) ||
    /\b(lightning|ice|fire|chaos|physical)\b.*\b(arrow|bolt|strike|blast|nova|orb|wave)\b/i.test(trimmed) ||
    /\b(ranger|mercenary|monk|witch|sorceress|warrior|huntress|druid|templar|duelist|shadow|marauder)\b/i.test(trimmed) ||
    looksLikeGemList ||                              // ← NEU: Gem-Listen
    (trimmed.includes('\n') && trimmed.length > 30)  // ← Schwelle: 50→30
  );
},
```

**Betroffene Inputs die damit funktionieren:**
- `"Infernal Cry\nEnduring Cry"` ✓
- `"Bone Shatter\nArmour Explosion\nClose Combat"` ✓
- `"Herald of Thunder\nHerald of Ice\nHaste"` ✓
- `"Summon Raging Spirits\nMinion Damage"` ✓

---

### 2. `/import` redirectet auf `/` statt Komponente zu zeigen

**Datei:** `src/app/import/page.tsx`

```typescript
// AKTUELL:
export default function ImportPage() {
  redirect("/");  // ← ImportBuild ist auf / — aber Route /import zeigt ins Leere
}
```

`ImportBuild` ist auf `/` gemountet (`src/app/page.tsx`). Die Route `/import` ist tot — der Redirect zu `/` funktioniert zwar, aber die Navbar verlinkt auf `/import` und das verwirrt. Entweder `ImportBuild` auf `/import` verschieben und `/` als Landing-Page nutzen, oder den Link in der Navbar anpassen.

---

### 3. Fehlende Gem-Namen in der Datenbank

`extractGemsFromText()` kann nur finden, was in `gems.ts` steht. Folgende gebräuchliche Gems fehlen:
- `Added Lightning Damage` → nicht vorhanden
- `Bone Shatter` → heißt `Boneshatter` (ein Wort) — Regex-Mismatch bei "Bone Shatter"
- Support-Gem-Suffix: Viele User schreiben `"Chain Support"`, DB hat nur `"Chain"`

**Fix:** Alias-Matching oder Normalisierung des Inputs (Leerzeichen entfernen, "Support"-Suffix strippen) vor dem Regex-Check.

---

## 🟡 Mittel (diese Woche)

### 4. Nur eine aktive Gem pro Build

`buildStore.ts` hat 6 Sockets: Slot 0 = aktiv, Slots 1–5 = Support. Das ist korrekt für ein einzelnes Skill-Setup, aber PoE 2 erlaubt mehrere verlinkte Gruppen (z. B. Brust mit 6L + Helm mit 4L). Aktuell kann man nur eine Gruppe verwalten.

### 5. `statsOffensive` hat keine realen Grundwerte

`statCalculator.ts` addiert prozentuale Boni aus Items/Gems/Passives, aber ignoriert Basiswerte (z. B. Lebensformel = `50 + 10 × Level`). Die angezeigten Stats sind reine Boni, nicht absolute Werte — das ist für Nutzer irreführend.

### 6. Import-Seite zeigt kein Feedback wenn Text zu kurz ist

Wenn ein User `"Chain"` eingibt und klickt, wirft `findParser()` eine Exception und zeigt `"Fehler beim Import"`. Besser: direkte Meldung "Text zu kurz oder kein Build-Format erkannt — bitte Klassenname oder mehr Gems angeben".

### 7. `GemSocket`-Suchfeld lädt alle 570 Gems gleichzeitig

Kein Virtualisierung, kein Lazy Loading. Bei langsamem Gerät spürbar beim Öffnen des Dropdowns.

### 8. Skilltree zeigt nur ~12 Passives via `TALENT_ICONS`-Hardcoding

`passives.ts` hat tausende Einträge, aber die Seite rendert alle davon ohne Filterung nach Klasse. Bei gewähltem Warrior sieht man trotzdem Ranger-Talente. Klassen-Filter fehlt.

---

## 🔵 Gering (Backlog)

### 9. `import/page.tsx` Redirect — Fehlercode falsch

`redirect("/")` in Next.js App Router löst standardmäßig eine 307-Weiterleitung aus, keine 301. Für SEO irrelevant (es ist eine SPA), aber unnötig.

### 10. `full_code_audit_2026.md` — Befunde teils veraltet

Das Cline-Audit vom 05.06. listet SSRF als kritisch — ist inzwischen gefixt (Whitelist vorhanden). Andere Befunde doppeln sich oder sind nicht mehr reproduzierbar. Datei kann archiviert werden.

### 11. Keine Tests

Weder Unit- noch Integration-Tests. Der Parser-Bug wäre mit einem einfachen Test sofort aufgefallen.

### 12. `BuildUrlLoader.tsx` — potentieller Memory Leak

Event-Listener-Cleanup sollte überprüft werden (wurde im alten Audit gemeldet, noch nicht verifiziert gefixt).

---

## Prioritätsliste

| # | Problem | Aufwand | Impact |
|---|---------|---------|--------|
| 1 | `canParse()` — Schwelle 50→30, `looksLikeGemList` | 5 min | hoch |
| 2 | Alias-Normalisierung: "Chain Support" → "Chain", "Bone Shatter" → "Boneshatter" | 30 min | hoch |
| 3 | `/import`-Route: entweder echte Page oder Navbar-Link korrigieren | 10 min | mittel |
| 4 | Toast-Meldung bei zu kurzem Input verbessern | 10 min | mittel |
| 5 | Skilltree: Passives nach Klasse filtern | 2 h | mittel |
| 6 | Mehrere Skill-Gruppen im Store | 4 h | niedrig |
| 7 | GemSocket: Virtualisierung (react-window) | 2 h | niedrig |
| 8 | Tests schreiben (zumindest für Parser) | 4 h | niedrig |

---

## Fazit

Der Import-Parser-Bug ist **kein tiefer struktureller Fehler** — es ist eine zu strenge `canParse()`-Bedingung (50-Zeichen-Hürde) kombiniert mit Alias-Mismatch in der Gem-Datenbank. Beide Fixes sind klein. Alles andere ist Feinschliff.
