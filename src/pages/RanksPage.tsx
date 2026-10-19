import React, { useState, useEffect } from 'react';
import { Product } from '../types.ts';
import {
  Crown,
  Check,
  ShoppingBag,
} from 'lucide-react';

interface RanksPageProps {
  onSelectProduct: (product: Product) => void;
}

export const RanksPage: React.FC<RanksPageProps> = ({ onSelectProduct }) => {
  const [ranks, setRanks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resRanks = await fetch('/api/products?category=rank');
        if (resRanks.ok) {
          const ranksData = await resRanks.json();
          setRanks(ranksData);
        }
      } catch (err) {
        console.error('Failed to load ranks:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
          <Crown className="w-4 h-4" />
          <span>Lifetime Server Ranks</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          BeastMC Official Ranks
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Stand out in chat, bypass server queues, access private player vaults, and unlock game-changing survival and skyblock privileges. All ranks are permanent one-time purchases.
        </p>
      </div>

      {/* Ranks Tier Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading ranks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ranks.map((rank) => {
            let perks: string[] = [];
            try {
              perks = JSON.parse(rank.perks);
            } catch {
              perks = [];
            }

            const isHighTier = rank.slug === 'beast-rank' || rank.slug === 'overlord-rank';

            return (
              <div
                key={rank.id}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all relative shadow-2xl group ${
                  isHighTier
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/50 hover:border-emerald-400'
                    : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Glow highlight */}
                {isHighTier && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg">
                    {rank.badge || 'SIGNATURE TIER'}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="text-xs font-black uppercase tracking-wider"
                        style={{ color: rank.color || '#10b981' }}
                      >
                        {rank.badge || 'PERMANENT'}
                      </div>
                      <h2 className="text-2xl font-black text-white mt-1 group-hover:text-emerald-400 transition-colors">
                        {rank.name}
                      </h2>
                    </div>

                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-950 font-bold shadow-lg"
                      style={{ backgroundColor: rank.color || '#10b981' }}
                    >
                      <Crown className="w-6 h-6 text-slate-950" />
                    </div>
                  </div>

                  {/* Price */}
                  <div className="border-y border-slate-800/80 py-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        ${(rank.price / 100).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">USD / One-time</span>
                      {rank.originalPrice && (
                        <span className="text-sm text-slate-500 line-through ml-auto">
                          ${(rank.originalPrice / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {rank.description}
                    </p>
                  </div>

                  {/* Perks list */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Included Privileges:
                    </div>
                    <div className="space-y-2.5">
                      {perks.map((perk, i) => (
                        <div key={i} className="text-xs text-slate-300 flex items-start gap-2.5">
                          <div
                            className="p-0.5 rounded-full mt-0.5"
                            style={{ backgroundColor: `${rank.color || '#10b981'}20` }}
                          >
                            <Check
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: rank.color || '#10b981' }}
                            />
                          </div>
                          <span className="leading-tight">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-6">
                  <button
                    onClick={() => onSelectProduct(rank)}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Purchase {rank.name}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


