import React, { useState } from 'react';
import { useStateContext } from '../context';

const Explorer = () => {
  const { transactions, networkName } = useStateContext();
  const [filter, setFilter] = useState('all');
  const [copiedHash, setCopiedHash] = useState(null);

  const filteredTx = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'donations') return tx.type.includes('Donation');
    if (filter === 'campaigns') return tx.type.includes('Campaign');
    if (filter === 'governance') return tx.type.includes('request') || tx.type.includes('vote');
    return true;
  });

  const stats = [
    { label: 'Total Txns', value: transactions.length, icon: '📋', color: 'indigo' },
    { label: 'Confirmed', value: transactions.filter((t) => t.status === 'Confirmed').length, icon: '✓', color: 'emerald' },
    { label: 'Donations', value: transactions.filter((t) => t.type.toLowerCase().includes('donation')).length, icon: '💎', color: 'purple' },
    { label: 'Campaigns', value: transactions.filter((t) => t.type.toLowerCase().includes('campaign')).length, icon: '🚀', color: 'amber' },
  ];

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'donations', label: 'Donations' },
    { key: 'campaigns', label: 'Campaigns' },
    { key: 'governance', label: 'Governance' },
  ];

  const getTxIcon = (type) => {
    if (type.toLowerCase().includes('donation')) return '💎';
    if (type.toLowerCase().includes('campaign')) return '🚀';
    if (type.toLowerCase().includes('request') || type.toLowerCase().includes('vote')) return '🗳️';
    return '📋';
  };

  const getTxGradient = (type) => {
    if (type.toLowerCase().includes('donation')) return 'bg-gradient-to-br from-indigo-500 to-purple-600';
    if (type.toLowerCase().includes('campaign')) return 'bg-gradient-to-br from-amber-400 to-orange-500';
    if (type.toLowerCase().includes('request') || type.toLowerCase().includes('vote')) return 'bg-gradient-to-br from-emerald-400 to-teal-500';
    return 'bg-gradient-to-br from-slate-400 to-slate-600';
  };

  const getAccentColor = (color) => {
    const map = {
      indigo: 'text-indigo-600',
      emerald: 'text-emerald-600',
      purple: 'text-purple-600',
      amber: 'text-amber-600',
    };
    return map[color] || 'text-slate-600';
  };

  const getAccentBg = (color) => {
    const map = {
      indigo: 'bg-indigo-50',
      emerald: 'bg-emerald-50',
      purple: 'bg-purple-50',
      amber: 'bg-amber-50',
    };
    return map[color] || 'bg-slate-50';
  };

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Timestamp unavailable';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
          <span>🔍</span>
          On-Chain Activity
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Blockchain Explorer</h1>
        <p className="text-slate-400 mt-1.5 text-sm">
          Inspect confirmed contract events and transaction hashes from the local Hardhat chain.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`w-10 h-10 rounded-xl ${getAccentBg(stat.color)} flex items-center justify-center text-xl mx-auto mb-2`}>
              {stat.icon}
            </div>
            <div className={`text-2xl font-extrabold ${getAccentColor(stat.color)}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-semibold text-slate-700 mr-1">Filter:</span>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-150 ${
              filter === f.key
                ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg">Transaction History</h2>
          <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-3 py-1 font-semibold">
            {filteredTx.length} transactions
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold text-slate-600">No transactions found</p>
            <p className="text-xs mt-1">
              {filter !== 'all' ? 'Try a different filter.' : 'Start interacting to see transactions here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredTx.map((tx, i) => (
              <div
                key={`${tx.hash}-${i}`}
                className="px-6 py-4 hover:bg-indigo-50/30 transition-colors flex items-center gap-4"
              >
                {/* Tx Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getTxGradient(tx.type)}`}
                >
                  {getTxIcon(tx.type)}
                </div>

                {/* Tx Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{tx.type}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-mono text-xs text-slate-400 truncate max-w-[200px] sm:max-w-[320px]">
                      {tx.hash}
                    </p>
                    <button
                      onClick={() => handleCopyHash(tx.hash)}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors flex-shrink-0"
                    >
                      {copiedHash === tx.hash ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Block + Gas Info (Desktop) */}
                <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-mono">
                    Block #{tx.block}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{tx.account ? `${tx.account.slice(0, 8)}…${tx.account.slice(-6)}` : networkName}</span>
                </div>

                {/* Amount + Status + Time */}
                <div className="text-right flex-shrink-0 min-w-[90px]">
                  <span className="font-bold text-emerald-600 text-sm">{tx.amount}</span>
                  <div className="flex items-center gap-1 mt-0.5 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-xs text-emerald-600 font-semibold">{tx.status}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{formatTime(tx.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Network Info Footer */}
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{networkName}</span>
        </div>
        <span>•</span>
        <span>Latest Block: #{filteredTx.length > 0 ? Math.max(...filteredTx.map((t) => t.block)) : '—'}</span>
        <span>•</span>
        <span>Contract event activity</span>
      </div>
    </div>
  );
};

export default Explorer;
