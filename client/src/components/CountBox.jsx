import React from 'react';

const CountBox = ({ title, value, icon, accent }) => {
  const colors = {
    gradient: accent === 'emerald' ? 'from-emerald-400 to-teal-500' : accent === 'amber' ? 'from-amber-400 to-orange-500' : 'from-indigo-500 to-purple-600',
    bg: accent === 'emerald' ? 'bg-emerald-50' : accent === 'amber' ? 'bg-amber-50' : 'bg-indigo-50',
    text: accent === 'emerald' ? 'text-emerald-600' : accent === 'amber' ? 'text-amber-600' : 'text-indigo-600',
    border: accent === 'emerald' ? 'border-emerald-100' : accent === 'amber' ? 'border-amber-100' : 'border-indigo-100',
  };

  return (
    <div className={`flex flex-col items-center px-6 py-4 rounded-2xl bg-white border shadow-card min-w-[120px] ${colors.border}`}>
      {icon && (
        <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center text-lg mb-2`}>
          {icon}
        </div>
      )}
      <h4 className={`font-extrabold text-3xl bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent leading-none`}>
        {value}
      </h4>
      <p className="mt-1.5 text-xs font-semibold text-slate-500 text-center uppercase tracking-wide">
        {title}
      </p>
    </div>
  );
};

export default CountBox;