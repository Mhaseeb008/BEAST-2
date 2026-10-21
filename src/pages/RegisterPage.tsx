import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserPlus, Mail, Lock, User as UserIcon, Gamepad2, ArrowRight, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

interface RegisterPageProps {
  setCurrentTab: (tab: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ setCurrentTab }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username || !minecraftUsername) {
      setError('All fields are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationNotice(null);

    try {
      const res = await register(email, password, username, minecraftUsername);
      if (res?.requiresVerification) {
        setVerificationNotice(res.message || 'Please check your email to confirm your account.');
      } else {
        setCurrentTab('dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 space-y-6 shadow-2xl relative">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-950">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Create BeastMC Account
          </h1>
          <p className="text-xs text-slate-400">
            Link your Minecraft username for automatic perk and rank delivery.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {verificationNotice ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-950/80 border border-emerald-700/60 rounded-2xl text-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verification Link Sent!</span>
              </div>
              <p className="leading-relaxed">
                {verificationNotice}
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Once confirmed, you can sign in with your email and password to access the player dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentTab('login')}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Proceed to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Minecraft Username <span className="text-emerald-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <img
                  src={`https://mc-heads.net/avatar/${minecraftUsername || 'Steve'}/36`}
                  alt="Minecraft Avatar"
                  className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-700 p-0.5 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="relative flex-1">
                  <Gamepad2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={minecraftUsername}
                    onChange={(e) => setMinecraftUsername(e.target.value)}
                    placeholder="Exact in-game IGN"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Make sure this matches your in-game IGN so orders can be delivered!
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

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
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Creating Account...' : 'Register with Supabase'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-400">
          Already registered?{' '}
          <button
            onClick={() => setCurrentTab('login')}
            className="text-emerald-400 hover:underline font-bold"
          >
            Sign in here
          </button>
        </div>
      </div>
    </div>
  );
};
