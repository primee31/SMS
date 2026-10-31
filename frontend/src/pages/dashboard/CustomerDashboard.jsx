import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { User, Building, Phone, Mail, MapPin, Receipt, CalendarCheck, Shield } from 'lucide-react';

export function CustomerDashboard() {
  const { user } = useAuth();
  const customer = user?.customer;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Customer Header */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-indigo-500/20 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <User className="w-3.5 h-3.5" /> Customer Portal
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Hello, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {customer?.company ? `${customer.company} &bull; ` : ''}Manage your subscriptions, invoices, and billing history
            </p>
          </div>
          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 text-xs text-slate-400 space-y-1">
            <div><span className="text-slate-500">Status:</span> <span className="font-semibold text-emerald-400">{customer?.status || 'ACTIVE'}</span></div>
            <div><span className="text-slate-500">Email:</span> <span className="font-mono text-slate-300">{user?.email}</span></div>
            <div><span className="text-slate-500">Customer ID:</span> <span className="font-mono text-slate-400">{customer?.id?.slice(0, 13) || 'Profile Initialized'}...</span></div>
          </div>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 md:col-span-1">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            <span>Billing Profile</span>
          </h2>
          <div className="space-y-3.5 text-xs">
            <div>
              <div className="text-slate-500">Primary Contact</div>
              <div className="text-slate-200 font-semibold mt-0.5">{customer?.name || `${user?.firstName} ${user?.lastName}`}</div>
            </div>
            <div>
              <div className="text-slate-500">Company Name</div>
              <div className="text-slate-200 font-semibold mt-0.5">{customer?.company || 'Individual Account'}</div>
            </div>
            <div>
              <div className="text-slate-500">Email Address</div>
              <div className="text-slate-200 font-mono mt-0.5">{customer?.email || user?.email}</div>
            </div>
            <div>
              <div className="text-slate-500">Phone</div>
              <div className="text-slate-200 mt-0.5">{customer?.phone || 'Not specified'}</div>
            </div>
            <div>
              <div className="text-slate-500">Billing Address</div>
              <div className="text-slate-200 mt-0.5">
                {customer?.addressLine1 ? (
                  <>
                    {customer.addressLine1}
                    {customer.city ? `, ${customer.city}` : ''}
                    {customer.state ? ` ${customer.state}` : ''}
                    {customer.country ? ` (${customer.country})` : ''}
                  </>
                ) : (
                  <span className="text-slate-500 italic">No billing address set</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions & Invoices Quick Access */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 md:col-span-2 space-y-6">
          <Link
            to="/subscriptions"
            className="block p-4 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 transition group"
          >
            <h2 className="text-base font-bold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-cyan-400" />
                <span>My Subscriptions</span>
              </span>
              <span className="text-xs font-normal text-cyan-400 group-hover:underline">View All &rarr;</span>
            </h2>
            <div className="text-xs text-slate-400">
              View and manage active recurring subscriptions linked to your account.
            </div>
          </Link>

          <Link
            to="/invoices"
            className="block p-4 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 transition group"
          >
            <h2 className="text-base font-bold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>My Invoices & Receipts</span>
              </span>
              <span className="text-xs font-normal text-emerald-400 group-hover:underline">View All &rarr;</span>
            </h2>
            <div className="text-xs text-slate-400">
              Historical billing records, payment status receipts, and balance dues.
            </div>
          </Link>

          {/* Data Isolation Notice */}
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Customer Data Isolation Active:</strong> Your session is restricted strictly to your own records. Administrative resources and other customer accounts are completely inaccessible.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
