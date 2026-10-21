import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Key, CheckCircle, RefreshCw, X, Sparkles } from 'lucide-react';

interface LoginPageProps {
  setCurrentTab: (tab: string) => void;
  onSuccessRedirect?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ setCurrentTab, onSuccessRedirect }) => {
  const { login, loginWithGoogle, forgotPassword, resetPassword, resendVerification, bootstrapOwner, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Unconfirmed email helper
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Reset Password Flow (from email link)
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Owner Bootstrap helper
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);

  useEffect(() => {
    // Detect password reset flow from URL query (?reset=true or #type=recovery)
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (urlParams.get('reset') === 'true' || hash.includes('type=recovery')) {
      setIsResetMode(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setUnconfirmedEmail(null);

    try {
      await login(email, password);
      setCurrentTab(onSuccessRedirect || 'dashboard');
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      setError(msg);
      if (msg.toLowerCase().includes('not been confirmed') || msg.toLowerCase().includes('unconfirmed')) {
        setUnconfirmedEmail(email);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      setCurrentTab(onSuccessRedirect || 'dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setError(null);
    try {
      const res = await forgotPassword(forgotEmail);
      setSuccessMessage(res.message);
      setShowForgotModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await resetPassword(newPassword);
      setSuccessMessage(res.message);
      setIsResetMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unconfirmedEmail) return;
    setResendingVerification(true);
    setError(null);
    try {
      const res = await resendVerification(unconfirmedEmail);
      setSuccessMessage(res.message);
      setUnconfirmedEmail(null);
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleBootstrapOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootstrapSecret.trim()) return;
    setBootstrapping(true);
    setError(null);
    try {
      const res = await bootstrapOwner(bootstrapSecret.trim());
      setSuccessMessage(res.message);
      setShowBootstrapModal(false);
      setTimeout(() => setCurrentTab('admin'), 1000);
    } catch (err: any) {
      setError(err.message || 'Bootstrap failed');
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 space-y-6 shadow-2xl relative">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-950">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            {isResetMode ? 'Set New Password' : 'Sign In to BeastMC'}
          </h1>
          <p className="text-xs text-slate-400">
            {isResetMode
              ? 'Choose a strong new password for your BeastMC account.'
              : 'Login is required to purchase ranks, coins, and track orders.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <span>{error}</span>
              {unconfirmedEmail && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg shadow transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${resendingVerification ? 'animate-spin' : ''}`} />
                    <span>Resend Confirmation Email</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Password Reset Form Mode */}
        {isResetMode ? (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                New Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsResetMode(false)}
              className="w-full text-center text-xs text-slate-400 hover:text-white"
            >
              Back to Login
            </button>
          </form>
        ) : (
          /* Standard Login Form */
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Signing in...' : 'Sign In with Supabase'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-wider">
                Or Continue With
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign In with Google</span>
            </button>

            <div className="text-center text-xs text-slate-400">
              Don't have an account yet?{' '}
              <button
                onClick={() => setCurrentTab('register')}
                className="text-emerald-400 hover:underline font-bold"
              >
                Create an account
              </button>
            </div>

            {/* Owner Bootstrap Banner for mhaseebahmed0@gmail.com */}
            {user?.email?.toLowerCase() === 'mhaseebahmed0@gmail.com' && user.role !== 'owner' && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBootstrapModal(true)}
                  className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/30 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Provision Owner Privileges (Setup)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Reset Password
              </h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your registered email address. We'll send you a secure Supabase link to reset your password.
            </p>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owner Bootstrap Modal */}
      {showBootstrapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Owner Provisioning
                </h3>
              </div>
              <button
                onClick={() => setShowBootstrapModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Verify your server-side bootstrap secret key to link <strong className="text-amber-400">mhaseebahmed0@gmail.com</strong> with permanent Server Owner permissions.
            </p>

            <form onSubmit={handleBootstrapOwnerSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                  Administrator Bootstrap Secret Key
                </label>
                <input
                  type="password"
                  required
                  value={bootstrapSecret}
                  onChange={(e) => setBootstrapSecret(e.target.value)}
                  placeholder="Enter OWNER_BOOTSTRAP_SECRET"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBootstrapModal(false)}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bootstrapping}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow shadow-amber-950 disabled:opacity-50"
                >
                  {bootstrapping ? 'Verifying...' : 'Activate Owner Privileges'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
