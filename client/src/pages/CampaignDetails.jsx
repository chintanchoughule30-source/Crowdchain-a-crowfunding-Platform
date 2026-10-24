import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useStateContext } from '../context';
import { useToast } from '../components';
import { CountBox, Loader } from '../components';
import { calculateBarPercentage, daysLeft } from '../utils';

const CampaignDetails = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    user,
    address,
    balance,
    isAuthenticated,
    chainRevision,
    getCampaigns,
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
    reviewCampaign,
  } = useStateContext();
  const [campaign, setCampaign] = useState(state || null);
  const [donators, setDonators] = useState([]);
  const [requests, setRequests] = useState([]);
  const [contribution, setContribution] = useState(0);
  const [refundClaimed, setRefundClaimed] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [requestForm, setRequestForm] = useState({ description: '', recipient: '', amount: '', evidence: null });
  const [isLoading, setIsLoading] = useState(false);
  const [loaderLabel, setLoaderLabel] = useState('');

  const refreshCampaign = async () => {
    try {
      const [allCampaigns, donorRows, spendingRequests] = await Promise.all([
        getCampaigns(),
        getDonations(Number(id)),
        getRequests(Number(id)),
      ]);
      const latestCampaign = allCampaigns.find((item) => item.pId === Number(id));
      if (latestCampaign) setCampaign(latestCampaign);
      setDonators(donorRows);
      setRequests(spendingRequests);
      if (isAuthenticated) {
        const [donated, refunded] = await Promise.all([
          getMyContribution(Number(id)),
          hasRefunded(Number(id)),
        ]);
        setContribution(donated);
        setRefundClaimed(refunded);
      } else {
        setContribution(0);
        setRefundClaimed(false);
      }
    } catch (error) {
      toast.error(error.message || 'Could not load campaign details.');
    }
  };

  useEffect(() => {
    refreshCampaign();
  }, [isAuthenticated, id, chainRevision]);

  const isOwner = Boolean(campaign && address && campaign.owner.toLowerCase() === address.toLowerCase());
  const canApproveCampaign = user?.role === 'admin' && campaign?.status === 'Pending review';
  const isCancelled = campaign?.status === 'Cancelled';
  const isSuccessful = campaign?.status === 'Successful';
  const isActive = campaign?.status === 'Active';
  const remainingDays = campaign ? daysLeft(campaign.deadline) : 0;
  const percentage = campaign
    ? calculateBarPercentage(campaign.target, campaign.amountCollected)
    : 0;
  const availableFunds = useMemo(() => {
    if (!campaign) return '0.0000';
    return Math.max(
      0,
      Number(campaign.amountCollected) - Number(campaign.amountReleased) - Number(campaign.reservedAmount)
    ).toFixed(4);
  }, [campaign]);

  const runAction = async (label, action) => {
    setLoaderLabel(label);
    setIsLoading(true);
    try {
      const result = await action();
      if (!result.success) toast.error(result.error);
      return result.success;
    } catch (error) {
      toast.error(error.message || 'The transaction failed.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDonate = async () => {
    if (!donationAmount || Number(donationAmount) <= 0) {
      toast.warning('Enter a positive donation amount.');
      return;
    }
    if (await runAction('Recording your donation through the local signer...', () =>
      donate(Number(id), donationAmount))) {
      setDonationAmount('');
    }
  };

  const handleRefund = () => runAction('Waiting for your refund transaction to mine...', () =>
    claimRefund(Number(id)));

  const handleCancel = async () => {
    if (!window.confirm('Cancel this campaign? Donors will be able to claim refunds.')) return;
    await runAction('Waiting for campaign cancellation to mine...', () => cancelCampaign(Number(id)));
  };

  const handleApproveCampaign = async () => {
    const approved = await runAction('Recording campaign approval on the local blockchain...', () =>
      reviewCampaign(Number(id), true, 'Approved by local administrator.'));
    if (approved) await refreshCampaign();
  };

  const handleCreateRequest = async (event) => {
    event.preventDefault();
    if (!requestForm.description.trim() || !requestForm.recipient.trim() || !requestForm.amount) {
      toast.warning('Complete each spending request field.');
      return;
    }
    const submitted = await runAction('Pinning milestone evidence and recording the spending request...', () =>
      createRequest(Number(id), requestForm.description, requestForm.recipient, requestForm.amount, requestForm.evidence));
    if (submitted) setRequestForm({ description: '', recipient: '', amount: '', evidence: null });
  };

  const handleVote = (requestId, approve) => runAction('Waiting for your donor vote to be recorded...', () =>
    voteRequest(Number(id), requestId, approve));

  const handleFinalize = (requestId) => runAction('Finalizing the donor vote and any approved payout...', () =>
    finalizeRequest(Number(id), requestId));

  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-100 p-8 text-center">
        <p className="font-bold text-slate-800">Campaign not loaded</p>
        <p className="text-sm text-slate-500 mt-2">Load the local chain and open a campaign from the dashboard.</p>
        <button onClick={() => navigate('/')} className="mt-5 px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold">
          Back to campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {isLoading && <Loader label={loaderLabel} />}

      <button onClick={() => navigate(-1)} className="mb-5 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
        ← Back to campaigns
      </button>

      <div className="grid lg:grid-cols-[1.5fr_0.8fr] gap-6">
        <section>
          <div className="relative h-72 sm:h-96 rounded-3xl overflow-hidden shadow-card">
            <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            <div className="absolute top-4 left-4 rounded-full px-3 py-1 bg-white/90 text-xs font-bold text-slate-700">
              {campaign.status}
            </div>
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide">{campaign.category}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">{campaign.title}</h1>
            </div>
          </div>
          <div className="mt-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-card">
            <div className="flex justify-between text-sm font-semibold text-slate-600 mb-2">
              <span>{Number(campaign.amountCollected).toFixed(4)} ETH raised</span>
              <span>{Math.round(percentage)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${Math.min(percentage, 100)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>Goal: {Number(campaign.target).toFixed(4)} ETH</span>
              <span>{remainingDays > 0 ? `${remainingDays} days left` : campaign.status}</span>
            </div>
          </div>

          <article className="mt-6 bg-white rounded-3xl border border-slate-100 shadow-card p-6">
            <h2 className="font-bold text-slate-900 text-lg">Campaign story</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 whitespace-pre-line">{campaign.description}</p>
            <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
              Creator <span className="font-mono text-slate-800">{campaign.owner}</span>
              <div className="mt-1">IPFS metadata CID <span className="font-mono">{campaign.metadataCID}</span></div>
            </div>
          </article>

          <section className="mt-6 bg-white rounded-3xl border border-slate-100 shadow-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-900 text-lg">Spending requests</h2>
              <span className="text-sm text-slate-500">{availableFunds} ETH unreserved</span>
            </div>

            {isOwner && isSuccessful && Number(availableFunds) > 0 && (
              <form onSubmit={handleCreateRequest} className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-3">
                <h3 className="font-semibold text-indigo-900">Request a milestone payment</h3>
                <input
                  value={requestForm.description}
                  onChange={(event) => setRequestForm({ ...requestForm, description: event.target.value })}
                  placeholder="What will this funding pay for?"
                  maxLength={280}
                  className="w-full rounded-xl border border-indigo-100 px-3 py-2 text-sm"
                />
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={requestForm.recipient}
                    onChange={(event) => setRequestForm({ ...requestForm, recipient: event.target.value })}
                    placeholder="Payout recipient address"
                    className="min-w-0 rounded-xl border border-indigo-100 px-3 py-2 text-sm font-mono"
                  />
                  <input
                    type="number"
                    min="0.000000000000000001"
                    step="0.0001"
                    max={availableFunds}
                    value={requestForm.amount}
                    onChange={(event) => setRequestForm({ ...requestForm, amount: event.target.value })}
                    placeholder="Amount in ETH"
                    className="rounded-xl border border-indigo-100 px-3 py-2 text-sm"
                  />
                </div>
                <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                  Submit for donor vote
                </button>
                <label className="block text-xs font-semibold text-indigo-900">
                  Milestone evidence *
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp,text/plain"
                    onChange={(event) => setRequestForm({ ...requestForm, evidence: event.target.files?.[0] || null })}
                    className="mt-2 block w-full rounded-lg border border-indigo-100 bg-white p-2 text-xs"
                  />
                </label>
                <p className="text-xs text-indigo-700">Evidence is pinned to IPFS. The contract records its CID. Payout is locked for three days while donors vote; more than 50% of contributed ETH must approve.</p>
              </form>
            )}

            {requests.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No milestone requests yet.</p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => {
                  const voteTotal = Number(campaign.amountCollected) || 0;
                  const yesPercentage = voteTotal ? (Number(request.yesVotes) / voteTotal) * 100 : 0;
                  const votingOpen = !request.finalized && Date.now() < request.votingDeadline;
                  return (
                    <article key={request.requestId} className="p-4 rounded-2xl border border-slate-200">
                      <div className="flex flex-wrap justify-between gap-2">
                        <h3 className="font-bold text-slate-800">{request.description}</h3>
                        <span className="font-bold text-indigo-700">{Number(request.amount).toFixed(4)} ETH</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 font-mono break-all">Recipient: {request.recipient}</p>
                      <a
                        href={request.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-indigo-600 underline"
                      >
                        View evidence on IPFS · {request.evidenceCID}
                      </a>
                      <div className="mt-3 flex justify-between text-xs text-slate-500">
                        <span>Yes: {Number(request.yesVotes).toFixed(4)} ETH</span>
                        <span>No: {Number(request.noVotes).toFixed(4)} ETH</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(yesPercentage, 100)}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {request.finalized
                          ? request.approved ? 'Approved and released' : 'Rejected; escrow retained'
                          : votingOpen
                            ? `Voting closes ${new Date(request.votingDeadline).toLocaleString()}`
                            : 'Voting ended; finalize to apply the result'}
                      </p>
                      {votingOpen && address && !request.hasVoted && contribution > 0 && (
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => handleVote(request.requestId, true)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">
                            Approve
                          </button>
                          <button onClick={() => handleVote(request.requestId, false)} className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold">
                            Reject
                          </button>
                        </div>
                      )}
                      {!request.finalized && !votingOpen && (
                        <button onClick={() => handleFinalize(request.requestId)} className="mt-3 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                          Finalize vote
                        </button>
                      )}
                      {request.hasVoted && <p className="mt-2 text-xs text-emerald-700">Your vote is recorded.</p>}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <CountBox title="Days left" value={Math.max(remainingDays, 0)} icon="⏳" accent="amber" />
            <CountBox title="Backers" value={donators.length} icon="👥" accent="indigo" />
          </div>
          {canApproveCampaign && (
            <section className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-card">
              <p className="text-xs font-extrabold uppercase tracking-wide text-amber-800">Admin action · Pending review</p>
              <h2 className="mt-2 text-lg font-extrabold text-slate-900">Ready to approve?</h2>
              <p className="mt-1 text-sm text-slate-600">Approving enables donations. This decision is recorded on the local blockchain.</p>
              <button
                onClick={handleApproveCampaign}
                disabled={isLoading}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Processing approval…' : 'Approve campaign now'}
              </button>
            </section>
          )}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{isActive ? 'Support this campaign' : 'Campaign escrow'}</h2>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Local demo signer</span><b>{balance.toFixed(4)} ETH</b></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Funds released</span><b>{Number(campaign.amountReleased).toFixed(4)} ETH</b></div>
            {isActive && (
              <>
                <p className="text-sm text-slate-600">Your donation goes into the campaign’s on-chain escrow. Minimum donation: 0.001 ETH.</p>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  aria-label="Donation amount in ETH"
                  placeholder="Enter donation amount in ETH"
                  value={donationAmount}
                  onChange={(event) => setDonationAmount(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                />
                {isAuthenticated ? (
                  <button onClick={handleDonate} disabled={!address || isLoading} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold disabled:opacity-50">
                    {isLoading ? 'Processing donation…' : 'Donate now'}
                  </button>
                ) : (
                  <button onClick={() => navigate('/login')} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold">
                    Sign in to donate
                  </button>
                )}
              </>
            )}
            {campaign.status === 'Pending review' && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Donations will be enabled after an administrator approves this campaign.</p>
            )}
            {campaign.status === 'Rejected' && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">This campaign was not approved and cannot accept donations.</p>
            )}
            {(campaign.status === 'Failed' || isCancelled) && contribution > 0 && !refundClaimed && (
              <button onClick={handleRefund} className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold">
                Claim refund ({contribution.toFixed(4)} ETH)
              </button>
            )}
            {refundClaimed && <p className="text-sm text-emerald-700">Your refund has been claimed.</p>}
            {isOwner && isActive && (
              <button onClick={handleCancel} className="w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold">
                Cancel campaign
              </button>
            )}
            <p className="text-xs leading-5 text-slate-500">
              Funds remain in contract escrow. The creator never has direct access: each spending request must receive yes votes representing more than half of all campaign contributions.
            </p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-5">
            <h3 className="font-bold text-slate-900 mb-3">Donors</h3>
            <div className="space-y-2 max-h-64 overflow-auto">
              {donators.map((donor, index) => (
                <div key={`${donor.donator}-${index}`} className="flex justify-between gap-2 text-xs">
                  <span className="font-mono text-slate-500 truncate">{donor.donator}</span>
                  <b className="whitespace-nowrap">{Number(donor.donation).toFixed(4)} ETH</b>
                </div>
              ))}
              {!donators.length && <p className="text-sm text-slate-400">No donors yet.</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CampaignDetails;
