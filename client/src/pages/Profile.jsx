import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStateContext } from '../context';
import { useToast } from '../components';
import { DisplayCampaigns } from '../components';

const Profile = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, address, balance, transactions, getUserCampaigns, chainRevision } = useStateContext();

  const shortAddr = address
    ? `${address.slice(0, 10)}...${address.slice(-6)}`
    : '';

  const fetchUserCampaigns = async () => {
    setIsLoading(true);
    try {
      const data = await getUserCampaigns();
      setCampaigns(data);
    } catch (error) {
      toast.error(error.message || 'Could not load your campaigns.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCampaigns();
  }, [address, chainRevision]);

  const totalDonated = transactions
    .filter((tx) => tx.type.includes('Donation') && tx.account?.toLowerCase() === (address || '').toLowerCase())
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Profile Header */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-8 mb-8 shadow-lg overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-20 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-black border border-white/30 shadow-lg flex-shrink-0">
            {address ? address.slice(2, 4).toUpperCase() : 'W3'}
          </div>
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-bold px-3 py-1 rounded-full mb-2 border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Local demo identity active
            </div>
            <h1 className="text-2xl font-extrabold text-white">{user?.username || 'My account'}</h1>
            <p className="font-mono text-sm text-indigo-100 mt-1">{shortAddr}</p>
          </div>
        </div>

        {/* Wallet Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-6">
          {[
            { label: 'Local test ETH', value: `${balance.toFixed(3)} ETH`, icon: '💎' },
            { label: 'My Campaigns', value: campaigns.length, icon: '🚀' },
            { label: 'Donated on local chain', value: `${totalDonated.toFixed(3)} ETH`, icon: '💝' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="font-bold text-white text-lg">{stat.value}</div>
              <div className="text-indigo-100 text-xs font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-900 text-lg">Transaction History</h2>
          <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-3 py-1 font-semibold">
            {transactions.length} txns
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No transactions yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.slice(0, 8).map((tx, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-base flex-shrink-0">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{tx.type}</p>
                  <p className="font-mono text-xs text-slate-400 mt-0.5 truncate">{tx.hash}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">Block #{tx.block}</span>
                    <span className="text-xs text-slate-400">Block-confirmed on Hardhat</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-bold text-emerald-600 text-sm">{tx.amount}</span>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-xs text-emerald-600 font-semibold">Confirmed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Campaigns */}
      <DisplayCampaigns
        title="My Campaigns"
        isLoading={isLoading}
        campaigns={campaigns}
      />

      {campaigns.length === 0 && !isLoading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => navigate('/create-campaign')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-sm hover:opacity-90 transition-all"
          >
            🚀 Create Your First Campaign
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;