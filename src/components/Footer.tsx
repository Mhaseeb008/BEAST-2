import React from 'react';
import { Shield, Heart, ExternalLink, Mail, MessageSquare } from 'lucide-react';
import { SiteSettings } from '../types.ts';

interface FooterProps {
  siteSettings: SiteSettings | null;
  setCurrentTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ siteSettings, setCurrentTab }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              {siteSettings?.logoUrl ? (
                <img
                  src={siteSettings.logoUrl}
                  alt="BeastMC Logo"
                  className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-slate-800 p-0.5"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                  <Shield className="w-5 h-5" />
                </div>
              )}
              <span className="text-lg font-black tracking-wider text-white uppercase">
                {siteSettings?.siteName || 'BeastMC Network'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The premier Minecraft server network featuring custom Survival SMP, competitive SkyBlock, BedWars tournaments, and an active global community.
            </p>
            <div className="text-xs text-emerald-400 font-mono">
              IP: {siteSettings?.serverIp || 'play.beastmc.net'}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentTab('home')} className="hover:text-emerald-400 transition-colors">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('store')} className="hover:text-emerald-400 transition-colors">
                  Official Store
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('ranks')} className="hover:text-emerald-400 transition-colors">
                  VIP & Overlord Ranks
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('coins')} className="hover:text-emerald-400 transition-colors">
                  Coins & In-Game Currency
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('dashboard')} className="hover:text-emerald-400 transition-colors">
                  Player Dashboard & Order History
                </button>
              </li>
            </ul>
          </div>

          {/* Payment & Guarantees */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Order Delivery & Support</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-emerald-400">
                <span>&bull; Manual Payment Verification</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span>&bull; 24-Hour Delivery Notice Guarantee</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span>&bull; BeastMC Support Official Email Dispatch</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <span>&bull; Bank, IBAN, EasyPaisa & Crypto Accepted</span>
              </li>
            </ul>
          </div>

          {/* Community & Contact */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Community & Help</h4>
            <div className="space-y-3">
              {siteSettings?.discordUrl && (
                <a
                  href={siteSettings.discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 text-indigo-300 hover:text-white transition-all text-xs font-semibold"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Join Discord Community</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                </a>
              )}

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">{siteSettings?.supportEmail || 'support@beastmc.net'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer / Notice */}
        <div className="mt-8 pt-8 border-t border-slate-900 text-[11px] text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-center md:text-left">
            BeastMC Network is not affiliated with Mojang Studios or Microsoft. All Minecraft content and materials are copyrights of Mojang Studios.
          </p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>&copy; {currentYear} {siteSettings?.siteName || 'BeastMC Network'}. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
