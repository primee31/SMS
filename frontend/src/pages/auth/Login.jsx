import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, KeyRound } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);

  const from = location.state?.from?.pathname;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      const user = await login(data.email, data.password);
      
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'STAFF') {
        navigate('/staff', { replace: true });
      } else {
        navigate('/customer', { replace: true });
      }
    } catch (err) {
      if (!err.response) {
        setServerError('Cannot connect to backend server. Please verify the backend is running at http://localhost:4000 (npm run dev:backend).');
      } else if (err.response.status === 503 || err.response.status === 500) {
        setServerError(err.response.data?.error?.message || 'Database connection error. Please ensure PostgreSQL is running and migrated.');
      } else {
        const msg = err.response.data?.error?.message || 'Login failed. Please check your credentials.';
        setServerError(msg);
      }
    }
  };

  const fillDemoCreds = (email, pass) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome Back</h1>
            <p className="text-sm text-slate-400 mt-2">Sign in to your Brightloop SMS account</p>
          </div>

          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-white placeholder-slate-500 text-sm outline-none"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-400 mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  {...register('password')}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-white placeholder-slate-500 text-sm outline-none"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-rose-400 mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
              Create an account
            </Link>
          </div>

          {/* Development Quick-Fill Helper */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 mb-2.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Demo Quick-Fill Credentials:</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCreds('admin@brightloop.com', 'Admin#1234')}
                className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-rose-300 text-center border border-rose-500/20 font-mono transition"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoCreds('sarah.ops@brightloop.com', 'Staff#1234')}
                className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 text-center border border-amber-500/20 font-mono transition"
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => fillDemoCreds('acme.corp@example.com', 'Customer#1234')}
                className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-indigo-300 text-center border border-indigo-500/20 font-mono transition"
              >
                Customer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
