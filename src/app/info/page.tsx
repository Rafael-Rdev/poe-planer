import { Info, Languages, ImagePlus, BookMarked, Zap } from "lucide-react";

export default function InfoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Info className="h-6 w-6 text-amber-400" />
          Wie funktioniert die App?
        </h1>
      </div>

      <div className="flex flex-col gap-5">

        {/* Was macht die App */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold text-amber-300 mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Was macht die App?
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Der Build-Guide Übersetzer nimmt englische Path of Exile 2 Build-Guides — egal ob
            von Maxroll, Mobalytics, Reddit, Discord oder YouTube-Beschreibungen — und übersetzt
            sie strukturiert auf Deutsch. Dabei werden ausschließlich die offiziellen deutschen
            Spielbegriffe für Skills, Passive Nodes und Items verwendet.
          </p>
        </div>

        {/* Schritt 1 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold text-amber-300 mb-3 flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Schritt 1: Text einfügen
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Kopiere den kompletten Build-Guide-Text (Strg+A auf der Webseite, dann Strg+C) und
            füge ihn in das Textfeld ein. Die App versteht unformatierten Text genauso wie
            strukturierte Guides mit Überschriften.
          </p>
        </div>

        {/* Schritt 2 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold text-amber-300 mb-3 flex items-center gap-2">
            <ImagePlus className="h-4 w-4" />
            Schritt 2: Screenshot hochladen (Alternative)
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Statt Text kannst du auch Screenshots hochladen — zum Beispiel wenn der Guide als
            Bild geteilt wurde oder du mehrere Seiten eines Guides als Fotos hast. Mehrere
            Bilder gleichzeitig möglich (JPG, PNG, WebP).
          </p>
        </div>

        {/* Schritt 3 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold text-amber-300 mb-3 flex items-center gap-2">
            <BookMarked className="h-4 w-4" />
            Schritt 3: Speichern & Nachschlagen
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Nach der Übersetzung kannst du den Build unter einem eigenen Namen speichern (bis zu
            5 Builds). Gespeicherte Builds findest du jederzeit unter „Gespeicherte Builds" —
            auch ohne Internetverbindung, da alles lokal im Browser liegt.
          </p>
        </div>

        {/* Ausgabe-Format */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold text-amber-300 mb-3">Ausgabe-Format</h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            Die Übersetzung ist immer nach diesem Schema gegliedert:
          </p>
          <ul className="space-y-1.5">
            {[
              "Build-Überblick",
              "Skills & Gems",
              "Rotation",
              "Top 5 Passive-Punkte",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="text-amber-600">▸</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Hinweis API-Key */}
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-5">
          <h2 className="text-base font-semibold text-amber-300 mb-2">Hinweis für Entwickler</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Die App verwendet die Mistral API. Für den lokalen Betrieb wird ein
            {" "}<code className="text-amber-400 bg-zinc-800 px-1 py-0.5 rounded text-xs">MISTRAL_API_KEY</code>{" "}
            in <code className="text-amber-400 bg-zinc-800 px-1 py-0.5 rounded text-xs">.env.local</code> benötigt.
            Auf Vercel wird der Key in den Environment Variables gesetzt.
          </p>
        </div>

      </div>
    </div>
  );
}
