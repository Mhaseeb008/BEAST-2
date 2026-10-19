import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users, siteSettings, products, paymentMethods, orders } from './schema.ts';

export async function seedDatabaseIfEmpty() {
  try {
    // 1. Check & seed Site Settings
    const existingSettings = await db.select().from(siteSettings).limit(1);
    if (existingSettings.length === 0) {
      console.log('Seeding initial site settings...');
      await db.insert(siteSettings).values({
        siteName: 'BeastMC Network',
        serverIp: 'play.beastmc.net',
        serverPort: 25565,
        discordUrl: 'https://discord.gg/beastmc',
        logoUrl: '',
        heroTitle: 'WELCOME TO BEASTMC NETWORK',
        heroSubtitle: 'The ultimate competitive Minecraft survival, skyblock, and minigames network with custom economy, custom bosses, and non-stop events.',
        heroBgUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
        supportEmail: 'support@beastmc.net',
        announcementText: 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted',
        announcementEnabled: 1,
      });
    }

    // 2. Check & seed Products (Ranks, Coins, Crates)
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
      console.log('Seeding initial products & ranks...');
      const seedProductsList = [
        // Ranks
        {
          name: 'VIP Rank',
          slug: 'vip-rank',
          category: 'rank',
          price: 499, // $4.99
          originalPrice: 799,
          description: 'Step up from player status with essential quality of life perks and cosmetic perks.',
          perks: JSON.stringify([
            'Green [VIP] Chat Tag & Tab Name',
            'Fly Command in all Hubs & Lobbies (/fly)',
            'Access to 2 Player Vaults (/pv 1-2)',
            'Set up to 3 Home warps (/sethome)',
            '1x Monthly Rare Mystery Box',
            'Reserved Server Slot during full peak hours',
            'Exclusive [VIP] Discord Role'
          ]),
          badge: 'STARTER',
          color: '#10b981', // emerald
          icon: 'Shield',
          isFeatured: 0,
          isActive: 1,
          sortOrder: 1,
        },
        {
          name: 'VIP+ Rank',
          slug: 'vip-plus-rank',
          category: 'rank',
          price: 999, // $9.99
          originalPrice: 1499,
          description: 'Unlock enhanced survival perks, extra vaults, and custom particle cosmetics.',
          perks: JSON.stringify([
            'Aqua [VIP+] Chat Tag & Tab Name',
            'All perks from VIP rank included',
            'Set up to 6 Home warps (/sethome)',
            'Access to 4 Player Vaults (/pv 1-4)',
            '3x Monthly Epic Mystery Boxes',
            'Access to /feed command (30 min cooldown)',
            'Wilderness Teleport without cooldown (/rtp)',
            'Exclusive particle trails in lobbies'
          ]),
          badge: 'POPULAR',
          color: '#06b6d4', // cyan
          icon: 'ShieldCheck',
          isFeatured: 0,
          isActive: 1,
          sortOrder: 2,
        },
        {
          name: 'MVP Rank',
          slug: 'mvp-rank',
          category: 'rank',
          price: 1999, // $19.99
          originalPrice: 2999,
          description: 'A true beast rank equipped with auto-smelt, enhanced shop discounts, and priority queue.',
          perks: JSON.stringify([
            'Gold [MVP] Chat Tag & Tab Name',
            'All perks from VIP & VIP+ included',
            'Set up to 10 Home warps (/sethome)',
            'Access to 7 Player Vaults (/pv 1-7)',
            'Auto-Smelt toggle for mining (/autosmelt)',
            'Access to /craft & /wb workbench command anywhere',
            '5x Monthly Mythic Mystery Boxes',
            '5% Store Discount on future purchases',
            'Gold Glowing Armor cosmetic in lobby'
          ]),
          badge: 'BEST VALUE',
          color: '#f59e0b', // amber
          icon: 'Award',
          isFeatured: 1,
          isActive: 1,
          sortOrder: 3,
        },
        {
          name: 'MVP+ Rank',
          slug: 'mvp-plus-rank',
          category: 'rank',
          price: 3499, // $34.99
          originalPrice: 4999,
          description: 'Maximum power with /fly in survival claims, keep inventory in Nether, and private vault expansion.',
          perks: JSON.stringify([
            'Diamond Blue [MVP+] Chat Tag & Tab Name',
            'Fly in your own Survival & Skyblock Claims (/fly)',
            'Keep Inventory in Nether & The End',
            'Set up to 20 Home warps (/sethome)',
            'Access to 12 Player Vaults (/pv 1-12)',
            'Access to /hat, /near, /condense',
            '8x Monthly Mythic Mystery Boxes',
            '10% In-Game Shop Discount',
            'Priority 1 Support Ticket Queue'
          ]),
          badge: 'POWER',
          color: '#3b82f6', // blue
          icon: 'Zap',
          isFeatured: 1,
          isActive: 1,
          sortOrder: 4,
        },
        {
          name: 'BEAST Rank',
          slug: 'beast-rank',
          category: 'rank',
          price: 5999, // $59.99
          originalPrice: 8999,
          description: 'Dominate BeastMC with custom animated gradient titles, weekly keys, and VIP lounge access.',
          perks: JSON.stringify([
            'Animated Fiery [BEAST] Chat Tag & Tab Name',
            'All perks from MVP+ included',
            'Weekly 2x Beast Crate Keys automatically delivered',
            '/repair all command (1 hour cooldown)',
            'Unlimited Home Warps (/sethome)',
            'Access to 20 Player Vaults (/pv 1-20)',
            'Private Access to the Beast Lounge & High-Roller Casino',
            '15% Store Discount permanently applied',
            'Custom Wing Particle Effect & Dragon Pet'
          ]),
          badge: 'SIGNATURE',
          color: '#ef4444', // red
          icon: 'Flame',
          isFeatured: 1,
          isActive: 1,
          sortOrder: 5,
        },
        {
          name: 'OVERLORD Rank',
          slug: 'overlord-rank',
          category: 'rank',
          price: 9999, // $99.99
          originalPrice: 14999,
          description: 'The supreme pinnacle rank of BeastMC Network. Eternal KeepXP, God status and custom perks.',
          perks: JSON.stringify([
            'Supreme Crown Hologram + Dark Red [OVERLORD] Tag',
            'Eternal KeepXP across all deaths in all worlds',
            'Unlimited Player Vaults (/pv 1-54)',
            '5x Weekly Overlord Crate Keys',
            '/god, /heal, /feed, /fly in all claims with 0 cooldown',
            'Custom In-Game Nickname with RGB Hex colors (/nick)',
            'Custom Discord Role, Secret Staff-Player Council Channel',
            'Personal In-Game NPC statue at spawn',
            'Permanent 20% Store & Coin Discount'
          ]),
          badge: 'ULTIMATE GOD',
          color: '#a855f7', // purple
          icon: 'Crown',
          isFeatured: 1,
          isActive: 1,
          sortOrder: 6,
        },

        // Coins
        {
          name: '1,000 Beast Coins',
          slug: 'coins-1000',
          category: 'coins',
          price: 299,
          originalPrice: 399,
          description: 'Great for purchasing starter cosmetics, player titles, or in-game claim blocks.',
          perks: JSON.stringify([
            'Instant 1,000 Coins credited to your in-game balance',
            'Usable in /shop, /cosmetics, and /auctions',
            'Includes bonus 50 Beast XP'
          ]),
          badge: 'STARTER',
          color: '#fbbf24',
          icon: 'Coins',
          isFeatured: 0,
          isActive: 1,
          sortOrder: 10,
        },
        {
          name: '3,500 Beast Coins (+15% Bonus)',
          slug: 'coins-3500',
          category: 'coins',
          price: 799,
          originalPrice: 999,
          description: 'Boost your progress with 3,500 Coins including 500 bonus coins.',
          perks: JSON.stringify([
            '3,500 Coins total (3,000 + 500 bonus)',
            'Unlock custom chat tags and miniature pets',
            '1x Free Rare Crate Key bonus'
          ]),
          badge: '15% BONUS',
          color: '#fbbf24',
          icon: 'Coins',
          isFeatured: 0,
          isActive: 1,
          sortOrder: 11,
        },
        {
          name: '7,500 Beast Coins (+25% Bonus)',
          slug: 'coins-7500',
          category: 'coins',
          price: 1499,
          originalPrice: 1999,
          description: 'Our top mid-tier currency pack loaded with extra bonuses.',
          perks: JSON.stringify([
            '7,500 Coins total (6,000 + 1,500 bonus)',
            'Unlock legendary weapon skins and kill effects',
            '2x Free Epic Crate Keys bonus'
          ]),
          badge: '25% BONUS',
          color: '#fbbf24',
          icon: 'Coins',
          isFeatured: 0,
          isActive: 1,
          sortOrder: 12,
        },
        {
          name: '15,000 Beast Coins (+35% Bonus)',
          slug: 'coins-15000',
          category: 'coins',
          price: 2499,
          originalPrice: 3499,
          description: 'The community favorite pack. Get huge purchasing power for economy & cosmetics.',
          perks: JSON.stringify([
            '15,000 Coins total (11,000 + 4,000 bonus)',
            'Free Mythic Crate Key',
            'Exclusive "Coin Baron" chat title',
            '5x XP Booster tokens (1 hour 2x XP)'
          ]),
          badge: 'MOST POPULAR',
          color: '#fbbf24',
          icon: 'Coins',
          isFeatured: 1,
          isActive: 1,
          sortOrder: 13,
        },
        {
          name: '35,000 Beast Coins (+50% Bonus)',
          slug: 'coins-35000',
          category: 'coins',
          price: 4999,
          originalPrice: 7499,
          description: 'Whale tier coin pack with maximum extra coins and exclusive perks.',
          perks: JSON.stringify([
            '35,000 Coins total (23,000 + 12,000 huge bonus)',
            '3x Mythic Crate Keys + 1x Beast Key',
            'Exclusive Golden Dragon Pet',
            '10x Server-wide booster tokens'
          ]),
          badge: '50% BONUS',
          color: '#fbbf24',
          icon: 'Coins',
          isFeatured: 1,
          isActive: 1,
          sortOrder: 14,
        },

        // Bundles / Crates
        {
          name: 'Mythic Crate Key Pack (x5)',
          slug: 'crate-mythic-5',
          category: 'crate',
          price: 899,
          originalPrice: 1299,
          description: 'Open 5 Mythic Crates at spawn for legendary armor, custom enchants, and rare spawners.',
          perks: JSON.stringify([
            '5x Mythic Crate Keys delivered to your inventory',
            'Chance to win Beast Rank, Netherite God Sets, and Silk Touch Spawners',
            'Keys never expire and can be traded in-game'
          ]),
          badge: 'HOT',
          color: '#ec4899',
          icon: 'Key',
          isFeatured: 0,
          isActive: 1,
          sortOrder: 20,
        },
        {
          name: 'Beast Starter Survival Bundle',
          slug: 'bundle-starter-survival',
          category: 'bundle',
          price: 1299,
          originalPrice: 2199,
          description: 'Everything a new survival player needs to jump straight to the top of the leaderboards.',
          perks: JSON.stringify([
            '1x VIP Rank Voucher (30 days)',
            '2,500 Beast Coins',
            '3x Rare Crate Keys + 1x Epic Key',
            'Full Protection IV Diamond Starter Gear',
            '10,000 Claim Blocks for your base'
          ]),
          badge: 'MEGA DEAL',
          color: '#10b981',
          icon: 'Package',
          isFeatured: 1,
          isActive: 1,
          sortOrder: 21,
        }
      ];

      for (const prod of seedProductsList) {
        await db.insert(products).values(prod);
      }
    }

    // 3. Check & seed Payment Methods (Bank Transfer, EasyPaisa, PayPal Manual, Crypto USDT)
    const existingPaymentMethods = await db.select().from(paymentMethods).limit(1);
    if (existingPaymentMethods.length === 0) {
      console.log('Seeding initial manual payment methods...');
      const seedMethods = [
        {
          name: 'Bank Transfer / IBAN (Direct)',
          accountTitle: 'BeastMC Network LLC',
          accountNumber: '9820-4102-5819',
          iban: 'GB29BEAST98204102581901',
          bankName: 'Global Commerce International Bank',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=IBAN:GB29BEAST98204102581901_BeastMC',
          instructions: '1. Transfer the exact amount in USD/EUR/GBP from your online banking app.\n2. In the transfer reference/remarks, enter your Minecraft username.\n3. Take a screenshot of the completed transfer confirmation.\n4. Upload the screenshot and enter the Bank Reference / Transaction ID below.',
          currency: 'USD',
          exchangeRate: '1.0',
          isActive: 1,
        },
        {
          name: 'EasyPaisa / JazzCash / Mobile Wallet',
          accountTitle: 'BeastMC Finance Desk',
          accountNumber: '0300-1234567',
          iban: 'PK12EPAY03001234567001',
          bankName: 'EasyPaisa / JazzCash Pakistan',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=03001234567_EasyPaisa_BeastMC',
          instructions: '1. Open EasyPaisa or JazzCash app.\n2. Send exact order amount (Converted at current exchange rate PKR 280 / USD).\n3. Enter your Order ID in remarks/purpose.\n4. Take a clear screenshot of the successful transaction receipt.\n5. Paste the TID (Transaction ID) and upload your screenshot.',
          currency: 'PKR',
          exchangeRate: '280.0',
          isActive: 1,
        },
        {
          name: 'PayPal Manual (Friends & Family)',
          accountTitle: 'BeastMC Operations',
          accountNumber: 'payments@beastmc.net',
          iban: '',
          bankName: 'PayPal Worldwide',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://paypal.me/beastmcnetwork',
          instructions: '1. Send payment via PayPal to: payments@beastmc.net\n2. IMPORTANT: Choose "Sending to a friend" (Friends & Family) to avoid delays.\n3. Leave the PayPal note blank or enter your order code only. Do not mention Minecraft.\n4. Save your PayPal Transaction ID and upload the receipt screenshot.',
          currency: 'USD',
          exchangeRate: '1.0',
          isActive: 1,
        },
        {
          name: 'Crypto USDT (TRC-20)',
          accountTitle: 'BeastMC Treasury TRON',
          accountNumber: 'TXv8bN5qV2Xm9pKd8zJw2Re7Lt4bQ3cE1a',
          iban: '',
          bankName: 'Tether TRC-20 Network',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TXv8bN5qV2Xm9pKd8zJw2Re7Lt4bQ3cE1a',
          instructions: '1. Send exact USDT amount to the TRC-20 wallet address above.\n2. Ensure network chosen is TRON (TRC-20) to prevent loss of funds.\n3. Wait for 1 network confirmation.\n4. Copy the TxHash / Transaction Hash and upload a screenshot of your wallet withdrawal.',
          currency: 'USDT',
          exchangeRate: '1.0',
          isActive: 1,
        }
      ];

      for (const m of seedMethods) {
        await db.insert(paymentMethods).values(m);
      }
    }

    // 4. Staff users are managed directly by the Owner in the Admin Panel without demo credentials.
    // Real staff accounts are preserved.

    // Always ensure mhaseebahmed0@gmail.com is seeded and has Owner role
    try {
      const haseebUser = await db.select().from(users).where(eq(users.email, 'mhaseebahmed0@gmail.com')).limit(1);
      const allPerms = [
        'manage_settings',
        'manage_products',
        'manage_payments',
        'verify_orders',
        'deliver_orders',
        'manage_admins',
        'view_audit_logs',
      ];
      if (haseebUser.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const ownerPasswordHash = await bcrypt.hash('Admin@Beast2026', salt);
        await db.insert(users).values({
          uid: 'owner-haseeb-001',
          email: 'mhaseebahmed0@gmail.com',
          username: 'Haseeb_Owner',
          minecraftUsername: 'BeastHaseeb',
          passwordHash: ownerPasswordHash,
          role: 'owner',
          permissions: JSON.stringify(allPerms),
          isBanned: 0,
        });
        console.log('Seeded mhaseebahmed0@gmail.com as Owner');
      } else if (haseebUser[0].role !== 'owner') {
        await db.update(users).set({
          role: 'owner',
          permissions: JSON.stringify(allPerms),
        }).where(eq(users.id, haseebUser[0].id));
        console.log('Updated mhaseebahmed0@gmail.com to Owner');
      }
    } catch (e) {
      console.error('Failed to seed owner email mhaseebahmed0@gmail.com:', e);
    }
  } catch (err) {
    console.error('Error during database seed:', err);
  }
}
