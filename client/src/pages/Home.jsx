import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStateContext } from '../context';
import { useToast } from '../components';
import { DisplayCampaigns } from '../components';

const CATEGORIES = [
  'All',
  'Tech & AI',
  'Clean Energy',
  'Education',
  'Healthcare',
  'Art & Culture',
  'Social Impact'
];

const Home = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { getCampaigns, searchTerm, setSearchTerm, chainRevision, apiError } = useStateContext();

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const data = await getCampaigns();
      setCampaigns(data || []);
    } catch (error) {
      toast.error(error.message || 'Could not load campaigns from the contract or IPFS.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [chainRevision]);

  // Dynamic calculations for presentation
  const stats = useMemo(() => {
    const totalRaised = campaigns.reduce(
      (sum, c) => sum + parseFloat(c.amountCollected || 0),
      0
    );
    const liveCount = campaigns.filter(
      (c) => c.status !== 'Cancelled' && (c.deadline > Date.now() || !c.deadline)
    ).length;
    const totalDonors = campaigns.reduce(
      (sum, c) => sum + (c.donators ? c.donators.length : 0),
      0
    );

    return [
      {
        label: 'Total Raised',
        value: `${totalRaised.toFixed(2)} ETH`,
        icon: '💎',
        accent: 'indigo'
      },
      {
        label: 'Campaigns Live',
        value: liveCount.toString(),
        icon: '🚀',
        accent: 'emerald'
      },
      {
        label: 'On-Chain Contributions',
        value:         totalDonors.toString(),
        icon: '🌍',
        accent: 'amber'
      }
    ];
  }, [campaigns]);

  // Filtering based on search term & category
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      const matchesCategory =
        selectedCategory === 'All' || camp.category === selectedCategory;
      const term = (searchTerm || '').trim().toLowerCase();
      const matchesSearch =
        !term ||
        (camp.title && camp.title.toLowerCase().includes(term)) ||
        (camp.description && camp.description.toLowerCase().includes(term)) ||
        (camp.category && camp.category.toLowerCase().includes(term)) ||
        (camp.owner && camp.owner.toLowerCase().includes(term));

      return matchesCategory && matchesSearch;
    });
  }, [campaigns, selectedCategory, searchTerm]);

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative w-full rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 sm:p-12 shadow-lg">
        {/* Decorative Circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-6 right-32 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Backend-managed local demo • Solidity escrow on Hardhat
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Fund the Future with
            <br />
            <span className="text-yellow-300">Decentralized Trust</span>
          </h1>
          <p className="mt-3 text-indigo-100 text-sm sm:text-base leading-relaxed max-w-md">
            Campaign details live on IPFS. Donor-weighted voting keeps funds in escrow until each milestone is approved.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => navigate('/create-campaign')}
              className="px-6 py-3 bg-white text-indigo-700 font-bold text-sm rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
            >
              🚀 Launch Your Campaign
            </button>
            <button
              onClick={() => navigate('/explorer')}
              className="px-5 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-xl backdrop-blur-sm border border-white/30 transition-all duration-200"
            >
              🔍 View Explorer
            </button>
          </div>

          {apiError && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {apiError}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col sm:flex-row items-center sm:gap-4 gap-2 bg-white rounded-2xl border border-slate-100 shadow-card p-4 sm:p-5 hover:shadow-hover transition-all"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                stat.accent === 'emerald'
                  ? 'bg-emerald-50'
                  : stat.accent === 'amber'
                  ? 'bg-amber-50'
                  : 'bg-indigo-50'
              }`}
            >
              {stat.icon}
            </div>
            <div className="text-center sm:text-left">
              <div
                className={`text-xl sm:text-2xl font-extrabold ${
                  stat.accent === 'emerald'
                    ? 'text-emerald-600'
                    : stat.accent === 'amber'
                    ? 'text-amber-600'
                    : 'text-indigo-600'
                }`}
              >
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Category Filter Pills & Search Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {searchTerm && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            <span>Filtering for: <b>"{searchTerm}"</b></span>
            <button
              onClick={() => setSearchTerm('')}
              className="text-slate-400 hover:text-slate-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Campaigns List */}
      <DisplayCampaigns
        title={
          selectedCategory === 'All'
            ? 'All On-Chain Campaigns'
            : `${selectedCategory} Campaigns`
        }
        isLoading={isLoading}
        campaigns={filteredCampaigns}
      />
    </div>
  );
};

export default Home;