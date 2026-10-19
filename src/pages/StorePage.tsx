import React, { useState, useEffect } from 'react';
import { Product, SiteSettings } from '../types.ts';
import {
  ShoppingBag,
  Search,
  Check,
  Crown,
  Coins,
  Package,
  Key,
  Shield,
  Info,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface StorePageProps {
  onSelectProduct: (product: Product) => void;
  siteSettings?: SiteSettings | null;
}

export const StorePage: React.FC<StorePageProps> = ({ onSelectProduct, siteSettings }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = [
    { id: 'all', name: 'All Items', icon: ShoppingBag },
    { id: 'rank', name: 'Server Ranks', icon: Crown },
    { id: 'coins', name: 'Beast Coins', icon: Coins },
    { id: 'crate', name: 'Crates & Keys', icon: Key },
    { id: 'bundle', name: 'Special Bundles', icon: Package },
  ];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Promotional / Event Network Banner */}
      {siteSettings?.bannerUrl && (
        <div className="rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl relative group">
          <img
            src={siteSettings.bannerUrl}
            alt="Store Promotional Banner"
            className="w-full h-32 sm:h-48 object-cover group-hover:scale-[1.01] transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/30">
              Featured Store Announcement
            </span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Official BeastMC Network Web Store</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Server Store & Perks
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Enhance your multiplayer experience with exclusive ranks, cosmetic coins, and booster bundles. All purchases directly fund server development and hosting.
        </p>
      </div>

      {/* Categories & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {categories.map((c) => {
            const IconComponent = c.icon;
            const active = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ranks, perks, coins..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading store catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="text-white font-bold text-lg">No products found</div>
          <p className="text-slate-400 text-xs">Try selecting a different category or adjusting your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => {
            let perks: string[] = [];
            try {
              perks = JSON.parse(p.perks);
            } catch {
              perks = [];
            }

            return (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all group shadow-xl hover:shadow-2xl hover:shadow-emerald-950/20"
              >
                <div className="space-y-4">
                  {p.imageUrl ? (
                    <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 group-hover:border-emerald-500/30 transition-colors">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-slate-950"
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

                  {/* Perks list */}
                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    {perks.slice(0, 4).map((perk, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{perk}</span>
                      </div>
                    ))}
                    {perks.length > 4 && (
                      <button
                        onClick={() => setDetailProduct(p)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 pt-1"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>View all {perks.length} perks</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Price</div>
                    <div className="text-2xl font-black text-white">
                      ${(p.price / 100).toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDetailProduct(p)}
                      className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                      title="View Details"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectProduct(p)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Perk Details Modal */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span
                  className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-slate-950"
                  style={{ backgroundColor: detailProduct.color || '#10b981' }}
                >
                  {detailProduct.badge || detailProduct.category}
                </span>
                <h3 className="text-xl font-black text-white mt-1">{detailProduct.name}</h3>
              </div>
              <button
                onClick={() => setDetailProduct(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailProduct.imageUrl && (
              <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <img
                  src={detailProduct.imageUrl}
                  alt={detailProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">{detailProduct.description}</p>

            <div className="space-y-2">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                All Included Features & In-Game Perks:
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-60 overflow-y-auto space-y-2.5">
                {(() => {
                  let perks: string[] = [];
                  try {
                    perks = JSON.parse(detailProduct.perks);
                  } catch {
                    perks = [];
                  }
                  return perks.map((perk, i) => (
                    <div key={i} className="text-xs text-slate-200 flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-2xl font-black text-white">
                ${(detailProduct.price / 100).toFixed(2)}
              </div>
              <button
                onClick={() => {
                  const p = detailProduct;
                  setDetailProduct(null);
                  onSelectProduct(p);
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
