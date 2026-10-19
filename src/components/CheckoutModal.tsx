import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Product, PaymentMethod, Order } from '../types.ts';
import {
  X,
  ShieldCheck,
  CreditCard,
  Upload,
  Copy,
  Check,
  QrCode,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Lock,
} from 'lucide-react';

interface CheckoutModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: (order: Order) => void;
  onGoToLogin: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  product,
  onClose,
  onSuccess,
  onGoToLogin,
}) => {
  const { user, token } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [minecraftUsername, setMinecraftUsername] = useState<string>(user?.minecraftUsername || '');
  const [transactionId, setTransactionId] = useState<string>('');
  const [senderNote, setSenderNote] = useState<string>('');
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user?.minecraftUsername) {
      setMinecraftUsername(user.minecraftUsername);
    }
  }, [user]);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const res = await fetch('/api/payment-methods');
        if (res.ok) {
          const data = await res.json();
          setPaymentMethods(data);
          if (data.length > 0) {
            setSelectedMethodId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load payment methods:', err);
      }
    };
    fetchMethods();
  }, []);

  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Screenshot file size must be less than 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !selectedMethodId || !token) return;

    if (!minecraftUsername.trim()) {
      setError('Minecraft username is required for delivery');
      return;
    }

    if (!transactionId.trim()) {
      setError('Please provide the transaction ID / receipt reference number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          minecraftUsername: minecraftUsername.trim(),
          paymentMethodId: selectedMethodId,
          transactionId: transactionId.trim(),
          senderNote: senderNote.trim(),
          paymentScreenshotUrl: screenshotData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit order');
      }

      setCompletedOrder(data.order);
      onSuccess(data.order);
    } catch (err: any) {
      setError(err.message || 'Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  // Not logged in guard
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider">Login Required</h3>
            <p className="text-sm text-slate-400 mt-2">
              You must be logged in to purchase <strong className="text-emerald-400">{product.name}</strong> ($
              {(product.price / 100).toFixed(2)}) so your orders are tracked and delivered to your Minecraft account.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => {
                onClose();
                onGoToLogin();
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In or Register</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success view
  if (completedOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
            <Check className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <div className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Pending Manual Payment Verification
            </div>
            <h3 className="text-2xl font-black text-white">Order Submitted!</h3>
            <p className="text-sm text-slate-300">
              Thank you, <strong className="text-emerald-400">{completedOrder.minecraftUsername}</strong>. Your order has been placed successfully.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Order ID:</span>
              <span className="font-mono font-bold text-emerald-400">#{completedOrder.orderCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Product:</span>
              <span className="font-semibold text-white">{completedOrder.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Method:</span>
              <span className="text-slate-200">{completedOrder.paymentMethodName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Transaction ID:</span>
              <span className="font-mono text-slate-300">{completedOrder.transactionId}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-900/40 text-xs text-slate-300 flex items-start gap-3 text-left">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white mb-0.5">What happens next?</div>
              <p className="text-slate-400 leading-relaxed">
                BeastMC Staff will manually check your transaction reference. Once approved, the status will change to <strong>Delivery Pending</strong> (with 24h delivery guarantee notice) and you will receive an official confirmation email from BeastMC Support upon in-game fulfillment.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Go to Player Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate local currency if available
  const exchangeRate = parseFloat(selectedMethod?.exchangeRate || '1.0');
  const usdPrice = product.price / 100;
  const localPrice = (usdPrice * exchangeRate).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-2xl w-full my-8 p-6 sm:p-8 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-12 h-12 object-cover rounded-xl border border-emerald-500/30 bg-slate-950 shrink-0"
              />
            )}
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Manual Payment Checkout
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {product.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="space-y-6">
          {/* Step 1: Minecraft Username Confirmation */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Step 1: Confirm In-Game Minecraft Username
            </label>
            <div className="flex items-center gap-3">
              <img
                src={`https://mc-heads.net/avatar/${minecraftUsername || 'Steve'}/48`}
                alt="Avatar"
                className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 p-1"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="flex-1">
                <input
                  type="text"
                  required
                  value={minecraftUsername}
                  onChange={(e) => setMinecraftUsername(e.target.value)}
                  placeholder="e.g. ProMiner99"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Items and ranks will be credited directly to this Minecraft username.
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Choose Payment Method */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Step 2: Choose Manual Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {paymentMethods.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setSelectedMethodId(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedMethodId === m.id
                      ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className={`w-4 h-4 ${selectedMethodId === m.id ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold">{m.name}</span>
                  </div>
                  {selectedMethodId === m.id && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Payment Instructions & Details */}
          {selectedMethod && (
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase">Transfer Amount:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400">
                    ${usdPrice.toFixed(2)} USD
                  </span>
                  {selectedMethod.currency !== 'USD' && (
                    <span className="text-xs text-slate-400 block font-mono">
                      &asymp; {localPrice} {selectedMethod.currency}
                    </span>
                  )}
                </div>
              </div>

              {/* Account details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400">Account Title:</span>
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>{selectedMethod.accountTitle}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedMethod.accountTitle, 'title')}
                      className="text-slate-400 hover:text-emerald-400"
                    >
                      {copiedKey === 'title' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400">Account / Wallet / Phone:</span>
                  <div className="font-mono font-bold text-emerald-400 flex items-center justify-between">
                    <span>{selectedMethod.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedMethod.accountNumber, 'acc')}
                      className="text-slate-400 hover:text-emerald-400"
                    >
                      {copiedKey === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {selectedMethod.iban && (
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1 sm:col-span-2">
                    <span className="text-slate-400">IBAN:</span>
                    <div className="font-mono font-bold text-white flex items-center justify-between">
                      <span className="truncate mr-2">{selectedMethod.iban}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedMethod.iban!, 'iban')}
                        className="text-slate-400 hover:text-emerald-400 shrink-0"
                      >
                        {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code if exists */}
              {selectedMethod.qrCodeUrl && (
                <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <img
                    src={selectedMethod.qrCodeUrl}
                    alt="Payment QR"
                    className="w-20 h-20 bg-white p-1 rounded-lg shrink-0 object-contain"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span>Scan & Pay with Mobile Banking App</span>
                    </div>
                    <p className="text-slate-400 mt-1">
                      Scan this QR code using your banking or crypto app for instant payment destination autofill.
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="text-xs text-slate-300 whitespace-pre-line bg-slate-900/60 p-3 rounded-lg border border-slate-800 leading-relaxed">
                <span className="font-bold text-emerald-400 block mb-1">Transfer Instructions:</span>
                {selectedMethod.instructions}
              </div>
            </div>
          )}

          {/* Step 4: Submit Payment Proof */}
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Step 3: Enter Transaction ID & Upload Proof
            </label>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Transaction ID / Reference Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. TID-984019284 or Bank Ref # or TxHash"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Payment Screenshot / Receipt
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>{screenshotData ? 'Change Screenshot' : 'Upload Receipt Screenshot'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {screenshotData && (
                  <div className="flex items-center gap-2">
                    <img
                      src={screenshotData}
                      alt="Preview"
                      className="w-10 h-10 object-cover rounded-md border border-emerald-500"
                    />
                    <span className="text-xs text-emerald-400 font-semibold">Attached</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Optional Sender Note / Remarks
              </label>
              <input
                type="text"
                value={senderNote}
                onChange={(e) => setSenderNote(e.target.value)}
                placeholder="e.g. Sent from John's Account / HBL App"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Submitting Order...</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Submit Order for Verification</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Our staff will verify your payment details manually and approve your order.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
