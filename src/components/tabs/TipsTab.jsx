import React, { useState } from 'react';
import {
  Trophy, Package, Hammer, Skull, Search, Copy, Check,
  ChevronRight, AlertTriangle, Zap,
} from 'lucide-react';

const regexString =
  '"-w-.-|b-b-b|g-g-r|g-r-g|r-g-g|.*(?=\\S*r)(?=\\S*g)(?=\\S*b)|r-r-[gb]|r-[gb]-r|[gb]-r-r|Runn|rint|me Sh|at\'s h|lap|Earn|(o |d |r)int"';

export default function TipsTab() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(regexString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white px-2 uppercase italic tracking-tighter">
        Wissen & Lexikon
      </h2>

      {/* Götter, Lab & Banditen */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-[2rem] p-5 shadow-xl">
        <h4 className="font-bold text-yellow-500 mb-3 flex items-center uppercase text-sm border-b border-slate-700 pb-2">
          <Trophy className="w-5 h-5 mr-2" /> Götter, Lab & Banditen
        </h4>
        <div className="space-y-3 pt-1">
          <div className="bg-black/30 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
              Akt 2 – Die Banditen
            </span>
            <p className="text-xs text-white font-bold flex items-center">
              <ChevronRight className="w-3 h-3 text-orange-500 mr-1" />
              Kraityn helfen
              <span className="font-normal text-slate-400 ml-2">
                (Für Lauftempo/Movement Speed)
              </span>
            </p>
            <p className="text-xs text-white font-bold flex items-center mt-1">
              <ChevronRight className="w-3 h-3 text-red-500 mr-1" />
              Alle Töten
              <span className="font-normal text-slate-400 ml-2">
                (Standardwahl für +1 Skillpunkt)
              </span>
            </p>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-blue-400 font-bold uppercase mb-1 block">
              Pantheon Götter
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed italic border-l-2 border-blue-500 pl-2">
              Sobald du „Reinheit der Elemente" ablegst: Nutze zwingend{' '}
              <span className="text-white font-bold text-xs uppercase">Brine King</span>{' '}
              für Einfrier-Immunität!
            </p>
          </div>
        </div>
      </div>

      {/* Top Leveling Uniques */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-xl">
        <h4 className="font-bold text-orange-400 mb-3 flex items-center uppercase text-sm border-b border-slate-800 pb-2">
          <Package className="w-5 h-5 mr-2" /> Top Leveling Uniques
        </h4>
        <ul className="space-y-3 pt-1 text-xs">
          {[
            ['Mantel der Flamme (Cloak of Flame)', 'Wahnsinnige Feuer-Resistenz. Nutzbar bis Level 100!'],
            ['Replika: Atziris Schwäche (Atziri\'s Foible)', 'Extreme Regeneration & Mana-Management.'],
            ['Xophs Herz (Xoph\'s Heart)', 'Massiv Leben & Feuerschaden.'],
            ['Siebenmeilenstiefel (Seven League Step)', 'Die schnellsten Stiefel im Spiel (Zoomer Boots).'],
          ].map(([name, desc]) => (
            <li
              key={name}
              className="bg-black/40 p-2.5 rounded-xl border border-orange-900/30 flex flex-col"
            >
              <span className="font-bold text-orange-300">{name}</span>
              <span className="text-[10px] text-slate-400">{desc}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Crafting & Aura-Regeln */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-xl">
        <h4 className="font-bold text-blue-400 mb-4 flex items-center uppercase text-sm border-b border-slate-800 pb-2">
          <Hammer className="w-5 h-5 mr-2" /> Crafting & Aura-Regeln
        </h4>
        <div className="space-y-3">
          <div className="bg-red-950/40 p-3 rounded-xl border-2 border-red-600">
            <span className="text-[10px] font-black text-red-500 flex items-center uppercase block mb-1">
              <AlertTriangle className="w-4 h-4 mr-1 animate-pulse" /> Tödlicher Fehler:
              Auren Verlinken
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed font-bold italic">
              Verlinke deine Auren NIEMALS mit Unterstützungs-Gemmen! Das erhöht ihre
              Mana-Kosten sofort auf über 100% und du kannst sie nicht mehr aktivieren!
            </p>
          </div>
          <div className="bg-black/40 p-3 rounded-xl border border-orange-900/30">
            <span className="text-[10px] font-bold text-orange-400 uppercase block mb-1">
              Rubinring Rezept
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              1x Eisenring + 1x beliebige rote Gemme ={' '}
              <span className="text-orange-400 font-bold uppercase">Rubinring</span>. Mache
              das 2x!
            </p>
          </div>
          <div className="bg-black/40 p-3 rounded-xl border border-blue-900/30">
            <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">
              Der 120% Resi-Trick
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Crafte „Feuerwiderstand" auf jedes Teil mit freiem Suffix. Ziel:{' '}
              <span className="text-white font-bold">120% Feuer-Resi</span> für die
              RF-Meisterschaft!
            </p>
          </div>
        </div>
      </div>

      {/* Tödliche Map Mods */}
      <div className="bg-red-950/20 border-2 border-red-900/50 rounded-[2rem] p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Skull className="w-12 h-12 text-red-500" />
        </div>
        <h4 className="font-bold text-red-400 mb-3 flex items-center uppercase text-sm border-b border-slate-800 pb-2">
          <Skull className="w-5 h-5 mr-2" /> Map-Mods Vermeiden!
        </h4>
        <ul className="space-y-2">
          <li className="bg-black/60 p-2 rounded-xl border border-red-900/50 text-[11px] font-bold text-red-300 flex items-center">
            <Zap className="w-3 h-3 mr-2" /> Spieler können Leben nicht regenerieren
          </li>
          <li className="bg-black/60 p-2 rounded-xl border border-orange-900/50 text-[11px] font-bold text-orange-300 flex items-center">
            <Zap className="w-3 h-3 mr-2" /> % Verringerte Lebens-Erholungsrate
          </li>
        </ul>
      </div>

      {/* Regex Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-xl border-t-4 border-t-blue-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Search className="w-12 h-12 text-blue-500" />
        </div>
        <h4 className="font-bold text-blue-400 mb-3 flex items-center uppercase text-sm">
          Händler REGEX (Filter)
        </h4>
        <div className="flex items-center space-x-2">
          <div className="bg-black/60 p-3 rounded-xl border border-slate-700 text-[9px] font-mono text-slate-300 break-all overflow-hidden flex-1">
            {regexString}
          </div>
          <button
            onClick={handleCopy}
            className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 flex-shrink-0"
            aria-label="Regex kopieren"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
