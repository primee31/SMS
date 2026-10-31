import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/axiosClient.js';
import { Lock, Key, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{9,}$/;

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(9, 'Password must be longer than 8 characters')
    .regex(passwordRegex, 'Must contain at least 1 uppercase letter, 1 lowercase letter, and 1 special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const queryToken = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: queryToken,
      newPassword: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    if (queryToken) {
      setValue('token', queryToken);
    }
  }, [queryToken, setValue]);

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      await apiClient.post('/auth/reset-password', {
        token: data.token,
        newPassword: data.newPassword
      });
      setIsSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Password reset failed. Token may be invalid or expired.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"></div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Set New Password</h1>
            <p className="text-sm text-slate-400 mt-2">Create a secure new password for your account</p>
          </div>

          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Password Reset Successful</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your password has been securely updated. You can now sign in with your new credentials.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Reset Token
                </label>
                <div className="relative">
                  <Key className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    {...register('token')}
                    placeholder="Enter or paste reset token"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-white placeholder-slate-500 text-sm font-mono outline-none"
                  />
                </div>
                {errors.token && (
                  <p className="text-xs text-rose-400 mt-1.5">{errors.token.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    {...register('newPassword')}
                    placeholder="At least 9 chars, 1 uppercase, 1 lowercase, 1 symbol"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-white placeholder-slate-500 text-sm outline-none"
                  />
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-rose-400 mt-1.5">{errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    {...register('confirmPassword')}
                    placeholder="Re-enter new password"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-white placeholder-slate-500 text-sm outline-none"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-400 mt-1.5">{errors.confirmPassword.message}</p>
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
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center text-sm text-slate-400 mt-4">
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
