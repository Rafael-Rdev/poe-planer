"use client";

import { useState, useEffect } from "react";
import { BookMarked, Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { useSavedBuildsStore } from "@/context/savedBuildsStore";
import Link from "next/link";

// ─── Mini-Markdown-Renderer (gleich wie auf /translate) ──────────────────────

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

// ─── Build-Karte ─────────────────────────────────────────────────────────────

function BuildCard({ build }: { build: { id: string; name: string; content: string; createdAt: number } }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(build.name);

  const { deleteBuild, updateBuildName } = useSavedBuildsStore();

  const saveEdit = () => {
    if (nameInput.trim()) updateBuildName(build.id, nameInput.trim());
    setEditing(false);
  };

  const cancelEdit = () => {
    setNameInput(build.name);
    setEditing(false);
  };

  const date = new Date(build.createdAt).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Kopfzeile */}
      <div className="flex items-center gap-3 px-5 py-3">
        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
              autoFocus
              className="flex-1 min-w-0 rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-600/50 border border-zinc-700"
            />
            <button onClick={saveEdit} className="text-green-400 hover:text-green-300 p-1">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={cancelEdit} className="text-zinc-500 hover:text-zinc-300 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-zinc-100 truncate block">{build.name}</span>
              <span className="text-xs text-zinc-600">{date}</span>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-zinc-600 hover:text-zinc-300 p-1 transition-colors"
              title="Namen ändern"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <button
          onClick={() => deleteBuild(build.id)}
          className="text-zinc-700 hover:text-red-400 p-1 transition-colors ml-1"
          title="Löschen"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors"
          title={expanded ? "Einklappen" : "Ausklappen"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Inhalt */}
      {expanded && (
        <div className="border-t border-zinc-800 px-5 pb-5">
          <MarkdownOutput content={build.content} />
        </div>
      )}
    </div>
  );
}

// ─── Seite ────────────────────────────────────────────────────────────────────

export default function SavedPage() {
  const [hydrated, setHydrated] = useState(false);
  const { builds } = useSavedBuildsStore();

  useEffect(() => {
    void useSavedBuildsStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <BookMarked className="h-6 w-6 text-amber-400" />
          Gespeicherte Builds
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bis zu 5 übersetzte Build-Guides — älteste werden automatisch ersetzt.
        </p>
      </div>

      {!hydrated ? (
        <p className="text-zinc-600 text-sm">Lade…</p>
      ) : builds.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <BookMarked className="h-12 w-12 text-zinc-800" />
          <p className="text-zinc-500">Noch keine Builds gespeichert.</p>
          <Link
            href="/translate"
            className="rounded-lg bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            Jetzt übersetzen
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-600">{builds.length} / 5 Slots belegt</p>
          {builds.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      )}
    </div>
  );
}
