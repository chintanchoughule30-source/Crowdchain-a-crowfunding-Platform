import React from 'react';
import { useNavigate } from 'react-router-dom';
import FundCard from './FundCard';
import { loader } from '../assets';
import { useStateContext } from '../context';

const DisplayCampaigns = ({ title, isLoading, campaigns }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useStateContext();

  const handleNavigate = (campaign) => {
    navigate(`/campaign-details/${campaign.pId}`, { state: campaign });
  };

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-2xl text-slate-900">{title}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} loaded from the local chain
          </p>
        </div>
        <div className={`flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1.5 ${
          isAuthenticated
            ? 'text-emerald-600 bg-emerald-50 border border-emerald-100'
            : 'text-slate-500 bg-slate-50 border border-slate-200'
        }`}>
          <span className={`w-2 h-2 rounded-full inline-block ${isAuthenticated ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          {isAuthenticated ? 'Demo account active' : 'Read-only · sign in to act'}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <img src={loader} alt="loader" className="w-12 h-12 object-contain animate-spin opacity-40" />
          <p className="text-slate-400 text-sm font-medium">Fetching campaigns from blockchain...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">🚀</div>
          <div className="text-center">
            <p className="font-bold text-slate-700 text-lg">
              {isAuthenticated ? 'No campaigns yet' : 'No campaigns on this local chain yet'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {isAuthenticated
                ? 'Be the first to launch a campaign on this local contract.'
                : 'Start the local Hardhat node and deploy the contract to discover campaigns.'}
            </p>
          </div>
        </div>
      )}

      {/* Campaign Cards Grid */}
      {!isLoading && campaigns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <FundCard
              key={`${campaign.pId}-${campaign.title}`}
              {...campaign}
              handleClick={() => handleNavigate(campaign)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DisplayCampaigns;