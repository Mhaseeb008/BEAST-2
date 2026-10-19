import React, { useState } from 'react';
import { X, Search, Clock, CheckCircle2, AlertTriangle, PackageCheck } from 'lucide-react';

interface TrackOrderModalProps {
  onClose: () => void;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({ onClose }) => {
  const [orderCode, setOrderCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim()) return;

    setLoading(true);
    setError(null);
    setOrderData(null);

    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(orderCode.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Order not found');
      }
      setOrderData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to track order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Track BeastMC Order</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTrack} className="flex gap-2">
          <input
            type="text"
            required
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            placeholder="Enter Order Code (e.g. BMC-2026-1042)"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        {orderData && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400">Order ID:</span>
                <span className="font-mono font-bold text-emerald-400 ml-2">#{orderData.orderCode}</span>
              </div>
              <div>
                {orderData.status === 'Pending Payment Verification' && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending Verification
                  </span>
                )}
                {orderData.status === 'Delivery Pending' && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
                    <PackageCheck className="w-3 h-3" />
                    Delivery Pending
                  </span>
                )}
                {orderData.status === 'Delivered' && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Delivered
                  </span>
                )}
                {orderData.status === 'Payment Rejected' && (
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Payment Rejected
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-400 block">Product:</span>
                <span className="font-semibold text-white">{orderData.productName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Minecraft Player:</span>
                <span className="font-mono text-emerald-400">{orderData.minecraftUsername}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Amount:</span>
                <span>${(orderData.amount / 100).toFixed(2)} {orderData.currency}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Method:</span>
                <span>{orderData.paymentMethodName}</span>
              </div>
            </div>

            {/* 24-Hour Notice if Approved */}
            {orderData.status === 'Delivery Pending' && (
              <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-lg text-blue-200">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>24-Hour Delivery Notice Active</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Your manual payment was verified and approved by BeastMC Administration! Your order is queued in the batch and will be active in-game within 24 hours. A BeastMC Support email will be dispatched once delivered.
                </p>
              </div>
            )}

            {/* Delivered confirmation */}
            {orderData.status === 'Delivered' && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-200">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Delivered & Fulfilled!</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Your item has been delivered in-game. Please log into <strong>play.beastmc.net</strong> and type <code>/claim</code>. An official confirmation email from BeastMC Support has been sent to your registered email.
                </p>
              </div>
            )}

            {/* Rejection note */}
            {orderData.status === 'Payment Rejected' && (
              <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-200">
                <div className="font-bold mb-1">Reason for Rejection:</div>
                <p className="text-slate-300 text-[11px]">
                  {orderData.rejectionReason || 'Invalid transaction receipt or unverified payment.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
