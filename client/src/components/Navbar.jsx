import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useStateContext } from '../context';
import { useToast } from './Toast';
import { logo, search } from '../assets';
import { navlinks } from '../constants';

const Navbar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const {
    user,
    address,
    balance,
    logout,
    searchTerm,
    setSearchTerm,
    networkName,
    apiError,
  } = useStateContext();

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <header className="flex md:flex-row flex-col-reverse justify-between mb-8 gap-4 pt-6 px-4 sm:px-0">
      <div className="flex-1 flex flex-row max-w-[440px] py-2.5 pl-5 pr-3 h-[52px] bg-white rounded-2xl shadow-card border border-slate-100 items-center gap-2">
        <img src={search} alt="" className="w-4 h-4 object-contain opacity-40" />
        <input
          type="search"
          placeholder="Search campaigns by title, tag, or description..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full font-normal text-sm placeholder:text-slate-400 text-slate-800 bg-transparent outline-none"
        />
      </div>

      <div className="hidden sm:flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500">{networkName}</span>
        {address ? (
          <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-2xl border border-slate-100 shadow-card">
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-700">{user.username} · <span className="font-mono">{shortAddress}</span></div>
              <div className="text-xs text-indigo-500 font-semibold">{balance.toFixed(3)} local ETH</div>
            </div>
            {user.role === 'admin' && <button onClick={() => navigate('/admin')} className="text-xs font-bold text-indigo-600">Admin</button>}
            <button onClick={handleLogout} className="text-xs font-semibold text-slate-500 hover:text-rose-600">Sign out</button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            Sign in
          </button>
        )}
        {apiError && <span className="max-w-48 text-xs text-amber-700">{apiError}</span>}
        <button
          onClick={() => navigate('/create-campaign')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-sm hover:opacity-90 transition-all"
        >
          <span>+</span>
          <span>Create Campaign</span>
        </button>
      </div>

      <div className="sm:hidden flex justify-between items-center">
        <Link to="/">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex justify-center items-center shadow-sm">
            <img src={logo} alt="CrowdChain" className="w-[60%] h-[60%] object-contain brightness-200" />
          </div>
        </Link>
        <button
          aria-label="Open navigation"
          className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm text-lg"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          {drawerOpen ? '×' : '☰'}
        </button>
      </div>

      {drawerOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-white p-6">
          <div className="flex justify-between items-center mb-6">
            <span className="font-bold text-slate-900">CrowdChain · {networkName}</span>
            <button aria-label="Close navigation" onClick={() => setDrawerOpen(false)}>×</button>
          </div>
          {address ? (
            <div className="mb-5 rounded-xl bg-indigo-50 p-4 font-mono text-sm">
              <p className="font-sans font-bold">{user.username}</p>
              {shortAddress} · {balance.toFixed(3)} local ETH
              <div className="mt-3 flex gap-4 font-sans">
                {user.role === 'admin' && <button onClick={() => { navigate('/admin'); setDrawerOpen(false); }} className="text-indigo-700">Admin</button>}
                <button onClick={handleLogout} className="text-rose-700">Sign out</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { navigate('/login'); setDrawerOpen(false); }}
              className="w-full mb-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold"
            >
              Sign in
            </button>
          )}
          {apiError && <p className="text-sm text-red-600 mb-4">{apiError}</p>}
          <nav className="flex flex-col gap-2">
            {navlinks.filter((link) => !link.disabled).map((link) => (
              <button
                key={link.name}
                onClick={() => {
                  navigate(link.link);
                  setDrawerOpen(false);
                }}
                className="p-3 text-left rounded-xl hover:bg-slate-50 capitalize"
              >
                {link.name}
              </button>
            ))}
          </nav>
          <button
            onClick={() => {
              navigate('/create-campaign');
              setDrawerOpen(false);
            }}
            className="w-full mt-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold"
          >
            Create campaign
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
