import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/axiosClient.js';
import { Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, Key } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export function ForgotPassword() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' }
  });

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      const res = await apiClient.post('/auth/forgot-password', { email: data.email });
      setSuccessInfo(res.data);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Password reset request failed.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-purple-500"></div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Forgot Password</h1>
            <p className="text-sm text-slate-400 mt-2">Enter your email to receive password reset instructions</p>
          </div>

          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {successInfo ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-200">Reset Request Received</p>
                  <p className="mt-1 text-xs text-emerald-300/80">{successInfo.message}</p>
                </div>
              </div>

              {/* Local Development One-Time Reset Token Display */}
              {successInfo.devResetToken && (
                <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-slate-300">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
                    <Key className="w-4 h-4" />
                    <span>Local Development Reset Token:</span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700/60 text-xs font-mono break-all text-indigo-200 select-all">
                    {successInfo.devResetToken}
                  </div>
                  <button
                    onClick={() => navigate(`/reset-password?token=${successInfo.devResetToken}`)}
                    className="w-full mt-3 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                  >
                    Proceed to Reset Password with this Token →
                  </button>
                </div>
              )}

              <div className="text-center pt-2">
                <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition">
                  ← Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Registered Email Address
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Request...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center text-sm text-slate-400 mt-4">
                Remember your password?{' '}
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
                  Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
