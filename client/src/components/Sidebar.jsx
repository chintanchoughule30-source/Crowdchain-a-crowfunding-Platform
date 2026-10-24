import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { logo } from '../assets';
import { navlinks } from '../constants';
import { useStateContext } from '../context';

const Sidebar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, networkName } = useStateContext();
  const [isActive, setIsActive] = useState('dashboard');

  return (
    <div className="flex flex-col w-[80px] sticky top-0 h-screen bg-white border-r border-slate-100 py-6 items-center gap-4 shadow-sm">
      {/* Logo */}
      <Link to="/">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex justify-center items-center shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200">
          <img src={logo} alt="logo" className="w-[55%] h-[55%] object-contain brightness-200" />
        </div>
      </Link>

      {/* Label */}
      <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">Menu</div>

      {/* Nav Icons */}
      <div className="flex flex-col items-center gap-2 flex-1">
        {navlinks.map((link) => {
          const active = isActive === link.name;
          return (
            <div
              key={link.name}
              onClick={() => {
                if (!link.disabled) {
                  setIsActive(link.name);
                  navigate(link.link);
                }
              }}
              title={link.name}
              className={`relative w-12 h-12 rounded-2xl flex justify-center items-center transition-all duration-200 group
                ${link.disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}
                ${active ? 'bg-indigo-50 shadow-sm' : 'hover:bg-slate-50'}`}
            >
              <img
                src={link.imgUrl}
                alt={link.name}
                className={`w-[22px] h-[22px] object-contain transition-all duration-200 ${active ? '' : 'grayscale opacity-50 group-hover:opacity-75'}`}
              />
              {/* Active indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-r-full" />
              )}
              {/* Tooltip */}
              {!link.disabled && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap capitalize z-10 shadow-xl">
                  {link.name}
                </div>
              )}
              {link.disabled && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-500 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  Coming Soon
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Divider */}
      <div className="w-8 h-px bg-slate-100 mb-1" />

      {/* Blockchain Status */}
      <div className="flex flex-col items-center gap-1 pb-1">
        <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isAuthenticated ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
        <span title={networkName} className="text-[8px] text-slate-400 font-semibold tracking-wider">
          {isAuthenticated ? 'SIGNED IN' : 'READ ONLY'}
        </span>
      </div>
    </div>
  );
};

export default Sidebar;