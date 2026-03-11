import React from 'react';
import { ShieldAlert, Lock, Shield } from 'lucide-react';

const FOREVER_LOCKS = [
  {
    name: 'Auslösung bei erlittenem Schaden',
    level: 'LVL 1',
    color: 'border-red-900/40',
    badge: 'bg-red-600',
  },
  {
    name: 'Frostspurt & Arkane Woge',
    level: 'LVL 1',
    color: 'border-indigo-900/40',
    badge: 'bg-indigo-600',
  },
  {
    name: 'Lebenszapfer (Schildsturm & Fluch)',
    level: 'LVL 1',
    color: 'border-red-900/40',
    badge: 'bg-red-600',
  },
];

const SPECIFIC_LIMITS = [
  {
    name: 'Geschmolzener Panzer',
    level: 'LVL 10',
    color: 'border-orange-900/40',
    badge: 'bg-orange-600',
  },
  {
    name: 'Magmakugel (Auf Hexe Lvl 1!)',
    level: 'LVL 8–10',
    color: 'border-orange-900/40',
    badge: 'bg-orange-600',
  },
];

function LockItem({ name, level, color, badge }) {
  return (
    <div
      className={`flex justify-between items-center p-3 bg-black/40 rounded-2xl border ${color}`}
    >
      <span className="text-xs font-bold text-slate-100">{name}</span>
      <div className={`${badge} text-white text-[11px] font-black px-3 py-1 rounded-lg`}>
        {level}
      </div>
    </div>
  );
}

export default function StopsTab() {
  return (
    <div className="space-y-6">
      {/* Info-Banner */}
      <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-3xl flex items-start space-x-3 shadow-lg">
        <ShieldAlert className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-red-400 font-black text-sm uppercase italic">
            Dauerhafte vs. Temporäre Sperren
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Viele Gemmen bleiben für das{' '}
            <span className="text-white font-bold">komplette Spiel</span> auf Lvl 1!
            Drücke die <span className="text-white font-bold">DREIECK-Taste</span>, um
            sie auszublenden.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 space-y-6 shadow-2xl">
        {/* Für immer sperren */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center border-b border-slate-800 pb-2">
            <Lock className="w-3 h-3 mr-2" /> FÜR IMMER SPERREN (Lvl 1)
          </h4>
          {FOREVER_LOCKS.map((item) => (
            <LockItem key={item.name} {...item} />
          ))}
        </div>

        {/* Spezifische Grenzen */}
        <div className="space-y-3 pt-2">
          <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center border-b border-slate-800 pb-2">
            <Shield className="w-3 h-3 mr-2" /> SPEZIFISCHE GRENZEN
          </h4>
          {SPECIFIC_LIMITS.map((item) => (
            <LockItem key={item.name} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
