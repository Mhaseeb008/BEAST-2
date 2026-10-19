import React, { useState, useEffect } from 'react';
import { Product } from '../types.ts';
import {
  Coins,
  Check,
  Sparkles,
  ShoppingBag,
  Zap,
  Flame,
  Gift,
  Shield,
  Smile,
  Tag,
} from 'lucide-react';

interface CoinsPageProps {
  onSelectProduct: (product: Product) => void;
}

export const CoinsPage: React.FC<CoinsPageProps> = ({ onSelectProduct }) => {
  const [coinProducts, setCoinProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const res = await fetch('/api/products?category=coins');
        if (res.ok) {
          const data = await res.json();
          setCoinProducts(data);
        }
      } catch (err) {
        console.error('Failed to load coins:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCoins();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-bold uppercase tracking-wider border border-yellow-500/30">
          <Coins className="w-4 h-4" />
          <span>In-Game Beast Currency</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Beast Coins & Currency Packs
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Stock up on Beast Coins to purchase cosmetic trails, pets, mystery crates, custom title suffixes, and economy boosters in-game.
        </p>
      </div>

      {/* Coin Packs Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading coin packs...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {coinProducts.map((p) => {
            let perks: string[] = [];
            try {
              perks = JSON.parse(p.perks);
            } catch {
              perks = [];
            }

            const isBestDeal = p.badge?.includes('POPULAR') || p.badge?.includes('50%');

            return (
              <div
                key={p.id}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all relative shadow-xl group ${
                  isBestDeal
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-2 border-yellow-500/50 hover:border-yellow-400'
                    : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.badge && (
                  <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-yellow-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                    {p.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-lg">
                    <Coins className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-white group-hover:text-yellow-400 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">
                        ${(p.price / 100).toFixed(2)}
                      </span>
                      {p.originalPrice && (
                        <span className="text-xs text-slate-500 line-through">
                          ${(p.originalPrice / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    {perks.map((perk, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800">
                  <button
                    onClick={() => onSelectProduct(p)}
                    className="w-full py-3 bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-600 hover:from-yellow-500 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                  >
                    <ShoppingBag className="w-4 h-4 text-slate-950" />
                    <span>Purchase Coins</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* What can you do with coins */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            How Can You Spend Beast Coins?
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Beast Coins are the premium universal cosmetic and convenience currency accepted across all BeastMC Network servers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <h3 className="text-sm font-bold text-white">Particle Auras</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Equip wings, halos, flame rings, and magical vortexes around your player avatar in hubs and survival claims.
            </p>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <Smile className="w-6 h-6 text-yellow-400" />
            <h3 className="text-sm font-bold text-white">Pet Companions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unlock miniature dragons, baby pandas, iron golems, and flying parrots that follow you anywhere you travel.
            </p>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <Tag className="w-6 h-6 text-yellow-400" />
            <h3 className="text-sm font-bold text-white">Custom Chat Titles</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Display unique RGB gradient titles before your player name like [COIN BARON], [WARLORD], or [PHANTOM].
            </p>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <Gift className="w-6 h-6 text-yellow-400" />
            <h3 className="text-sm font-bold text-white">Mystery Crate Keys</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Convert coins into Rare, Epic, and Mythic Crate keys at spawn for a chance at high-tier enchants and cosmetics.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
