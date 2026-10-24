import React from 'react';
import { daysLeft } from '../utils';

const categoryColors = {
  'Tech & AI': { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500' },
  'Clean Energy': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  'Education': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
  'Healthcare': { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
  'Default': { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
};

const FundCard = ({ owner, title, description, target, deadline, amountCollected, image, category, status, handleClick }) => {
  const remainingDays = daysLeft(deadline);
  const percentage = Math.min(100, Math.round((parseFloat(amountCollected) / parseFloat(target)) * 100));
  const colors = categoryColors[category] || categoryColors['Default'];

  return (
    <div
      className="group sm:w-[300px] w-full rounded-3xl bg-white border border-slate-100 overflow-hidden cursor-pointer hover:shadow-hover hover:-translate-y-1.5 transition-all duration-300 shadow-card"
      onClick={handleClick}
    >
      {/* Campaign Image */}
      <div className="relative overflow-hidden h-[180px]">
        <img
          src={image}
          alt="campaign"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        {/* Category Badge */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 ${colors.bg} ${colors.text} px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm shadow-sm`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} inline-block`}></span>
          {category || 'Project'}
        </div>

        {/* Days Left badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-800 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
          {remainingDays > 0 ? `${remainingDays}d left` : 'Ended'}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-[16px] text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors duration-200">
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed line-clamp-2">
          {description}
        </p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-slate-700">{amountCollected} ETH raised</span>
            <span className={`font-bold ${percentage >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{percentage}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 mt-1">Goal: {target} ETH</div>
        </div>

        {/* Footer: Creator */}
        <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-slate-50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {owner ? owner.slice(2, 4).toUpperCase() : 'CR'}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">Campaign Creator</p>
            <p className="font-mono text-[12px] text-slate-700 font-semibold truncate">
              {owner ? `${owner.slice(0, 8)}...${owner.slice(-4)}` : 'Unknown'}
            </p>
          </div>
          <div className="ml-auto flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleClick();
            }}
            className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              status === 'Active'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {status === 'Active' ? 'Donate to this campaign' : 'View campaign details'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FundCard;