import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ShieldCheck, Users, Package, Calendar, Settings, Activity, Clock, ArrowUpRight } from 'lucide-react';

export function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-rose-500/20 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-indigo-500 to-purple-500"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Administrator Console
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Brightloop Enterprise Subscription Platform &bull; Administrative Operations
            </p>
          </div>
          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 text-xs text-slate-400 space-y-1">
            <div><span className="text-slate-500">Role:</span> <span className="font-semibold text-rose-300">ADMIN</span></div>
            <div><span className="text-slate-500">Email:</span> <span className="font-mono text-slate-300">{user?.email}</span></div>
            <div><span className="text-slate-500">Account ID:</span> <span className="font-mono text-slate-400">{user?.id?.slice(0, 13)}...</span></div>
          </div>
        </div>
      </div>

      {/* Administration Modules Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <span>Core Management Modules</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Link
            to="/products"
            className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-900/40 transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition">
                <Package className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
            </div>
            <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition">Products & Variants</h3>
            <p className="text-xs text-slate-400 mt-1">Configure recurring goods and services with variant pricing.</p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">&bull; Catalog Active</span>
              <span className="font-mono text-slate-500">Manage &rarr;</span>
            </div>
          </Link>

          <Link
            to="/plans"
            className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/40 transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
                <Calendar className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
            </div>
            <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition">Billing Plans</h3>
            <p className="text-xs text-slate-400 mt-1">Daily, weekly, monthly and yearly billing frequencies.</p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">&bull; Plans Active</span>
              <span className="font-mono text-slate-500">Configure &rarr;</span>
            </div>
          </Link>

          <Link
            to="/customers"
            className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-amber-500/60 hover:bg-slate-900/40 transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                <Users className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
            </div>
            <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition">Customers</h3>
            <p className="text-xs text-slate-400 mt-1">Manage accounts, billing profiles, and client information.</p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">&bull; Directory Active</span>
              <span className="font-mono text-slate-500">View Clients &rarr;</span>
            </div>
          </Link>

          <Link
            to="/users"
            className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-rose-500/60 hover:bg-slate-900/40 transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition" />
            </div>
            <h3 className="font-bold text-white text-base group-hover:text-rose-300 transition">Staff & Users</h3>
            <p className="text-xs text-slate-400 mt-1">Admin-only staff creation and permission control.</p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">&bull; Admin Console</span>
              <span className="font-mono text-slate-500">Manage Staff &rarr;</span>
            </div>
          </Link>
        </div>
      </div>

      {/* System Status Details */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" />
          <span>System Environment &bull; Phase 2 Status</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-500">Database Engine</div>
            <div className="text-slate-200 font-semibold mt-1">PostgreSQL via Prisma ORM</div>
            <div className="text-xs text-emerald-400 mt-2 font-mono">21 Models Validated</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-500">Security Architecture</div>
            <div className="text-slate-200 font-semibold mt-1">JWT + Refresh Rotation</div>
            <div className="text-xs text-emerald-400 mt-2 font-mono">RBAC + Ownership Checks</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-500">API Architecture</div>
            <div className="text-slate-200 font-semibold mt-1">Express 5 REST APIs</div>
            <div className="text-xs text-emerald-400 mt-2 font-mono">Zod Validated Schemas</div>
          </div>
        </div>
      </div>
    </div>
  );
}
