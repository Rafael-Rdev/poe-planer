import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function ShopTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white px-2 uppercase italic tracking-tighter">
        Einkaufsliste
      </h2>

      {/* Akt 1 */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-xl">
        <h4 className="font-bold text-orange-400 mb-4 flex items-center uppercase text-sm border-b border-slate-800 pb-2">
          <ShoppingCart className="w-5 h-5 mr-2" /> Akt 1 (Nessa & Tarkleigh)
        </h4>
        <div className="space-y-4">
          {/* Hexe */}
          <div className="bg-black/40 p-3 rounded-2xl border border-purple-900/50">
            <span className="text-[10px] text-purple-400 font-black uppercase mb-2 block tracking-wider">
              1. Mit der Hexe (Mule) kaufen:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {[
                ['Magmakugel', 'Sofort (Nessa)'],
                ['Frostspurt', 'Nach "Eier aufbrechen"'],
                ['Arkane Woge', 'Sofort (Nessa)'],
                ['Flammenwand', 'Nach "Eier aufbrechen"'],
              ].map(([item, when]) => (
                <li key={item} className="flex justify-between">
                  <span>{item}</span>
                  <span className="text-slate-500">{when}</span>
                </li>
              ))}
              <li className="flex justify-between">
                <span className="font-bold text-blue-400">Elementare Ausweitung</span>
                <span className="text-slate-500">Sofort (Nessa)</span>
              </li>
            </ul>
          </div>

          {/* Marodeur */}
          <div className="bg-black/40 p-3 rounded-2xl border border-red-900/50">
            <span className="text-[10px] text-red-400 font-black uppercase mb-2 block tracking-wider">
              2. Mit dem Marodeur holen:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {[
                ['Heiliges Flammentotem', 'Belohnung Tarkleigh'],
                ['Phantasma beschwören', 'Nessa (Lvl 8)'],
                ['Zusätzlicher Feuerschaden', 'Nessa (Lvl 8)'],
                ['Entzünden', 'Nessa (Lvl 8)'],
                ['Vitalität & Lebenszapfer', 'Nessa (Lvl 10)'],
                ['Schildsturm', 'Nessa (Lvl 10)'],
              ].map(([item, when]) => (
                <li key={item} className="flex justify-between">
                  <span>{item}</span>
                  <span className="text-slate-500">{when}</span>
                </li>
              ))}
              <li className="flex justify-between">
                <span className="font-bold text-white">Geschmolzener Panzer</span>
                <span className="text-orange-400 font-bold">Nach Brutus</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Akt 2 & 3 */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-xl">
        <h4 className="font-bold text-orange-400 mb-3 flex items-center uppercase text-sm border-b border-slate-800 pb-2">
          <ShoppingCart className="w-5 h-5 mr-2" /> Akt 2 & 3
        </h4>

        <div className="space-y-3">
          <div className="bg-black/40 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
              Akt 2 (Yeena):
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex justify-between">
                <span>Gerechtes Feuer (RF)</span>
                <span className="text-slate-500">Nach Fidelitas</span>
              </li>
              <li className="flex justify-between">
                <span>Herold des Donners</span>
                <span className="text-slate-500">Nach Der Weber</span>
              </li>
            </ul>
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-orange-900/50">
            <span className="text-[10px] text-orange-400 font-bold uppercase mb-1 block">
              Akt 3 (Siosa / Bibliothek):
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex justify-between">
                <span className="font-bold text-white">Feuerfalle</span>
                <span className="text-slate-500">Siosa</span>
              </li>
              {[
                ['Fallen- & Minenschaden', 'Siosa'],
                ['Schnelle Gebrechen', 'Siosa'],
                ['Wirksamkeit', 'Siosa'],
              ].map(([item, when]) => (
                <li key={item} className="flex justify-between">
                  <span>{item}</span>
                  <span className="text-slate-500">{when}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
