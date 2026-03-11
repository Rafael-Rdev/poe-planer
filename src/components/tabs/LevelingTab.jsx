import React from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

export default function LevelingTab({ acts, onToggle }) {
  return (
    <div className="space-y-4">
      {acts.map((act) => (
        <div
          key={act.id}
          className={`bg-slate-900 border rounded-[2rem] overflow-hidden shadow-xl transition-all ${
            act.done ? 'border-green-500/20 opacity-60' : 'border-slate-800'
          }`}
        >
          <div
            onClick={() => onToggle(act.id)}
            className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-800 select-none"
          >
            <div>
              <span className="text-[9px] font-black text-orange-500 uppercase">
                {act.act}
              </span>
              <h4 className="font-bold text-lg text-white">{act.title}</h4>
            </div>
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 ${
                act.done ? 'bg-green-500 border-green-500' : 'border-slate-700'
              }`}
            >
              {act.done && <CheckCircle2 className="w-5 h-5 text-white" />}
            </div>
          </div>

          {!act.done && (
            <div className="p-5 border-t border-slate-800/50 bg-slate-950/30">
              <ul className="space-y-3">
                {act.steps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start text-[13px] text-slate-300 leading-relaxed"
                  >
                    <ChevronRight className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span dangerouslySetInnerHTML={{ __html: step }} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
