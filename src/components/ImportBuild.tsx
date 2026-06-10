"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Copy, Check, CheckCircle, AlertTriangle, Loader2, Link, ClipboardCopy, ExternalLink, Code2, FolderOpen, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { translateBuildText } from "@/lib/parser";
import { parseBuild, findParser } from "@/lib/parsers";
import { parseMaxrollBuildFile, type MaxrollBuildParseResult } from "@/lib/maxrollBuildFileParser";
import { useBuildStore } from "@/context/buildStore";
import ResetBuildButton from "@/components/ResetBuildButton";
import LocalSaveSlots from "@/components/LocalSaveSlots";

type Tab = "text" | "pob" | "file";

export default function ImportBuild() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [textInput, setTextInput] = useState("");
  const [pobInput, setPobInput] = useState("");

  // .build file state
  const [buildFile, setBuildFile] = useState<File | null>(null);
  const [fileParseResult, setFileParseResult] = useState<MaxrollBuildParseResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const input = activeTab === "text" ? textInput : pobInput;

  // Mount-Guard
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const [translated, setTranslated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Store-Actions
  const { setSockets, setClass, setPassives, setAllEquipment, setLevel } = useBuildStore(
    useShallow((s) => ({
      setSockets: s.setSockets,
      setClass: s.setClass,
      setPassives: s.setPassives,
      setAllEquipment: s.setAllEquipment,
      setLevel: s.setLevel,
    }))
  );

  // Toast-Timer-Ref
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  function showToast(type: "success" | "error", text: string) {
    setToastMsg({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 4000);
  }

  // ── Text / URL / PoB import ──────────────────────────────────────────────────

  async function handleImport() {
    if (!input.trim()) return;
    setIsImporting(true);
    try {
      const parsed = await parseBuild(input.trim());

      let displayText: string | null = null;
      try {
        const parser = findParser(input.trim());
        if (parser.name === "genericUrl" || parser.name === "maxroll" || parser.name === "mobalytics") {
          displayText = `🌐 Build von URL importiert:\n${input.trim()}`;
        } else if (parser.name === "pobCode" || parser.name === "pobXml") {
          displayText = "📦 PoB-Build importiert";
        } else {
          displayText = translateBuildText(input);
        }
      } catch {
        displayText = translateBuildText(input);
      }

      if (parsed.characterClass) setClass(parsed.characterClass);
      if (parsed.level !== undefined) setLevel(parsed.level);
      if (parsed.sockets.some((s) => s !== null)) setSockets(parsed.sockets);
      if (parsed.selectedPassives.length > 0) setPassives(parsed.selectedPassives);
      setAllEquipment(parsed.equipment);
      if (displayText !== null) setTranslated(displayText);

      const parts: string[] = [];
      if (parsed.characterClass) parts.push("Klasse");
      if (parsed.level !== undefined) parts.push(`Level ${parsed.level}`);
      if (parsed.sockets.some((s) => s !== null)) parts.push("Gemmen");
      if (parsed.selectedPassives.length > 0) parts.push("Talente");
      if (Object.values(parsed.equipment).some((v) => v !== null)) parts.push("Items");

      if (parts.length === 0) {
        showToast("error", "Keine Build-Daten erkannt. Bitte überprüfe, ob es sich um einen gültigen Build handelt.");
      } else {
        showToast("success", `Build erfolgreich importiert! (${parts.join(", ")})`);
        setTimeout(() => { if (isMounted.current) router.push("/build"); }, 1500);
      }
    } catch (err) {
      showToast("error", `Fehler beim Import: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
    } finally {
      setIsImporting(false);
    }
  }

  // ── .build file import ───────────────────────────────────────────────────────

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setFileParseResult(null);
    setBuildFile(file);

    try {
      const content = await file.text();
      const result = parseMaxrollBuildFile(content);
      setFileParseResult(result);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Fehler beim Lesen der Datei.");
      setBuildFile(null);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleClearFile() {
    setBuildFile(null);
    setFileParseResult(null);
    setFileError(null);
  }

  async function handleFileImport() {
    if (!fileParseResult) return;
    setIsImporting(true);
    try {
      const r = fileParseResult;
      if (r.characterClass) setClass(r.characterClass);
      if (r.level !== undefined) setLevel(r.level);
      if (r.sockets.some((s) => s !== null)) setSockets(r.sockets);
      if (r.selectedPassives.length > 0) setPassives(r.selectedPassives);
      setAllEquipment(r.equipment);

      const parts: string[] = [];
      if (r.characterClass) parts.push("Klasse");
      if (r.level !== undefined) parts.push(`Level ${r.level}`);
      if (r.sockets.some((s) => s !== null)) parts.push(`${r.stats.gemsRecognized} Gem${r.stats.gemsRecognized !== 1 ? "s" : ""}`);
      if (r.selectedPassives.length > 0) parts.push(`${r.selectedPassives.length} Passive`);

      if (parts.length === 0) {
        showToast("error", "Keine bekannten Build-Daten in der Datei gefunden.");
      } else {
        showToast("success", `Build importiert! (${parts.join(", ")})`);
        setTimeout(() => { if (isMounted.current) router.push("/build"); }, 1500);
      }
    } finally {
      setIsImporting(false);
    }
  }

  function handleCopy() {
    if (!translated) return;
    navigator.clipboard.writeText(translated).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* TOAST */}
      {toastMsg && (
        <div
          className={`fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-5 py-3 shadow-xl transition-all duration-300 ${
            toastMsg.type === "success"
              ? "border border-emerald-700/50 bg-emerald-900/80 text-emerald-200 backdrop-blur-sm"
              : "border border-red-700/50 bg-red-900/80 text-red-200 backdrop-blur-sm"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
          )}
          <span className="text-sm font-medium">{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-amber-400 sm:text-4xl">
          Build Importieren & Übersetzen
        </h1>
        <p className="mt-2 text-zinc-400">
          Füge einen Build-Text, eine URL, einen PoB-Code ein oder lade eine Maxroll .build-Datei hoch.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-lg border border-zinc-700 bg-zinc-900/50 p-1">
        <button
          onClick={() => setActiveTab("text")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "text" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          Text / URL
        </button>
        <button
          onClick={() => setActiveTab("pob")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "pob" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Code2 className="h-4 w-4" />
          PoB-Code
        </button>
        <button
          onClick={() => setActiveTab("file")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "file" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          .build-Datei
        </button>
      </div>

      {/* ── Tab: Text / URL ── */}
      {activeTab === "text" && (
        <>
          <div className="mb-6">
            <label htmlFor="build-input" className="mb-2 block text-sm font-medium text-zinc-300">
              Build-Text oder URL
            </label>
            <textarea
              id="build-input"
              rows={12}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Füge hier deinen Build-Text oder eine Build-Planer-URL ein:\n\nText:  Playing a Mercenary Build. I'm using Lightning Arrow linked with Chain…\nURL:   https://maxroll.gg/poe2/planner/abc123… (maxroll.gg oder pob.party)`}
              className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-colors"
            />
          </div>
          {/mobalytics\.gg/i.test(textInput.trim()) && (
            <div className="-mt-4 mb-6 rounded-xl border border-amber-700/40 bg-amber-950/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">
                  Mobalytics blockiert automatische Imports — hier ist wie es trotzdem geht:
                </span>
              </div>
              <ol className="space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-700/50 text-[10px] font-bold text-amber-300">1</span>
                  <span>Öffne deinen Mobalytics-Build im Browser</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-700/50 text-[10px] font-bold text-amber-300">2</span>
                  <span>Scrolle zum Abschnitt <strong className="text-zinc-100">„Skills"</strong> oder <strong className="text-zinc-100">„Passives"</strong> und markiere den Build-Text</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-700/50 text-[10px] font-bold text-amber-300">3</span>
                  <span>Alternativ: Klicke auf <strong className="text-zinc-100">„Copy Build"</strong> oder <strong className="text-zinc-100">„Export"</strong> falls vorhanden</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-700/50 text-[10px] font-bold text-amber-300">4</span>
                  <span>Füge den kopierten Text oben ins Textfeld ein</span>
                </li>
              </ol>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
                <ClipboardCopy className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <span>Tipp: Auch ein roher Build-Text mit Gem-Namen funktioniert — z.B. aus einem Reddit-Post oder einem YouTube-Guide.</span>
              </div>
            </div>
          )}
          {/^https?:\/\//i.test(textInput.trim()) && !/mobalytics\.gg/i.test(textInput.trim()) && (
            <div className="-mt-4 mb-6 flex items-center gap-2 rounded-lg border border-blue-700/40 bg-blue-900/20 px-4 py-2 text-sm text-blue-300">
              <Link className="h-4 w-4 shrink-0" />
              <span>URL erkannt – die Seite wird abgerufen und nach Build-Daten durchsucht.</span>
            </div>
          )}
          <div className="mb-10 flex flex-wrap items-center gap-3">
            <button
              onClick={handleImport}
              disabled={!textInput.trim() || isImporting}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? <><Loader2 className="h-4 w-4 animate-spin" />Importiere…</> : <><Upload className="h-4 w-4" />Build Importieren</>}
            </button>
            <ResetBuildButton variant="full" />
          </div>
        </>
      )}

      {/* ── Tab: PoB-Code ── */}
      {activeTab === "pob" && (
        <>
          <div className="mb-6">
            <label htmlFor="pob-input" className="mb-2 block text-sm font-medium text-zinc-300">
              Path of Building Code
            </label>
            <textarea
              id="pob-input"
              rows={6}
              value={pobInput}
              onChange={(e) => setPobInput(e.target.value)}
              placeholder="eNrtPW9zoziy9/tTeefDTtVkJCEJqEol2Djjf2Mb4385t7a2ZGxiM8bgA2x29tlfvwI7TmY2M..."
              className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-colors"
            />
          </div>
          <div className="-mt-4 mb-6 rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-300">So erhältst du deinen PoB-Code:</p>
            <ol className="space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300">1</span>
                <span>Öffne <strong className="text-zinc-200">Path of Building Community</strong> und lade deinen Build</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300">2</span>
                <span>Klicke oben links auf <strong className="text-zinc-200">Gear → Copy Build Code</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300">3</span>
                <span>Füge den kopierten Code in das Feld oben ein</span>
              </li>
            </ol>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-400">
              <Code2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span>Klasse, Level, Gems und Passive werden automatisch erkannt – sofern in unserer Datenbank vorhanden.</span>
            </div>
          </div>
          <div className="mb-10 flex flex-wrap items-center gap-3">
            <button
              onClick={handleImport}
              disabled={!pobInput.trim() || isImporting}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? <><Loader2 className="h-4 w-4 animate-spin" />Importiere…</> : <><Upload className="h-4 w-4" />Build Importieren</>}
            </button>
            <ResetBuildButton variant="full" />
          </div>
        </>
      )}

      {/* ── Tab: .build-Datei ── */}
      {activeTab === "file" && (
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".build,.json"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Drop / select area */}
          {!buildFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mb-6 flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-600 bg-zinc-900/40 px-6 py-12 text-zinc-400 transition-colors hover:border-amber-600/60 hover:bg-zinc-900/70 hover:text-zinc-200"
            >
              <FolderOpen className="h-10 w-10 text-zinc-500" />
              <div className="text-center">
                <p className="text-sm font-medium">Klicken zum Auswählen einer .build-Datei</p>
                <p className="mt-1 text-xs text-zinc-500">Maxroll PoE2 Build Export (.build / .json)</p>
              </div>
            </button>
          ) : (
            <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{buildFile.name}</p>
                    <p className="text-xs text-zinc-500">{(buildFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={handleClearFile}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                  title="Datei entfernen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Parse preview */}
              {fileParseResult && (
                <div className="mt-4 space-y-3 border-t border-zinc-700/50 pt-4">
                  {fileParseResult.buildName && (
                    <p className="text-sm text-zinc-300">
                      <span className="text-zinc-500">Build:</span>{" "}
                      <span className="font-medium text-amber-300">{fileParseResult.buildName}</span>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <Stat
                      label="Klasse"
                      value={fileParseResult.characterClass ?? "–"}
                      ok={!!fileParseResult.characterClass}
                    />
                    <Stat
                      label="Level"
                      value={fileParseResult.level !== undefined ? String(fileParseResult.level) : "–"}
                      ok={fileParseResult.level !== undefined}
                    />
                    <Stat
                      label="Passive"
                      value={`${fileParseResult.stats.passivesRecognized} / ${fileParseResult.stats.passivesTotal}`}
                      ok={fileParseResult.stats.passivesRecognized > 0}
                    />
                    <Stat
                      label="Gems"
                      value={`${fileParseResult.stats.gemsRecognized} / ${fileParseResult.stats.gemsTotal}`}
                      ok={fileParseResult.stats.gemsRecognized > 0}
                    />
                  </div>
                  {fileParseResult.stats.passivesRecognized < fileParseResult.stats.passivesTotal && (
                    <p className="text-xs text-zinc-500">
                      Nicht alle Passive/Gems wurden in der Datenbank gefunden — vermutlich numerische IDs oder Einträge die noch nicht in der DB sind.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {fileError && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {fileError}
            </div>
          )}

          {/* Anleitung */}
          <div className="mb-6 rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-300">So exportierst du deinen Maxroll-Build:</p>
            <ol className="space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300">1</span>
                <span>Öffne deinen Build auf <strong className="text-zinc-200">maxroll.gg/poe2/build-planner</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300">2</span>
                <span>Klicke auf das <strong className="text-zinc-200">Zahnrad-Symbol</strong> oder <strong className="text-zinc-200">„Export"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300">3</span>
                <span>Wähle <strong className="text-zinc-200">„Export Build File (.build)"</strong> und speichere die Datei</span>
              </li>
            </ol>
          </div>

          <div className="mb-10 flex flex-wrap items-center gap-3">
            <button
              onClick={handleFileImport}
              disabled={!fileParseResult || isImporting}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? <><Loader2 className="h-4 w-4 animate-spin" />Importiere…</> : <><Upload className="h-4 w-4" />Build Importieren</>}
            </button>
            <ResetBuildButton variant="full" />
          </div>
        </>
      )}

      {/* Build speichern / Lokale Slots */}
      <div className="mb-10">
        <LocalSaveSlots />
      </div>

      {/* Translated Output (nur für Text/URL/PoB relevant) */}
      {translated !== null && activeTab !== "file" && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50">
          <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Übersetzter Build (Deutsch / PS5)</h2>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              {copied ? <><Check className="h-3.5 w-3.5 text-green-400" />Kopiert</> : <><Copy className="h-3.5 w-3.5" />Kopieren</>}
            </button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-4 font-mono text-sm leading-relaxed text-zinc-300">
            {translated}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Sub-Komponente: Stat-Badge ─────────────────────────────────────────────────

function Stat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${
      ok
        ? "border-emerald-800/50 bg-emerald-950/30"
        : "border-zinc-700/50 bg-zinc-800/40"
    }`}>
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className={`mt-0.5 font-medium ${ok ? "text-emerald-300" : "text-zinc-400"}`}>{value}</p>
    </div>
  );
}
