"use client";

import { useState, useRef, useCallback, useEffect, type DragEvent, type ChangeEvent } from "react";
import {
  Languages,
  ImagePlus,
  X,
  Copy,
  BookmarkPlus,
  Check,
  Loader2,
  FileText,
  AlertCircle,
  ChevronDown,
  FileUp,
} from "lucide-react";
import { useSavedBuildsStore } from "@/context/savedBuildsStore";

// ─── Typen ───────────────────────────────────────────────────────────────────

interface UploadedImage {
  id: string;
  file: File;
  data: string;       // base64 ohne data:-Prefix
  mediaType: string;  // "image/jpeg" | "image/png" | "image/webp"
  preview: string;    // object URL für Vorschau
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Entfernt PoE2-Markup-Tags wie <rgb(...)>{...}, <b>{...}, <s>{...} aus Text */
function stripMarkup(text: string): string {
  return text
    .replace(/<rgb\([^)]*\)>\{?/gi, "")
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?b>\{?/gi, "")
    .replace(/<\/?s>/gi, "")
    .replace(/<\/?s>\{?/gi, "")
    .replace(/\{/g, "")
    .replace(/\}/g, "")
    .replace(/<[^>]+>/g, "")  // Fallback: alle verbleibenden HTML-ähnlichen Tags
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Markdown-Renderer ────────────────────────────────────────────────────────

function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-zinc-100 font-semibold">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function MarkdownOutput({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`ul-${listKey++}`} className="ml-4 mt-1 mb-3 space-y-1 list-none">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flushList();
      nodes.push(
        <h2 key={i} className="mt-6 mb-2 text-lg font-bold text-amber-400 border-b border-amber-900/40 pb-1">
          {parseInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      nodes.push(
        <h3 key={i} className="mt-4 mb-1 text-base font-semibold text-amber-300">
          {parseInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(
        <li key={i} className="flex gap-2 text-zinc-300 text-sm leading-relaxed">
          <span className="text-amber-600 mt-1 flex-shrink-0">▸</span>
          <span>{parseInline(line.slice(2))}</span>
        </li>
      );
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={i} className="text-zinc-300 text-sm leading-relaxed mb-2">
          {parseInline(line)}
        </p>
      );
    }
  });

  flushList();
  return <div className="py-2">{nodes}</div>;
}

// ─── Bild-Komprimierung (Canvas-API) ───────────────────────────────────────────

/**
 * Komprimiert ein Bild mit der Canvas-API auf max. 1280px Breite
 * und gibt es als JPEG-base64-dataURL zurück.
 * Bei Fehlern wird das Original-File unverändert verwendet.
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_WIDTH = 1280;
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Canvas nicht verfügbar → Original-Datei als dataURL zurückgeben
        fallbackToOriginalDataUrl(file, resolve);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      fallbackToOriginalDataUrl(file, resolve);
    };

    img.src = objectUrl;
  });
}

function fallbackToOriginalDataUrl(
  file: File,
  resolve: (value: string) => void
): void {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => resolve("");
  reader.readAsDataURL(file);
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function TranslatePage() {
  const [activeTab, setActiveTab] = useState<"text" | "images" | "file">("text");
  const [textInput, setTextInput] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [buildName, setBuildName] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [buildFile, setBuildFile] = useState<File | null>(null);
  const [buildData, setBuildData] = useState<Record<string, unknown> | null>(null);
  const [extractedText, setExtractedText] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const buildFileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const { saveBuild } = useSavedBuildsStore();

  /** Parst eine .build Datei, extrahiert relevante Felder und bereinigt Markup */
  function parseBuildFile(file: File) {
    // H3: Dateigröße prüfen vor readAsText
    if (file.size > 5 * 1024 * 1024) {
      setError("Datei zu groß (max. 5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setBuildData(json);

        const parts: string[] = [];

        if (json.name) parts.push(`Name: ${stripMarkup(String(json.name))}`);
        if (json.author) parts.push(`Autor: ${stripMarkup(String(json.author))}`);
        if (json.description) parts.push(`Beschreibung: ${stripMarkup(String(json.description))}`);
        if (json.ascendancy) parts.push(`Ascendancy: ${stripMarkup(String(json.ascendancy))}`);

        // Passives extrahieren
        if (Array.isArray(json.passives)) {
          const passiveTexts = json.passives
            .map((p: Record<string, unknown>) => {
              if (p.additional_text) return stripMarkup(String(p.additional_text));
              if (p.name) return stripMarkup(String(p.name));
              return "";
            })
            .filter(Boolean);
          if (passiveTexts.length > 0) {
            parts.push(`Passive Skills:\n${passiveTexts.join("\n")}`);
          }
        }

        // Skills extrahieren
        if (Array.isArray(json.skills)) {
          const skillTexts = json.skills
            .map((s: Record<string, unknown>) => {
              const skillParts: string[] = [];
              if (s.name) skillParts.push(stripMarkup(String(s.name)));
              if (s.description) skillParts.push(stripMarkup(String(s.description)));
              if (s.additional_text) skillParts.push(stripMarkup(String(s.additional_text)));
              return skillParts.join(": ");
            })
            .filter(Boolean);
          if (skillTexts.length > 0) {
            parts.push(`Skills:\n${skillTexts.join("\n")}`);
          }
        }

        setExtractedText(parts.join("\n\n"));
      } catch {
        setError("Ungültiges JSON-Format. Bitte eine gültige .build Datei hochladen.");
        setBuildData(null);
        setExtractedText("");
      }
    };
    reader.readAsText(file);
  }

  // M4: Tab-Wechsel mit State-Clearing
  const handleTabChange = (tab: "text" | "images" | "file") => {
    if (activeTab === "images" && tab !== "images") setImages([]);
    if (activeTab === "file" && tab !== "file") {
      setBuildFile(null);
      setBuildData(null);
      setExtractedText("");
    }
    setActiveTab(tab);
  };

  // Zustand aus localStorage laden
  useEffect(() => {
    void useSavedBuildsStore.persist.rehydrate();
  }, []);

  // Bei neuer Ausgabe: zum Ergebnis scrollen (nur beim ersten Mal)
  const hadOutputRef = useRef(false);
  useEffect(() => {
    if (output && !hadOutputRef.current) {
      hadOutputRef.current = true;
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (!output) hadOutputRef.current = false;
  }, [output]);

  // ─── Bild-Handling ─────────────────────────────────────────────────────────

  const addImageFiles = useCallback((files: FileList | File[]) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    Array.from(files).forEach((file) => {
      if (!allowed.includes(file.type)) return;

      const addImage = (dataUrl: string, mediaType: string) => {
        const base64 = dataUrl.split(",")[1] ?? "";
        // K2: Max 5 Bilder
        setImages((prev) => {
          if (prev.length >= 5) return prev;
          return [
            ...prev,
            {
              id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              file,
              data: base64,
              mediaType,
              preview: URL.createObjectURL(file),
            },
          ];
        });
      };

      compressImage(file)
        .then((dataUrl) => {
          const mediaType =
            dataUrl.match(/data:(.+);base64/)?.[1] ?? "image/jpeg";
          addImage(dataUrl, mediaType);
        })
        .catch(() => {
          // Fallback: falls compressImage komplett fehlschlägt, Original lesen
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            addImage(result, file.type);
          };
          reader.readAsDataURL(file);
        });
    });
  }, []);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addImageFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addImageFiles(e.target.files);
    e.target.value = "";
  };

  // ─── Übersetzung ───────────────────────────────────────────────────────────

  const handleTranslate = async () => {
    setError(null);
    setOutput("");
    setSaved(false);

    if (activeTab === "text" && !textInput.trim()) {
      setError("Bitte zuerst einen Build-Guide einfügen.");
      return;
    }
    if (activeTab === "images" && images.length === 0) {
      setError("Bitte mindestens ein Screenshot hochladen.");
      return;
    }
    if (activeTab === "file" && !extractedText) {
      setError("Bitte zuerst eine .build Datei hochladen.");
      return;
    }

    setIsLoading(true);

    const body =
      activeTab === "text"
        ? { type: "text", text: textInput }
        : activeTab === "images"
          ? {
              type: "images",
              images: images.map((img) => ({ data: img.data, mediaType: img.mediaType })),
            }
          : { type: "text", text: extractedText };

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: string }).error ?? `Fehler ${res.status}`
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setOutput(result);
      }

      // Build-Name aus erster ## Zeile extrahieren (Fallback)
      if (!buildName) {
        const match = /^##\s+(.+?)$/m.exec(result);
        if (match) setBuildName(match[1].trim().replace(/Build-Name[&\s]*Klasse[:\s]*/i, "").trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Kopieren & Speichern ──────────────────────────────────────────────────

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const name = buildName.trim() || "Unbenannter Build";
    saveBuild(name, output);
    setSaved(true);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Languages className="h-6 w-6 text-amber-400" />
          Build-Guide Übersetzer
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Englischen Guide einfügen → strukturiert auf Deutsch mit offiziellen PS5-Begriffen
        </p>
      </div>

      {/* Input-Bereich */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-zinc-950 rounded-lg w-fit">
          <button
            onClick={() => handleTabChange("text")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "text"
                ? "bg-amber-900/40 text-amber-300"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            Text einfügen
          </button>
          <button
            onClick={() => handleTabChange("images")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "images"
                ? "bg-amber-900/40 text-amber-300"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ImagePlus className="h-4 w-4" />
            Screenshot hochladen
          </button>
          <button
            onClick={() => handleTabChange("file")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "file"
                ? "bg-amber-900/40 text-amber-300"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileUp className="h-4 w-4" />
            Build-Datei hochladen
          </button>
        </div>

        {/* Tab: Text */}
        {activeTab === "text" && (
          <div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Build-Guide hier einfügen…&#10;&#10;Beliebiger Text von Maxroll, Mobalytics, Reddit, Discord usw."
              className="w-full h-56 resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600/50 transition-colors"
              spellCheck={false}
              maxLength={30000}
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              Tipp: Strg+A → Strg+C im Browser kopiert die gesamte Seite, dann hier einfügen.
            </p>
          </div>
        )}

        {/* Tab: Bilder */}
        {activeTab === "images" && (
          <div>
            {/* Drop-Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => imageInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 cursor-pointer transition-colors ${
                isDragging
                  ? "border-amber-500 bg-amber-900/10"
                  : "border-zinc-700 bg-zinc-950 hover:border-zinc-500"
              }`}
            >
              <ImagePlus className={`h-8 w-8 ${isDragging ? "text-amber-400" : "text-zinc-600"}`} />
              <p className="text-sm text-zinc-400">
                Bilder hierher ziehen oder <span className="text-amber-400 underline">klicken</span>
              </p>
              <p className="text-xs text-zinc-600">JPG, PNG, WebP — mehrere Bilder möglich</p>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            {/* Bild-Vorschau */}
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img) => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden border border-zinc-700 aspect-video bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.preview} alt={img.file.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 rounded-full bg-zinc-900/80 p-0.5 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Build-Datei */}
        {activeTab === "file" && (
          <div>
            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file && (file.name.endsWith(".build") || file.type === "application/json")) {
                  setBuildFile(file);
                  parseBuildFile(file);
                  setError(null);
                } else {
                  setError("Bitte eine .build Datei (JSON) hochladen.");
                }
              }}
              onClick={() => buildFileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-500 transition-colors"
            >
              <FileUp className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">
                {buildFile
                  ? `Geladen: ${buildFile.name}`
                  : ".build Datei hierher ziehen oder klicken zum Auswählen"}
              </p>
              <input
                ref={buildFileInputRef}
                type="file"
                accept=".build,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBuildFile(file);
                    parseBuildFile(file);
                    setError(null);
                  }
                }}
              />
            </div>

            {/* Extrahierte Vorschau */}
            {buildData && (
              <div className="mt-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-300 mb-2">
                  Extrahierte Felder ({extractedText.length.toLocaleString("de-DE")} Zeichen zur Übersetzung)
                </h3>
                <div className="space-y-1 text-sm text-zinc-400">
                  {!!buildData.name && (
                    <p><span className="text-zinc-500">Name:</span> {stripMarkup(String(buildData.name))}</p>
                  )}
                  {!!buildData.author && (
                    <p><span className="text-zinc-500">Autor:</span> {stripMarkup(String(buildData.author))}</p>
                  )}
                  {!!buildData.ascendancy && (
                    <p><span className="text-zinc-500">Ascendancy:</span> {stripMarkup(String(buildData.ascendancy))}</p>
                  )}
                  {Array.isArray(buildData.passives) && (
                    <p><span className="text-zinc-500">Passive Skills:</span> {buildData.passives.length}</p>
                  )}
                  {Array.isArray(buildData.skills) && (
                    <p><span className="text-zinc-500">Skills:</span> {buildData.skills.length}</p>
                  )}
                </div>
                <details className="mt-3">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                    Extrahierter Text anzeigen
                  </summary>
                  <pre className="mt-2 text-xs text-zinc-400 whitespace-pre-wrap max-h-48 overflow-y-auto p-2 bg-zinc-900 rounded">
                    {extractedText}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Fehler */}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Übersetzen-Button */}
        <button
          onClick={handleTranslate}
          disabled={isLoading}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Übersetze…
            </>
          ) : (
            <>
              <Languages className="h-4 w-4" />
              Übersetzen
            </>
          )}
        </button>
      </div>

      {/* Output-Bereich */}
      {(output || isLoading) && (
        <div ref={outputRef} className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900">
          {/* Output-Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <ChevronDown className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <input
                type="text"
                value={buildName}
                onChange={(e) => { setBuildName(e.target.value); setSaved(false); }}
                placeholder="Build-Name (editierbar)"
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-zinc-200 placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <button
                onClick={handleCopy}
                disabled={!output}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Kopiert" : "Kopieren"}
              </button>
              <button
                onClick={handleSave}
                disabled={!output || saved}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  saved
                    ? "bg-green-900/40 text-green-400"
                    : "bg-amber-900/40 hover:bg-amber-800/40 text-amber-300"
                }`}
              >
                {saved ? (
                  <><Check className="h-3.5 w-3.5" /> Gespeichert</>
                ) : (
                  <><BookmarkPlus className="h-3.5 w-3.5" /> Speichern</>
                )}
              </button>
            </div>
          </div>

          {/* Markdown-Ausgabe */}
          <div className="px-5 pb-5">
            {isLoading && !output && (
              <div className="flex items-center gap-2 py-8 text-zinc-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Übersetzung läuft…
              </div>
            )}
            {output && <MarkdownOutput content={output} />}
          </div>
        </div>
      )}
    </div>
  );
}
