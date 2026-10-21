import React, { useState, useEffect } from 'react';
import { SiteSettings, Product, McStatus } from '../types.ts';
import {
  Copy,
  Check,
  Users,
  Shield,
  Zap,
  Flame,
  Crown,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Server,
  ArrowRight,
  Gift,
  Gamepad2,
  Sword,
  Pickaxe,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  Activity,
} from 'lucide-react';

interface HomePageProps {
  siteSettings: SiteSettings | null;
  onSelectProduct: (product: Product) => void;
  setCurrentTab: (tab: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  siteSettings,
  onSelectProduct,
  setCurrentTab,
}) => {
  const [copied, setCopied] = useState(false);
  const [mcStatus, setMcStatus] = useState<McStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  const serverIp = siteSettings?.serverIp || 'play.beastmc.net';
  const serverPort = siteSettings?.serverPort || 25565;

  const fetchStatus = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/mc-status', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setMcStatus(data);
      }
    } catch (err) {
      console.warn('Live Minecraft status check unavailable:', err);
      // Graceful offline fallback
      setMcStatus((prev) => prev || {
        online: false,
        status: 'offline',
        ip: serverIp,
        port: serverPort,
        players: { online: 0, max: 100, list: [] },
        version: { name: 'Paper' },
        motd: { clean: 'BeastMC Network' },
        icon: null,
        latency: null,
        serverType: 'paper',
        serverName: siteSettings?.siteName || 'BeastMC Network',
        bedrockPort: siteSettings?.bedrockPort || 19132,
        crossplayEnabled: (siteSettings?.crossplayEnabled ?? 1) === 1,
        networkServers: [],
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      if (showLoading) {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchFeatured = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('/api/products', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok && isMounted) {
          const data = await res.json();
          setFeaturedProducts(data.slice(0, 4));
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Could not load featured products:', err);
        }
      }
    };

    fetchStatus(false);
    fetchFeatured();

    // Requirement 6: Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (isMounted) {
        fetchStatus(false);
      }
    }, 30000);

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

  const isOnline = mcStatus?.status === 'online' || mcStatus?.online === true;
  const isOffline = mcStatus?.status === 'offline';
  const isUnavailable = !mcStatus || mcStatus?.status === 'unavailable';

  return (
    <div className="space-y-16 pb-16">
      {/* Promotional / Event Network Banner */}
      {siteSettings?.bannerUrl && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 relative group">
            <img
              src={siteSettings.bannerUrl}
              alt="Network Announcement Banner"
              className="w-full h-32 sm:h-48 md:h-56 object-cover group-hover:scale-[1.01] transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/30">
                Official Network Announcement
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Dynamic Homepage Background Image */}
        {siteSettings?.heroBgUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center -z-20 opacity-30 mix-blend-luminosity scale-105 transform filter transition-all duration-700"
            style={{ backgroundImage: `url(${siteSettings.heroBgUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b12]/80 via-[#070b12]/90 to-[#070b12] -z-10" />

        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-600/20 via-teal-900/10 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide uppercase shadow-lg shadow-emerald-900/20">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Minecraft Java & Bedrock 1.20 - 1.21.x Supported</span>
          </div>

          {/* Hero Titles */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-none">
              {siteSettings?.heroTitle || 'WELCOME TO BEASTMC NETWORK'}
            </h1>
            <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {siteSettings?.heroSubtitle ||
                'The ultimate competitive Minecraft survival, skyblock, and minigames network with custom economy, custom bosses, and non-stop events.'}
            </p>
          </div>

          {/* Interactive Server IP & Connect Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 max-w-xl mx-auto">
            {/* Copy Server IP Box */}
            <button
              onClick={copyIp}
              className="w-full sm:w-auto flex-1 flex items-center justify-between gap-4 bg-slate-900/90 hover:bg-slate-800 border-2 border-emerald-500/50 hover:border-emerald-400 px-5 py-4 rounded-2xl shadow-xl shadow-emerald-950/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950/80 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Server className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                    CLICK TO COPY SERVER IP
                  </div>
                  <div className="text-base sm:text-lg font-mono font-black text-white group-hover:text-emerald-300 transition-colors">
                    {serverIp}{serverPort && serverPort !== 25565 ? `:${serverPort}` : ''}
                  </div>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                {copied ? <Check className="w-5 h-5 text-emerald-400 group-hover:text-white" /> : <Copy className="w-5 h-5" />}
              </div>
            </button>

            {/* Store CTA */}
            <button
              onClick={() => setCurrentTab('store')}
              className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Explore Store</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {copied && (
            <div className="text-xs font-bold text-emerald-400 animate-bounce">
              ✓ Server IP copied to clipboard! Paste into your Minecraft multiplayer screen!
            </div>
          )}

          {/* Real Live Server Status Bar (Requirements 1, 2, 4, 7 - Zero fake players/counts) */}
          <div className="pt-6">
            <div className="inline-flex flex-wrap items-center justify-center gap-6 sm:gap-8 bg-slate-950/90 border border-slate-800/90 px-6 py-3.5 rounded-2xl backdrop-blur-md shadow-2xl">
              {/* Server Status Indicator */}
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                ) : isOffline ? (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-lg shadow-rose-500/50"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 animate-pulse"></span>
                )}

                <div className="text-left">
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    {isOnline ? (
                      <span className="text-emerald-400">Online</span>
                    ) : isOffline ? (
                      <span className="text-rose-400">Offline</span>
                    ) : (
                      <span className="text-amber-400">Status Unavailable</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {mcStatus?.serverType === 'bungeecord' ? 'Bungee Network' : 'Paper Server'}
                  </div>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-800 hidden sm:block" />

              {/* Real Online Players Count */}
              <div className="text-left">
                <div className="text-sm font-black text-white">
                  {isOnline ? (
                    <>
                      <span className="text-emerald-300 font-mono">{mcStatus?.players?.online ?? 0}</span>
                      <span className="text-slate-500 text-xs font-normal"> / {mcStatus?.players?.max ?? 0}</span>
                    </>
                  ) : (
                    <span className="text-slate-500 font-mono">0 / 0</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>Real Online Players</span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-800 hidden sm:block" />

              {/* Minecraft Server Version */}
              <div className="text-left">
                <div className="text-sm font-black text-slate-200 truncate max-w-[140px]">
                  {mcStatus?.version?.name || (isOnline ? 'Paper / 1.20 - 1.21.x' : 'Paper')}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Minecraft Version
                </div>
              </div>

              <div className="h-6 w-px bg-slate-800 hidden sm:block" />

              {/* Real Ping / Latency or Refresh */}
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="text-sm font-black text-amber-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      {isOnline && typeof mcStatus?.latency === 'number'
                        ? `${mcStatus.latency}ms`
                        : isOnline
                        ? 'Active'
                        : isOffline
                        ? 'Offline'
                        : 'Unreachable'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Latency
                  </div>
                </div>

                <button
                  onClick={() => fetchStatus(true)}
                  disabled={isRefreshing}
                  title="Auto-refreshes every 30s. Click to refresh now."
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors border border-slate-800"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Server Network & Live Players (Requirements 1, 2, 4, 5, 7, 9, 11) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Live Minecraft Status
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  (Auto-refreshes every 30s)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>{mcStatus?.serverType === 'bungeecord' ? 'BungeeCord Network Hub' : 'Paper Server Status'}</span>
                {isOnline ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold normal-case">
                    Online
                  </span>
                ) : isOffline ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold normal-case">
                    Offline
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold normal-case">
                    Unavailable
                  </span>
                )}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-mono text-slate-300 font-bold">
                  {serverIp}{serverPort && serverPort !== 25565 ? `:${serverPort}` : ''}
                </div>
                <div className="text-[10px] text-slate-500">
                  {mcStatus?.lastUpdated ? `Checked at ${new Date(mcStatus.lastUpdated).toLocaleTimeString()}` : 'Live Query'}
                </div>
              </div>

              <button
                onClick={() => fetchStatus(true)}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* MOTD / Status Banner */}
          {mcStatus?.motd?.clean && (
            <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl font-mono text-xs text-slate-300 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{mcStatus.motd.clean}</span>
            </div>
          )}

          {/* BungeeCord Sub-Servers Status Grid (Requirement 11) */}
          {mcStatus?.serverType === 'bungeecord' && mcStatus.networkServers && mcStatus.networkServers.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-teal-400" />
                <span>Network Sub-Servers ({mcStatus.networkServers.length} Connected Realms)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {mcStatus.networkServers.map((srv) => (
                  <div
                    key={srv.id || srv.name}
                    className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{srv.name}</span>
                      <span className={`w-2 h-2 rounded-full ${srv.online ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-500'}`} />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {srv.ip}:{srv.port}
                    </div>
                    <div className="text-xs font-bold text-slate-300">
                      {srv.online ? (
                        <span className="text-emerald-400 font-mono">{srv.players.online} Players</span>
                      ) : (
                        <span className="text-rose-400 font-mono">Offline</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Online Players List (Requirement 4, 5, 9) */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>
                  Online Players ({isOnline ? (mcStatus?.players?.online ?? 0) : 0}
                  {isOnline && mcStatus?.players?.max ? ` / ${mcStatus.players.max}` : ''})
                </span>
              </div>

              {isOnline && (mcStatus?.players?.online ?? 0) > 0 && (
                <span className="text-[11px] text-emerald-400 font-bold">
                  ✓ Verified Live from Paper Server
                </span>
              )}
            </div>

            {/* If Online and Players List Available */}
            {isOnline && mcStatus?.players?.list && mcStatus.players.list.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {mcStatus.players.list.map((player, idx) => (
                  <div
                    key={`${player.name}-${idx}`}
                    className="p-2.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl transition-all flex items-center gap-3 group"
                  >
                    <img
                      src={`https://mc-heads.net/avatar/${player.name}/48`}
                      alt={player.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/48';
                      }}
                      className="w-8 h-8 rounded-lg shadow-sm border border-slate-700 group-hover:scale-105 transition-transform shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                        {player.name}
                      </div>
                      <div className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>In-Game</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : isOnline && (mcStatus?.players?.online ?? 0) > 0 ? (
              /* When Server Query Reports Online Count but Hide-Players sample is active in Paper properties */
              <div className="p-6 bg-slate-950/50 border border-slate-800/80 rounded-2xl text-center space-y-2">
                <div className="inline-flex p-3 rounded-xl bg-emerald-950/50 text-emerald-400 border border-emerald-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-white">
                  {mcStatus?.players?.online} Player{(mcStatus?.players?.online ?? 0) > 1 ? 's' : ''} Currently Playing
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Live player count reported directly from your Paper server. Connect to {serverIp} to play alongside them!
                </p>
              </div>
            ) : isOnline ? (
              /* Online but 0 players */
              <div className="p-6 bg-slate-950/50 border border-slate-800/80 rounded-2xl text-center space-y-2">
                <div className="inline-flex p-3 rounded-xl bg-slate-800 text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-slate-300">
                  0 Players Currently Online
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  The server is running smoothly! Copy <span className="text-emerald-400 font-mono">{serverIp}</span> into Minecraft to be the first player on the realm.
                </p>
              </div>
            ) : isOffline ? (
              /* Explicitly Offline */
              <div className="p-6 bg-rose-950/20 border border-rose-900/40 rounded-2xl text-center space-y-2">
                <div className="inline-flex p-3 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-500/20">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-white">
                  Paper Minecraft Server is Currently Offline
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No fake players or demo data are shown. Once you start your Paper server on {serverIp}:{serverPort}, this live widget will update automatically every 30 seconds.
                </p>
              </div>
            ) : (
              /* Status Unavailable */
              <div className="p-6 bg-amber-950/20 border border-amber-900/40 rounded-2xl text-center space-y-2">
                <div className="inline-flex p-3 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-500/20">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-white">
                  Server Status Query Unavailable
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Could not reach {serverIp}:{serverPort}. Verify that your server IP, port, and DNS/firewall settings are configured in the Owner Dashboard.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Gamemodes Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Choose Your Adventure
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Popular BeastMC Realms
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            High performance dedicated hardware, custom plugins, zero pay-to-win mechanics, and 100% manual payment order guarantees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Survival SMP */}
          <div className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 space-y-4 hover:translate-y-[-4px] transition-all group shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Pickaxe className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Realm 1</div>
              <h3 className="text-xl font-bold text-white mt-0.5">Survival SMP</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Custom land claiming, player economy, dungeons, daily quests, and balanced PvP arenas with anti-cheat.
            </p>
            <div className="pt-2 text-xs font-mono text-emerald-300 font-bold flex items-center gap-1">
              <span>/server smp</span>
              <ArrowRight className="w-3 h-3 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* SkyBlock */}
          <div className="bg-slate-900/60 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 space-y-4 hover:translate-y-[-4px] transition-all group shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-teal-950 border border-teal-700/50 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">Realm 2</div>
              <h3 className="text-xl font-bold text-white mt-0.5">SkyBlock Titan</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Build your custom floating kingdom, level up minions, slay void dragons, and compete on the $500 monthly island top.
            </p>
            <div className="pt-2 text-xs font-mono text-teal-300 font-bold flex items-center gap-1">
              <span>/server skyblock</span>
              <ArrowRight className="w-3 h-3 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* BedWars */}
          <div className="bg-slate-900/60 border border-slate-800 hover:border-red-500/50 rounded-2xl p-6 space-y-4 hover:translate-y-[-4px] transition-all group shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-red-950 border border-red-700/50 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
              <Sword className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider">Realm 3</div>
              <h3 className="text-xl font-bold text-white mt-0.5">BedWars Arena</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fast paced tactical competitive Bedwars with custom kill sounds, custom shopkeeper skins, and seasonal leaderboard crowns.
            </p>
            <div className="pt-2 text-xs font-mono text-red-300 font-bold flex items-center gap-1">
              <span>/server bedwars</span>
              <ArrowRight className="w-3 h-3 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Prison */}
          <div className="bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 space-y-4 hover:translate-y-[-4px] transition-all group shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-amber-950 border border-amber-700/50 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Realm 4</div>
              <h3 className="text-xl font-bold text-white mt-0.5">OP Prison</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mine from Rank A to Free, enchant your pickaxes with explosive enchants, unlock gang vaults, and dominate the mines.
            </p>
            <div className="pt-2 text-xs font-mono text-amber-300 font-bold flex items-center gap-1">
              <span>/server prison</span>
              <ArrowRight className="w-3 h-3 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Store Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              BeastMC Network Store
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Featured Ranks & Perks
            </h2>
          </div>
          <button
            onClick={() => setCurrentTab('store')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All Products</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((p) => {
            let perks: string[] = [];
            try {
              perks = JSON.parse(p.perks);
            } catch {
              perks = [];
            }

            return (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all group shadow-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-slate-950 font-mono"
                      style={{ backgroundColor: p.color || '#10b981' }}
                    >
                      {p.badge || p.category}
                    </span>
                    {p.originalPrice && (
                      <span className="text-xs text-slate-500 line-through">
                        ${(p.originalPrice / 100).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    {perks.slice(0, 3).map((perk, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xl font-black text-white">
                    ${(p.price / 100).toFixed(2)}
                  </div>
                  <button
                    onClick={() => onSelectProduct(p)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Purchase</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Manual Payment & 24h Delivery Guarantee Notice */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              <Shield className="w-4 h-4" />
              <span>Safe & Transparent Process</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              100% Manual Payment Verification & 24-Hour Delivery Notice
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We support unlimited manual payment options including direct Bank Wire, IBAN, EasyPaisa, JazzCash, PayPal Friends & Family, and Crypto USDT. Every order receipt is reviewed manually by staff. Once approved, your order is tracked with a 24-hour delivery guarantee and an official delivery confirmation email from BeastMC Support.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <button
                onClick={() => setCurrentTab('ranks')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
              >
                Browse VIP & Beast Ranks
              </button>
              <button
                onClick={() => setCurrentTab('coins')}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 transition-all"
              >
                Buy Beast Coins
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
