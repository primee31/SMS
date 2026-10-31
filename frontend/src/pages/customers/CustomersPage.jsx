import React, { useEffect, useState } from 'react';
import { customersApi } from '../../api/billingApi.js';
import { Users, Plus, Search, Building, Mail, Phone, MapPin, X, CheckCircle2, Archive } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  INACTIVE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ARCHIVED: 'bg-slate-700/40 text-slate-400 border-slate-700',
};

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [customerForm, setCustomerForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      };
      const res = await customersApi.list(params);
      setCustomers(res.data.items || res.data || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, statusFilter]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await customersApi.create({
        name: customerForm.name,
        company: customerForm.company || undefined,
        email: customerForm.email,
        phone: customerForm.phone || undefined,
        addressLine1: customerForm.addressLine1 || undefined,
        city: customerForm.city || undefined,
        state: customerForm.state || undefined,
        postalCode: customerForm.postalCode || undefined,
        country: customerForm.country || 'US',
      });
      showToast('Customer created successfully');
      setIsAddOpen(false);
      setCustomerForm({
        name: '',
        company: '',
        email: '',
        phone: '',
        addressLine1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      });
      fetchCustomers();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to create customer', 'error');
    }
  };

  const handleArchiveCustomer = async (id, name) => {
    if (!window.confirm(`Archive customer "${name}"?`)) return;
    try {
      await customersApi.delete(id);
      showToast('Customer archived');
      fetchCustomers();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to archive customer', 'error');
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
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <Users className="w-3.5 h-3.5" /> Customer Accounts
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Customer Directory</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage client billing profiles, contact points, and subscription assignments.
            </p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20 transition"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, company, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Customers List */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading customer directory...</div>
      ) : customers.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 text-slate-400">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-white">No customers found</p>
          <p className="text-xs text-slate-500 mt-1">Register your first client profile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map((c) => (
            <div
              key={c.id}
              className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base tracking-tight">{c.name}</h3>
                    {c.company && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Building className="w-3 h-3 text-slate-500" />
                        <span>{c.company}</span>
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      STATUS_COLORS[c.status] || STATUS_COLORS.ACTIVE
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300 mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-slate-300">{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {(c.city || c.country) && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {[c.city, c.state, c.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <Link
                  to={`/subscriptions?search=${encodeURIComponent(c.name)}`}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  View Subscriptions &rarr;
                </Link>
                {c.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => handleArchiveCustomer(c.id, c.name)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Archive Customer"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Customer */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" /> Create Customer Profile
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer / Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Smith"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="Acme Global Inc."
                    value={customerForm.company}
                    onChange={(e) => setCustomerForm({ ...customerForm, company: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@acme.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 555-0199"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="100 Market Street, Suite 400"
                  value={customerForm.addressLine1}
                  onChange={(e) => setCustomerForm({ ...customerForm, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Austin"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State / Province</label>
                  <input
                    type="text"
                    placeholder="TX"
                    value={customerForm.state}
                    onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    placeholder="US"
                    value={customerForm.country}
                    onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
