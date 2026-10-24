import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useStateContext } from '../context';
import { useToast } from '../components';
import { FormField, Loader } from '../components';

const CATEGORIES = [
  'Tech & AI',
  'Clean Energy',
  'Education',
  'Healthcare',
  'Art & Culture',
  'Social Impact'
];

const CreateCampaign = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { createCampaign, balance, address, apiError } = useStateContext();
  const [form, setForm] = useState({
    name: '',
    title: '',
    description: '',
    target: '',
    deadline: '',
    image: null,
    category: 'Tech & AI'
  });

  const handleFormFieldChange = (fieldName, e) => {
    setForm({ ...form, [fieldName]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title || !form.description || !form.target || !form.deadline || !form.image) {
      toast.warning('Please complete all fields and select a campaign image.');
      return;
    }

    if (parseFloat(form.target) <= 0 || isNaN(parseFloat(form.target))) {
      toast.warning('Target funding goal must be greater than 0 ETH.');
      return;
    }

    if (new Date(form.deadline).getTime() <= Date.now()) {
      toast.warning('Campaign end date must be in the future.');
      return;
    }

    setIsLoading(true);
    let result;
    try {
      result = await createCampaign({ ...form });
    } finally {
      setIsLoading(false);
    }

    if (result && result.success) {
      navigate('/');
    } else {
      toast.error(result?.error || 'Failed to create campaign.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {isLoading && <Loader label="Pinning metadata to IPFS and recording the transaction on Hardhat..." />}

      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
          <span>⛓️</span>
          Verified Smart Contract State Creation
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Launch a Campaign</h1>
        <p className="text-slate-400 mt-1.5 text-sm">
          The local API pins campaign artwork and metadata to IPFS, then records the campaign on the local Hardhat chain.
        </p>
      </div>

      {/* Info Banner */}
      {!address && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {apiError || 'Sign in to receive a local demo account before creating a campaign.'}
        </div>
      )}

      <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white mb-8 shadow-sm">
        <div className="text-4xl flex-shrink-0">💎</div>
        <div>
          <h4 className="font-bold text-base">Donor-approved milestone escrow</h4>
          <p className="text-indigo-100 text-sm mt-0.5">
            Funds stay in the contract after a successful campaign. The creator can request specific milestone payments, released only after donors approve by majority voting power.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-100 shadow-card p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-wrap gap-6">
          <FormField
            labelName="Your Name *"
            placeholder="e.g. Satoshi Nakamoto"
            inputType="text"
            value={form.name}
            handleChange={(e) => handleFormFieldChange('name', e)}
          />
          <FormField
            labelName="Campaign Title *"
            placeholder="Give your campaign an inspiring title"
            inputType="text"
            value={form.title}
            handleChange={(e) => handleFormFieldChange('title', e)}
          />
        </div>

        <FormField
          labelName="Campaign Story *"
          placeholder="Describe your vision, roadmap, and how on-chain funds will be utilized..."
          isTextArea
          value={form.description}
          handleChange={(e) => handleFormFieldChange('description', e)}
        />

        <div className="flex flex-wrap gap-6">
          <FormField
            labelName="Funding Goal (ETH) *"
            placeholder="e.g. 5.0"
            inputType="number"
            step="0.01"
            value={form.target}
            handleChange={(e) => handleFormFieldChange('target', e)}
          />
          <FormField
            labelName="Campaign End Date *"
            placeholder="End Date"
            inputType="date"
            value={form.deadline}
            handleChange={(e) => handleFormFieldChange('deadline', e)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="campaign-image" className="text-sm font-semibold text-slate-700">
            Campaign Image *
          </label>
          <input
            id="campaign-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })}
            className="w-full py-3 px-4 border border-slate-200 rounded-xl text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700"
          />
          <span className="text-xs text-slate-400">JPEG, PNG, or WebP up to 5 MB. Image and campaign JSON are pinned to IPFS.</span>
        </div>

        {/* Category Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm({ ...form, category: cat })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                  form.category === cat
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gas Fee Notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <span className="text-xl flex-shrink-0">⛽</span>
          <div className="text-sm">
            <p className="font-semibold text-amber-700">Local-chain transaction</p>
            <p className="text-amber-600 text-xs mt-0.5">
              Demo account balance: <b>{balance.toFixed(4)} local ETH</b>. Transactions are signed by the local API on Hardhat.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!address}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-2xl shadow-md hover:opacity-90 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
        >
          🚀 Pin Metadata & Submit for Review
        </button>
      </form>
    </div>
  );
};

export default CreateCampaign;