import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Historical identifier or unique account identifier
  supabaseUid: text('supabase_uid').unique(), // Authenticated Supabase Auth User UUID
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  minecraftUsername: text('minecraft_username').notNull(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('user'), // 'user', 'player', 'moderator', 'admin', 'owner'
  permissions: text('permissions').default('[]'), // JSON array of permission strings
  isBanned: integer('is_banned').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  siteName: text('site_name').notNull().default('BeastMC Network'),
  serverIp: text('server_ip').notNull().default('play.beastmc.net'),
  serverPort: integer('server_port').default(25565),
  discordUrl: text('discord_url').default('https://discord.gg/beastmc'),
  logoUrl: text('logo_url').default(''),
  heroTitle: text('hero_title').default('WELCOME TO BEASTMC NETWORK'),
  heroSubtitle: text('hero_subtitle').default('The ultimate competitive survival, skyblock, and minigames network.'),
  heroBgUrl: text('hero_bg_url').default(''),
  bannerUrl: text('banner_url').default(''),
  faviconUrl: text('favicon_url').default(''),
  supportEmail: text('support_email').default('support@beastmc.net'),
  serverType: text('server_type').default('paper'), // 'paper' | 'bungeecord'
  bedrockPort: integer('bedrock_port').default(19132),
  crossplayEnabled: integer('crossplay_enabled').default(1), // 1 = Yes, 0 = No
  networkServers: text('network_servers').default('[]'), // JSON array of sub-servers for BungeeCord
  announcementText: text('announcement_text').default('BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted'),
  announcementEnabled: integer('announcement_enabled').default(1), // 1 = Enabled, 0 = Disabled
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category').notNull(), // 'rank', 'coins', 'crate', 'bundle'
  price: integer('price').notNull(), // in USD cents (e.g. 1999 = $19.99)
  originalPrice: integer('original_price'),
  description: text('description').notNull(),
  perks: text('perks').notNull(), // JSON array of perk strings
  badge: text('badge'),
  color: text('color').default('#10b981'),
  icon: text('icon').default('Shield'),
  imageUrl: text('image_url').default(''),
  isFeatured: integer('is_featured').default(0),
  isActive: integer('is_active').default(1),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paymentMethods = pgTable('payment_methods', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  accountTitle: text('account_title').notNull(),
  accountNumber: text('account_number').notNull(),
  iban: text('iban').default(''),
  bankName: text('bank_name').default(''),
  qrCodeUrl: text('qr_code_url').default(''),
  instructions: text('instructions').notNull(),
  currency: text('currency').default('USD'),
  exchangeRate: text('exchange_rate').default('1.0'),
  isActive: integer('is_active').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderCode: text('order_code').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  userEmail: text('user_email').notNull(),
  minecraftUsername: text('minecraft_username').notNull(),
  productId: integer('product_id').references(() => products.id),
  productName: text('product_name').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').default('USD'),
  paymentMethodId: integer('payment_method_id').references(() => paymentMethods.id),
  paymentMethodName: text('payment_method_name').notNull(),
  transactionId: text('transaction_id').notNull(),
  senderNote: text('sender_note').default(''),
  paymentScreenshotUrl: text('payment_screenshot_url'),
  status: text('status').notNull().default('Pending Payment Verification'),
  // 'Pending Payment Verification', 'Payment Rejected', 'Delivery Pending', 'Delivered'
  rejectionReason: text('rejection_reason').default(''),
  approvedAt: timestamp('approved_at'),
  deliveredAt: timestamp('delivered_at'),
  deliveryNotice: text('delivery_notice').default(''),
  deliveryEmailSent: integer('delivery_email_sent').default(0),
  deliveredByAdmin: text('delivered_by_admin').default(''),
  paymentVerified: integer('payment_verified').default(0),
  paymentVerifiedAt: timestamp('payment_verified_at'),
  paymentVerifiedBy: text('payment_verified_by').default(''),
  orderHistory: text('order_history').default('[]'),
  isDeleted: integer('is_deleted').default(0),
  deletedAt: timestamp('deleted_at'),
  deletedByAdmin: text('deleted_by_admin').default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sentEmails = pgTable('sent_emails', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id),
  recipientEmail: text('recipient_email').notNull(),
  minecraftUsername: text('minecraft_username').notNull(),
  subject: text('subject').notNull(),
  productName: text('product_name').notNull(),
  bodyHtml: text('body_html').notNull(),
  discordLink: text('discord_link').notNull(),
  status: text('status').notNull().default('sent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  adminEmail: text('admin_email').notNull(),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const voteSites = pgTable('vote_sites', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  description: text('description').default(''),
  rewardText: text('reward_text').default('Vote to receive in-game Beast Coins and Crate Keys!'),
  iconUrl: text('icon_url').default(''),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active').default(1), // 1 = Enabled, 0 = Disabled
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [orders.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));
