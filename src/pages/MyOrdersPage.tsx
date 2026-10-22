import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Order, OrderHistoryItem } from '../types.ts';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  RefreshCw,
  Calendar,
  CreditCard,
  Crown,
  Coins,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  History,
  Copy,
  Check,
  Info,
} from 'lucide-react';

interface MyOrdersPageProps {
  setCurrentTab: (tab: string) => void;
}

export type CanonicalPlayerOrderStatus =
  | 'PENDING'
  | 'PAYMENT_VERIFIED'
  | 'AWAITING_DELIVERY'
  | 'REJECTED'
  | 'COMPLETED';

export interface PlayerStatusConfig {
  statusKey: CanonicalPlayerOrderStatus;
  displayTitle: string;
  badgeClass: string;
  dotColor: string;
  explanation: string;
  details: string;
}

export function getStatusConfig(order: Order, formatDate: (d: string) => string): PlayerStatusConfig {
  const raw = (order.status || '').toLowerCase().trim();

  // 1. REJECTED (Payment or order rejected by Owner)
  if (raw === 'rejected' || raw === 'payment rejected') {
    return {
      statusKey: 'REJECTED',
      displayTitle: 'Rejected',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
      dotColor: 'bg-red-500',
      explanation: 'Payment or order rejected by Owner.',
      details: order.rejectionReason
        ? `Rejection Reason: ${order.rejectionReason}`
        : 'Payment transaction verification failed. Please check your transaction ID or receipt and contact support.',
    };
  }

  // 2. COMPLETED (Owner has confirmed manual delivery)
  if (raw === 'completed' || raw === 'delivered') {
    return {
      statusKey: 'COMPLETED',
      displayTitle: 'Completed',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dotColor: 'bg-emerald-500',
      explanation: 'Owner has confirmed manual delivery.',
      details: `Your order has been fulfilled by the Owner${
        order.deliveredAt ? ` on ${formatDate(order.deliveredAt)}` : ''
      }. Connect to play.beastmc.net to use your rank/items.`,
    };
  }

  // 3. AWAITING DELIVERY (Payment approved. Owner will manually deliver the Minecraft product)
  if (raw === 'awaiting delivery' || raw === 'delivery pending' || raw === 'approved') {
    return {
      statusKey: 'AWAITING_DELIVERY',
      displayTitle: 'Awaiting Delivery',
      badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      dotColor: 'bg-orange-500',
      explanation: 'Payment approved. Owner will manually deliver the Minecraft product.',
      details:
        order.deliveryNotice ||
        'Payment approved. The Server Owner will manually fulfill and dispatch your Minecraft rank or coins within 24 hours.',
    };
  }

  // 4. PAYMENT VERIFIED (Owner has verified the payment)
  if (raw === 'payment verified' || (order.paymentVerified === 1 && raw.includes('pending'))) {
    return {
      statusKey: 'PAYMENT_VERIFIED',
      displayTitle: 'Payment Verified',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      dotColor: 'bg-blue-500',
      explanation: 'Owner has verified the payment.',
      details:
        'Your submitted payment evidence has been successfully verified by the Owner. Your order is queued for manual delivery.',
    };
  }

  // 5. PENDING (Payment submitted and awaiting review)
  return {
    statusKey: 'PENDING',
    displayTitle: 'Pending',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dotColor: 'bg-amber-400',
    explanation: 'Payment submitted and awaiting review.',
    details:
      'Payment submitted and awaiting review. BeastMC staff will manually check your transaction ID and bank receipt before approving delivery.',
  };
}

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ setCurrentTab }) => {
  const { user, token, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedHistoryOrderIds, setExpandedHistoryOrderIds] = useState<number[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchMyOrders = async (showLoadingSpinner = true) => {
    if (!token) return;
    try {
      if (showLoadingSpinner) setRefreshing(true);
      const res = await fetch('/api/orders/my', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to load orders from database:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch and automatic polling for real-time status updates from Owner Dashboard
  useEffect(() => {
    fetchMyOrders(false);

    // Automatic status updates: poll real database every 10 seconds
    const interval = setInterval(() => {
      fetchMyOrders(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  const handleManualRefresh = () => {
    fetchMyOrders(true);
  };

  const toggleHistory = (orderId: number) => {
    setExpandedHistoryOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleCopyOrderCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Helper to calculate remaining time from 24h deadline
  const getRemainingTime = (approvedAtStr?: string) => {
    if (!approvedAtStr) return null;
    const deadline = new Date(approvedAtStr).getTime() + 24 * 60 * 60 * 1000;
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) {
      return 'Fulfillment window ending soon';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining in 24h window`;
  };

  // Format date helper with time
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  // Parse order history safely
  const parseOrderHistory = (historyJson?: string): OrderHistoryItem[] => {
    if (!historyJson) return [];
    try {
      const parsed = JSON.parse(historyJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
          Verifying session & loading orders...
        </p>
      </div>
    );
  }

  // Unauthenticated guard
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-5 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
          <Package className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Sign In to View My Orders
          </h2>
          <p className="text-xs text-slate-400">
            Please log in with your BeastMC account to view your purchase history, live order statuses, and manual delivery progress.
          </p>
        </div>
        <button
          onClick={() => setCurrentTab('login')}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <span>Sign In or Register</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Player Order Status Tracking</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            My Orders
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status tracking for Minecraft account <strong className="text-emerald-400 font-mono">"{user.minecraftUsername}"</strong>. All status updates update automatically from the database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md"
            title="Refresh order statuses from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{refreshing ? 'Checking...' : 'Refresh Status'}</span>
          </button>

          <button
            onClick={() => setCurrentTab('store')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>BeastMC Store</span>
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Loading your orders from the database...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Orders Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't placed any store orders yet. Browse our ranks, coins, and keys to gear up on BeastMC Network!
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('store')}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            Browse BeastMC Store
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const config = getStatusConfig(order, formatDate);
            const historyItems = parseOrderHistory(order.orderHistory);
            const isHistoryExpanded = expandedHistoryOrderIds.includes(order.id);
            const deadlineRemaining =
              config.statusKey === 'AWAITING_DELIVERY' && order.approvedAt
                ? getRemainingTime(order.approvedAt)
                : null;

            return (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 transition-all shadow-xl space-y-5 relative overflow-hidden"
              >
                {/* 1. Header: Order ID, Date, Last Status Update & Current Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Order ID
                      </span>
                      <button
                        onClick={() => handleCopyOrderCode(order.orderCode)}
                        className="font-mono font-black text-lg text-amber-400 hover:text-amber-300 flex items-center gap-1.5 group transition-colors"
                        title="Click to copy Order ID"
                      >
                        <span>#{order.orderCode}</span>
                        {copiedCode === order.orderCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Order Date: <strong>{formatDate(order.createdAt)}</strong></span>
                      </span>
                      <span className="text-slate-600 hidden sm:inline">&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Last Update: <strong>{formatDate(order.updatedAt || order.createdAt)}</strong></span>
                      </span>
                    </div>
                  </div>

                  {/* 3. ORDER STATUS BADGE (Pending: Yellow, Payment Verified: Blue, Awaiting Delivery: Orange, Rejected: Red, Completed: Green) */}
                  <div className="flex flex-col items-start sm:items-end gap-1">
                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 border shadow-sm ${config.badgeClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
                      <span>{config.displayTitle}</span>
                    </div>
                  </div>
                </div>

                {/* 1. ORDER DETAILS GRID (Product Name, Minecraft Username, Order Amount, Payment Method) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* Product Name */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                      {order.packageType?.includes('Coin') ? (
                        <Coins className="w-3 h-3 text-yellow-400" />
                      ) : (
                        <Crown className="w-3 h-3 text-amber-400" />
                      )}
                      <span>Product Name</span>
                    </div>
                    <div className="font-bold text-white text-sm truncate" title={order.productName}>
                      {order.productName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Category: {order.productCategory || 'In-Game Package'}
                    </div>
                  </div>

                  {/* Minecraft Username */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">
                      Minecraft Username
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://mc-heads.net/avatar/${order.minecraftUsername}/24`}
                        alt="IGN"
                        className="w-6 h-6 rounded bg-slate-900 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="font-mono font-bold text-emerald-400 text-sm truncate">
                        {order.minecraftUsername}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Player IGN
                    </div>
                  </div>

                  {/* Order Amount */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">
                      Order Amount
                    </div>
                    <div className="font-black text-emerald-400 text-base">
                      ${(order.amount / 100).toFixed(2)}{' '}
                      <span className="text-slate-400 font-normal text-xs">{order.currency || 'USD'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      TID: {order.transactionId}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-slate-400" />
                      <span>Payment Method</span>
                    </div>
                    <div className="font-bold text-slate-200 text-sm truncate" title={order.paymentMethodName}>
                      {order.paymentMethodName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Manual Bank / Mobile Transfer
                    </div>
                  </div>
                </div>

                {/* 3 & 5 & 6. STATUS EXPLANATION BANNER (Distinct per status) */}
                <div
                  className={`rounded-xl p-4 text-xs space-y-2 border ${
                    config.statusKey === 'PENDING'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : config.statusKey === 'PAYMENT_VERIFIED'
                      ? 'bg-blue-950/20 border-blue-500/30'
                      : config.statusKey === 'AWAITING_DELIVERY'
                      ? 'bg-orange-950/20 border-orange-500/30'
                      : config.statusKey === 'COMPLETED'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-red-950/20 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {config.statusKey === 'PENDING' && <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
                      {config.statusKey === 'PAYMENT_VERIFIED' && <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />}
                      {config.statusKey === 'AWAITING_DELIVERY' && <Clock className="w-4 h-4 text-orange-400 shrink-0 animate-spin" />}
                      {config.statusKey === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {config.statusKey === 'REJECTED' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}

                      <span
                        className={
                          config.statusKey === 'PENDING'
                            ? 'text-amber-300'
                            : config.statusKey === 'PAYMENT_VERIFIED'
                            ? 'text-blue-300'
                            : config.statusKey === 'AWAITING_DELIVERY'
                            ? 'text-orange-300'
                            : config.statusKey === 'COMPLETED'
                            ? 'text-emerald-300'
                            : 'text-red-300'
                        }
                      >
                        {config.explanation}
                      </span>
                    </div>

                    {deadlineRemaining && (
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-900/40 text-orange-300 font-mono text-[11px] font-bold border border-orange-700/50">
                        {deadlineRemaining}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    {config.details}
                  </p>

                  {/* 5. REJECTION REASON DISPLAY */}
                  {config.statusKey === 'REJECTED' && order.rejectionReason && (
                    <div className="mt-2 p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-xs space-y-1">
                      <span className="font-bold text-red-400 uppercase tracking-wider text-[10px] block">
                        Rejection Reason from Owner:
                      </span>
                      <p className="text-slate-200 font-medium">{order.rejectionReason}</p>
                      <p className="text-[11px] text-slate-400 pt-1">
                        If this order was rejected by mistake, the Server Owner can reopen the order. Once reopened, its status will automatically update to <strong>Pending Review</strong>.
                      </p>
                    </div>
                  )}

                  {/* 6. MANUAL DELIVERY NOTICE */}
                  {config.statusKey === 'AWAITING_DELIVERY' && (
                    <div className="pt-2 border-t border-orange-500/20 text-[11px] text-orange-300/80 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                      <span>
                        <strong>Manual Delivery Note:</strong> Products are delivered manually by the Server Owner. The order will be marked as Completed after successful in-game fulfillment.
                      </span>
                    </div>
                  )}

                  {/* COMPLETED INSTRUCTIONS */}
                  {config.statusKey === 'COMPLETED' && (
                    <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-300/80 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>
                        <strong>In-Game Activation:</strong> Log into <strong>play.beastmc.net</strong> on Minecraft. Type <code>/claim</code> or check your rank perks in tab list!
                      </span>
                    </div>
                  )}
                </div>

                {/* 7. ORDER HISTORY & STATUS TIMELINE TOGGLE */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    <span>Order History: <strong>{historyItems.length} milestone(s) recorded</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleHistory(order.id)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <span>{isHistoryExpanded ? 'Hide History Timeline' : 'View Order History Timeline'}</span>
                    {isHistoryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* 7. EXPANDED ORDER HISTORY TIMELINE */}
                {isHistoryExpanded && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 animate-in fade-in">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      <span>Audit & Status Change Timeline</span>
                    </div>

                    {historyItems.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No historical changes recorded yet.</p>
                    ) : (
                      <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                        {historyItems.map((item, idx) => (
                          <div key={idx} className="relative pl-8 text-xs space-y-1">
                            <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-amber-500 -translate-x-1/2" />
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-xs">{item.action}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                &bull; {formatDate(item.timestamp)}
                              </span>
                              {item.adminEmail && (
                                <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                                  {item.adminEmail === 'System' ? 'System' : 'Staff Action'}
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-slate-400 text-[11px] leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                                {item.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
