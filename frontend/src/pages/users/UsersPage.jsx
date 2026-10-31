import React, { useEffect, useState } from 'react';
import { usersApi } from '../../api/billingApi.js';
import { ShieldCheck, UserCheck, User, Plus, Search, Trash2, X, Lock, Mail, Phone } from 'lucide-react';

const ROLE_BADGES = {
  ADMIN: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  STAFF: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CUSTOMER: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [toast, setToast] = useState(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: 50,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      };
      const res = await usersApi.list(params);
      setUsers(res.data.items || res.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await usersApi.createStaff({
        email: staffForm.email,
        password: staffForm.password,
        firstName: staffForm.firstName,
        lastName: staffForm.lastName,
        phone: staffForm.phone || undefined,
      });
      showToast('Internal Staff account created successfully');
      setIsAddStaffOpen(false);
      setStaffForm({ email: '', password: '', firstName: '', lastName: '', phone: '' });
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to create staff account', 'error');
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (!window.confirm(`Deactivate user account "${email}"?`)) return;
    try {
      await usersApi.delete(id);
      showToast('User deactivated');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to deactivate user', 'error');
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
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Identity & Access Control
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Staff & User Administration</h1>
            <p className="text-slate-400 text-sm mt-1">
              Admin-restricted oversight of staff accounts, permission roles, and customer access.
            </p>
          </div>
          <button
            onClick={() => setIsAddStaffOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition"
          >
            <Plus className="w-4 h-4" /> Create Staff Member
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-rose-500"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="STAFF">STAFF</option>
          <option value="CUSTOMER">CUSTOMER</option>
        </select>
      </div>

      {/* Users Table */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading user accounts...</div>
      ) : users.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 text-slate-400">
          <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-white">No users found</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">
                      {u.firstName} {u.lastName}
                    </div>
                    <div className="text-xs font-mono text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        ROLE_BADGES[u.role] || ROLE_BADGES.CUSTOMER
                      }`}
                    >
                      {u.role === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}
                      {u.role === 'STAFF' && <UserCheck className="w-3 h-3" />}
                      {u.role === 'CUSTOMER' && <User className="w-3 h-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">
                    {u.phone || '—'}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Deactivate User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Staff Member */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-rose-400" /> Create Internal Staff
              </h3>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sarah"
                    value={staffForm.firstName}
                    onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Connor"
                    value={staffForm.lastName}
                    onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="sarah.ops@brightloop.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Password * <span className="text-[11px] text-slate-500 font-normal">(&gt;8 chars, 1 uppercase, 1 special)</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Staff#2026Secure"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="+1-555-0120"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
