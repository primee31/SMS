import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { UserCheck, Users, FileText, CreditCard, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

export function StaffDashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-amber-500/20 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <UserCheck className="w-3.5 h-3.5" /> Staff Operations Portal
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Brightloop Customer Operations &bull; Day-to-Day Subscription Management
            </p>
          </div>
          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 text-xs text-slate-400 space-y-1">
            <div><span className="text-slate-500">Role:</span> <span className="font-semibold text-amber-300">STAFF</span></div>
            <div><span className="text-slate-500">Email:</span> <span className="font-mono text-slate-300">{user?.email}</span></div>
            <div><span className="text-slate-500">Account ID:</span> <span className="font-mono text-slate-400">{user?.id?.slice(0, 13)}...</span></div>
          </div>
        </div>
      </div>

      {/* Staff Permitted Workflows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Permitted Daily Operations</span>
          </h2>
          <div className="space-y-3 text-sm">
            <Link
              to="/customers"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition group"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-indigo-300 transition">Customer Management</div>
                  <div className="text-xs text-slate-400">View and manage customer profiles, addresses, and contacts.</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
            </Link>

            <Link
              to="/quotations"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition">Quotations & Orders</div>
                  <div className="text-xs text-slate-400">Prepare quotes, apply standard plan terms, send to clients.</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
            </Link>

            <Link
              to="/invoices"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition group"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-amber-300 transition">Invoices & Payments</div>
                  <div className="text-xs text-slate-400">Track invoice settlements and record manual offline payments.</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
            </Link>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-rose-400" />
            <span>Role-Based Boundaries (RBAC Protected)</span>
          </h2>
          <div className="space-y-3 text-sm">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-rose-500/10 text-xs text-slate-300">
              <span className="font-semibold text-rose-400">&bull; Staff Creation Restricted:</span> Only system administrators have authorization to register and manage internal Staff accounts (<span className="font-mono text-slate-400">/api/v1/users/staff</span>).
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-rose-500/10 text-xs text-slate-300">
              <span className="font-semibold text-rose-400">&bull; Plan & Product Definitions:</span> Master catalog configuration and baseline pricing are locked to administrative oversight.
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-rose-500/10 text-xs text-slate-300">
              <span className="font-semibold text-rose-400">&bull; Audit Logs:</span> System-level security trails and deletion events are restricted to Admin inspection.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
