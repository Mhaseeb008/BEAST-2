import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Order } from '../types.ts';
import {
  User as UserIcon,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  ExternalLink,
  Edit2,
  Check,
  X,
  Eye,
  Calendar,
  CreditCard,
  Mail,
  Search,
  Package,
  RefreshCw,
  Crown,
  Coins,
  ArrowRight,
} from 'lucide-react';

interface PlayerDashboardPageProps {
  setCurrentTab: (tab: string) => void;
}

export const PlayerDashboardPage: React.FC<PlayerDashboardPageProps> = ({ setCurrentTab }) => {
  const { user, token, updateProfile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Edit Minecraft IGN state
  const [editingIgn, setEditingIgn] = useState(false);
  const [newIgn, setNewIgn] = useState(user?.minecraftUsername || '');
  const [savingIgn, setSavingIgn] = useState(false);

  useEffect(() => {
    if (user?.minecraftUsername) {
      setNewIgn(user.minecraftUsername);
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/orders/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.warn('Failed to fetch player orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleSaveIgn = async () => {
    if (!newIgn.trim()) return;
    setSavingIgn(true);
    try {
      await updateProfile({ minecraftUsername: newIgn.trim() });
      setEditingIgn(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingIgn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
          Loading player profile...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <UserIcon className="w-12 h-12 text-slate-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Please Sign In</h2>
        <p className="text-xs text-slate-400">
          You must be logged in to view your player dashboard and active orders.
        </p>
        <button
          onClick={() => setCurrentTab('login')}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Profile Card Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Minecraft Avatar */}
          <div className="relative group">
            <img
              src={`https://mc-heads.net/avatar/${user.minecraftUsername || 'Steve'}/96`}
              alt="Player Skin"
              className="w-24 h-24 rounded-2xl bg-slate-950 border-2 border-emerald-500/50 p-1 shadow-xl group-hover:scale-105 transition-transform"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/96';
              }}
            />
            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-slate-950 text-[10px] font-bold text-emerald-400 border border-emerald-500/40">
              IGN
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {user.username}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {user.role}
              </span>
            </div>

            <div className="text-xs text-slate-400 flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Linked IGN:</span>
                {editingIgn ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newIgn}
                      onChange={(e) => setNewIgn(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono"
                    />
                    <button
                      onClick={handleSaveIgn}
                      disabled={savingIgn}
                      className="p-1 bg-emerald-600 rounded text-white"
                      title="Save"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setEditingIgn(false)}
                      className="p-1 bg-slate-800 rounded text-slate-400"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
                    <span>{user.minecraftUsername}</span>
                    <button
                      onClick={() => setEditingIgn(true)}
                      className="text-slate-500 hover:text-white"
                      title="Edit IGN"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-500">Email:</span>{' '}
                <span className="text-slate-300">{user.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex sm:flex-col gap-2">
            <button
              onClick={() => setCurrentTab('orders')}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              <span>My Orders</span>
            </button>
            <button
              onClick={() => setCurrentTab('store')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Browse Store</span>
            </button>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Orders</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              Order History & Delivery Tracking
            </h2>
            <p className="text-xs text-slate-400">
              Track your manual payment verification status and in-game delivery notices in real time.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Total Orders: <strong className="text-white">{orders.length}</strong>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="text-white font-bold">No Orders Placed Yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't purchased any ranks or coin packages yet. Browse our store to unlock in-game perks.
            </p>
            <button
              onClick={() => setCurrentTab('store')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Visit Store
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      #{order.orderCode}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleDateString()} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {order.status === 'Pending Payment Verification' && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Payment Verification</span>
                      </span>
                    )}
                    {order.status === 'Delivery Pending' && (
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Delivery Pending (Approved)</span>
                      </span>
                    )}
                    {order.status === 'Delivered' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </span>
                    )}
                    {order.status === 'Payment Rejected' && (
                      <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Payment Rejected</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Purchased Item</span>
                    <span className="font-bold text-white text-sm">{order.productName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Delivery Account</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {order.minecraftUsername}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Paid Amount</span>
                    <span className="font-bold text-white text-sm">
                      ${(order.amount / 100).toFixed(2)} {order.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Payment Method</span>
                    <span className="text-slate-300">{order.paymentMethodName}</span>
                  </div>
                </div>

                {/* 24-Hour Notice Banner (When status is Delivery Pending) */}
                {order.status === 'Delivery Pending' && (
                  <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/60 rounded-xl p-4 text-xs text-blue-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-blue-300">
                      <Clock className="w-4 h-4 text-blue-400 animate-spin" />
                      <span>24-Hour Delivery Notice Active</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Your manual payment was verified and approved by BeastMC Staff! Your order has been placed into the priority automated in-game delivery batch and will be delivered within 24 hours. Once marked delivered, an official BeastMC Support email will be dispatched to your inbox.
                    </p>
                  </div>
                )}

                {/* Delivered Notice */}
                {order.status === 'Delivered' && (
                  <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3.5 text-xs text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Order Delivered & Fulfilled on{' '}
                        {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'Recently'}!
                        Connect to <strong>play.beastmc.net</strong> to claim.
                      </span>
                    </div>
                    {order.deliveryEmailSent === 1 && (
                      <span className="text-[11px] text-emerald-400 font-mono font-bold shrink-0">
                        ✓ Support Email Sent
                      </span>
                    )}
                  </div>
                )}

                {/* Rejection Notice */}
                {order.status === 'Payment Rejected' && (
                  <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-3.5 text-xs text-red-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-red-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Rejection Notice from Staff</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      {order.rejectionReason || 'Your transaction reference could not be verified in our records.'}
                    </p>
                  </div>
                )}

                {/* Bottom Order Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-800/60">
                  <span className="font-mono">Reference TID: {order.transactionId}</span>
                  <button
                    onClick={() => setCurrentTab('orders')}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>View in My Orders Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
