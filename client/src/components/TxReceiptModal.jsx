import React, { useState } from 'react';
import { useStateContext } from '../context';

const TxReceiptModal = () => {
  const { latestTx, clearLatestTx } = useStateContext();
  const [copied, setCopied] = useState(false);

  if (!latestTx) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(latestTx.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-hidden transform transition-all scale-100">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 via-indigo-500 to-purple-600" />
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl font-bold">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  Transaction Confirmed
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                On-Chain Verification
              </h3>
            </div>
          </div>
          
          <button 
            onClick={clearLatestTx}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="mt-6 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Action:</span>
            <span className="font-semibold text-slate-800 text-right">{latestTx.type}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Value / Amount:</span>
            <span className="font-bold text-indigo-600">{latestTx.amount}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Execution:</span>
            <span className="text-slate-700 font-mono text-xs">{latestTx.fee}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Block Number:</span>
            <span className="font-mono text-xs font-semibold text-slate-800">#{latestTx.block}</span>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Transaction Hash:</div>
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
              <span className="font-mono text-xs text-slate-600 truncate max-w-[320px]">
                {latestTx.hash}
              </span>
              <button 
                onClick={handleCopy}
                className="ml-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors whitespace-nowrap"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Confirmed on {latestTx.network || 'connected network'}</span>
          </div>
          <button
            onClick={clearLatestTx}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default TxReceiptModal;
