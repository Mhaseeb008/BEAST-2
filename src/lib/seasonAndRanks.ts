import fs from 'fs';
import path from 'path';
import { db } from '../db/index.ts';
import { siteSettings, products } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  SeasonSettings,
  RankComparisonFeature,
  Product,
} from '../types.ts';

const configDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
const siteConfigFile = path.join(configDir, 'site-config.json');

export const DEFAULT_SEASON_SETTINGS: SeasonSettings = {
  seasonTitle: 'BeastMC Season 4',
  seasonNumber: '4',
  statusBadge: 'Active',
  seasonSubtitle: '24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted',
  customText: 'BeastMC Season 4 Active',
};

export const INITIAL_RANK_COMPARISON_FEATURES: RankComparisonFeature[] = [
  {
    id: 'feat_fly',
    name: 'Lobby Flight (/fly)',
    description: 'Fly freely across all BeastMC lobbies, hubs, and spawn platforms.',
    category: 'General',
    order: 0,
    visible: true,
    ranks: {
      '1': { enabled: true, valueType: 'boolean' }, // VIP
      '2': { enabled: true, valueType: 'boolean' }, // VIP+
      '3': { enabled: true, valueType: 'boolean' }, // MVP
      '4': { enabled: true, valueType: 'boolean' }, // MVP+
      '5': { enabled: true, valueType: 'boolean' }, // BEAST
      '6': { enabled: true, valueType: 'boolean' }, // OVERLORD
      'vip-rank': { enabled: true, valueType: 'boolean' },
      'vip-plus-rank': { enabled: true, valueType: 'boolean' },
      'mvp-rank': { enabled: true, valueType: 'boolean' },
      'mvp-plus-rank': { enabled: true, valueType: 'boolean' },
      'beast-rank': { enabled: true, valueType: 'boolean' },
      'overlord-rank': { enabled: true, valueType: 'boolean' },
    },
  },
  {
    id: 'feat_claim_flight',
    name: 'Survival Claim Flight',
    description: 'Toggle flight mode inside your protected survival claim regions.',
    category: 'Survival',
    order: 1,
    visible: true,
    ranks: {
      '1': { enabled: false, valueType: 'boolean' },
      '2': { enabled: false, valueType: 'boolean' },
      '3': { enabled: false, valueType: 'boolean' },
      '4': { enabled: true, valueType: 'boolean' },
      '5': { enabled: true, valueType: 'boolean' },
      '6': { enabled: true, valueType: 'boolean' },
      'vip-rank': { enabled: false, valueType: 'boolean' },
      'vip-plus-rank': { enabled: false, valueType: 'boolean' },
      'mvp-rank': { enabled: false, valueType: 'boolean' },
      'mvp-plus-rank': { enabled: true, valueType: 'boolean' },
      'beast-rank': { enabled: true, valueType: 'boolean' },
      'overlord-rank': { enabled: true, valueType: 'boolean' },
    },
  },
  {
    id: 'feat_pv',
    name: 'Player Vaults (/pv)',
    description: 'Access secure cross-server private vault storage compartments.',
    category: 'Storage',
    order: 2,
    visible: true,
    ranks: {
      '1': { enabled: true, valueType: 'text', customText: '2' },
      '2': { enabled: true, valueType: 'text', customText: '4' },
      '3': { enabled: true, valueType: 'text', customText: '7' },
      '4': { enabled: true, valueType: 'text', customText: '12' },
      '5': { enabled: true, valueType: 'text', customText: '20' },
      '6': { enabled: true, valueType: 'text', customText: 'Unlimited (54)' },
      'vip-rank': { enabled: true, valueType: 'text', customText: '2' },
      'vip-plus-rank': { enabled: true, valueType: 'text', customText: '4' },
      'mvp-rank': { enabled: true, valueType: 'text', customText: '7' },
      'mvp-plus-rank': { enabled: true, valueType: 'text', customText: '12' },
      'beast-rank': { enabled: true, valueType: 'text', customText: '20' },
      'overlord-rank': { enabled: true, valueType: 'text', customText: 'Unlimited (54)' },
    },
  },
  {
    id: 'feat_sethome',
    name: 'Home Warps (/sethome)',
    description: 'Maximum custom waypoint coordinates you can bookmark and teleport to.',
    category: 'Teleportation',
    order: 3,
    visible: true,
    ranks: {
      '1': { enabled: true, valueType: 'text', customText: '3' },
      '2': { enabled: true, valueType: 'text', customText: '6' },
      '3': { enabled: true, valueType: 'text', customText: '10' },
      '4': { enabled: true, valueType: 'text', customText: '20' },
      '5': { enabled: true, valueType: 'text', customText: 'Unlimited' },
      '6': { enabled: true, valueType: 'text', customText: 'Unlimited' },
      'vip-rank': { enabled: true, valueType: 'text', customText: '3' },
      'vip-plus-rank': { enabled: true, valueType: 'text', customText: '6' },
      'mvp-rank': { enabled: true, valueType: 'text', customText: '10' },
      'mvp-plus-rank': { enabled: true, valueType: 'text', customText: '20' },
      'beast-rank': { enabled: true, valueType: 'text', customText: 'Unlimited' },
      'overlord-rank': { enabled: true, valueType: 'text', customText: 'Unlimited' },
    },
  },
  {
    id: 'feat_autosmelt',
    name: 'Auto-Smelt Mining',
    description: 'Mined ores automatically convert into smelted ingots directly into your bag.',
    category: 'Mining',
    order: 4,
    visible: true,
    ranks: {
      '1': { enabled: false, valueType: 'boolean' },
      '2': { enabled: false, valueType: 'boolean' },
      '3': { enabled: true, valueType: 'boolean' },
      '4': { enabled: true, valueType: 'boolean' },
      '5': { enabled: true, valueType: 'boolean' },
      '6': { enabled: true, valueType: 'boolean' },
      'vip-rank': { enabled: false, valueType: 'boolean' },
      'vip-plus-rank': { enabled: false, valueType: 'boolean' },
      'mvp-rank': { enabled: true, valueType: 'boolean' },
      'mvp-plus-rank': { enabled: true, valueType: 'boolean' },
      'beast-rank': { enabled: true, valueType: 'boolean' },
      'overlord-rank': { enabled: true, valueType: 'boolean' },
    },
  },
  {
    id: 'feat_keepxp',
    name: 'Eternal KeepXP & God',
    description: 'Immunity to XP loss upon environmental death with supreme perks.',
    category: 'Combat',
    order: 5,
    visible: true,
    ranks: {
      '1': { enabled: false, valueType: 'boolean' },
      '2': { enabled: false, valueType: 'boolean' },
      '3': { enabled: false, valueType: 'boolean' },
      '4': { enabled: false, valueType: 'boolean' },
      '5': { enabled: false, valueType: 'boolean' },
      '6': { enabled: true, valueType: 'text', customText: '✓ Supreme' },
      'vip-rank': { enabled: false, valueType: 'boolean' },
      'vip-plus-rank': { enabled: false, valueType: 'boolean' },
      'mvp-rank': { enabled: false, valueType: 'boolean' },
      'mvp-plus-rank': { enabled: false, valueType: 'boolean' },
      'beast-rank': { enabled: false, valueType: 'boolean' },
      'overlord-rank': { enabled: true, valueType: 'text', customText: '✓ Supreme' },
    },
  },
];

// Read from site-config.json file
function readConfigFile(): any {
  try {
    if (fs.existsSync(siteConfigFile)) {
      return JSON.parse(fs.readFileSync(siteConfigFile, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading siteConfigFile:', err);
  }
  return {};
}

// Write to site-config.json file
function writeConfigFile(patch: Record<string, any>): void {
  try {
    const existing = readConfigFile();
    const updated = { ...existing, ...patch };
    fs.writeFileSync(siteConfigFile, JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error('Error writing siteConfigFile:', err);
  }
}

// ==========================================
// 1. SEASON SETTINGS (Database + File Sync)
// ==========================================

export async function getDatabaseSeasonSettings(): Promise<SeasonSettings> {
  try {
    // 1. Check database site_settings record with siteName = '__season_settings__'
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.siteName, '__season_settings__'))
      .limit(1);

    if (rows.length > 0 && rows[0].heroTitle) {
      try {
        const parsed = JSON.parse(rows[0].heroTitle);
        if (parsed && parsed.seasonTitle) {
          return {
            ...DEFAULT_SEASON_SETTINGS,
            ...parsed,
          };
        }
      } catch {}
    }

    // 2. Fallback to site-config.json
    const fileConfig = readConfigFile();
    if (fileConfig && fileConfig.seasonSettings) {
      return {
        ...DEFAULT_SEASON_SETTINGS,
        ...fileConfig.seasonSettings,
      };
    }
  } catch (err) {
    console.error('Error fetching database season settings:', err);
  }

  return { ...DEFAULT_SEASON_SETTINGS };
}

export async function saveDatabaseSeasonSettings(
  settings: Partial<SeasonSettings>
): Promise<SeasonSettings> {
  const current = await getDatabaseSeasonSettings();
  const merged: SeasonSettings = {
    seasonTitle: (settings.seasonTitle !== undefined ? settings.seasonTitle : current.seasonTitle).trim(),
    seasonNumber: settings.seasonNumber !== undefined ? settings.seasonNumber : current.seasonNumber,
    statusBadge: (settings.statusBadge !== undefined ? settings.statusBadge : current.statusBadge).trim(),
    seasonSubtitle: (settings.seasonSubtitle !== undefined ? settings.seasonSubtitle : current.seasonSubtitle).trim(),
    customText: settings.customText !== undefined ? settings.customText.trim() : (settings.seasonTitle || current.seasonTitle).trim(),
  };

  try {
    // Save to PostgreSQL site_settings table
    const existing = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.siteName, '__season_settings__'))
      .limit(1);

    const payload = JSON.stringify(merged);

    if (existing.length === 0) {
      await db.insert(siteSettings).values({
        siteName: '__season_settings__',
        serverIp: 'internal',
        heroTitle: payload,
        heroSubtitle: merged.seasonSubtitle,
      });
    } else {
      await db
        .update(siteSettings)
        .set({
          heroTitle: payload,
          heroSubtitle: merged.seasonSubtitle,
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.id, existing[0].id));
    }

    // Also mirror to file for instant cold-start resilience
    writeConfigFile({ seasonSettings: merged });
  } catch (err) {
    console.error('Error saving database season settings:', err);
    // Ensure file persistence even if DB transient error
    writeConfigFile({ seasonSettings: merged });
  }

  return merged;
}

// ==========================================
// 2. RANK COMPARISON (Database + Sync)
// ==========================================

export async function getDatabaseRankComparison(): Promise<RankComparisonFeature[]> {
  let features: RankComparisonFeature[] = [];

  try {
    // Check PostgreSQL database for '__rank_comparison__' row
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.siteName, '__rank_comparison__'))
      .limit(1);

    if (rows.length > 0 && rows[0].networkServers) {
      try {
        const parsed = JSON.parse(rows[0].networkServers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          features = parsed;
        }
      } catch {}
    }

    // Fallback to file config if DB empty
    if (features.length === 0) {
      const fileConfig = readConfigFile();
      if (Array.isArray(fileConfig?.rankComparison) && fileConfig.rankComparison.length > 0) {
        features = fileConfig.rankComparison;
      }
    }
  } catch (err) {
    console.error('Error loading database rank comparison:', err);
  }

  if (features.length === 0) {
    features = [...INITIAL_RANK_COMPARISON_FEATURES];
  }

  // Fetch current real ranks from database to ensure automatic synchronization
  try {
    const currentRanks = await db
      .select()
      .from(products)
      .where(eq(products.category, 'rank'));

    features = synchronizeRankFeatures(features, currentRanks as unknown as Product[]);
  } catch (err) {
    console.error('Error auto-syncing ranks with database:', err);
  }

  return features;
}

export async function saveDatabaseRankComparison(
  features: RankComparisonFeature[]
): Promise<RankComparisonFeature[]> {
  // Normalize orders
  const normalized = features.map((f, idx) => ({
    ...f,
    order: typeof f.order === 'number' ? f.order : idx,
    visible: f.visible !== false,
  }));

  try {
    const existing = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.siteName, '__rank_comparison__'))
      .limit(1);

    const payload = JSON.stringify(normalized);

    if (existing.length === 0) {
      await db.insert(siteSettings).values({
        siteName: '__rank_comparison__',
        serverIp: 'internal',
        networkServers: payload,
      });
    } else {
      await db
        .update(siteSettings)
        .set({
          networkServers: payload,
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.id, existing[0].id));
    }

    // Mirror to file
    writeConfigFile({ rankComparison: normalized });
  } catch (err) {
    console.error('Error saving database rank comparison:', err);
    writeConfigFile({ rankComparison: normalized });
  }

  return normalized;
}

// Automatic Rank Synchronization Helper:
// Connects Rank Comparison with products (category === 'rank')
export function synchronizeRankFeatures(
  features: RankComparisonFeature[],
  currentRanks: Product[]
): RankComparisonFeature[] {
  const rankIdSet = new Set(currentRanks.map((r) => String(r.id)));
  const rankSlugSet = new Set(currentRanks.map((r) => r.slug));

  return features.map((feat) => {
    const updatedRanks: Record<string, any> = { ...feat.ranks };

    currentRanks.forEach((rank) => {
      const idKey = String(rank.id);
      const slugKey = rank.slug;

      // Check if value exists under idKey or slugKey
      const existingVal = updatedRanks[idKey] || updatedRanks[slugKey];

      if (existingVal) {
        // Map to both keys so UI can reference either by id or slug
        updatedRanks[idKey] = existingVal;
        updatedRanks[slugKey] = existingVal;
      } else {
        // Unconfigured rank features default to disabled (Requirement 2)
        const defaultVal = {
          enabled: false,
          valueType: 'boolean',
          customText: '-',
        };
        updatedRanks[idKey] = defaultVal;
        updatedRanks[slugKey] = defaultVal;
      }
    });

    return {
      ...feat,
      ranks: updatedRanks,
    };
  });
}
