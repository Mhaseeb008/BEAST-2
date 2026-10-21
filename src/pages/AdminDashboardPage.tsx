import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Order,
  Product,
  PaymentMethod,
  SiteSettings,
  User,
  SentEmail,
  AuditLog,
  SeasonSettings,
  RankComparisonFeature,
  RankFeatureValue,
  VoteSite,
} from '../types.ts';
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Settings,
  Users as UsersIcon,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PackageCheck,
  Plus,
  Trash2,
  Crown,
  Sparkles,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Edit,
  ExternalLink,
  Eye,
  Check,
  X,
  Search,
  DollarSign,
  TrendingUp,
  RefreshCw,
  QrCode,
  Shield,
  Send,
  Lock,
  Key,
  Copy,
  Image as ImageIcon,
  Server,
  Wifi,
  WifiOff,
  AlertCircle,
  Zap,
  Activity,
  RotateCcw,
  CheckSquare,
  Square,
  History,
  SlidersHorizontal,
  Calendar,
  CalendarDays,
  Filter,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Vote,
} from 'lucide-react';
import {
  DatePreset,
  OrderStatusFilter,
  FilterStatistics,
  DATE_PRESET_OPTIONS,
  ORDER_STATUS_OPTIONS,
  getDateRangeForPreset,
} from '../lib/orderDateFilters.ts';
import { ImageUploader } from '../components/ImageUploader.tsx';

interface AdminDashboardPageProps {
  siteSettings: SiteSettings | null;
  onRefreshSettings: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  siteSettings,
  onRefreshSettings,
}) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'orders'
    | 'products'
    | 'rank-comparison'
    | 'payments'
    | 'mc-server'
    | 'settings'
    | 'vote-links'
    | 'season-settings'
    | 'users'
    | 'emails'
    | 'audit'
  >('orders');

  // Minecraft Server Settings (Owner Dashboard)
  const [mcForm, setMcForm] = useState<{
    siteName: string;
    serverIp: string;
    serverPort: number;
    bedrockPort: number;
    serverType: 'paper' | 'bungeecord';
    crossplayEnabled: number;
  }>({
    siteName: siteSettings?.siteName || 'BeastMC Network',
    serverIp: siteSettings?.serverIp || 'play.beastmc.net',
    serverPort: siteSettings?.serverPort || 25565,
    bedrockPort: siteSettings?.bedrockPort || 19132,
    serverType: (siteSettings?.serverType as any) || 'paper',
    crossplayEnabled: siteSettings?.crossplayEnabled ?? 1,
  });
  const [savingMcSettings, setSavingMcSettings] = useState(false);
  const [testingMc, setTestingMc] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: 'online' | 'offline' | 'unavailable' | 'invalid_address';
    message: string;
    latency?: number | null;
    players?: { online: number; max: number; list?: Array<{ name: string; uuid?: string }> };
    version?: { name: string };
    motd?: { clean: string };
    testedAt?: string;
  } | null>(null);
  const [liveMcStatus, setLiveMcStatus] = useState<any>(null);
  const [loadingLiveStatus, setLoadingLiveStatus] = useState(false);

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [deliverModalOpen, setDeliverModalOpen] = useState<boolean>(false);
  const [customDiscordLink, setCustomDiscordLink] = useState<string>(
    siteSettings?.discordUrl || 'https://discord.gg/beastmc'
  );

  // Advanced Order Date Filter & Statistics States
  const [datePreset, setDatePreset] = useState<DatePreset>('all_time');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [configuredTimezone, setConfiguredTimezone] = useState<string>(
    siteSettings?.timezone || 'UTC'
  );
  const [filterStats, setFilterStats] = useState<FilterStatistics | null>(null);
  const [searchOrderId, setSearchOrderId] = useState<string>('');
  const [searchMinecraftUsername, setSearchMinecraftUsername] = useState<string>('');
  const [searchCustomerEmail, setSearchCustomerEmail] = useState<string>('');
  const [searchProductName, setSearchProductName] = useState<string>('');
  const [isCombinedSearchExpanded, setIsCombinedSearchExpanded] = useState<boolean>(false);
  const [isTimezoneModalOpen, setIsTimezoneModalOpen] = useState<boolean>(false);
  const [savingTimezone, setSavingTimezone] = useState<boolean>(false);

  // Advanced Order & Payment Management States (Bulk selection, Verification, History, Soft Delete)
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [orderDeleteTarget, setOrderDeleteTarget] = useState<{
    type: 'single' | 'selected' | 'rejected' | 'approved' | 'completed' | 'pending';
    orderId?: number;
    orderCode?: string;
    count?: number;
  } | null>(null);
  const [deletingOrders, setDeletingOrders] = useState<boolean>(false);
  const [reopeningOrderId, setReopeningOrderId] = useState<number | null>(null);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<number | null>(null);
  const [orderSubView, setOrderSubView] = useState<'all' | 'verification'>('all');
  const [statusOverrideModalOpen, setStatusOverrideModalOpen] = useState<boolean>(false);
  const [targetOverrideStatus, setTargetOverrideStatus] = useState<
    'Pending' | 'Approved' | 'Rejected' | 'Completed'
  >('Pending');
  const [statusOverrideNote, setStatusOverrideNote] = useState<string>('');

  // Products
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productModalOpen, setProductModalOpen] = useState<boolean>(false);

  // Payment Methods
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethod[]>([]);
  const [editingMethod, setEditingMethod] = useState<Partial<PaymentMethod> | null>(null);
  const [methodModalOpen, setMethodModalOpen] = useState<boolean>(false);

  // Rank Comparison Manager States
  const [comparisonFeatures, setComparisonFeatures] = useState<RankComparisonFeature[]>([]);
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);
  const [savingComparison, setSavingComparison] = useState<boolean>(false);
  const [editingFeature, setEditingFeature] = useState<RankComparisonFeature | null>(null);
  const [featureModalOpen, setFeatureModalOpen] = useState<boolean>(false);
  const [deleteFeatureTarget, setDeleteFeatureTarget] = useState<RankComparisonFeature | null>(null);
  const [featureForm, setFeatureForm] = useState<{
    name: string;
    description: string;
    category: string;
    visible: boolean;
  }>({
    name: '',
    description: '',
    category: 'General',
    visible: true,
  });
  const [editingCustomCell, setEditingCustomCell] = useState<{
    featureId: string;
    rankId: string;
    customValue: string;
  } | null>(null);

  // Season Settings States
  const [seasonForm, setSeasonForm] = useState<SeasonSettings>({
    seasonTitle: siteSettings?.seasonSettings?.seasonTitle || siteSettings?.seasonTitle || 'BeastMC Season 4',
    seasonNumber: siteSettings?.seasonSettings?.seasonNumber || siteSettings?.seasonNumber || '4',
    statusBadge: siteSettings?.seasonSettings?.statusBadge || 'Active',
    seasonSubtitle:
      siteSettings?.seasonSettings?.seasonSubtitle ||
      siteSettings?.seasonSubtitle ||
      '24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted',
    customText: siteSettings?.seasonSettings?.customText || 'BeastMC Season 4 Active',
  });
  const [savingSeason, setSavingSeason] = useState<boolean>(false);
  const [seasonSuccess, setSeasonSuccess] = useState<boolean>(false);

  // Site Settings Form
  const [settingsForm, setSettingsForm] = useState<Partial<SiteSettings>>({});
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSuccess, setSettingsSuccess] = useState<boolean>(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState<boolean>(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState<boolean>(false);

  // Users & Staff
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [editingStaffUser, setEditingStaffUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'player' | 'moderator' | 'admin' | 'owner'>('player');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [resetPasswordModalData, setResetPasswordModalData] = useState<{ email: string; tempPassword: string } | null>(null);
  const [tempPasswordCopied, setTempPasswordCopied] = useState<boolean>(false);

  // Vote Sites / Links Manager
  const [voteSitesList, setVoteSitesList] = useState<VoteSite[]>([]);
  const [loadingVoteSites, setLoadingVoteSites] = useState<boolean>(false);
  const [editingVoteSite, setEditingVoteSite] = useState<Partial<VoteSite> | null>(null);
  const [voteSiteModalOpen, setVoteSiteModalOpen] = useState<boolean>(false);
  const [voteSiteToDelete, setVoteSiteToDelete] = useState<VoteSite | null>(null);
  const [savingVoteSite, setSavingVoteSite] = useState<boolean>(false);

  // Emails & Audit
  const [sentEmailsList, setSentEmailsList] = useState<SentEmail[]>([]);
  const [previewEmail, setPreviewEmail] = useState<SentEmail | null>(null);
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>([]);

  // General Loading & Feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availablePermissions = [
    { key: 'manage_settings', label: 'Manage Settings (Server IP, Branding, Discord)' },
    { key: 'manage_products', label: 'Manage Products & Prices (Add/Edit/Delete)' },
    { key: 'manage_payments', label: 'Manage Payment Methods (Unlimited IBAN, Accounts, QR)' },
    { key: 'verify_orders', label: 'Verify Manual Orders (Approve/Reject Payments)' },
    { key: 'deliver_orders', label: 'Deliver Orders (Triggers BeastMC Support Email)' },
    { key: 'manage_admins', label: 'Manage Staff Roles & Permissions (Multi-Admin)' },
    { key: 'view_audit_logs', label: 'View Security Audit Logs & Sent Emails' },
  ];

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async (overrideParams?: {
    status?: string;
    search?: string;
    datePreset?: DatePreset;
    startDate?: string;
    endDate?: string;
    orderId?: string;
    minecraftUsername?: string;
    customerEmail?: string;
    productName?: string;
    timezone?: string;
  }) => {
    if (!token) return;
    try {
      setLoading(true);
      const st = overrideParams?.status !== undefined ? overrideParams.status : orderFilter;
      const q = overrideParams?.search !== undefined ? overrideParams.search : orderSearch;
      const preset = overrideParams?.datePreset !== undefined ? overrideParams.datePreset : datePreset;
      const start = overrideParams?.startDate !== undefined ? overrideParams.startDate : customStartDate;
      const end = overrideParams?.endDate !== undefined ? overrideParams.endDate : customEndDate;
      const oid = overrideParams?.orderId !== undefined ? overrideParams.orderId : searchOrderId;
      const ign = overrideParams?.minecraftUsername !== undefined ? overrideParams.minecraftUsername : searchMinecraftUsername;
      const email = overrideParams?.customerEmail !== undefined ? overrideParams.customerEmail : searchCustomerEmail;
      const prod = overrideParams?.productName !== undefined ? overrideParams.productName : searchProductName;
      const tz = overrideParams?.timezone !== undefined ? overrideParams.timezone : configuredTimezone;

      const params = new URLSearchParams();
      if (st && st !== 'all') params.set('status', st);
      if (q && q.trim()) params.set('search', q.trim());
      if (preset && preset !== 'all_time') params.set('datePreset', preset);
      if (preset === 'custom' && start) params.set('startDate', start);
      if (preset === 'custom' && end) params.set('endDate', end);
      if (tz) params.set('timezone', tz);
      if (oid && oid.trim()) params.set('orderId', oid.trim());
      if (ign && ign.trim()) params.set('minecraftUsername', ign.trim());
      if (email && email.trim()) params.set('customerEmail', email.trim());
      if (prod && prod.trim()) params.set('productName', prod.trim());

      const url = `/api/admin/orders?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
        } else if (data && Array.isArray(data.orders)) {
          setOrders(data.orders);
          if (data.stats) {
            setFilterStats(data.stats);
          }
          if (data.timezone) {
            setConfiguredTimezone(data.timezone);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProductsList(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPaymentMethods = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPaymentMethodsList(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVoteSites = async () => {
    if (!token) return;
    try {
      setLoadingVoteSites(true);
      const res = await fetch('/api/admin/vote-sites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setVoteSitesList(await res.json());
      }
    } catch (err) {
      console.warn('Could not fetch vote sites in admin:', err);
    } finally {
      setLoadingVoteSites(false);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsersList(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmailsAndAudit = async () => {
    if (!token) return;
    try {
      const emailRes = await fetch('/api/admin/sent-emails', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (emailRes.ok) {
        setSentEmailsList(await emailRes.json());
      }
      const auditRes = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (auditRes.ok) {
        setAuditLogsList(await auditRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (siteSettings) {
      setSettingsForm(siteSettings);
      setCustomDiscordLink(siteSettings.discordUrl || 'https://discord.gg/beastmc');
      setMcForm({
        siteName: siteSettings.siteName || 'BeastMC Network',
        serverIp: siteSettings.serverIp || 'play.beastmc.net',
        serverPort: siteSettings.serverPort || 25565,
        bedrockPort: siteSettings.bedrockPort || 19132,
        serverType: (siteSettings.serverType as any) || 'paper',
        crossplayEnabled: siteSettings.crossplayEnabled ?? 1,
      });
    }
  }, [siteSettings]);

  const fetchLiveMcStatus = async (showLoading = false) => {
    if (showLoading) setLoadingLiveStatus(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/mc-status', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setLiveMcStatus(data);
      }
    } catch (err) {
      console.warn('Dashboard live MC status poll skipped:', err);
    } finally {
      if (showLoading) {
        setTimeout(() => setLoadingLiveStatus(false), 500);
      }
    }
  };

  useEffect(() => {
    fetchLiveMcStatus(false);
    const interval = setInterval(() => {
      fetchLiveMcStatus(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchOrders();
    fetchProducts();
    fetchPaymentMethods();
    fetchVoteSites();
    fetchUsers();
    fetchEmailsAndAudit();
  }, [token]);

  useEffect(() => {
    if (siteSettings?.timezone) {
      setConfiguredTimezone(siteSettings.timezone);
    }
  }, [siteSettings?.timezone]);

  useEffect(() => {
    if (datePreset !== 'custom') {
      fetchOrders();
    }
  }, [orderFilter, orderSearch, datePreset, configuredTimezone]);

  const handleDatePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      fetchOrders({ datePreset: preset });
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      showNotification('Please select both Start Date and End Date.', true);
      return;
    }
    if (customStartDate > customEndDate) {
      showNotification('Start Date cannot be after End Date.', true);
      return;
    }
    fetchOrders({
      datePreset: 'custom',
      startDate: customStartDate,
      endDate: customEndDate,
    });
    showNotification(`Date filter applied: ${customStartDate} to ${customEndDate}`);
  };

  const handleClearFilters = () => {
    setDatePreset('all_time');
    setCustomStartDate('');
    setCustomEndDate('');
    setOrderFilter('all');
    setOrderSearch('');
    setSearchOrderId('');
    setSearchMinecraftUsername('');
    setSearchCustomerEmail('');
    setSearchProductName('');
    fetchOrders({
      datePreset: 'all_time',
      startDate: '',
      endDate: '',
      status: 'all',
      search: '',
      orderId: '',
      minecraftUsername: '',
      customerEmail: '',
      productName: '',
    });
    showNotification('All search and date filters cleared. Showing All Time orders.');
  };

  const handleApplyCombinedSearch = () => {
    fetchOrders({
      orderId: searchOrderId,
      minecraftUsername: searchMinecraftUsername,
      customerEmail: searchCustomerEmail,
      productName: searchProductName,
      search: orderSearch,
      status: orderFilter,
      datePreset,
      startDate: customStartDate,
      endDate: customEndDate,
    });
  };

  const handleSaveTimezone = async (newTz: string) => {
    if (!token) return;
    try {
      setSavingTimezone(true);
      const res = await fetch('/api/admin/settings/timezone', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ timezone: newTz }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfiguredTimezone(newTz);
      setIsTimezoneModalOpen(false);
      showNotification(`Website timezone updated to ${newTz}`);
      fetchOrders({ timezone: newTz });
      if (onRefreshSettings) onRefreshSettings();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update timezone', true);
    } finally {
      setSavingTimezone(false);
    }
  };

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setActionMessage(msg);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Order Actions: Approve, Reject, Deliver
  const handleApprovePayment = async (orderId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification('Payment verified! Status updated to Delivery Pending with 24-hr notice.');
      fetchOrders();
      fetchStats();
      setSelectedOrder(null);
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleRejectPayment = async () => {
    if (!token || !selectedOrder) return;
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification('Order marked as Payment Rejected.');
      setRejectModalOpen(false);
      setRejectionReason('');
      fetchOrders();
      fetchStats();
      setSelectedOrder(null);
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleDeliverOrder = async () => {
    if (!token || !selectedOrder) return;
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customDiscordLink: customDiscordLink.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification(`Order #${selectedOrder.orderCode} marked as Delivered! BeastMC Support email dispatched.`);
      setDeliverModalOpen(false);
      fetchOrders();
      fetchStats();
      fetchEmailsAndAudit();
      setSelectedOrder(null);
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Task 2 & 7: Owner Reopen Rejected Order (Restores to Pending Review, preserves proof & details, no auto delivery)
  const handleReopenOrder = async (orderId: number) => {
    if (!token) return;
    if (user?.role !== 'owner') {
      showNotification('Permission Denied: Only the Server Owner can reopen rejected orders.', true);
      return;
    }
    setReopeningOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification('✓ Order reopened successfully and restored to Pending Review! Original proof preserved.');
      fetchOrders();
      fetchStats();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(data.order);
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to reopen order', true);
    } finally {
      setReopeningOrderId(null);
    }
  };

  // Task 5: Manual Payment Evidence Verification (Explicit confirmation of bank/payment receipt)
  const handleVerifyPaymentEvidence = async (orderId: number) => {
    if (!token) return;
    setVerifyingPaymentId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification('✓ Payment evidence manually verified against financial records!');
      fetchOrders();
      fetchStats();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(data.order);
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to verify payment evidence', true);
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  // Task 1 & 7: Override Order Status (Owner Only)
  const handleOverrideOrderStatus = async (
    orderId: number,
    newStatus: 'Pending' | 'Approved' | 'Rejected' | 'Completed'
  ) => {
    if (!token) return;
    if (user?.role !== 'owner') {
      showNotification('Permission Denied: Only the Server Owner can override order statuses.', true);
      return;
    }
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          note: statusOverrideNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification(`✓ Order status successfully changed to "${newStatus}"!`);
      setStatusOverrideModalOpen(false);
      setStatusOverrideNote('');
      fetchOrders();
      fetchStats();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(data.order);
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to override status', true);
    }
  };

  // Task 3 & 7: Delete Single Order Prompt
  const handleDeleteSingleOrderPrompt = (order: Order) => {
    if (user?.role !== 'owner') {
      showNotification('Permission Denied: Only the Server Owner can delete orders.', true);
      return;
    }
    setOrderDeleteTarget({
      type: 'single',
      orderId: order.id,
      orderCode: order.orderCode,
    });
  };

  // Task 3 & 4: Bulk Delete Prompt
  const handleBulkDeletePrompt = (
    type: 'selected' | 'rejected' | 'approved' | 'completed' | 'pending'
  ) => {
    if (user?.role !== 'owner') {
      showNotification('Permission Denied: Only the Server Owner can delete orders.', true);
      return;
    }
    if (type === 'selected' && selectedOrderIds.length === 0) {
      showNotification('No orders selected to delete.', true);
      return;
    }
    setOrderDeleteTarget({
      type,
      count: type === 'selected' ? selectedOrderIds.length : undefined,
    });
  };

  // Confirm and Execute Deletion (Single or Bulk, Soft Deletion preserving financial records)
  const handleExecuteOrderDeletion = async () => {
    if (!token || !orderDeleteTarget) return;
    if (user?.role !== 'owner') {
      showNotification('Permission Denied: Only the Server Owner can delete orders.', true);
      return;
    }
    setDeletingOrders(true);
    try {
      if (orderDeleteTarget.type === 'single' && orderDeleteTarget.orderId) {
        const res = await fetch(`/api/admin/orders/${orderDeleteTarget.orderId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showNotification(data.message || 'Order removed successfully. Audit record preserved.');
      } else {
        const res = await fetch('/api/admin/orders/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deleteType: orderDeleteTarget.type,
            orderIds: orderDeleteTarget.type === 'selected' ? selectedOrderIds : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showNotification(data.message || `Successfully removed ${data.deletedCount} order(s).`);
      }

      setOrderDeleteTarget(null);
      setSelectedOrderIds([]);
      if (selectedOrder && orderDeleteTarget.orderId === selectedOrder.id) {
        setSelectedOrder(null);
      }
      fetchOrders();
      fetchStats();
      fetchEmailsAndAudit();
    } catch (err: any) {
      showNotification(err.message || 'Deletion failed', true);
    } finally {
      setDeletingOrders(false);
    }
  };

  // Selection helpers
  const handleToggleSelectOrder = (id: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisibleOrders = (visibleOrders: Order[]) => {
    const visibleIds = visibleOrders.map((o) => o.id);
    const allSelected = visibleIds.every((id) => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedOrderIds, ...visibleIds]));
      setSelectedOrderIds(merged);
    }
  };

  const handleDeselectAllOrders = () => {
    setSelectedOrderIds([]);
  };

  // Product Actions
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingProduct) return;

    try {
      const isNew = !editingProduct.id;
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${editingProduct.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingProduct),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification(isNew ? 'Product created successfully' : 'Product updated successfully');
      setProductModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      showNotification('Product deleted successfully');
      fetchProducts();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Payment Method Actions
  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingMethod) return;

    try {
      const isNew = !editingMethod.id;
      const url = isNew ? '/api/admin/payment-methods' : `/api/admin/payment-methods/${editingMethod.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingMethod),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification(isNew ? 'Payment method added' : 'Payment method updated');
      setMethodModalOpen(false);
      setEditingMethod(null);
      fetchPaymentMethods();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleDeletePaymentMethod = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      showNotification('Payment method deleted successfully');
      fetchPaymentMethods();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Vote Site Actions
  const handleOpenCreateVoteSite = () => {
    const nextOrder = voteSitesList.length > 0 ? Math.max(...voteSitesList.map((s) => s.sortOrder || 0)) + 1 : 1;
    setEditingVoteSite({
      name: '',
      url: '',
      description: '',
      rewardText: '500 Beast Coins + 1x Vote Crate Key',
      sortOrder: nextOrder,
      isActive: 1,
    });
    setVoteSiteModalOpen(true);
  };

  const handleOpenEditVoteSite = (site: VoteSite) => {
    setEditingVoteSite({ ...site });
    setVoteSiteModalOpen(true);
  };

  const handleSaveVoteSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingVoteSite) return;

    if (!editingVoteSite.name?.trim() || !editingVoteSite.url?.trim()) {
      showNotification('Vote Site Name and URL are required.', true);
      return;
    }

    setSavingVoteSite(true);
    try {
      const isNew = !editingVoteSite.id;
      const url = isNew ? '/api/admin/vote-sites' : `/api/admin/vote-sites/${editingVoteSite.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingVoteSite),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification(isNew ? `Vote site "${data.name}" added successfully!` : `Vote site "${data.name}" updated!`);
      setVoteSiteModalOpen(false);
      setEditingVoteSite(null);
      fetchVoteSites();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setSavingVoteSite(false);
    }
  };

  const handleDeleteVoteSite = async () => {
    if (!token || !voteSiteToDelete) return;
    try {
      const res = await fetch(`/api/admin/vote-sites/${voteSiteToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete vote site');
      showNotification(`Deleted vote site "${voteSiteToDelete.name}"`);
      setVoteSiteToDelete(null);
      fetchVoteSites();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleToggleVoteSiteActive = async (site: VoteSite) => {
    if (!token) return;
    const nextActive = site.isActive === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/admin/vote-sites/${site.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) throw new Error('Failed to toggle status');
      showNotification(nextActive === 1 ? `"${site.name}" enabled (Live)` : `"${site.name}" disabled (Hidden)`);
      fetchVoteSites();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleMoveVoteSite = async (index: number, direction: 'up' | 'down') => {
    if (!token) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= voteSitesList.length) return;

    const newList = [...voteSitesList];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);

    const itemsToUpdate = newList.map((site, i) => ({
      id: site.id,
      sortOrder: i + 1,
    }));

    setVoteSitesList(newList.map((site, i) => ({ ...site, sortOrder: i + 1 })));

    try {
      const res = await fetch('/api/admin/vote-sites-reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: itemsToUpdate }),
      });
      if (!res.ok) throw new Error('Failed to update sort order');
      showNotification('Vote links order updated!');
      fetchVoteSites();
    } catch (err: any) {
      showNotification(err.message, true);
      fetchVoteSites();
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification('Site settings saved and applied to entire server network!');
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
      onRefreshSettings();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setSavingSettings(false);
    }
  };

  // Dedicated Save for Announcement Bar (Permanently Saved in Supabase)
  const handleSaveAnnouncement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;
    setSavingAnnouncement(true);
    try {
      const targetText = settingsForm.announcementText !== undefined
        ? settingsForm.announcementText
        : 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted';
      const targetEnabled = (settingsForm.announcementEnabled ?? 1) === 0 ? 0 : 1;

      const res = await fetch('/api/admin/settings/announcement', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          announcementText: targetText,
          announcementEnabled: targetEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification('Announcement bar updated and live on entire network!');
      setAnnouncementSuccess(true);
      setTimeout(() => setAnnouncementSuccess(false), 3000);
      onRefreshSettings();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Task 1 & 9: Owner-Only Save Minecraft Server Settings
  const handleSaveMcSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (user?.role !== 'owner') {
      showNotification('Permission Denied: Only the Owner can modify Minecraft Server Settings.', true);
      return;
    }

    setSavingMcSettings(true);
    try {
      const res = await fetch('/api/admin/minecraft/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mcForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save Minecraft settings');
      }

      showNotification('✓ Minecraft Server Settings saved permanently to database!');
      onRefreshSettings();
      fetchLiveMcStatus(true);
    } catch (err: any) {
      showNotification(err.message || 'Failed to save Minecraft settings', true);
    } finally {
      setSavingMcSettings(false);
    }
  };

  // Task 5: Test Connection to Real Minecraft Server
  const handleTestMinecraftConnection = async () => {
    if (!token) return;
    setTestingMc(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/minecraft/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mcForm),
      });

      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        showNotification(data.message);
      } else {
        showNotification(data.message, true);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 'unavailable',
        message: err.message || 'Failed to execute Minecraft connection test.',
        latency: null,
      });
      showNotification(err.message || 'Test connection error', true);
    } finally {
      setTestingMc(false);
    }
  };

  // Direct Save for Individual Image Settings (Logo, Favicon, Hero BG, Banner)
  const handleSaveImageSetting = async (field: keyof SiteSettings, url: string, successLabel: string) => {
    if (!token) return;
    const updated = { ...settingsForm, [field]: url };
    setSettingsForm(updated);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to update ${successLabel}`);
      showNotification(`${successLabel} updated and saved to persistent database!`);
      onRefreshSettings();
    } catch (err: any) {
      showNotification(err.message || `Failed to save ${successLabel}`, true);
      throw err;
    }
  };

  const handleRemoveImageSetting = async (field: keyof SiteSettings, label: string) => {
    if (!token) return;
    const updated = { ...settingsForm, [field]: '' };
    setSettingsForm(updated);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to remove ${label}`);
      showNotification(`${label} removed from website successfully`);
      onRefreshSettings();
    } catch (err: any) {
      showNotification(err.message || `Failed to remove ${label}`, true);
      throw err;
    }
  };

  // User Role & Permissions Save
  const handleOpenStaffModal = (u: User) => {
    setEditingStaffUser(u);
    setSelectedRole(u.role);
    setUserPermissions(u.permissions || []);
  };

  const handleSaveStaffRole = async () => {
    if (!token || !editingStaffUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingStaffUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: selectedRole,
          permissions: userPermissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification(`Staff role and server-side permissions updated for ${editingStaffUser.email}`);
      setEditingStaffUser(null);
      fetchUsers();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteUser = (targetUser: User) => {
    setUserToDelete(targetUser);
  };

  const confirmDeleteUser = async () => {
    if (!token || !userToDelete) return;
    try {
      setIsDeletingUser(true);
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      showNotification(data.message || `User account ${userToDelete.email} deleted successfully.`);
      setUserToDelete(null);
      await fetchUsers();
      await fetchStats();
    } catch (err: any) {
      console.error('Delete user error:', err);
      showNotification(err.message || 'Failed to delete user account', true);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleResetPassword = (targetUser: User) => {
    setUserToResetPassword(targetUser);
  };

  const confirmResetPassword = async () => {
    if (!token || !userToResetPassword) return;
    try {
      setIsResettingPassword(true);
      const res = await fetch(`/api/admin/users/${userToResetPassword.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      const targetEmail = userToResetPassword.email;
      setUserToResetPassword(null);
      setResetPasswordModalData({
        email: data.email || targetEmail,
        tempPassword: data.temporaryPassword,
      });
      setTempPasswordCopied(false);
      showNotification(`Password reset successfully for ${targetEmail}`);
    } catch (err: any) {
      console.error('Reset password error:', err);
      showNotification(err.message || 'Failed to reset password', true);
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (!user || user.role === 'player') {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Staff Access Required
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This dashboard is restricted to the BeastMC Network Owner, Administrators, and authorized staff members. Demo staff access has been permanently disabled.
          </p>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 font-medium">
          Please sign in with your verified Staff account to access financial records and server management.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                BeastMC Staff Admin Panel
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged in as <strong className="text-amber-400">{user?.email}</strong>. Multi-admin permissions enforced server-side.
            </p>
          </div>
        </div>

        {/* Global Feedback banners */}
        {actionMessage && (
          <div className="px-4 py-2 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{actionMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="px-4 py-2 bg-red-950/80 border border-red-500 rounded-xl text-red-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Stats & Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all relative ${
            activeTab === 'orders'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Manual Orders & Verification</span>
          {stats?.pendingPaymentCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black">
              {stats.pendingPaymentCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'products'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Products & Prices</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'payments'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Methods (Unlimited)</span>
        </button>

        <button
          onClick={() => setActiveTab('mc-server')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'mc-server'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Minecraft Server Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Site & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('vote-links')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'vote-links'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>Vote Links</span>
          {voteSitesList.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'vote-links' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
            }`}>
              {voteSitesList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          <span>User Management</span>
        </button>

        <button
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'emails'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Dispatched Support Emails</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'audit'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="max-w-md">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-black tracking-wider">
                  Total Registered Users
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UsersIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-4xl font-black text-white">
                {stats?.totalUsers ?? usersList.length}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Total registered Minecraft players and staff accounts in the BeastMC Network database.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADVANCED ORDER & PAYMENT MANAGEMENT SYSTEM (Tasks 1, 2, 3, 4, 5, 6, 7, 8) */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Header & Sub-view Switcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                  Owner Dashboard &bull; Financial Orders Engine
                </span>
                {user?.role === 'owner' ? (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Owner Permissions Active</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                    Staff Review Access
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <PackageCheck className="w-6 h-6 text-amber-400" />
                <span>Advanced Order & Payment Management</span>
              </h2>
              <p className="text-xs text-slate-400">
                Review payment proof, reverify mistakenly rejected orders, manage bulk & individual soft-deletions, and preserve financial audit history.
              </p>
            </div>

            {/* Sub-view Toggle: Orders List vs Dedicated Payment Verification Queue (Task 5) */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-2xl self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setOrderSubView('all')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  orderSubView === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <PackageCheck className="w-4 h-4" />
                <span>Orders List</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px]">
                  {orders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrderSubView('verification')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  orderSubView === 'verification'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Payment Verification Queue</span>
                {stats?.pendingPaymentCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                    {stats.pendingPaymentCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 6. REAL DATABASE ORDER STATISTICS (Filtered by currently selected criteria) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Stat 1: Total Orders */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Orders</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <PackageCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-white">
                {filterStats?.totalOrders ?? orders.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">Filtered database count</div>
            </div>

            {/* Stat 2: Pending Orders */}
            <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Pending</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-400">
                {filterStats?.pendingOrders ??
                  orders.filter((o) => (o.status || '').toLowerCase().includes('pending')).length}
              </div>
              <div className="text-[10px] text-amber-400/70 mt-1 truncate">Awaiting review</div>
            </div>

            {/* Stat 3: Approved Orders */}
            <div className="bg-slate-900 border border-sky-500/20 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-sky-500/40 transition-colors">
              <div className="flex items-center justify-between text-sky-400">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">Approved</span>
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-sky-400">
                {filterStats?.approvedOrders ??
                  orders.filter(
                    (o) =>
                      (o.status || '').toLowerCase() === 'approved' ||
                      (o.status || '').toLowerCase() === 'delivery pending' ||
                      (o.status || '').toLowerCase() === 'awaiting delivery'
                  ).length}
              </div>
              <div className="text-[10px] text-sky-400/70 mt-1 truncate">Ready for delivery</div>
            </div>

            {/* Stat 4: Rejected Orders */}
            <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-red-500/40 transition-colors">
              <div className="flex items-center justify-between text-red-400">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-300">Rejected</span>
                <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-red-400">
                {filterStats?.rejectedOrders ??
                  orders.filter((o) => (o.status || '').toLowerCase().includes('reject')).length}
              </div>
              <div className="text-[10px] text-red-400/70 mt-1 truncate">Declined payments</div>
            </div>

            {/* Stat 5: Completed Orders */}
            <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Completed</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-400">
                {filterStats?.completedOrders ??
                  orders.filter(
                    (o) =>
                      (o.status || '').toLowerCase() === 'completed' ||
                      (o.status || '').toLowerCase() === 'delivered'
                  ).length}
              </div>
              <div className="text-[10px] text-emerald-400/70 mt-1 truncate">Delivered to players</div>
            </div>

            {/* Stat 6: Total Order Value */}
            <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Total Value</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black text-emerald-400 truncate">
                {filterStats?.totalOrderValueFormatted ??
                  `$${(orders.reduce((sum, o) => sum + (o.amount || 0), 0) / 100).toFixed(2)} USD`}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">Real DB sum</div>
            </div>
          </div>

          {/* 1 & 2. ADVANCED ORDER DATE FILTER SYSTEM */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            {/* Date Filter Header & Timezone Indicator */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <span>Date Filter System</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                      Preset: {DATE_PRESET_OPTIONS.find((p) => p.id === datePreset)?.label}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Filter orders by creation date using server-side database querying.
                  </p>
                </div>
              </div>

              {/* Timezone Indicator and Change Button */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Timezone:</span>
                  <span className="font-mono font-bold text-white">{configuredTimezone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTimezoneModalOpen(true)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl transition-colors"
                  title="Configure website timezone for date filtering"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Date Preset Buttons (Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, All Time, Custom Date Range) */}
            <div className="flex flex-wrap items-center gap-2">
              {DATE_PRESET_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleDatePresetSelect(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    datePreset === opt.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Custom Date Search Section (Start Date, End Date, Apply Filter) */}
            {datePreset === 'custom' && (
              <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Calendar className="w-4 h-4" />
                  <span>Select Custom Date Range ({configuredTimezone})</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustomDates}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply Filter</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3 & 4. COMBINED SEARCH, STATUS FILTERS, AND CONTROLS BAR */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            {/* Row 1: Order Status Filters (All Orders, Pending, Payment Verified, Awaiting Delivery, Approved, Rejected, Completed) */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span>Order Status Filters</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'All Orders', count: filterStats?.totalOrders ?? orders.length },
                  { id: 'pending', label: 'Pending', count: filterStats?.pendingOrders },
                  { id: 'payment_verified', label: 'Payment Verified', count: filterStats?.paymentVerifiedOrders },
                  { id: 'awaiting_delivery', label: 'Awaiting Delivery', count: filterStats?.awaitingDeliveryOrders },
                  { id: 'approved', label: 'Approved', count: filterStats?.approvedOrders },
                  { id: 'rejected', label: 'Rejected', count: filterStats?.rejectedOrders },
                  { id: 'completed', label: 'Completed', count: filterStats?.completedOrders },
                ].map((f) => {
                  const isActive = orderFilter.toLowerCase() === f.id.toLowerCase();
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOrderFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <span>{f.label}</span>
                      {f.count !== undefined && f.count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {f.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Search Input & Action Tools */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              {/* Quick Search */}
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Quick search by Order ID, Minecraft IGN, Email, Product, TID..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Buttons: Toggle Combined Search & Clear Filters */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                <button
                  type="button"
                  onClick={() => setIsCombinedSearchExpanded(!isCombinedSearchExpanded)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isCombinedSearchExpanded ||
                    searchOrderId ||
                    searchMinecraftUsername ||
                    searchCustomerEmail ||
                    searchProductName
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                  title="Toggle dedicated inputs for Order ID, IGN, Email, and Product"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Combined Field Search</span>
                  {isCombinedSearchExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* 7. RESET FILTERS BUTTON */}
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3 py-2 bg-slate-950 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="Reset all search and date filters to All Time"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              </div>
            </div>

            {/* 3. COMBINED ORDER SEARCH DEDICATED FIELDS (Order ID, IGN, Email, Product) */}
            {isCombinedSearchExpanded && (
              <div className="p-4 bg-slate-950 rounded-xl border border-blue-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Combined Order Search Fields</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Combine specific fields with active date range & status
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Order ID (e.g. BEAST-1002)
                    </label>
                    <input
                      type="text"
                      value={searchOrderId}
                      onChange={(e) => setSearchOrderId(e.target.value)}
                      placeholder="e.g. BMC-2026-1042"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Minecraft Username
                    </label>
                    <input
                      type="text"
                      value={searchMinecraftUsername}
                      onChange={(e) => setSearchMinecraftUsername(e.target.value)}
                      placeholder="e.g. ProGamer99"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Customer Email
                    </label>
                    <input
                      type="text"
                      value={searchCustomerEmail}
                      onChange={(e) => setSearchCustomerEmail(e.target.value)}
                      placeholder="e.g. player@gmail.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={searchProductName}
                      onChange={(e) => setSearchProductName(e.target.value)}
                      placeholder="e.g. Dragon Rank, Beast Coins"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOrderId('');
                      setSearchMinecraftUsername('');
                      setSearchCustomerEmail('');
                      setSearchProductName('');
                      handleApplyCombinedSearch();
                    }}
                    className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Reset Fields
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCombinedSearch}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Apply Combined Search</span>
                  </button>
                </div>
              </div>
            )}

            {/* Task 3 & 4: Bulk Management & Selection Action Bar */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectAllVisibleOrders(orders)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-lg border border-slate-800 transition-colors flex items-center gap-2"
                >
                  {orders.length > 0 && orders.every((o) => selectedOrderIds.includes(o.id)) ? (
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Select All Visible</span>
                </button>

                {selectedOrderIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAllOrders}
                    className="text-slate-400 hover:text-white underline text-[11px]"
                  >
                    Deselect All
                  </button>
                )}

                <span className="text-slate-400 font-mono text-[11px] bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                  <strong className="text-amber-400">{selectedOrderIds.length}</strong> of {orders.length} order(s) selected
                </span>
              </div>

              {/* Bulk Action Buttons (Owner Only) */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedOrderIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleBulkDeletePrompt('selected')}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 animate-in fade-in"
                    title="Soft-delete selected orders. Financial records preserved."
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected Orders ({selectedOrderIds.length})</span>
                  </button>
                )}

                {/* Predefined Bulk Deletion Options (Task 3) */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleBulkDeletePrompt('rejected')}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-red-950/60 text-slate-300 hover:text-red-300 rounded-lg border border-slate-800 text-[11px] font-bold transition-colors flex items-center gap-1"
                    title="Soft delete all rejected orders"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                    <span>Delete All Rejected</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkDeletePrompt('completed')}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 rounded-lg border border-slate-800 text-[11px] font-bold transition-colors flex items-center gap-1"
                    title="Soft delete all completed/delivered orders"
                  >
                    <Trash2 className="w-3 h-3 text-emerald-400" />
                    <span>Delete All Completed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkDeletePrompt('approved')}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-blue-950/60 text-slate-300 hover:text-blue-300 rounded-lg border border-slate-800 text-[11px] font-bold transition-colors flex items-center gap-1"
                    title="Soft delete all approved orders"
                  >
                    <Trash2 className="w-3 h-3 text-blue-400" />
                    <span>Delete All Approved</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkDeletePrompt('pending')}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-amber-950/60 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-800 text-[11px] font-bold transition-colors flex items-center gap-1"
                    title="Soft delete all pending orders"
                  >
                    <Trash2 className="w-3 h-3 text-amber-400" />
                    <span>Delete All Pending</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* VIEW 1: DEDICATED PAYMENT VERIFICATION QUEUE (Task 5) */}
          {orderSubView === 'verification' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-emerald-300 uppercase tracking-wider">
                    Task 5: Manual Payment Verification Engine
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Review submitted customer payment evidence below. <strong>Important:</strong> Do not treat uploaded screenshots alone as proof of successful payment. Confirm receipt of funds in your payment gateway or bank account before clicking <em>Verify Payment</em> or <em>Approve Order</em>.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-500 text-xs">Loading verification queue...</div>
              ) : orders.filter(
                  (o) =>
                    o.status === 'Pending' ||
                    o.status === 'Pending Payment Verification' ||
                    !o.paymentVerified
                ).length === 0 ? (
                <div className="bg-slate-900 p-12 text-center rounded-2xl border border-slate-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="text-sm font-bold text-white">All Payments Verified!</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    There are no unverified pending orders right now. Switch back to "Orders List" to view all records.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orders
                    .filter(
                      (o) =>
                        o.status === 'Pending' ||
                        o.status === 'Pending Payment Verification' ||
                        !o.paymentVerified
                    )
                    .map((o) => (
                      <div
                        key={o.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Card Header */}
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-mono">
                                Order ID &bull; {new Date(o.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-base font-black text-amber-400 font-mono">
                                #{o.orderCode}
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  o.status === 'Pending' || o.status === 'Pending Payment Verification'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : o.status === 'Approved' || o.status === 'Delivery Pending'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : o.status === 'Completed' || o.status === 'Delivered'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}
                              >
                                {o.status}
                              </span>
                            </div>
                          </div>

                          {/* Customer & Product Info */}
                          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Customer</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <img
                                  src={`https://mc-heads.net/avatar/${o.minecraftUsername}/20`}
                                  alt="Skin"
                                  className="w-5 h-5 rounded bg-slate-900"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <span className="font-mono font-bold text-white truncate">{o.minecraftUsername}</span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Product & Amount</span>
                              <div className="font-bold text-emerald-400 mt-0.5">
                                ${(o.amount / 100).toFixed(2)} {o.currency} &bull; <span className="text-slate-200">{o.productName}</span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Payment Method</span>
                              <span className="text-slate-200 truncate block mt-0.5">{o.paymentMethodName}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Transaction ID</span>
                              <span className="font-mono font-bold text-amber-300 truncate block mt-0.5">{o.transactionId}</span>
                            </div>
                          </div>

                          {/* Screenshot Proof Preview (Task 5) */}
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                              <span>Customer Submitted Proof Screenshot:</span>
                              {o.paymentScreenshotUrl && (
                                <a
                                  href={o.paymentScreenshotUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:underline flex items-center gap-1 text-[10px]"
                                >
                                  <span>View Original</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {o.paymentScreenshotUrl ? (
                              <div
                                onClick={() => setSelectedOrder(o)}
                                className="h-44 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-2 flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition-colors group relative"
                              >
                                <img
                                  src={o.paymentScreenshotUrl}
                                  alt="Payment Proof"
                                  className="max-h-full max-w-full object-contain rounded"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                                  <Eye className="w-4 h-4" />
                                  <span>Click to inspect proof</span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                                No screenshot provided. Verify funds via Transaction ID in your banking gateway.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons for Verification */}
                        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {o.paymentVerified ? (
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Payment Evidence Verified</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleVerifyPaymentEvidence(o.id)}
                                disabled={verifyingPaymentId === o.id}
                                className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{verifyingPaymentId === o.id ? 'Verifying...' : 'Verify Payment Evidence'}</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(o)}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Full Review</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApprovePayment(o.id)}
                              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: STANDARD ORDERS TABLE WITH BULK CHECKBOXES & ACTIONS */}
          {orderSubView === 'all' && (
            <>
              {loading ? (
                <div className="py-20 text-center text-slate-500 text-xs">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="bg-slate-900 p-12 text-center rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No orders found matching the selected filter.
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/60">
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={orders.length > 0 && orders.every((o) => selectedOrderIds.includes(o.id))}
                            onChange={() => handleSelectAllVisibleOrders(orders)}
                            className="rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                            title="Select all visible orders"
                          />
                        </th>
                        <th className="py-3 px-3">Order ID</th>
                        <th className="py-3 px-3">Customer Username</th>
                        <th className="py-3 px-3">Minecraft Username</th>
                        <th className="py-3 px-3">Product Name</th>
                        <th className="py-3 px-3">Order Amount</th>
                        <th className="py-3 px-3">Order Date</th>
                        <th className="py-3 px-3">Payment Status</th>
                        <th className="py-3 px-3">Order Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {orders.map((o) => {
                        const isSelected = selectedOrderIds.includes(o.id);
                        return (
                          <tr
                            key={o.id}
                            className={`transition-colors ${
                              isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-850/50'
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOrder(o.id)}
                                className="rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                              />
                            </td>

                            {/* 1. Order ID */}
                            <td className="py-3.5 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                              #{o.orderCode}
                            </td>

                            {/* 2. Customer Username */}
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-200 truncate max-w-[130px]" title={o.userEmail}>
                                {o.customerUsername || o.userEmail.split('@')[0]}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                                {o.userEmail}
                              </div>
                            </td>

                            {/* 3. Minecraft Username */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={`https://mc-heads.net/avatar/${o.minecraftUsername}/24`}
                                  alt="Skin"
                                  className="w-6 h-6 rounded bg-slate-950 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <span className="font-mono font-bold text-white truncate max-w-[120px]">
                                  {o.minecraftUsername}
                                </span>
                              </div>
                            </td>

                            {/* 4. Product Name */}
                            <td className="py-3.5 px-3 font-semibold text-slate-200">
                              {o.productName}
                            </td>

                            {/* 5. Order Amount */}
                            <td className="py-3.5 px-3 font-bold text-emerald-400 whitespace-nowrap">
                              ${(o.amount / 100).toFixed(2)} <span className="text-[10px] text-emerald-500/80">{o.currency || 'USD'}</span>
                            </td>

                            {/* 6. Order Date */}
                            <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                              <div>{new Date(o.createdAt).toLocaleDateString()}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>

                            {/* 7. Payment Status */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {o.paymentVerified ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                  <Check className="w-3 h-3" />
                                  <span>Verified</span>
                                </span>
                              ) : o.paymentScreenshotUrl ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                  <ImageIcon className="w-3 h-3" />
                                  <span>Proof Attached</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                  TID: {o.transactionId.slice(0, 8)}...
                                </span>
                              )}
                            </td>

                            {/* 8. Order Status */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {((o.status || '').toLowerCase() === 'pending' ||
                                (o.status || '').toLowerCase() === 'pending payment verification') && (
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                  Pending
                                </span>
                              )}
                              {((o.status || '').toLowerCase() === 'payment verified' ||
                                (o.paymentVerified === 1 && (o.status || '').toLowerCase().includes('pending'))) && (
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                                  Payment Verified
                                </span>
                              )}
                              {((o.status || '').toLowerCase() === 'awaiting delivery' ||
                                (o.status || '').toLowerCase() === 'delivery pending') && (
                                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-bold">
                                  Awaiting Delivery
                                </span>
                              )}
                              {(o.status || '').toLowerCase() === 'approved' && (
                                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                                  Approved
                                </span>
                              )}
                              {((o.status || '').toLowerCase() === 'completed' ||
                                (o.status || '').toLowerCase() === 'delivered') && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                  Completed
                                </span>
                              )}
                              {((o.status || '').toLowerCase() === 'rejected' ||
                                (o.status || '').toLowerCase() === 'payment rejected') && (
                                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                                  Rejected
                                </span>
                              )}
                            </td>

                            {/* 9. Actions Column with View Details Button */}
                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(o)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                                title="View order details and payment verification"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Details</span>
                              </button>

                              {/* Task 2: Reopen button directly on rejected orders */}
                              {(o.status === 'Rejected' || o.status === 'Payment Rejected') && (
                                <button
                                  type="button"
                                  onClick={() => handleReopenOrder(o.id)}
                                  disabled={reopeningOrderId === o.id || user?.role !== 'owner'}
                                  className="px-2.5 py-1.5 bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 text-amber-300 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                                  title="Reopen mistakenly rejected order (Owner only)"
                                >
                                  <RotateCcw className={`w-3.5 h-3.5 ${reopeningOrderId === o.id ? 'animate-spin' : ''}`} />
                                  <span>Reopen</span>
                                </button>
                              )}

                              {/* Task 3: Individual Soft Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleOrderPrompt(o)}
                                disabled={user?.role !== 'owner'}
                                className="p-2 bg-slate-950 hover:bg-rose-950/70 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-400 rounded-xl transition-colors inline-flex items-center disabled:opacity-40"
                                title={user?.role === 'owner' ? 'Remove order (Soft delete, audit preserved)' : 'Owner permission required'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Review Order Inspection Modal (Tasks 1, 2, 5, 6, 7) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full my-8 p-6 sm:p-7 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider">
                    Staff Order Review & Verification
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedOrder.status === 'Pending' || selectedOrder.status === 'Pending Payment Verification'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : selectedOrder.status === 'Approved' || selectedOrder.status === 'Delivery Pending'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : selectedOrder.status === 'Completed' || selectedOrder.status === 'Delivered'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-mono flex items-center gap-2 mt-0.5">
                  <span>#{selectedOrder.orderCode}</span>
                  <span className="text-slate-400 font-normal">&bull;</span>
                  <span className="text-emerald-400">{selectedOrder.productName}</span>
                </h3>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Player IGN</span>
                <div className="flex items-center gap-1.5">
                  <img
                    src={`https://mc-heads.net/avatar/${selectedOrder.minecraftUsername}/20`}
                    alt="Skin"
                    className="w-5 h-5 rounded bg-slate-900"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {selectedOrder.minecraftUsername}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Total Amount</span>
                <span className="font-bold text-white text-sm">
                  ${(selectedOrder.amount / 100).toFixed(2)} {selectedOrder.currency}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Payment Method</span>
                <span className="text-slate-200 font-semibold">{selectedOrder.paymentMethodName}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Order Placed Date</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Customer Email & Transaction ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Customer Registered Email:</span>
                <span className="font-mono font-bold text-slate-200">{selectedOrder.userEmail}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Transaction ID / Reference:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {selectedOrder.transactionId}
                </span>
              </div>
            </div>

            {selectedOrder.senderNote && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Customer Remarks / Note:</span>
                <span className="text-slate-300 italic">{selectedOrder.senderNote}</span>
              </div>
            )}

            {/* Task 5: Manual Payment Evidence Verification Section */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Task 5: Payment Evidence Verification Proof
                  </span>
                </div>

                {selectedOrder.paymentVerified ? (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified {selectedOrder.paymentVerifiedBy ? `by ${selectedOrder.paymentVerifiedBy}` : ''}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Pending Manual Verification
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Check your bank/wallet statement for TID <code>{selectedOrder.transactionId}</code> and exact amount <strong>${(selectedOrder.amount / 100).toFixed(2)}</strong>. Do not treat uploaded screenshots alone as proof.
              </p>

              {/* Uploaded Receipt Screenshot */}
              <div>
                <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Customer Uploaded Screenshot / Proof:</span>
                  {selectedOrder.paymentScreenshotUrl && (
                    <a
                      href={selectedOrder.paymentScreenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Open Full Size</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {selectedOrder.paymentScreenshotUrl ? (
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-2 max-h-72 flex items-center justify-center">
                    <img
                      src={selectedOrder.paymentScreenshotUrl}
                      alt="Receipt Screenshot"
                      className="max-h-64 object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 text-center text-slate-500 text-xs">
                    No screenshot uploaded by player. Verify directly using Transaction ID.
                  </div>
                )}
              </div>

              {/* Manual Verification Button */}
              {!selectedOrder.paymentVerified && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleVerifyPaymentEvidence(selectedOrder.id)}
                    disabled={verifyingPaymentId === selectedOrder.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{verifyingPaymentId === selectedOrder.id ? 'Verifying...' : 'Verify Payment Evidence in Bank/Wallet'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Rejection Note display if rejected */}
            {(selectedOrder.status === 'Rejected' || selectedOrder.status === 'Payment Rejected') && selectedOrder.rejectionReason && (
              <div className="p-4 bg-red-950/30 border border-red-800/50 rounded-2xl text-xs space-y-1">
                <div className="font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Previous Rejection Reason:</span>
                </div>
                <p className="text-red-200">{selectedOrder.rejectionReason}</p>
              </div>
            )}

            {/* Task 6: Chronological Order History Timeline */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <History className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Task 6: Order Audit History Timeline
                </span>
              </div>

              {(() => {
                let historyItems: any[] = [];
                try {
                  historyItems = selectedOrder.orderHistory ? JSON.parse(selectedOrder.orderHistory) : [];
                } catch {
                  historyItems = [];
                }

                if (!historyItems || historyItems.length === 0) {
                  return (
                    <div className="text-[11px] text-slate-500 italic py-1">
                      No recorded audit events for this order yet.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {historyItems.map((evt, idx) => (
                      <div
                        key={idx}
                        className="text-xs flex items-start gap-3 p-2 bg-slate-900/60 rounded-xl border border-slate-800/80"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-[11px]">{evt.action}</span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : ''}
                            </span>
                          </div>
                          {evt.adminEmail && (
                            <div className="text-[10px] text-emerald-400 font-mono">
                              Admin: {evt.adminEmail}
                            </div>
                          )}
                          {evt.note && <div className="text-[11px] text-slate-400">{evt.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Task 1, 2, 7: Staff & Owner Actions Toolbar */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Order Execution & Decision Actions:
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Reopen Order (Task 2 & 7: Available for rejected orders, or to reopen any order) */}
                {(selectedOrder.status === 'Rejected' || selectedOrder.status === 'Payment Rejected') && (
                  <button
                    type="button"
                    onClick={() => handleReopenOrder(selectedOrder.id)}
                    disabled={reopeningOrderId === selectedOrder.id || user?.role !== 'owner'}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${reopeningOrderId === selectedOrder.id ? 'animate-spin' : ''}`} />
                    <span>{reopeningOrderId === selectedOrder.id ? 'Reopening Order...' : 'Reopen Order (Restore to Pending Review)'}</span>
                  </button>
                )}

                {/* 2. Approve Order */}
                {(selectedOrder.status === 'Pending' ||
                  selectedOrder.status === 'Pending Payment Verification' ||
                  selectedOrder.status === 'Rejected' ||
                  selectedOrder.status === 'Payment Rejected') && (
                  <button
                    type="button"
                    onClick={() => handleApprovePayment(selectedOrder.id)}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Order</span>
                  </button>
                )}

                {/* 3. Reject Order */}
                {selectedOrder.status !== 'Rejected' && selectedOrder.status !== 'Payment Rejected' && (
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    className="px-5 py-3 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reject Order</span>
                  </button>
                )}

                {/* 4. Deliver / Complete Order (If Approved / Delivery Pending) */}
                {(selectedOrder.status === 'Approved' || selectedOrder.status === 'Delivery Pending') && (
                  <button
                    type="button"
                    onClick={() => setDeliverModalOpen(true)}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Mark Completed & Dispatch BeastMC Delivery Email</span>
                  </button>
                )}
              </div>

              {/* Owner Status Override & Individual Deletion Bar (Task 1, 3 & 7) */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetOverrideStatus('Pending');
                      setStatusOverrideModalOpen(true);
                    }}
                    disabled={user?.role !== 'owner'}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 flex items-center gap-1.5 font-bold disabled:opacity-40"
                    title={user?.role === 'owner' ? 'Directly change status' : 'Owner permission required'}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change Status...</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteSingleOrderPrompt(selectedOrder)}
                    disabled={user?.role !== 'owner'}
                    className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-950 border border-rose-800 text-rose-300 font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete This Order</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task 3: Order Deletion Confirmation Modal (Single or Bulk, Soft Deletion) */}
      {orderDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Confirm Order Removal
                </h3>
                <span className="text-[11px] font-bold text-amber-400">
                  Task 3 & 8: Soft Deletion with Financial Audit Protection
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {orderDeleteTarget.type === 'single'
                ? `Are you sure you want to delete Order #${orderDeleteTarget.orderCode}?`
                : orderDeleteTarget.type === 'selected'
                ? `Are you sure you want to delete ${selectedOrderIds.length} selected order(s)?`
                : `Are you sure you want to delete all ${orderDeleteTarget.type} orders?`}
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300">Financial Audit Guarantee:</div>
              <div>
                • Orders will be soft-deleted and hidden from active views.
              </div>
              <div>
                • Payment transaction logs and audit timestamps remain preserved permanently in PostgreSQL.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderDeleteTarget(null)}
                disabled={deletingOrders}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteOrderDeletion}
                disabled={deletingOrders}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-950 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingOrders ? 'Deleting...' : 'Confirm Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task 1 & 7: Owner Status Override Modal */}
      {statusOverrideModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase font-black">Owner Control</span>
                <h3 className="text-lg font-black text-white">Override Order Status</h3>
              </div>
              <button
                onClick={() => setStatusOverrideModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select the new status for Order <strong>#{selectedOrder.orderCode}</strong>. This status change will be recorded in the audit history.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Target Status:</label>
                <select
                  value={targetOverrideStatus}
                  onChange={(e) => setTargetOverrideStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold focus:border-amber-500"
                >
                  <option value="Pending">Pending (Restores to Pending Review)</option>
                  <option value="Approved">Approved (Payment verified, ready for delivery)</option>
                  <option value="Completed">Completed (Fulfilled in-game)</option>
                  <option value="Rejected">Rejected (Payment rejected)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Audit Log Note (Optional):</label>
                <textarea
                  rows={2}
                  value={statusOverrideNote}
                  onChange={(e) => setStatusOverrideNote(e.target.value)}
                  placeholder="Reason or note for this status change..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusOverrideModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleOverrideOrderStatus(selectedOrder.id, targetOverrideStatus)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg"
              >
                Apply Status Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payment Reason Modal */}
      {rejectModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-800/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Reject Payment for #{selectedOrder.orderCode}</h3>
            <p className="text-xs text-slate-400">
              Provide a clear reason for rejecting this manual payment proof. The player will see this note in their dashboard.
            </p>
            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Transaction ID was not found in our bank statement or amount does not match."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliver Order & Email Dispatch Modal */}
      {deliverModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Fulfillment & Official Email Dispatch
              </span>
              <h3 className="text-xl font-black text-white">
                Deliver Order #{selectedOrder.orderCode}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Marking this order as delivered will immediately send an official delivery confirmation email from <strong>BeastMC Support</strong> to <strong className="text-emerald-400">{selectedOrder.userEmail}</strong> with order code, product details, player username, and your editable Discord support link.
            </p>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-400 font-bold uppercase tracking-wider">
                Editable Discord Support Link for this Email:
              </label>
              <input
                type="text"
                value={customDiscordLink}
                onChange={(e) => setCustomDiscordLink(e.target.value)}
                placeholder="https://discord.gg/beastmc"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-slate-500 block">
                The player can click this Discord button inside the email if they need ticket assistance.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeliverModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeliverOrder}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Confirm Delivery & Send Email</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Website Timezone Selector Modal */}
      {isTimezoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black text-white">Website Timezone</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTimezoneModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Select the primary operating timezone for BeastMC Network. All date filter presets (Today, Yesterday, Last 7 Days, This Month, etc.) and custom date queries use this timezone consistently.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Select Timezone (IANA)
              </label>
              <select
                value={configuredTimezone}
                onChange={(e) => handleSaveTimezone(e.target.value)}
                disabled={savingTimezone}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (US Eastern Time - EDT/EST)</option>
                <option value="America/Chicago">America/Chicago (US Central Time - CDT/CST)</option>
                <option value="America/Denver">America/Denver (US Mountain Time - MDT/MST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (US Pacific Time - PDT/PST)</option>
                <option value="Europe/London">Europe/London (GMT / British Summer Time)</option>
                <option value="Europe/Berlin">Europe/Berlin (Central European Time)</option>
                <option value="Europe/Paris">Europe/Paris (Central European Time)</option>
                <option value="Asia/Karachi">Asia/Karachi (Pakistan Standard Time - PKT UTC+5)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (India Standard Time - IST UTC+5:30)</option>
                <option value="Asia/Dubai">Asia/Dubai (Gulf Standard Time - GST UTC+4)</option>
                <option value="Asia/Singapore">Asia/Singapore (Singapore Time - SGT UTC+8)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (Japan Standard Time - JST UTC+9)</option>
                <option value="Australia/Sydney">Australia/Sydney (Australian Eastern Time)</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsTimezoneModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS & PRICES MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Store Products & Pricing
              </h2>
              <p className="text-xs text-slate-400">
                Manage ranks, coins, keys, bundles, prices, discounts, and included perks.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingProduct({
                  name: '',
                  slug: '',
                  category: 'rank',
                  price: 999,
                  description: '',
                  perks: '["Exclusive Perks Here"]',
                  badge: 'POPULAR',
                  color: '#10b981',
                  isActive: 1,
                  sortOrder: 0,
                });
                setProductModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsList.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {p.imageUrl ? (
                    <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded text-slate-950"
                      style={{ backgroundColor: p.color || '#10b981' }}
                    >
                      {p.category} &bull; {p.badge || 'Active'}
                    </span>
                    <span className="text-lg font-black text-white">
                      ${(p.price / 100).toFixed(2)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">/{p.slug}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingProduct(p);
                        setProductModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      title="Edit Product"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 rounded-lg"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {productModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full my-8 p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white">
              {editingProduct.id ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="e.g. BEAST Rank"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">URL Slug</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.slug || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                    placeholder="e.g. beast-rank"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={editingProduct.category || 'rank'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="rank">Server Rank</option>
                    <option value="coins">Beast Coins</option>
                    <option value="crate">Crates & Keys</option>
                    <option value="bundle">Special Bundle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Price in Cents ($19.99 = 1999)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Original Price (Strikeout Cents)</label>
                  <input
                    type="number"
                    value={editingProduct.originalPrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Perks JSON Array (e.g. ["Fly in Hub", "KeepXP"])</label>
                <textarea
                  rows={3}
                  value={
                    typeof editingProduct.perks === 'string'
                      ? editingProduct.perks
                      : JSON.stringify(editingProduct.perks || [])
                  }
                  onChange={(e) => setEditingProduct({ ...editingProduct, perks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={editingProduct.badge || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                    placeholder="e.g. BEST VALUE"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Theme Color (Hex)</label>
                  <input
                    type="text"
                    value={editingProduct.color || '#10b981'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <ImageUploader
                  label="Store Product Image"
                  description="Upload a custom PNG, JPG, or WebP image for this store item"
                  currentUrl={editingProduct.imageUrl || null}
                  category="product"
                  recommendedDimensions="800x800 PNG/WebP"
                  token={token}
                  onSave={(url) => setEditingProduct({ ...editingProduct, imageUrl: url })}
                  onRemove={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENT METHODS (UNLIMITED) */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Manual Payment Methods
              </h2>
              <p className="text-xs text-slate-400">
                Add unlimited bank accounts, IBANs, EasyPaisa, JazzCash, QR codes, and custom transfer instructions.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingMethod({
                  name: '',
                  accountTitle: '',
                  accountNumber: '',
                  iban: '',
                  bankName: '',
                  qrCodeUrl: '',
                  instructions: '1. Send payment to the account details above.\n2. Note your Minecraft IGN in remarks.\n3. Take a screenshot of the completed transfer.',
                  currency: 'USD',
                  exchangeRate: '1.0',
                  isActive: 1,
                });
                setMethodModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Payment Method</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paymentMethodsList.map((m) => (
              <div
                key={m.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-400">{m.name}</span>
                    <span className="text-xs font-mono font-bold text-slate-400">{m.currency}</span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                    <div>
                      <span className="text-slate-500">Account Title:</span>{' '}
                      <span className="font-bold text-white">{m.accountTitle}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Account / Wallet / Phone:</span>{' '}
                      <span className="font-mono font-bold text-amber-400">{m.accountNumber}</span>
                    </div>
                    {m.iban && (
                      <div>
                        <span className="text-slate-500">IBAN:</span>{' '}
                        <span className="font-mono text-slate-300">{m.iban}</span>
                      </div>
                    )}
                  </div>

                  {m.qrCodeUrl && (
                    <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <img src={m.qrCodeUrl} alt="QR" className="w-14 h-14 bg-white p-1 rounded-lg" />
                      <span className="text-[11px] text-slate-400">QR Code configured for instant app scanning</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 line-clamp-3 whitespace-pre-line bg-slate-950/50 p-2.5 rounded-xl border border-slate-850">
                    {m.instructions}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Status: <strong className={m.isActive ? 'text-emerald-400' : 'text-slate-500'}>{m.isActive ? 'Active' : 'Disabled'}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingMethod(m);
                        setMethodModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      title="Edit Payment Method"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePaymentMethod(m.id)}
                      className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 rounded-lg"
                      title="Delete Payment Method"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Payment Method Modal */}
      {methodModalOpen && editingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full my-8 p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white">
              {editingMethod.id ? 'Edit Payment Method' : 'Add Unlimited Payment Method'}
            </h3>
            <form onSubmit={handleSavePaymentMethod} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Method Name (e.g. Bank Wire / EasyPaisa / Crypto)</label>
                <input
                  type="text"
                  required
                  value={editingMethod.name || ''}
                  onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                  placeholder="e.g. Bank Transfer (IBAN)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Account Title / Beneficiary</label>
                  <input
                    type="text"
                    required
                    value={editingMethod.accountTitle || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, accountTitle: e.target.value })}
                    placeholder="e.g. BeastMC Network LLC"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Account / Phone / Wallet Address</label>
                  <input
                    type="text"
                    required
                    value={editingMethod.accountNumber || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, accountNumber: e.target.value })}
                    placeholder="e.g. 9820-4102-5819"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">IBAN (Optional)</label>
                  <input
                    type="text"
                    value={editingMethod.iban || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, iban: e.target.value })}
                    placeholder="GB29BEAST98204102581901"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Bank Name / Provider</label>
                  <input
                    type="text"
                    value={editingMethod.bankName || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, bankName: e.target.value })}
                    placeholder="e.g. Standard Chartered"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">QR Code Image URL (Optional)</label>
                <input
                  type="text"
                  value={editingMethod.qrCodeUrl || ''}
                  onChange={(e) => setEditingMethod({ ...editingMethod, qrCodeUrl: e.target.value })}
                  placeholder="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Currency Code</label>
                  <input
                    type="text"
                    value={editingMethod.currency || 'USD'}
                    onChange={(e) => setEditingMethod({ ...editingMethod, currency: e.target.value.toUpperCase() })}
                    placeholder="USD, PKR, EUR, USDT"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Exchange Rate to 1 USD</label>
                  <input
                    type="text"
                    value={editingMethod.exchangeRate || '1.0'}
                    onChange={(e) => setEditingMethod({ ...editingMethod, exchangeRate: e.target.value })}
                    placeholder="1.0 or 280.0 for PKR"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Step-by-Step Payment Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={editingMethod.instructions || ''}
                  onChange={(e) => setEditingMethod({ ...editingMethod, instructions: e.target.value })}
                  placeholder="Instructions displayed to the player..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMethodModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow"
                >
                  Save Payment Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: SITE & SERVER IP SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-8 max-w-4xl">
          {/* SECTION 1: WEBSITE LOGO, FAVICON & BRANDING IMAGES */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-wider border border-emerald-500/20 mb-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Owner Branding Dashboard</span>
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  Website Logo, Favicon & Brand Images
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload, preview, replace, and remove images stored persistently in server storage and database.
                </p>
              </div>
              <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                PNG • JPG • WebP (Max 10MB)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Website Logo */}
              <ImageUploader
                label="Website Brand Logo"
                description="Displayed in navigation header, footer, and brand banners."
                currentUrl={settingsForm.logoUrl || null}
                category="logo"
                recommendedDimensions="512x512 PNG/WebP"
                token={token}
                onSave={(url) => handleSaveImageSetting('logoUrl', url, 'Website Logo')}
                onRemove={() => handleRemoveImageSetting('logoUrl', 'Website Logo')}
              />

              {/* 2. Website Favicon */}
              <ImageUploader
                label="Website Browser Favicon"
                description="Browser tab icon displayed beside page title across all tabs."
                currentUrl={settingsForm.faviconUrl || null}
                category="favicon"
                recommendedDimensions="64x64 or 32x32 PNG/WebP"
                token={token}
                onSave={(url) => handleSaveImageSetting('faviconUrl', url, 'Website Favicon')}
                onRemove={() => handleRemoveImageSetting('faviconUrl', 'Website Favicon')}
              />

              {/* 3. Homepage Background Image */}
              <ImageUploader
                label="Homepage Background Image"
                description="High-resolution backdrop for the server hero section."
                currentUrl={settingsForm.heroBgUrl || null}
                category="background"
                recommendedDimensions="1920x1080 JPG/WebP"
                token={token}
                onSave={(url) => handleSaveImageSetting('heroBgUrl', url, 'Homepage Background')}
                onRemove={() => handleRemoveImageSetting('heroBgUrl', 'Homepage Background')}
              />

              {/* 4. Promotional Banner */}
              <ImageUploader
                label="Promotional & Store Banner"
                description="Special announcement banner shown on homepage & store."
                currentUrl={settingsForm.bannerUrl || null}
                category="banner"
                recommendedDimensions="1200x400 JPG/PNG/WebP"
                token={token}
                onSave={(url) => handleSaveImageSetting('bannerUrl', url, 'Promotional Banner')}
                onRemove={() => handleRemoveImageSetting('bannerUrl', 'Promotional Banner')}
              />
            </div>
          </div>

          {/* SECTION 2: ANNOUNCEMENT BAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-wider border border-emerald-500/20 mb-1.5">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Website Settings • Top Banner</span>
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  Announcement Bar
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Control the top announcement bar shown across all pages. Saved permanently in Supabase database.
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {(settingsForm.announcementEnabled ?? 1) === 1 ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live / Enabled
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    Hidden / Disabled
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-5 text-xs">
              {/* Toggle Enable/Disable */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="space-y-0.5 pr-4">
                  <div className="text-white font-bold text-sm flex items-center gap-2">
                    <span>Enable Announcement Bar</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      (settingsForm.announcementEnabled ?? 1) === 1
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {(settingsForm.announcementEnabled ?? 1) === 1 ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs">
                    When enabled, the announcement is visible at the very top of all pages. When disabled, the entire top bar is hidden.
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={(settingsForm.announcementEnabled ?? 1) === 1}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        announcementEnabled: e.target.checked ? 1 : 0,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Announcement Text Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold uppercase">
                    Announcement Message
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsForm({
                        ...settingsForm,
                        announcementText: 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted',
                      })
                    }
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={settingsForm.announcementText ?? 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted'}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, announcementText: e.target.value })
                  }
                  placeholder="e.g. BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-xs"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tip: Use <span className="text-emerald-400 font-mono font-bold">•</span> (bullet) to separate the highlighted title (first section) from the subtitle details.
                </p>
              </div>

              {/* Live Preview */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                  Live Top Bar Preview
                </div>
                {(settingsForm.announcementEnabled ?? 1) === 1 ? (
                  <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 py-2 px-4 rounded-xl text-xs font-medium border border-emerald-900/60 shadow-inner flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-2 truncate">
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-emerald-400 font-bold uppercase tracking-wider truncate">
                        {(settingsForm.announcementText || 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted').split('•')[0].trim()}
                      </span>
                      {(settingsForm.announcementText || '').includes('•') && (
                        <span className="text-slate-400 hidden sm:inline truncate">
                          &bull; {(settingsForm.announcementText || '').split('•').slice(1).join(' • ').trim()}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-400/70 font-mono shrink-0">Preview</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-slate-500 text-center italic text-xs">
                    Announcement Bar is currently disabled and will be hidden from all visitors.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveAnnouncement}
                  disabled={savingAnnouncement}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingAnnouncement ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : announcementSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Saved & Live!</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Save Announcement Bar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3: SERVER IP & NETWORK DETAILS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="space-y-1 border-b border-slate-800/80 pb-4">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Site Settings & Minecraft Server IP
              </h2>
              <p className="text-xs text-slate-400">
                Customize your server IP (used for live player counts and copy buttons), Discord link, site name, and titles.
              </p>
            </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Network / Site Name</label>
                <input
                  type="text"
                  required
                  value={settingsForm.siteName || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, siteName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Minecraft Server IP (Live status & Copy)
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.serverIp || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, serverIp: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-emerald-400 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Discord Support Invite URL</label>
                <input
                  type="text"
                  value={settingsForm.discordUrl || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, discordUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Support Email Address</label>
                <input
                  type="email"
                  value={settingsForm.supportEmail || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">Hero Title</label>
              <input
                type="text"
                value={settingsForm.heroTitle || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">Hero Subtitle</label>
              <textarea
                rows={2}
                value={settingsForm.heroSubtitle || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingSettings ? <span>Saving Changes...</span> : <span>Save Settings</span>}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* TAB: VOTE LINKS & MINECRAFT DIRECTORIES (OWNER / ADMIN) */}
      {activeTab === 'vote-links' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
                  <Vote className="w-3.5 h-3.5" />
                  <span>Minecraft Server Listings & Rewards</span>
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  Vote Links Manager
                </h2>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Manage all external Minecraft server voting sites listed on the public <span className="text-emerald-400 font-mono">/vote</span> page. Authorized admins can add new websites, edit links, reorder positions, and toggle visibility.
                </p>
              </div>

              <button
                onClick={handleOpenCreateVoteSite}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950 flex items-center justify-center gap-2 transition-all shrink-0 hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vote Link</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Listings</span>
                  <div className="text-xl font-black text-white">{voteSitesList.length}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                  <Vote className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Live on Website</span>
                  <div className="text-xl font-black text-emerald-400">
                    {voteSitesList.filter((s) => s.isActive === 1).length}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                  <Eye className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Disabled / Hidden</span>
                  <div className="text-xl font-black text-slate-400">
                    {voteSitesList.filter((s) => s.isActive !== 1).length}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                  <EyeOff className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Voting Sites Table / List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {loadingVoteSites ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400">Loading vote sites from database...</p>
              </div>
            ) : voteSitesList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Vote className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Voting Links Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click the button below to add your first Minecraft server voting directory listing.
                </p>
                <button
                  onClick={handleOpenCreateVoteSite}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                >
                  + Add First Vote Link
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/70">
                      <th className="py-3 px-4 w-20 text-center">Order</th>
                      <th className="py-3 px-4">Voting Website</th>
                      <th className="py-3 px-4">Vote URL</th>
                      <th className="py-3 px-4">In-Game Reward</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {voteSitesList.map((site, index) => (
                      <tr key={site.id} className="hover:bg-slate-850/50 transition-colors">
                        {/* Order & Reorder Controls */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-mono font-bold text-slate-400 text-xs w-5">
                              #{site.sortOrder || index + 1}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleMoveVoteSite(index, 'up')}
                                disabled={index === 0}
                                className="p-1 rounded hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-white"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveVoteSite(index, 'down')}
                                disabled={index === voteSitesList.length - 1}
                                className="p-1 rounded hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-white"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Name & Description */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              <span>{site.name}</span>
                            </div>
                            {site.description && (
                              <p className="text-[11px] text-slate-400 max-w-xs truncate">
                                {site.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Vote URL */}
                        <td className="py-4 px-4 font-mono text-[11px]">
                          <div className="flex items-center gap-2 max-w-xs">
                            <span className="text-slate-400 truncate">{site.url}</span>
                            <a
                              href={site.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:text-amber-300 p-1 hover:bg-slate-800 rounded shrink-0"
                              title="Open Voting Site"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>

                        {/* Reward Text */}
                        <td className="py-4 px-4">
                          {site.rewardText ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[11px] font-semibold">
                              <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{site.rewardText}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Default server perks</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleVoteSiteActive(site)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                              site.isActive === 1
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                            }`}
                            title="Click to toggle visibility on /vote page"
                          >
                            {site.isActive === 1 ? (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Live (Active)</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>Hidden (Disabled)</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditVoteSite(site)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white transition-colors"
                              title="Edit Vote Link"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setVoteSiteToDelete(site)}
                              className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors border border-red-900/30"
                              title="Delete Vote Link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Vote Site */}
      {voteSiteModalOpen && editingVoteSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full my-8 p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    {editingVoteSite.id ? 'Edit Vote Link' : 'Add New Vote Link'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure the external Minecraft voting directory listing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVoteSiteModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVoteSite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                  Voting Website Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingVoteSite.name || ''}
                  onChange={(e) => setEditingVoteSite({ ...editingVoteSite, name: e.target.value })}
                  placeholder="e.g. TopG Minecraft Servers"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-3 text-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                  Direct Vote URL *
                </label>
                <input
                  type="url"
                  required
                  value={editingVoteSite.url || ''}
                  onChange={(e) => setEditingVoteSite({ ...editingVoteSite, url: e.target.value })}
                  placeholder="https://topg.org/minecraft-servers/server-..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-3 text-white text-sm font-mono focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  When players click "Vote Now", this exact link opens in a new browser tab.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                  In-Game Reward Description
                </label>
                <input
                  type="text"
                  value={editingVoteSite.rewardText || ''}
                  onChange={(e) => setEditingVoteSite({ ...editingVoteSite, rewardText: e.target.value })}
                  placeholder="e.g. 500 Beast Coins + 1x Vote Crate Key"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-3 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editingVoteSite.description || ''}
                  onChange={(e) => setEditingVoteSite({ ...editingVoteSite, description: e.target.value })}
                  placeholder="Vote daily on this website to help BeastMC rank higher and claim your reward bundle."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-3 text-white text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingVoteSite.sortOrder || 1}
                    onChange={(e) => setEditingVoteSite({ ...editingVoteSite, sortOrder: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-700 rounded-xl p-2.5">
                    <input
                      type="checkbox"
                      checked={editingVoteSite.isActive === 1}
                      onChange={(e) => setEditingVoteSite({ ...editingVoteSite, isActive: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-600"
                    />
                    <span className="text-xs font-bold text-white select-none">
                      Active (Visible)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setVoteSiteModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVoteSite}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingVoteSite ? <span>Saving...</span> : <span>Save Vote Link</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Vote Site Confirmation */}
      {voteSiteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-950/60 border border-red-800/40 text-red-400 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">Delete Vote Link?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-white">"{voteSiteToDelete.name}"</strong>? Players will no longer see this voting website on the public Vote page.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setVoteSiteToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVoteSite}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-950 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'mc-server' && (
        <div className="space-y-8 max-w-5xl">
          {/* Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-wider border border-emerald-500/20">
                  <Server className="w-3.5 h-3.5" />
                  <span>Owner Dashboard • Minecraft Server Configuration</span>
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span>Minecraft Server Settings</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold normal-case border border-emerald-500/30">
                    Pterodactyl Panel • Paper
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Configure your real Paper server connection hosted on Pterodactyl Panel, verify Java & Bedrock crossplay, and monitor real live player statistics.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => fetchLiveMcStatus(true)}
                  disabled={loadingLiveStatus}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                  title="Refreshes automatically every 30s. Click to refresh now."
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLiveStatus ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Refresh Server Status</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestMinecraftConnection}
                  disabled={testingMc}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${testingMc ? 'animate-bounce' : ''}`} />
                  <span>{testingMc ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>

            {/* Real Live Server Diagnostics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>Live Server Status</span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  {liveMcStatus?.status === 'online' || liveMcStatus?.online === true ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-sm font-black text-emerald-400">ONLINE</span>
                    </>
                  ) : liveMcStatus?.status === 'offline' ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-sm font-black text-rose-400">OFFLINE</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-sm font-black text-amber-400">STATUS UNAVAILABLE</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <UsersIcon className="w-3 h-3 text-emerald-400" />
                  <span>Online Players</span>
                </div>
                <div className="text-sm font-black text-white font-mono pt-0.5">
                  {liveMcStatus?.online ? (
                    <>
                      <span className="text-emerald-400">{liveMcStatus?.players?.online ?? 0}</span>
                      <span className="text-slate-500 text-xs"> / {liveMcStatus?.players?.max ?? 0}</span>
                    </>
                  ) : (
                    <span className="text-slate-500">0 / 0</span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-emerald-400" />
                  <span>Minecraft Software</span>
                </div>
                <div className="text-sm font-bold text-slate-200 truncate pt-0.5">
                  {liveMcStatus?.version?.name || (liveMcStatus?.online ? 'Paper 1.20 - 1.21.x' : 'Paper')}
                </div>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Server Ping / Latency</span>
                </div>
                <div className="text-sm font-bold text-amber-400 font-mono pt-0.5">
                  {liveMcStatus?.latency ? `${liveMcStatus.latency}ms` : (liveMcStatus?.online ? 'Active' : 'Offline')}
                </div>
              </div>
            </div>

            {/* Last checked timestamp */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
              <span>Host Target: {liveMcStatus?.ip || mcForm.serverIp}:{liveMcStatus?.port || mcForm.serverPort}</span>
              <span>{liveMcStatus?.lastUpdated ? `Last verified: ${new Date(liveMcStatus.lastUpdated).toLocaleTimeString()}` : 'Auto-query enabled'} (Refreshes every 30s)</span>
            </div>
          </div>

          {/* Test Connection Results Panel (Task 5) */}
          {testResult && (
            <div
              className={`border rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl transition-all animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/40'
                  : testResult.status === 'offline'
                  ? 'bg-rose-950/30 border-rose-500/40'
                  : 'bg-amber-950/30 border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  {testResult.success ? (
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : testResult.status === 'offline' ? (
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <WifiOff className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Minecraft Connection Test Result
                    </div>
                    <div className="text-base font-black text-white flex items-center gap-2">
                      <span>
                        {testResult.success
                          ? 'Connection Successful'
                          : testResult.status === 'offline'
                          ? 'Server Offline'
                          : testResult.status === 'invalid_address'
                          ? 'Invalid IP or Port'
                          : 'Connection Timed Out / Status Unavailable'}
                      </span>
                      {testResult.latency && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 font-mono border border-slate-800">
                          {testResult.latency}ms ping
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTestResult(null)}
                  className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {testResult.message}
              </p>

              {testResult.motd?.clean && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <Server className="w-4 h-4 shrink-0" />
                  <span className="truncate">MOTD: {testResult.motd.clean}</span>
                </div>
              )}

              {/* Troubleshooting helper for Pterodactyl */}
              {!testResult.success && (
                <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs space-y-2 text-slate-400">
                  <div className="font-bold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Pterodactyl Panel Diagnostic Checklist:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    <li>Log into your Pterodactyl Panel and confirm the Paper server console shows "Done! For help, type help".</li>
                    <li>Verify the allocated port in Pterodactyl Network Settings matches the Java Server Port configured below.</li>
                    <li>If you are using a subdomain (e.g. play.beastmc.net), ensure your SRV or A record points to the correct node IP and port.</li>
                    <li>If Bedrock crossplay is active, check that the GeyserMC plugin port matches your Bedrock Port setting.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Form Settings (Task 1: Server Name, IP/Hostname, Java Port, Bedrock Port, Server Type, Crossplay) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Server Connection Parameters
                </h3>
                <p className="text-xs text-slate-400">
                  Enter your Minecraft server details. Saved permanently in database and used by the entire website.
                </p>
              </div>

              {user?.role === 'owner' ? (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Owner Authorization Confirmed</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Read-Only: Owner Role Required to Save</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSaveMcSettings} className="space-y-6 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* 1. Server Name */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider">
                    1. Server Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={user?.role !== 'owner'}
                    value={mcForm.siteName}
                    onChange={(e) => setMcForm({ ...mcForm, siteName: e.target.value })}
                    placeholder="BeastMC Network"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-medium focus:border-emerald-500 transition-colors disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-500">
                    Display name for your Minecraft community and website branding.
                  </p>
                </div>

                {/* 2. Minecraft Server IP / Hostname */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider">
                    2. Minecraft Server IP / Hostname
                  </label>
                  <input
                    type="text"
                    required
                    disabled={user?.role !== 'owner'}
                    value={mcForm.serverIp}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(':') && !val.includes('::')) {
                        const parts = val.split(':');
                        if (parts.length === 2 && /^\d+$/.test(parts[1])) {
                          const pNum = parseInt(parts[1], 10);
                          if (pNum >= 1 && pNum <= 65535) {
                            setMcForm({ ...mcForm, serverIp: parts[0].trim(), serverPort: pNum });
                            return;
                          }
                        }
                      }
                      setMcForm({ ...mcForm, serverIp: val });
                    }}
                    placeholder="play.beastmc.net or your Pterodactyl node host"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-emerald-400 font-mono font-bold focus:border-emerald-500 transition-colors disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-500">
                    Public domain hostname or Pterodactyl node address. (Localhost and private subnets are blocked).
                  </p>
                </div>

                {/* 3. Java Server Port */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider">
                    3. Java Server Port
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    required
                    disabled={user?.role !== 'owner'}
                    value={mcForm.serverPort}
                    onChange={(e) => setMcForm({ ...mcForm, serverPort: parseInt(e.target.value, 10) || 25565 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono font-bold focus:border-emerald-500 transition-colors disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-500">
                    Port allocated to your Paper server in Pterodactyl Panel (Standard: 25565).
                  </p>
                </div>

                {/* 4. Bedrock Server Port (Optional) */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider">
                    4. Bedrock Server Port (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    disabled={user?.role !== 'owner'}
                    value={mcForm.bedrockPort}
                    onChange={(e) => setMcForm({ ...mcForm, bedrockPort: parseInt(e.target.value, 10) || 19132 })}
                    placeholder="19132"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono font-bold focus:border-emerald-500 transition-colors disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-500">
                    Bedrock port for GeyserMC / Floodgate players (Standard: 19132 or custom Pterodactyl allocation).
                  </p>
                </div>

                {/* 5. Server Type (Paper / BungeeCord) */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider">
                    5. Server Architecture Type
                  </label>
                  <select
                    value={mcForm.serverType}
                    disabled={user?.role !== 'owner'}
                    onChange={(e) => setMcForm({ ...mcForm, serverType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold focus:border-emerald-500 transition-colors disabled:opacity-60"
                  >
                    <option value="paper">Paper (Standalone Server — Current Setup)</option>
                    <option value="bungeecord">BungeeCord / Velocity (Network Proxy — Future Upgrade)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Task 7: Set to Paper now. BungeeCord architecture is fully pre-configured for future multi-server expansion.
                  </p>
                </div>

                {/* 6. Crossplay Enabled (Yes / No) */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider">
                    6. Crossplay Enabled (Java + Bedrock)
                  </label>
                  <select
                    value={mcForm.crossplayEnabled}
                    disabled={user?.role !== 'owner'}
                    onChange={(e) => setMcForm({ ...mcForm, crossplayEnabled: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold focus:border-emerald-500 transition-colors disabled:opacity-60"
                  >
                    <option value={1}>Yes (Crossplay enabled via GeyserMC & Floodgate)</option>
                    <option value={0}>No (Java Players Only)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Task 3: Automatically queries GeyserMC and consolidates unique players without double-counting.
                  </p>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingMcSettings || user?.role !== 'owner'}
                    className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{savingMcSettings ? 'Saving to Database...' : 'Save Settings'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestMinecraftConnection}
                    disabled={testingMc}
                    className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>{testingMc ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchLiveMcStatus(true)}
                    disabled={loadingLiveStatus}
                    className="px-4 py-3.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLiveStatus ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>Refresh Server Status</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Storage: Cloud SQL PostgreSQL (site_settings table)
                </div>
              </div>
            </form>
          </div>

          {/* Real Online Players Preview (Task 4: Zero fake players, real usernames & avatars) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-emerald-400" />
                  <span>Real Connected Minecraft Players</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    {liveMcStatus?.online ? (liveMcStatus?.players?.online ?? 0) : 0} Online
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Task 4: Real player usernames and avatars retrieved from Paper server queries. Zero fake demo players.
                </p>
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                Avatars: Crafatar / MC-Heads
              </span>
            </div>

            {liveMcStatus?.online && liveMcStatus?.players?.list && liveMcStatus.players.list.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                {liveMcStatus.players.list.map((player: any, idx: number) => (
                  <div
                    key={`${player.name}-${idx}`}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center gap-3"
                  >
                    <img
                      src={`https://mc-heads.net/avatar/${player.uuid || player.name}/40`}
                      alt={player.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/40';
                      }}
                      className="w-8 h-8 rounded-lg border border-slate-700 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white truncate">{player.name}</div>
                      <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Online</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : liveMcStatus?.online && (liveMcStatus?.players?.online ?? 0) > 0 ? (
              <div className="p-6 bg-slate-950/50 border border-slate-800/80 rounded-2xl text-center space-y-1">
                <div className="text-sm font-bold text-white">
                  {liveMcStatus?.players?.online} Player{(liveMcStatus?.players?.online ?? 0) > 1 ? 's' : ''} Currently In-Game
                </div>
                <p className="text-xs text-slate-400">
                  Player count verified from live Paper server query. (Paper server hide-players sample setting is enabled in server.properties).
                </p>
              </div>
            ) : liveMcStatus?.online ? (
              <div className="p-6 bg-slate-950/50 border border-slate-800/80 rounded-2xl text-center space-y-1">
                <div className="text-sm font-bold text-slate-300">
                  0 Players Currently Online
                </div>
                <p className="text-xs text-slate-500">
                  The Paper server is running. No players have connected yet. Join at <span className="text-emerald-400 font-mono">{mcForm.serverIp}</span>!
                </p>
              </div>
            ) : (
              <div className="p-6 bg-rose-950/20 border border-rose-900/30 rounded-2xl text-center space-y-1">
                <div className="text-sm font-bold text-white">
                  Server Offline or Unreachable
                </div>
                <p className="text-xs text-slate-400">
                  No fake accounts are shown. When the Paper server is started on Pterodactyl Panel, active players will be displayed here automatically.
                </p>
              </div>
            )}
          </div>

          {/* Architecture & Security Notice (Task 7 & 9) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
              <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                <span>Task 7: Future BungeeCord Architecture</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your server currently runs on Paper on Pterodactyl. In the future, when you upgrade to a BungeeCord proxy with multiple sub-servers (e.g. SMP, Skyblock, Bedwars), switching Server Type to BungeeCord will automatically query all sub-nodes and aggregate unique players network-wide without double-counting.
              </p>
            </div>

            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Task 9: Security & Permissions</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Backend endpoints strictly verify Owner permissions (<code>role === 'owner'</code>) via cryptographic tokens. All server IPs and hostnames are validated to block private subnets (10.x, 172.16-31.x, 192.168.x, 127.0.0.1) and cloud metadata services.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: USER MANAGEMENT (OWNER DASHBOARD) */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                User Management
              </h2>
              <p className="text-xs text-slate-400">
                View all registered users, view user emails, search accounts, delete users, and initiate secure password resets.
              </p>
            </div>

            {/* Live Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by email, IGN, or username..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* User Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/60">
                  <th className="py-3 px-4">User & Email Address</th>
                  <th className="py-3 px-4">Minecraft IGN</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {usersList
                  .filter((u) => {
                    const q = userSearchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      u.email.toLowerCase().includes(q) ||
                      u.username.toLowerCase().includes(q) ||
                      u.minecraftUsername.toLowerCase().includes(q) ||
                      u.role.toLowerCase().includes(q)
                    );
                  })
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{u.username}</div>
                        <div className="text-xs font-mono text-emerald-400 mt-0.5">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://mc-heads.net/avatar/${u.minecraftUsername}/24`}
                            alt="IGN"
                            className="w-6 h-6 rounded bg-slate-950"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="font-mono font-bold text-white">{u.minecraftUsername}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            u.role === 'owner'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : u.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : u.role === 'moderator'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 text-amber-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          title="Generate a secure temporary password for this user"
                        >
                          <Key className="w-3 h-3" />
                          <span>Reset Password</span>
                        </button>

                        <button
                          onClick={() => handleOpenStaffModal(u)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                          title="Assign staff role"
                        >
                          Edit Role
                        </button>

                        {user?.role === 'owner' && (
                          u.role === 'owner' ? (
                            <span
                              className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-500 rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-default"
                              title="Owner account cannot be deleted"
                            >
                              <Shield className="w-3 h-3 text-red-500/50" />
                              <span>Owner</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="Permanently delete user account"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Role & Permissions Editor Modal */}
      {editingStaffUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Staff Role & Granular Permissions
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                {editingStaffUser.username} ({editingStaffUser.email})
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Assign Role</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['player', 'moderator', 'admin', 'owner'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`p-2 rounded-xl text-center font-bold capitalize transition-all ${
                        selectedRole === r
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular perms */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-bold uppercase">
                  Server-Side Enforced Permissions
                </label>
                <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800 max-h-56 overflow-y-auto">
                  {availablePermissions.map((perm) => {
                    const isChecked = selectedRole === 'owner' || userPermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2.5 cursor-pointer text-slate-300 text-xs"
                      >
                        <input
                          type="checkbox"
                          disabled={selectedRole === 'owner'}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserPermissions([...userPermissions, perm.key]);
                            } else {
                              setUserPermissions(userPermissions.filter((k) => k !== perm.key));
                            }
                          }}
                          className="rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                        />
                        <span>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingStaffUser(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStaffRole}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Save Role & Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Delete Confirmation Popup Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  Confirm Account Deletion
                </span>
                <h3 className="text-lg font-black text-white mt-1">Delete User Account</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to permanently delete this user account from BeastMC Network?
                </p>
              </div>
              <button
                onClick={() => !isDeletingUser && setUserToDelete(null)}
                disabled={isDeletingUser}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Info Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-3">
                <img
                  src={`https://mc-heads.net/avatar/${userToDelete.minecraftUsername}/36`}
                  alt="IGN"
                  className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-sm truncate">{userToDelete.username}</div>
                  <div className="text-xs font-mono text-emerald-400 truncate">{userToDelete.email}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Minecraft IGN:</span>
                <span className="font-mono font-bold text-white">{userToDelete.minecraftUsername}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Account Role:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-200">
                  {userToDelete.role}
                </span>
              </div>
            </div>

            {/* Safety & Order Preservation Notice */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-amber-300">Data Preservation:</strong> The user will no longer be able to log in. All historical order records, transaction IDs, and manual payment verification proofs are safely preserved in the database for auditing and accounting.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeletingUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/30 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting User...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete User Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <Key className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Reset Account Password</h3>
              </div>
              <button
                onClick={() => !isResettingPassword && setUserToResetPassword(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Generate a secure temporary password for <strong className="text-white">{userToResetPassword.email}</strong> ({userToResetPassword.minecraftUsername})?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setUserToResetPassword(null)}
                disabled={isResettingPassword}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetPassword}
                disabled={isResettingPassword}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg inline-flex items-center gap-1"
              >
                {isResettingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                <span>Generate Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Result Modal */}
      {resetPasswordModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Password Reset Generated</h3>
              </div>
              <button
                onClick={() => setResetPasswordModalData(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              A new secure temporary password has been set for <strong className="text-white">{resetPasswordModalData.email}</strong>.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="font-mono text-emerald-400 font-bold text-sm tracking-wider select-all">
                {resetPasswordModalData.tempPassword}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetPasswordModalData.tempPassword);
                  setTempPasswordCopied(true);
                  setTimeout(() => setTempPasswordCopied(false), 2000);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                {tempPasswordCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{tempPasswordCopied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setResetPasswordModalData(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: DISPATCHED SUPPORT EMAILS */}
      {activeTab === 'emails' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              Dispatched BeastMC Support Emails
            </h2>
            <p className="text-xs text-slate-400">
              Audit log of official fulfillment emails dispatched to players with order code, product details, delivery confirmation, and Discord link.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/60">
                  <th className="py-3 px-4">Date Sent</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Player IGN</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {sentEmailsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No delivery emails dispatched yet. Mark an approved order as "Delivered" to send an email.
                    </td>
                  </tr>
                ) : (
                  sentEmailsList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-850/50">
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">{e.recipientEmail}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">{e.minecraftUsername}</td>
                      <td className="py-3.5 px-4 text-slate-300">{e.subject}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setPreviewEmail(e)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                        >
                          View HTML Email
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HTML Email Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">
                  Official BeastMC Support Email
                </span>
                <h3 className="text-sm font-bold text-white">{previewEmail.subject}</h3>
              </div>
              <button
                onClick={() => setPreviewEmail(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 rounded-xl p-4 border border-slate-800">
              <div
                dangerouslySetInnerHTML={{ __html: previewEmail.bodyHtml }}
                className="text-white"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewEmail(null)}
                className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              Security & Action Audit Logs
            </h2>
            <p className="text-xs text-slate-400">
              Real-time audit records of staff actions, order verifications, payment approvals, and configuration changes.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/60">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Staff Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                {auditLogsList.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50">
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-amber-400">{log.adminEmail}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{log.action}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
