import React, { useEffect, useState } from 'react';
import { invoicesApi, paymentsApi } from '../../api/billingApi.js';
import { Receipt, DollarSign, X, CheckCircle2, AlertCircle } from 'lucide-react';

const STATUS_COLORS = {
  DRAFT: 'bg-slate-700 text-slate-300',
  POSTED: 'bg-blue-900/60 text-blue-300 border border-blue-800',
  PAID: 'bg-green-900/60 text-green-300 border border-green-800',
  PARTIALLY_PAID: 'bg-cyan-900/60 text-cyan-300 border border-cyan-800',
  OVERDUE: 'bg-red-900/60 text-red-400 border border-red-800',
  VOID: 'bg-slate-800 text-slate-500',
  CANCELLED: 'bg-slate-800 text-slate-500',
};

export function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  // Payment Recording Modal State
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    transactionReference: '',
    notes: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10, ...(search && { search }), ...(statusFilter && { status: statusFilter }) };
      const res = await invoicesApi.list(params);
      setInvoices(res.data.items || res.data || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [page, search, statusFilter]);

  const handlePost = async (id) => {
    setActionLoading(id + 'post');
    try {
      await invoicesApi.post(id);
      showToast('Invoice posted successfully');
      fetchInvoices();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to post invoice', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoid = async (id) => {
    const reason = window.prompt('Reason for voiding (optional):');
    if (reason === null) return;
    setActionLoading(id + 'void');
    try {
      await invoicesApi.void(id, reason || undefined);
      showToast('Invoice voided');
      fetchInvoices();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to void invoice', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openPaymentModal = (invoice) => {
    setPaymentModalInvoice(invoice);
    setPaymentForm({
      amount: String(invoice.amountDue),
      paymentMethod: 'BANK_TRANSFER',
      transactionReference: '',
      notes: '',
    });
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    try {
      await paymentsApi.create({
        invoiceId: paymentModalInvoice.id,
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference || undefined,
        notes: paymentForm.notes || undefined,
      });
      showToast(`Payment of $${parseFloat(paymentForm.amount).toFixed(2)} recorded successfully`);
      setPaymentModalInvoice(null);
      fetchInvoices();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to record payment', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border
          ${toast.type === 'error' ? 'bg-red-950 text-red-200 border-red-800' : 'bg-emerald-950 text-emerald-200 border-emerald-800'}`}>
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <Receipt className="w-3.5 h-3.5" /> Financial Accounting
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Invoices & Collections</h1>
            <p className="text-slate-400 text-sm mt-1">
              Historical billing snapshots, immutable tax lines, and payment recording.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search invoice # or customer..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2 text-sm w-72 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading invoices...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-400">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No invoices found.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/80">
                <th className="px-4 py-3 font-semibold">Invoice #</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Subscription</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-right">Paid</th>
                <th className="px-4 py-3 font-semibold text-right">Due</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {invoices.map((inv) => {
                const isOverdue = inv.status === 'OVERDUE';
                const canPay = ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status) && Number(inv.amountDue) > 0;
                return (
                  <tr key={inv.id} className={`hover:bg-slate-800/30 transition-colors ${isOverdue ? 'bg-red-950/20' : ''}`}>
                    <td className="px-4 py-3.5 text-sm font-mono text-indigo-400 font-semibold">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-semibold text-white">{inv.customer?.name}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">{inv.subscription?.subscriptionNumber || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[inv.status] || 'bg-slate-700 text-slate-300'}`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right font-mono text-white font-bold">${Number(inv.grandTotal).toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-mono text-emerald-400 font-semibold">${Number(inv.amountPaid).toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-mono text-amber-300 font-bold">${Number(inv.amountDue).toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-400">
                      <span className={isOverdue ? 'text-red-400 font-medium' : ''}>
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {canPay && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition"
                          >
                            <DollarSign className="w-3 h-3" /> Record Payment
                          </button>
                        )}
                        {inv.status === 'DRAFT' && (
                          <button onClick={() => handlePost(inv.id)} disabled={!!actionLoading}
                            className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition">
                            Post
                          </button>
                        )}
                        {!['PAID','VOID','CANCELLED'].includes(inv.status) && (
                          <button onClick={() => handleVoid(inv.id)} disabled={!!actionLoading}
                            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg disabled:opacity-50 transition">
                            Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800 disabled:opacity-40">Previous</button>
          <span className="px-3 py-1.5 text-sm text-slate-400">Page {page} / {pagination.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
            className="px-3 py-1.5 text-sm bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800 disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Modal: Record Offline Payment */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" /> Record Offline Payment
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Invoice {paymentModalInvoice.invoiceNumber} &bull; {paymentModalInvoice.customer?.name}
                </p>
              </div>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-sm">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Outstanding Balance:</span>
                <span className="font-mono text-amber-300 font-bold text-sm">
                  ${Number(paymentModalInvoice.amountDue).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={Number(paymentModalInvoice.amountDue)}
                  min="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                  <option value="CHECK">Paper Check</option>
                  <option value="CASH">Cash</option>
                  <option value="MANUAL">Manual Internal Settlement</option>
                  <option value="CREDIT_CARD">Credit Card (Offline record)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction / Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. WIRE-2026-99210"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Payment receipt verified by accounts receivable..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
