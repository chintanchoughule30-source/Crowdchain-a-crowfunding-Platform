import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStateContext } from '../context';
import { useToast } from '../components';

const Admin = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, authReady, getAdminCampaigns, getAdminStats, reviewCampaign } = useStateContext();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reviewingId, setReviewingId] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [queue, overview] = await Promise.all([getAdminCampaigns(), getAdminStats()]);
      setCampaigns(queue);
      setStats(overview);
    } catch (error) {
      setLoadError(error.message || 'Could not load campaigns for review.');
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [getAdminCampaigns, getAdminStats, toast]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) navigate('/login');
    else if (user.role !== 'admin') navigate('/');
    else refresh();
  }, [authReady, navigate, refresh, user]);

  const decide = async (campaignId, approved) => {
    setReviewingId(campaignId);
    try {
      const reason = (reasons[campaignId] || '').trim() || (approved ? 'Approved by local administrator.' : 'Rejected by local administrator.');
      const result = await reviewCampaign(campaignId, approved, reason);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(approved ? 'Campaign approved. It can now receive donations.' : 'Campaign rejected.');
      setCampaigns((current) => current.filter((campaign) => campaign.pId !== campaignId));
      setStats((current) => current ? {
        ...current,
        pendingReview: Math.max(0, current.pendingReview - 1),
      } : current);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">ADMIN</span>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Campaign approvals</h1>
          <p className="mt-1 text-sm text-slate-500">Approve a campaign before it can receive donations.</p>
        </div>
        <button onClick={refresh} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading ? 'Refreshing…' : 'Refresh list'}
        </button>
      </div>
      <section className={`mb-5 flex items-center justify-between gap-4 rounded-2xl border p-5 ${
        campaigns.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
      }`}>
        <div>
          <p className="text-sm font-semibold text-slate-600">Waiting for your decision</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats?.pendingReview ?? campaigns.length}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
          {campaigns.length ? 'PENDING REVIEW' : 'ALL CAUGHT UP'}
        </span>
      </section>
      {loadError && (
        <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-bold">Could not load the approval queue.</p>
          <p className="mt-1">{loadError}</p>
          <p className="mt-2">Check that the API and Hardhat node are running, then refresh.</p>
        </div>
      )}
      {loading ? <p className="rounded-2xl bg-white py-12 text-center text-slate-500">Loading pending campaigns…</p> : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-lg font-bold text-slate-800">{loadError ? 'Approval list unavailable' : 'No campaigns need approval'}</p>
          {!loadError && <p className="mt-2 text-sm text-slate-500">New campaigns will appear here with an Approve button.</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <article key={campaign.pId} className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-card">
              <div className="grid md:grid-cols-[200px_1fr]">
                <img src={campaign.image} alt="" className="h-48 w-full object-cover md:h-full" />
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{campaign.category}</p>
                      <h2 className="mt-1 text-xl font-extrabold text-slate-900">{campaign.title}</h2>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-800">PENDING APPROVAL</span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{campaign.description}</p>
                  <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
                    <p><span className="text-slate-500">Goal:</span> <b>{Number(campaign.target).toFixed(3)} ETH</b></p>
                    <p><span className="text-slate-500">Deadline:</span> <b>{new Date(campaign.deadline).toLocaleDateString()}</b></p>
                    <p className="sm:col-span-2 break-all"><span className="text-slate-500">Creator:</span> <span className="font-mono text-xs">{campaign.owner}</span></p>
                  </div>
                <textarea
                  value={reasons[campaign.pId] || ''}
                  onChange={(event) => setReasons((current) => ({ ...current, [campaign.pId]: event.target.value }))}
                  maxLength={500}
                  placeholder="Optional review note"
                  aria-label={`Review note for ${campaign.title}`}
                  className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm"
                  rows={1}
                />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button onClick={() => decide(campaign.pId, true)} disabled={reviewingId !== null} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {reviewingId === campaign.pId ? 'Please wait…' : '✓ Approve campaign'}
                  </button>
                  <button onClick={() => decide(campaign.pId, false)} disabled={reviewingId !== null} className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                    Reject
                  </button>
                </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;
