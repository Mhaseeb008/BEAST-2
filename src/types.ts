export interface User {
  id: number;
  uid: string;
  supabaseUid?: string;
  email: string;
  username: string;
  minecraftUsername: string;
  role: 'user' | 'player' | 'moderator' | 'admin' | 'owner';
  permissions: string[];
  isBanned?: number;
  createdAt?: string;
}

export interface SeasonSettings {
  seasonTitle: string; // e.g. "BeastMC Season 4" or custom text
  seasonNumber: string | number; // e.g. "4"
  statusBadge: string; // e.g. "Active"
  seasonSubtitle: string; // e.g. "24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted"
  customText?: string;
}

export interface RankFeatureValue {
  enabled: boolean;
  valueType: 'boolean' | 'text';
  customText?: string; // e.g. "2", "Unlimited (54)", "✓ Supreme"
}

export interface RankComparisonFeature {
  id: string; // unique feature id, e.g. 'feat_fly'
  name: string; // e.g. "Lobby Flight (/fly)"
  description?: string; // e.g. "Access to flight mode in BeastMC main lobby"
  category?: string; // e.g. "General", "Survival", "Mining"
  order: number; // sort index
  visible: boolean; // true = shown on public matrix, false = hidden
  // Keyed by rank ID (as string) or rank slug
  ranks: Record<string, RankFeatureValue>;
}

export interface RankComparisonConfig {
  features: RankComparisonFeature[];
  updatedAt?: string;
}

export interface SiteSettings {
  id: number;
  siteName: string;
  serverIp: string;
  serverPort: number;
  discordUrl: string;
  logoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBgUrl: string;
  bannerUrl?: string;
  faviconUrl?: string;
  supportEmail: string;
  serverType?: 'paper' | 'bungeecord';
  bedrockPort?: number;
  crossplayEnabled?: number; // 1 = Yes, 0 = No
  networkServers?: string; // JSON array of sub-servers
  announcementText?: string;
  announcementEnabled?: number; // 1 = Yes, 0 = No
  timezone?: string;
  seasonSettings?: SeasonSettings;
  seasonTitle?: string;
  seasonNumber?: string | number;
  seasonSubtitle?: string;
  updatedAt?: string;
}

export interface McPlayerSample {
  name: string;
  uuid?: string;
}

export interface McNetworkServerNode {
  id: string;
  name: string;
  ip: string;
  port: number;
  online: boolean;
  players: {
    online: number;
    max: number;
  };
  motd?: string;
}

export interface VoteSite {
  id: number;
  name: string;
  url: string;
  description?: string;
  rewardText?: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: number; // 1 = Enabled, 0 = Disabled
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category: 'rank' | 'coins' | 'crate' | 'bundle';
  price: number; // in cents ($19.99 = 1999)
  originalPrice?: number | null;
  description: string;
  perks: string; // JSON array string
  badge?: string;
  color?: string;
  icon?: string;
  imageUrl?: string;
  isFeatured: number;
  isActive: number;
  sortOrder: number;
  createdAt?: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
  bankName?: string;
  qrCodeUrl?: string;
  instructions: string;
  currency: string;
  exchangeRate: string;
  isActive: number;
  createdAt?: string;
}

export interface OrderHistoryItem {
  action:
    | 'Order Created'
    | 'Payment Submitted'
    | 'Order Approved'
    | 'Order Rejected'
    | 'Order Reopened'
    | 'Payment Verified'
    | 'Order Completed'
    | 'Order Deleted';
  timestamp: string;
  adminEmail: string;
  note?: string;
}

export interface Order {
  id: number;
  orderCode: string;
  userId: number;
  userEmail: string;
  minecraftUsername: string;
  productId: number;
  productName: string;
  amount: number;
  currency: string;
  paymentMethodId: number;
  paymentMethodName: string;
  transactionId: string;
  senderNote?: string;
  paymentScreenshotUrl?: string;
  status:
    | 'Pending'
    | 'Approved'
    | 'Rejected'
    | 'Completed'
    | 'Pending Payment Verification'
    | 'Payment Rejected'
    | 'Delivery Pending'
    | 'Delivered';
  rejectionReason?: string;
  approvedAt?: string;
  deliveredAt?: string;
  deliveryNotice?: string;
  deliveryEmailSent?: number;
  deliveredByAdmin?: string;
  paymentVerified?: number;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  orderHistory?: string;
  isDeleted?: number;
  deletedAt?: string;
  deletedByAdmin?: string;
  productCategory?: string;
  packageType?: string;
  deliveryDeadline?: string | null;
  customerUsername?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterStatistics {
  totalOrders: number;
  pendingOrders: number;
  paymentVerifiedOrders: number;
  awaitingDeliveryOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  completedOrders: number;
  totalOrderValue: number;
  totalOrderValueFormatted: string;
}

export interface SentEmail {
  id: number;
  orderId: number;
  recipientEmail: string;
  minecraftUsername: string;
  subject: string;
  productName: string;
  bodyHtml: string;
  discordLink: string;
  status: string;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  adminEmail: string;
  action: string;
  details?: string;
  createdAt: string;
}

export interface McStatus {
  online: boolean;
  status: 'online' | 'offline' | 'unavailable';
  ip: string;
  port: number;
  players: {
    online: number;
    max: number;
    list?: McPlayerSample[];
  };
  version: {
    name: string;
  };
  motd: {
    clean: string;
  };
  icon?: string | null;
  latency?: number | null;
  serverType?: 'paper' | 'bungeecord';
  networkServers?: McNetworkServerNode[];
  lastUpdated?: string;
}
