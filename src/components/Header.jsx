import React, { useState } from 'react';
import { Flame, Cloud, RefreshCw, Trash2 } from 'lucide-react';
import ProgressBar from './ProgressBar';

export default function Header({ progress, syncStatus, onReset }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = () => {
    onReset();
    setShowConfirm(false);
  };

  return (
    <header className="bg-[#0f1115]/90 backdrop-blur-md sticky top-0 z-10 border-b border-slate-800 pt-12 pb-4 shadow-2xl">
      <div className="px-4 flex items-center justify-between mb-3">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-orange-600 to-red-800 p-2.5 rounded-2xl border border-orange-500/20 shadow-lg relative">
            <Flame className="w-5 h-5 text-white" />
            {progress === 100 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">
              Mirage Begleiter
            </h1>
            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">
              Master Version – Rafael
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Sync Status */}
          <div className="bg-black/40 px-2.5 py-1.5 rounded-full border border-slate-800 flex items-center space-x-2">
            {syncStatus === 'synced' ? (
              <Cloud className="w-3 h-3 text-green-500" />
            ) : (
              <RefreshCw
                className={`w-3 h-3 ${
                  syncStatus === 'loading'
                    ? 'animate-spin text-blue-500'
                    : 'text-slate-500'
                }`}
              />
            )}
          </div>

          {/* Reset Button */}
          <div className="relative">
            <button
              onClick={() => setShowConfirm(!showConfirm)}
              className="bg-red-950/40 p-1.5 rounded-full border border-red-900/50 text-red-500 hover:bg-red-900/60 transition-colors"
              aria-label="Fortschritt zurücksetzen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {showConfirm && (
              <div className="absolute right-0 top-10 w-48 bg-slate-900 border border-red-500/30 rounded-xl p-3 shadow-2xl z-50">
                <p className="text-[10px] text-slate-300 mb-2">
                  Fortschritt wirklich zurücksetzen?
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-red-600 text-white text-[10px] font-bold py-1.5 rounded"
                  >
                    Ja
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 bg-slate-700 text-white text-[10px] font-bold py-1.5 rounded"
                  >
                    Nein
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4">
        <ProgressBar progress={progress} />
      </div>
    </header>
  );
}
