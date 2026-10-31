import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LogOut, Layers, ShieldCheck, UserCheck, User } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <UserCheck className="w-3.5 h-3.5" /> Staff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <User className="w-3.5 h-3.5" /> Customer
          </span>
        );
    }
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight hover:opacity-90 transition">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Brightloop</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono font-normal">SMS</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-300">
              <Link to="/" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                Dashboard
              </Link>
              {user.role === 'ADMIN' && (
                <>
                  <Link to="/products" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                    Products
                  </Link>
                  <Link to="/plans" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                    Plans
                  </Link>
                  <Link to="/customers" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                    Customers
                  </Link>
                  <Link to="/users" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                    Staff
                  </Link>
                </>
              )}
              {user.role === 'STAFF' && (
                <>
                  <Link to="/customers" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                    Customers
                  </Link>
                  <Link to="/products" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                    Products
                  </Link>
                  <Link to="/plans" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                    Plans
                  </Link>
                </>
              )}
              <Link to="/quotations" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                Quotations
              </Link>
              <Link to="/subscriptions" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                Subscriptions
              </Link>
              <Link to="/invoices" className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition">
                Invoices
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-200">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-slate-400 flex items-center justify-end gap-1.5 mt-0.5">
                  <span>{user.email}</span>
                  {getRoleBadge(user.role)}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition shadow-sm"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg shadow-md shadow-indigo-600/20 transition"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
