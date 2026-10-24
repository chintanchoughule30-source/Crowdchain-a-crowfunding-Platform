import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const StateContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

const request = async (path, { body, form, idempotencyKey, ...options } = {}) => {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(form ? {} : body ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...options.headers,
      },
      body: form || (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new Error(`Cannot reach the local API at ${API_URL}. Start the server and reload the app.`);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return result;
};

const getIdempotencyKey = async (path, body, address) => {
  const input = new TextEncoder().encode(`${path}:${JSON.stringify(body || {})}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = `crowdchain-idempotency:${address.toLowerCase()}:${hash}`;
  let key = window.localStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem(storageKey, key);
  }
  return { storageKey, key };
};

const transactionType = (name) => ({
  CampaignCreated: 'Campaign created',
  CampaignModerated: 'Campaign reviewed',
  DonationReceived: 'Donation received',
  FundsWithdrawn: 'Approved milestone released',
  RefundClaimed: 'Refund claimed',
  CampaignCancelled: 'Campaign cancelled',
  RequestCreated: 'Spending request created',
  RequestVoted: 'Donor vote recorded',
  RequestFinalized: 'Spending request finalized',
}[name] || name);

export const StateContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [apiError, setApiError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [latestTx, setLatestTx] = useState(null);
  const [chainRevision, setChainRevision] = useState(0);
  const [networkName, setNetworkName] = useState('Local backend · Hardhat 31337');

  const refreshSession = useCallback(async () => {
    try {
      const { user: sessionUser } = await request('/api/auth/session');
      setUser(sessionUser);
      setApiError('');
      return sessionUser;
    } catch (error) {
      setApiError(error.message);
      setUser(null);
      return null;
    } finally {
      setAuthReady(true);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      return;
    }
    try {
      const result = await request('/api/transactions');
      setTransactions((result.transactions || []).map((transaction) => ({
        ...transaction,
        type: transactionType(transaction.type),
        fee: 'Local Hardhat execution',
      })));
    } catch (error) {
      setApiError(error.message);
    }
  }, [user]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, chainRevision]);

  const authenticate = useCallback(async (mode, credentials) => {
    const result = await request(`/api/auth/${mode}`, { method: 'POST', body: credentials });
    setUser(result.user);
    setApiError('');
    return result.user;
  }, []);

  const register = useCallback((username, password) =>
    authenticate('register', { username, password }), [authenticate]);

  const login = useCallback((username, password) =>
    authenticate('login', { username, password }), [authenticate]);

  const logout = useCallback(async () => {
    await request('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setTransactions([]);
    setLatestTx(null);
  }, []);

  const commit = useCallback(async (path, body, action) => {
    let storageKey;
    try {
      const idempotency = await getIdempotencyKey(path, body, user.address);
      storageKey = idempotency.storageKey;
      const result = await request(path, { method: 'POST', body, idempotencyKey: idempotency.key });
      if (result.status === 'pending') return { success: false, pending: true, error: 'Transaction is still being reconciled by the local chain.' };
      window.localStorage.removeItem(storageKey);
      setLatestTx({
        ...result,
        type: action,
        amount: body?.amount ? `${body.amount} ETH` : '—',
        fee: 'Local test chain',
        network: 'Hardhat Local',
      });
      setChainRevision((revision) => revision + 1);
      await refreshSession();
      return { success: true, tx: result };
    } catch (error) {
      if (storageKey && [400, 403, 409].includes(error.status)) {
        window.localStorage.removeItem(storageKey);
      }
      return { success: false, error: error.message };
    }
  }, [refreshSession, user]);

  const createCampaign = useCallback(async (form) => {
    try {
      const upload = new FormData();
      upload.append('title', form.title.trim());
      upload.append('description', form.description.trim());
      upload.append('category', form.category);
      upload.append('creatorName', form.name || '');
      upload.append('image', form.image);
      const { cid } = await request('/api/campaign-metadata', { method: 'POST', form: upload });
      return await commit('/api/campaigns', {
        cid,
        target: form.target,
        deadline: new Date(form.deadline).toISOString(),
      }, 'Campaign created');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [commit]);

  const getCampaigns = useCallback(async () => {
    const result = await request('/api/campaigns');
    return result.campaigns || [];
  }, []);

  const getUserCampaigns = useCallback(async () => {
    if (!user) return [];
    return (await getCampaigns()).filter((campaign) =>
      campaign.owner.toLowerCase() === user.address.toLowerCase());
  }, [getCampaigns, user]);

  const getDonations = useCallback(async (campaignId) => {
    const result = await request(`/api/campaigns/${campaignId}/donations`);
    return result.donations || [];
  }, []);

  const getMyCampaignData = useCallback(async (campaignId) => {
    if (!user) return { contribution: 0, refunded: false };
    const result = await request(`/api/campaigns/${campaignId}/me`);
    return { contribution: Number(result.contribution), refunded: result.refunded };
  }, [user]);

  const getMyContribution = useCallback(async (campaignId) =>
    (await getMyCampaignData(campaignId)).contribution, [getMyCampaignData]);

  const hasRefunded = useCallback(async (campaignId) =>
    (await getMyCampaignData(campaignId)).refunded, [getMyCampaignData]);

  const getRequests = useCallback(async (campaignId) => {
    const result = await request(`/api/campaigns/${campaignId}/requests`);
    return result.requests || [];
  }, []);

  const uploadEvidence = useCallback(async (file) => {
    const form = new FormData();
    form.append('evidence', file);
    return request('/api/milestone-evidence', { method: 'POST', form });
  }, []);

  const createRequest = useCallback(async (campaignId, description, recipient, amount, evidenceFile) => {
    try {
      if (!evidenceFile) return { success: false, error: 'Attach milestone evidence before submitting the request.' };
      const { cid } = await uploadEvidence(evidenceFile);
      return commit(`/api/campaigns/${campaignId}/requests`, { description, evidenceCID: cid, recipient, amount }, 'Spending request created');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [commit, uploadEvidence]);

  const donate = useCallback((campaignId, amount) =>
    commit(`/api/campaigns/${campaignId}/donations`, { amount }, 'Donation received'), [commit]);

  const claimRefund = useCallback((campaignId) =>
    commit(`/api/campaigns/${campaignId}/refund`, {}, 'Refund claimed'), [commit]);

  const cancelCampaign = useCallback((campaignId) =>
    commit(`/api/campaigns/${campaignId}/cancel`, {}, 'Campaign cancelled'), [commit]);

  const voteRequest = useCallback((campaignId, requestId, approve) =>
    commit(`/api/campaigns/${campaignId}/requests/${requestId}/votes`, { approve }, 'Donor vote recorded'), [commit]);

  const finalizeRequest = useCallback((campaignId, requestId) =>
    commit(`/api/campaigns/${campaignId}/requests/${requestId}/finalize`, {}, 'Spending request finalized'), [commit]);

  const getAdminCampaigns = useCallback(async () => {
    const result = await request('/api/admin/campaigns');
    return result.campaigns || [];
  }, []);

  const getAdminStats = useCallback(() =>
    request('/api/admin/stats'), []);

  const reviewCampaign = useCallback((campaignId, approved, reason) =>
    commit(`/api/admin/campaigns/${campaignId}/review`, { approved, reason }, 'Campaign review'), [commit]);

  const address = user?.address || '';
  const balance = Number(user?.balance || 0);
  const isAuthenticated = Boolean(user);
  const value = useMemo(() => ({
    user,
    authReady,
    address,
    balance,
    networkName,
    apiError,
    searchTerm,
    setSearchTerm,
    transactions,
    latestTx,
    clearLatestTx: () => setLatestTx(null),
    isAuthenticated,
    chainRevision,
    register,
    login,
    logout,
    refreshSession,
    createCampaign,
    getCampaigns,
    getUserCampaigns,
    getDonations,
    getMyContribution,
    hasRefunded,
    getRequests,
    donate,
    claimRefund,
    cancelCampaign,
    createRequest,
    voteRequest,
    finalizeRequest,
    getAdminCampaigns,
    getAdminStats,
    reviewCampaign,
  }), [
    user, authReady, address, balance, networkName, apiError, searchTerm, transactions, latestTx, isAuthenticated,
    chainRevision, register, login, logout, refreshSession, createCampaign, getCampaigns, getUserCampaigns,
    getDonations, getMyContribution, hasRefunded, getRequests, donate, claimRefund, cancelCampaign,
    createRequest, voteRequest, finalizeRequest, getAdminCampaigns, getAdminStats, reviewCampaign,
  ]);

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
};

export const useStateContext = () => useContext(StateContext);
