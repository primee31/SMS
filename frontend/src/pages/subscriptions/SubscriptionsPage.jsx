import React, { useEffect, useState } from 'react';
import { subscriptionsApi } from '../../api/billingApi.js';

const STATUS_COLORS = {
  ACTIVE: 'bg-green-900 text-green-300',
  PAUSED: 'bg-yellow-900 text-yellow-300',
  CANCELLED: 'bg-red-900 text-red-300',
  CLOSED: 'bg-slate-700 text-slate-400',
  EXPIRED: 'bg-orange-900 text-orange-300',
  DRAFT: 'bg-slate-700 text-slate-300',
  QUOTATION: 'bg-blue-900 text-blue-300',
  CONFIRMED: 'bg-indigo-900 text-indigo-300',
};

export function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10, ...(search && { search }), ...(statusFilter && { status: statusFilter }) };
      const res = await subscriptionsApi.list(params);
      setSubscriptions(res.data.items || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubscriptions(); }, [page, search, statusFilter]);

  const doAction = async (action, id, extra = undefined) => {
    setActionLoading(id + action);
    try {
      await subscriptionsApi[action](id, extra);
      showToast(`Subscription ${action}d successfully`);
      fetchSubscriptions();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id) => {
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    doAction('cancel', id, reason || undefined);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-slate-400 text-sm mt-1">Manage recurring subscription lifecycle</p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search subscription # or customer..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          {['ACTIVE','PAUSED','CANCELLED','CLOSED','EXPIRED','DRAFT','CONFIRMED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-400">{error}</div>
        ) : subscriptions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No subscriptions found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Frequency</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Next Billing</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-indigo-400">{s.subscriptionNumber}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{s.customer?.name}</div>
                    <div className="text-xs text-slate-500">{s.customer?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{s.plan?.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{s.billingFrequency}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-slate-700 text-slate-300'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-green-400">
                    ${Number(s.recurringTotal).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {s.status === 'ACTIVE' && (
                        <button onClick={() => doAction('pause', s.id)} disabled={!!actionLoading}
                          className="px-2 py-1 text-xs bg-yellow-900 hover:bg-yellow-800 text-yellow-300 rounded disabled:opacity-50">
                          Pause
                        </button>
                      )}
                      {s.status === 'PAUSED' && (
                        <button onClick={() => doAction('resume', s.id)} disabled={!!actionLoading}
                          className="px-2 py-1 text-xs bg-green-900 hover:bg-green-800 text-green-300 rounded disabled:opacity-50">
                          Resume
                        </button>
                      )}
                      {['ACTIVE','EXPIRED'].includes(s.status) && (
                        <button onClick={() => doAction('renew', s.id)} disabled={!!actionLoading}
                          className="px-2 py-1 text-xs bg-indigo-900 hover:bg-indigo-800 text-indigo-300 rounded disabled:opacity-50">
                          Renew
                        </button>
                      )}
                      {!['CANCELLED','CLOSED','EXPIRED'].includes(s.status) && (
                        <button onClick={() => handleCancel(s.id)} disabled={!!actionLoading}
                          className="px-2 py-1 text-xs bg-red-900 hover:bg-red-800 text-red-300 rounded disabled:opacity-50">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-40">Previous</button>
          <span className="px-3 py-1.5 text-sm text-slate-400">Page {page} / {pagination.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
            className="px-3 py-1.5 text-sm bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
