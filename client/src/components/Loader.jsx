import React from 'react';

const Loader = ({ label = 'Processing transaction on blockchain...' }) => {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer ring */}
        <div className="w-20 h-20 rounded-full border-4 border-indigo-100" />
        {/* Spinning ring */}
        <div className="absolute w-20 h-20 rounded-full border-4 border-transparent border-t-indigo-500 border-r-purple-500 animate-spin" />
        {/* Inner dot */}
        <div className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
      </div>

      <div className="text-center">
        <p className="font-bold text-slate-800 text-lg">Transaction in progress</p>
        <p className="text-slate-400 text-sm mt-1">{label}</p>
      </div>

      <div className="mt-6 w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-4 shadow-card animate-pulse">
        <div className="flex justify-between">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-3 w-16 rounded bg-slate-100" />
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-100" />
        <div className="mt-4 h-3 w-3/4 rounded bg-slate-100" />
      </div>

      <div className="flex items-center gap-2 mt-5 text-xs text-emerald-600 font-semibold">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
        Awaiting block confirmation...
      </div>
    </div>
  );
};

export default Loader;