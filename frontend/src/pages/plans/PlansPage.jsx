import React, { useEffect, useState } from 'react';
import { plansApi } from '../../api/billingApi.js';
import { Calendar, Plus, Trash2, Search, CheckCircle2, Clock, X } from 'lucide-react';

export function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [toast, setToast] = useState(null);
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);

  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    description: '',
    billingFrequency: 'MONTHLY',
    price: '',
    minQuantity: 1,
    trialDays: 0,
    autoClose: false,
    autoRenew: true,
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: 50,
        ...(frequencyFilter && { billingFrequency: frequencyFilter }),
      };
      const res = await plansApi.list(params);
      setPlans(res.data.items || res.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [frequencyFilter]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await plansApi.create({
        name: planForm.name,
        code: planForm.code,
        description: planForm.description || undefined,
        billingFrequency: planForm.billingFrequency,
        price: parseFloat(planForm.price),
        minQuantity: parseInt(planForm.minQuantity, 10) || 1,
        trialDays: parseInt(planForm.trialDays, 10) || 0,
        autoClose: Boolean(planForm.autoClose),
        autoRenew: Boolean(planForm.autoRenew),
      });
      showToast('Billing plan created successfully');
      setIsAddPlanOpen(false);
      setPlanForm({
        name: '',
        code: '',
        description: '',
        billingFrequency: 'MONTHLY',
        price: '',
        minQuantity: 1,
        trialDays: 0,
        autoClose: false,
        autoRenew: true,
      });
      fetchPlans();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to create plan', 'error');
    }
  };

  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Delete billing plan "${name}"?`)) return;
    try {
      await plansApi.delete(id);
      showToast('Plan deleted');
      fetchPlans();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to delete plan', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
              <Calendar className="w-3.5 h-3.5" /> Recurring Models
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Billing Plans</h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure daily, weekly, monthly, and yearly recurring subscription contracts.
            </p>
          </div>
          <button
            onClick={() => setIsAddPlanOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20 transition"
          >
            <Plus className="w-4 h-4" /> Create Plan
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <select
          value={frequencyFilter}
          onChange={(e) => setFrequencyFilter(e.target.value)}
          className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Billing Frequencies</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly</option>
        </select>
      </div>

      {/* Plans Grid */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading billing plans...</div>
      ) : plans.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 text-slate-400">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-white">No plans configured</p>
          <p className="text-xs text-slate-500 mt-1">Create your first recurring cadence.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.id}
              className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {p.billingFrequency}
                  </span>
                  <button
                    onClick={() => handleDeletePlan(p.id, p.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-white tracking-tight">{p.name}</h3>
                <div className="font-mono text-xs text-slate-500 mt-0.5">Code: {p.code}</div>

                {p.description && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{p.description}</p>
                )}

                <div className="mt-5 pb-4 border-b border-slate-800/80">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      ${Number(p.price).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">/ {p.billingFrequency.toLowerCase()}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Min Quantity</span>
                    <span className="font-mono text-slate-300">{p.minQuantity || 1} units</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Trial Period</span>
                    <span className="font-mono text-slate-300">{p.trialDays || 0} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Auto Renewal</span>
                    <span className={p.autoRenew ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                      {p.autoRenew ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Plan */}
      {isAddPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" /> Create Billing Plan
              </h3>
              <button
                onClick={() => setIsAddPlanOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Monthly"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="ENT-MONTHLY"
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Frequency *</label>
                  <select
                    value={planForm.billingFrequency}
                    onChange={(e) => setPlanForm({ ...planForm, billingFrequency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="99.00"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.minQuantity}
                    onChange={(e) => setPlanForm({ ...planForm, minQuantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Standard terms for enterprise monthly subscription..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                ></textarea>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-300 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.autoRenew}
                    onChange={(e) => setPlanForm({ ...planForm, autoRenew: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <span>Auto Renew Cycle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.autoClose}
                    onChange={(e) => setPlanForm({ ...planForm, autoClose: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <span>Auto Close on Expiration</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPlanOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
