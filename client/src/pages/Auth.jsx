import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStateContext } from '../context';
import { useToast } from '../components';

const Auth = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { login, register } = useStateContext();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'register') await register(username, password);
      else await login(username, password);
      toast.success(mode === 'register' ? 'Local demo account created.' : 'Signed in successfully.');
      navigate('/');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="rounded-3xl border border-slate-100 bg-white p-7 sm:p-9 shadow-card">
        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
          Local Hardhat demo · no browser wallet
        </span>
        <h1 className="mt-4 text-3xl font-extrabold text-slate-900">
          {mode === 'register' ? 'Create a demo account' : 'Sign in to CrowdChain'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The local API assigns a disposable Hardhat account and signs demo transactions for you.
          This is local-only and must never be used with real funds.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold text-slate-700">
            Username
            <input
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-400"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              required
              minLength={mode === 'register' ? 10 : 1}
              maxLength={128}
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-400"
            />
            {mode === 'register' && <span className="mt-1 block text-xs font-normal text-slate-400">At least 10 characters.</span>}
          </label>
          <button
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3.5 font-bold text-white disabled:opacity-60"
          >
            {isLoading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          {mode === 'register' ? 'Already registered?' : 'New to this local demo?'}
          <button
            onClick={() => setMode((current) => current === 'register' ? 'login' : 'register')}
            className="ml-2 font-bold text-indigo-600 hover:text-indigo-800"
          >
            {mode === 'register' ? 'Sign in' : 'Create an account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
