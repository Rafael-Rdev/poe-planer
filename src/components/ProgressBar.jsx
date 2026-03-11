import React from 'react';

export default function ProgressBar({ progress }) {
  return (
    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
