import React from 'react';
import { Flame, Target, Swords, Beaker } from 'lucide-react';

function GemLink({ color, label, socket }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-xs font-bold ${color}`}>{label}</span>
      <span className="text-[10px] text-slate-500 uppercase">{socket}</span>
    </div>
  );
}

export default function SetupsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white px-2 uppercase italic tracking-tighter">
        Gemmen & Ausrüstung
      </h2>

      {/* Endgame-Phase */}
      <div className="bg-orange-950/10 border border-orange-900/30 rounded-[2rem] p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-orange-600 text-[10px] font-black text-white px-3 py-1 rounded-bl-xl">
          LVL 61–90
        </div>
        <h4 className="font-bold text-orange-500 mb-4 flex items-center uppercase text-sm mt-2">
          <Flame className="w-5 h-5 mr-2" /> Endgame-Phase
        </h4>

        <div className="space-y-3">
          {/* Gerechtes Feuer */}
          <div className="bg-black/40 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase mb-2 flex items-center">
              <Target className="w-3 h-3 mr-1" /> Gerechtes Feuer
              <span className="ml-auto font-bold text-orange-400 border border-orange-900/50 bg-orange-900/20 px-2 py-0.5 rounded">
                4-Link 🔵🔵🔵🔴
              </span>
            </div>
            <div className="space-y-1">
              <GemLink color="text-blue-300" label="Gerechtes Feuer" socket="Blau" />
              <GemLink color="text-red-300" label="Brennender Schaden" socket="Rot" />
              <GemLink color="text-blue-300" label="Elementarfokus" socket="Blau" />
              <GemLink color="text-blue-300" label="Wirksamkeit (Efficacy)" socket="Blau" />
            </div>
          </div>

          {/* Feuerfalle */}
          <div className="bg-black/40 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase mb-2 flex items-center">
              <Target className="w-3 h-3 mr-1" /> Feuerfalle
              <span className="ml-auto font-bold text-green-400 border border-green-900/50 bg-green-900/20 px-2 py-0.5 rounded">
                4-Link 🟢🟢🔴🟢
              </span>
            </div>
            <div className="space-y-1">
              <GemLink color="text-green-300" label="Feuerfalle" socket="Grün" />
              <GemLink color="text-green-300" label="Schnelle Gebrechen" socket="Grün" />
              <GemLink
                color="text-red-300"
                label="Lebenszapfer (MAX)"
                socket="Rot"
              />
              <GemLink
                color="text-green-300"
                label="Fallen- & Minenschaden"
                socket="Grün"
              />
            </div>
          </div>

          {/* Mobilität */}
          <div className="bg-black/40 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase mb-2 flex items-center">
              <Swords className="w-3 h-3 mr-1" /> Mobilität
              <span className="ml-auto font-bold text-slate-400 border border-slate-700 bg-slate-900 px-2 py-0.5 rounded">
                3-Link 🔴🔴🟢
              </span>
            </div>
            <div className="space-y-1">
              <GemLink color="text-red-300" label="Schildsturm" socket="Rot" />
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-red-300">
                  Lebenszapfer{' '}
                  <span className="text-red-500 font-black italic">(LVL 1!)</span>
                </span>
                <span className="text-[10px] text-slate-500 uppercase">Rot</span>
              </div>
              <GemLink color="text-green-300" label="Schnellere Angriffe" socket="Grün" />
            </div>
          </div>
        </div>
      </div>

      {/* Tränke */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Beaker className="w-12 h-12 text-green-500" />
        </div>
        <h4 className="font-bold text-green-400 mb-4 flex items-center uppercase text-sm">
          <Beaker className="w-5 h-5 mr-2" /> Tränke-Setup
        </h4>
        <div className="space-y-2">
          <div className="bg-black/40 p-2.5 rounded-xl border border-red-900/50 flex justify-between items-center">
            <span className="text-xs font-bold text-red-300">
              Göttliches Lebensfläschchen
            </span>
            <span className="text-[9px] text-slate-400 uppercase">Instant Recovery</span>
          </div>
          <div className="bg-black/40 p-2.5 rounded-xl border border-orange-900/50 flex justify-between items-center">
            <span className="text-xs font-bold text-orange-300">Rubin-Fläschchen</span>
            <span className="text-[9px] text-slate-400 uppercase">Gain Charge on Hit</span>
          </div>
          <div className="bg-black/40 p-2.5 rounded-xl border border-slate-700 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300">Granit-Fläschchen</span>
            <span className="text-[9px] text-slate-400 uppercase">+ Armor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
