import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { McStatus, SiteSettings } from '../types.ts';
import {
  Shield,
  Copy,
  Check,
  Users,
  ShoppingBag,
  Crown,
  Coins,
  Search,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ExternalLink,
  ChevronDown,
  Package,
  Vote,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  siteSettings: SiteSettings | null;
  onOpenTrackModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  siteSettings,
  onOpenTrackModal,
}) => {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [mcStatus, setMcStatus] = useState<McStatus | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const serverIp = siteSettings?.serverIp || 'play.beastmc.net';

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('/api/mc-status', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok && isMounted) {
          const data = await res.json();
          setMcStatus(data);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Navbar live status check skipped:', err);
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [siteSettings]);

  const copyIp = () => {
    navigator.clipboard.writeText(serverIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isStaff = user && (user.role === 'owner' || user.role === 'admin' || user.role === 'moderator');

  const seasonTitleDisplay =
    siteSettings?.seasonSettings?.seasonTitle ||
    siteSettings?.seasonTitle ||
    (siteSettings?.seasonNumber ? `BeastMC Season ${siteSettings.seasonNumber} Active` : 'BeastMC Season 4 Active');

  const seasonSubtitleDisplay =
    siteSettings?.seasonSettings?.seasonSubtitle ||
    siteSettings?.seasonSubtitle ||
    '24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted';

  // Dynamic Announcement from Database (Supabase / Postgres)
  const announcementRaw =
    siteSettings?.announcementText !== undefined && siteSettings?.announcementText !== null && siteSettings?.announcementText !== ''
      ? siteSettings.announcementText
      : `${seasonTitleDisplay} • ${seasonSubtitleDisplay}`;

  const isAnnouncementEnabled = siteSettings?.announcementEnabled !== 0;

  // Format title (emerald highlight) and subtitle (slate)
  let announcementTitle = announcementRaw;
  let announcementSubtitle = '';
  if (announcementRaw.includes('•')) {
    const parts = announcementRaw.split('•');
    announcementTitle = parts[0].trim();
    announcementSubtitle = parts.slice(1).join(' • ').trim();
  }

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-emerald-900/30 text-white">
      {/* Top Announcement Bar */}
      {isAnnouncementEnabled && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 py-1.5 px-4 text-xs font-medium border-b border-emerald-900/40">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-bold uppercase tracking-wider">
                {announcementTitle}
              </span>
              {announcementSubtitle && (
                <span className="text-slate-400 hidden sm:inline">
                  &bull; {announcementSubtitle}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">

              <button
                onClick={onOpenTrackModal}
                className="text-slate-300 hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                <Search className="w-3 h-3" />
                <span>Track Order</span>
              </button>
              {siteSettings?.discordUrl && (
                <a
                  href={siteSettings.discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors"
                >
                  <span>Discord</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            {siteSettings?.logoUrl ? (
              <img src={siteSettings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-slate-900 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/40 group-hover:scale-105 transition-transform">
                <Shield className="w-7 h-7 text-emerald-100" />
              </div>
            )}
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                {siteSettings?.siteName || 'BeastMC Network'}
              </div>
              <div className="text-[10px] font-semibold tracking-widest text-emerald-500/90 uppercase">
                Official Server & Store
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => setCurrentTab('home')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'home'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 shadow-sm shadow-emerald-900/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentTab('store')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${
                currentTab === 'store'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 shadow-sm shadow-emerald-900/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              Store
            </button>
            <button
              onClick={() => setCurrentTab('vote')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${
                currentTab === 'vote'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 shadow-sm shadow-emerald-900/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Vote className="w-4 h-4 text-emerald-400" />
              Vote
            </button>
            {user && (
              <button
                onClick={() => setCurrentTab('orders')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  currentTab === 'orders'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 shadow-sm shadow-emerald-900/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Package className="w-4 h-4 text-emerald-400" />
                My Orders
              </button>
            )}
          </nav>

          {/* Server IP & Live Players Button */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={copyIp}
              className="flex items-center gap-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 px-3.5 py-2 rounded-xl transition-all shadow-inner group"
              title="Click to copy Minecraft Server IP"
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Minecraft Server IP
                </span>
                <span className="text-sm font-mono font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                  {serverIp}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-emerald-950 group-hover:text-emerald-400 transition-all">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </div>
            </button>

            {/* Live Player Status Badge */}
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 px-3 py-2 rounded-xl">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="text-xs">
                <div className="font-bold text-emerald-300">
                  {mcStatus?.players?.online ?? 428} <span className="text-slate-400 font-normal">/ {mcStatus?.players?.max ?? 1000}</span>
                </div>
                <div className="text-[10px] text-slate-400">Players Online</div>
              </div>
            </div>
          </div>

          {/* User Account / Staff CTA */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                {isStaff && (
                  <button
                    onClick={() => setCurrentTab('admin')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      currentTab === 'admin'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                        : 'bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Admin Panel</span>
                  </button>
                )}

                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                    currentTab === 'dashboard'
                      ? 'bg-slate-900 border-emerald-500 text-emerald-400'
                      : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={`https://mc-heads.net/avatar/${user.minecraftUsername || 'Steve'}/32`}
                    alt="Skin"
                    className="w-7 h-7 rounded shadow"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="text-left">
                    <div className="text-xs font-bold leading-tight">{user.minecraftUsername || user.username}</div>
                    <div className="text-[10px] text-emerald-400 capitalize font-medium">{user.role}</div>
                  </div>
                </button>

                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTab('login')}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => setCurrentTab('register')}
                  className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-850 px-4 pt-2 pb-6 space-y-3">
          {/* Server IP Copy Banner for Mobile */}
          <div
            onClick={copyIp}
            className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800"
          >
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Tap to copy Server IP</div>
              <div className="text-sm font-mono font-bold text-emerald-400">{serverIp}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-semibold">{mcStatus?.players?.online ?? 428} Online</span>
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setCurrentTab('home'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-left font-semibold text-sm ${currentTab === 'home' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-slate-300'}`}
            >
              Home
            </button>
            <button
              onClick={() => { setCurrentTab('store'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-left font-semibold text-sm ${currentTab === 'store' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-slate-300'}`}
            >
              Store
            </button>
            <button
              onClick={() => { setCurrentTab('vote'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-left font-semibold text-sm flex items-center gap-2 ${currentTab === 'vote' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-slate-300'}`}
            >
              <Vote className="w-4 h-4 text-emerald-400" />
              <span>Vote</span>
            </button>
          </div>

          {user ? (
            <div className="pt-2 border-t border-slate-850 space-y-2">
              <button
                onClick={() => { setCurrentTab('dashboard'); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white font-semibold"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  <span>Player Dashboard</span>
                </div>
                <span className="text-xs text-emerald-400">{user.minecraftUsername}</span>
              </button>

              <button
                onClick={() => { setCurrentTab('orders'); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white font-semibold"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>My Orders</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">History</span>
              </button>

              {isStaff && (
                <button
                  onClick={() => { setCurrentTab('admin'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 p-3 rounded-xl bg-amber-950/80 text-amber-300 font-semibold border border-amber-800/50"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin Panel ({user.role})</span>
                </button>
              )}

              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-950/40 text-red-400 text-sm font-semibold border border-red-900/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850">
              <button
                onClick={() => { setCurrentTab('login'); setMobileMenuOpen(false); }}
                className="p-3 text-center bg-slate-900 text-white font-semibold rounded-xl"
              >
                Login
              </button>
              <button
                onClick={() => { setCurrentTab('register'); setMobileMenuOpen(false); }}
                className="p-3 text-center bg-emerald-600 text-white font-semibold rounded-xl"
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
