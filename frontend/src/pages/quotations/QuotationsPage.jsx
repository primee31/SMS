import React, { useEffect, useState } from 'react';
import { quotationsApi } from '../../api/billingApi.js';

const STATUS_COLORS = {
  DRAFT: 'bg-slate-700 text-slate-300',
  SENT: 'bg-blue-900 text-blue-300',
  CONFIRMED: 'bg-green-900 text-green-300',
  CANCELLED: 'bg-red-900 text-red-300',
  EXPIRED: 'bg-yellow-900 text-yellow-300',
};

export function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
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

  const fetchQuotations = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10, ...(search && { search }), ...(statusFilter && { status: statusFilter }) };
      const res = await quotationsApi.list(params);
      setQuotations(res.data.items || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuotations(); }, [page, search, statusFilter]);

  const handleStatusChange = async (id, newStatus) => {
    setActionLoading(id + newStatus);
    try {
      await quotationsApi.changeStatus(id, newStatus);
      showToast(`Quotation status updated to ${newStatus}`);
      fetchQuotations();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvert = async (id) => {
    if (!window.confirm('Convert this quotation to a subscription?')) return;
    setActionLoading(id + 'convert');
    try {
      await quotationsApi.convert(id, {});
      showToast('Subscription created successfully!');
      fetchQuotations();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Conversion failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotations</h1>
          <p className="text-slate-400 text-sm mt-1">Manage customer quotations and convert to subscriptions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search quotation # or customer..."
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
          {['DRAFT','SENT','CONFIRMED','CANCELLED','EXPIRED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-400">{error}</div>
        ) : quotations.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No quotations found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Valid Until</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-indigo-400">{q.quotationNumber}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{q.customer?.name}</div>
                    <div className="text-xs text-slate-500">{q.customer?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{q.plan?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[q.status] || 'bg-slate-700 text-slate-300'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-green-400">
                    ${Number(q.grandTotal).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {q.status === 'DRAFT' && (
                        <button
                          onClick={() => handleStatusChange(q.id, 'SENT')}
                          disabled={actionLoading === q.id + 'SENT'}
                          className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                        >Send</button>
                      )}
                      {q.status === 'SENT' && (
                        <button
                          onClick={() => handleStatusChange(q.id, 'CONFIRMED')}
                          disabled={actionLoading === q.id + 'CONFIRMED'}
                          className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded disabled:opacity-50"
                        >Confirm</button>
                      )}
                      {q.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleConvert(q.id)}
                          disabled={actionLoading === q.id + 'convert'}
                          className="px-2 py-1 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded disabled:opacity-50"
                        >Convert</button>
                      )}
                      {!['CANCELLED','EXPIRED'].includes(q.status) && (
                        <button
                          onClick={() => handleStatusChange(q.id, 'CANCELLED')}
                          disabled={actionLoading === q.id + 'CANCELLED'}
                          className="px-2 py-1 text-xs bg-red-900 hover:bg-red-800 text-red-300 rounded disabled:opacity-50"
                        >Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-40">
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-slate-400">
            Page {page} / {pagination.totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
            className="px-3 py-1.5 text-sm bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
