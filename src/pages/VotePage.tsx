import React, { useState, useEffect } from 'react';
import { VoteSite, SiteSettings } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Vote,
  ExternalLink,
  Sparkles,
  Check,
  Copy,
  Gift,
  Clock,
  ShieldCheck,
  Trophy,
  Server,
  Star,
  Flame,
} from 'lucide-react';

interface VotePageProps {
  siteSettings: SiteSettings | null;
}

export const VotePage: React.FC<VotePageProps> = ({ siteSettings }) => {
  const { user } = useAuth();
  const [voteSites, setVoteSites] = useState<VoteSite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Username copy helper
  const [playerUsername, setPlayerUsername] = useState<string>(user?.minecraftUsername || '');
  const [usernameCopied, setUsernameCopied] = useState<boolean>(false);
  const [ipCopied, setIpCopied] = useState<boolean>(false);
  const [votedSites, setVotedSites] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (user?.minecraftUsername) {
      setPlayerUsername(user.minecraftUsername);
    }
  }, [user?.minecraftUsername]);

  const serverIp = siteSettings?.serverIp || 'play.beastmc.net';

  useEffect(() => {
    const fetchVoteSites = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/vote-sites');
        if (res.ok) {
          const data = await res.json();
          setVoteSites(data);
        } else {
          throw new Error('Failed to load voting websites');
        }
      } catch (err: any) {
        console.warn('Could not load vote sites:', err);
        setError(err.message || 'Could not load voting links');
      } finally {
        setLoading(false);
      }
    };

    fetchVoteSites();
  }, []);

  const copyUsername = () => {
    if (!playerUsername) return;
    navigator.clipboard.writeText(playerUsername);
    setUsernameCopied(true);
    setTimeout(() => setUsernameCopied(false), 2000);
  };

  const copyServerIp = () => {
    navigator.clipboard.writeText(serverIp);
    setIpCopied(true);
    setTimeout(() => setIpCopied(false), 2000);
  };

  const handleVoteClick = (site: VoteSite) => {
    setVotedSites((prev) => ({ ...prev, [site.id]: true }));
    window.open(site.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30 shadow-lg shadow-emerald-950/40">
          <Vote className="w-4 h-4 text-emerald-400" />
          <span>Daily Server Rewards • 24h Reset</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Vote For <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">BeastMC Network</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Support our Minecraft server daily on each listing directory below to claim free in-game <strong className="text-emerald-400 font-semibold">Beast Coins</strong>, <strong className="text-amber-400 font-semibold">Mystery Crate Keys</strong>, and exclusive voter ranks. Enter your exact Minecraft username on each site!
        </p>
      </div>

      {/* Minecraft Username Quick-Copy Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Step 1: Have Your Username Ready</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Copy Your Minecraft In-Game Name (IGN)
            </h2>
            <p className="text-xs text-slate-400">
              Paste this exact username into the voting form on each site so the automated delivery plugin recognizes your account.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <input
                type="text"
                value={playerUsername}
                onChange={(e) => setPlayerUsername(e.target.value)}
                placeholder="Enter Minecraft IGN..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none"
              />
            </div>

            <button
              onClick={copyUsername}
              disabled={!playerUsername.trim()}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all shrink-0"
            >
              {usernameCopied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied IGN!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Username</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Voting Sites List */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span>Official Voting Sites</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold normal-case">
                {voteSites.length} Links Available
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Vote on all links every 24 hours to maximize your daily coins and mystery box rewards.
            </p>
          </div>

          {/* Server IP Copy shortcut */}
          <button
            onClick={copyServerIp}
            className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 text-xs font-mono transition-all"
            title="Copy Server IP"
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>IP: {serverIp}</span>
            {ipCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-400">Loading voting directories...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-red-950/20 border border-red-900/50 rounded-2xl space-y-2">
            <p className="text-red-400 font-bold text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-slate-300 underline"
            >
              Click to reload
            </button>
          </div>
        ) : voteSites.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl space-y-3">
            <Vote className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No voting sites listed yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The server owner has not added voting sites yet. Please check back soon or configure them in the Admin Panel!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {voteSites.map((site, index) => {
              const hasVoted = votedSites[site.id];
              let domain = '';
              try {
                domain = new URL(site.url).hostname.replace('www.', '');
              } catch {
                domain = site.url;
              }

              return (
                <div
                  key={site.id}
                  className="rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 p-6 sm:p-7 flex flex-col justify-between gap-6 transition-all shadow-xl hover:shadow-emerald-950/20 group relative overflow-hidden"
                >
                  {/* Glowing accent border top */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 opacity-60 group-hover:opacity-100 transition-opacity"></div>

                  <div className="space-y-4">
                    {/* Top Row: Rank Badge & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-slate-800 group-hover:bg-emerald-500/20 border border-slate-700 group-hover:border-emerald-500/30 text-slate-300 group-hover:text-emerald-400 font-black text-xs flex items-center justify-center transition-colors">
                          #{index + 1}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {domain}
                        </span>
                      </div>

                      {hasVoted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          <span>Link Opened</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          <span>Daily Vote</span>
                        </span>
                      )}
                    </div>

                    {/* Site Title */}
                    <div>
                      <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors">
                        {site.name}
                      </h3>
                      {site.description ? (
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          {site.description}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 italic mt-1.5">
                          Support BeastMC Network on {domain} and unlock server rewards.
                        </p>
                      )}
                    </div>

                    {/* Reward Badge */}
                    {site.rewardText && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs font-semibold">
                        <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{site.rewardText}</span>
                      </div>
                    )}
                  </div>

                  {/* Vote Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => handleVoteClick(site)}
                      className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg hover:scale-[1.01] ${
                        hasVoted
                          ? 'bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-emerald-500/40'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                      }`}
                    >
                      <Vote className="w-4 h-4" />
                      <span>{hasVoted ? 'Vote Again on ' + site.name : 'Vote Now on ' + site.name}</span>
                      <ExternalLink className="w-4 h-4 ml-1 opacity-75" />
                    </button>
                    <p className="text-[10px] text-center text-slate-500 mt-2">
                      Opens in a new browser tab. Complete the captcha and enter your Minecraft username.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guide & Reward Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-white uppercase">1. Free In-Game Coins</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every valid vote grants Beast Coins directly to your balance in survival, skyblock, and prison modes.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Gift className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-white uppercase">2. Mystery Crate Keys</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Open the exclusive Voter Crate at the server spawn for a chance at rare items, armor sets, and special particle cosmetics.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Flame className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-white uppercase">3. Top Voter of the Month</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The top 3 voters of every month win free store gift cards and permanent server rank upgrades announced on Discord!
          </p>
        </div>
      </div>
    </div>
  );
};
