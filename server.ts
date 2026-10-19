import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db } from './src/db/index.ts';
import {
  users,
  siteSettings,
  products,
  paymentMethods,
  orders,
  sentEmails,
  auditLogs,
} from './src/db/schema.ts';
import { eq, desc, and, or, sql, gte, lte, ilike } from 'drizzle-orm';
import { getDateRangeForPreset, DatePreset } from './src/lib/orderDateFilters.ts';
import {
  requireAuth,
  requireAdmin,
  requirePermission,
  signUserToken,
  AuthRequest,
} from './src/middleware/auth.ts';
import { sendDeliveryConfirmationEmail } from './src/lib/email.ts';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import {
  getDatabaseSeasonSettings,
  saveDatabaseSeasonSettings,
  getDatabaseRankComparison,
  saveDatabaseRankComparison,
} from './src/lib/seasonAndRanks.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Persistent Uploads Directory for website logo, favicon, backgrounds, banners & product images
const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Persistent Config Directory for site settings such as configured website timezone
const configDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
const siteConfigFile = path.join(configDir, 'site-config.json');

function getConfiguredTimezone(): string {
  try {
    if (fs.existsSync(siteConfigFile)) {
      const data = JSON.parse(fs.readFileSync(siteConfigFile, 'utf-8'));
      if (data && data.timezone) return data.timezone;
    }
  } catch (err) {
    console.error('Error reading site-config.json:', err);
  }
  return process.env.WEBSITE_TIMEZONE || 'UTC';
}

function setConfiguredTimezone(tz: string): void {
  try {
    let data: any = {};
    if (fs.existsSync(siteConfigFile)) {
      try {
        data = JSON.parse(fs.readFileSync(siteConfigFile, 'utf-8'));
      } catch {}
    }
    data.timezone = tz;
    fs.writeFileSync(siteConfigFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing site-config.json:', err);
  }
}

// Middleware
app.use(cors());
// Serve persistent uploaded images statically
app.use('/uploads', express.static(uploadsDir));
// Support base64 image uploads for branding, products, and payment receipts
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Seed initial database data asynchronously
seedDatabaseIfEmpty().catch((err) => {
  console.error('Initial DB seeding error:', err);
});

// ==========================================
// 1. PUBLIC API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ==========================================
// REAL MINECRAFT SERVER QUERY ENGINE (PAPER & BUNGEECORD)
// ==========================================

// ==========================================
// MINECRAFT SERVER STATUS & VALIDATION ENGINE
// ==========================================

// Task 9: Validate Minecraft Server Addresses and Ports (SSRF & Private Network Protection)
function validateMinecraftAddress(
  ip: string,
  port: number
): { valid: boolean; error?: string; cleanIp: string; cleanPort: number } {
  if (!ip || typeof ip !== 'string') {
    return { valid: false, error: 'Minecraft server IP or hostname is required.', cleanIp: '', cleanPort: 25565 };
  }
  let rawIp = ip.trim();
  let cleanPort = Number(port);

  // If user pasted IP:PORT (very common from Pterodactyl allocations, e.g. 51.79.230.80:10137)
  if (rawIp.includes(':') && !rawIp.includes('::')) {
    const parts = rawIp.split(':');
    if (parts.length === 2 && /^\d+$/.test(parts[1])) {
      rawIp = parts[0].trim();
      const extractedPort = parseInt(parts[1], 10);
      if (extractedPort >= 1 && extractedPort <= 65535) {
        cleanPort = extractedPort;
      }
    }
  }

  const cleanIp = rawIp.toLowerCase();

  if (isNaN(cleanPort) || !Number.isInteger(cleanPort) || cleanPort < 1 || cleanPort > 65535) {
    return { valid: false, error: 'Port must be a valid integer between 1 and 65535.', cleanIp, cleanPort: 25565 };
  }

  // SSRF Protection: Block localhost and loopback
  if (
    cleanIp === 'localhost' ||
    cleanIp === '127.0.0.1' ||
    cleanIp === '0.0.0.0' ||
    cleanIp === '::1' ||
    cleanIp === '0'
  ) {
    return {
      valid: false,
      error: 'Security Error: Localhost and loopback destinations (127.0.0.1, ::1) are strictly prohibited.',
      cleanIp,
      cleanPort,
    };
  }

  // SSRF Protection: Block cloud metadata services and internal domain suffixes
  if (
    cleanIp.endsWith('.local') ||
    cleanIp.endsWith('.internal') ||
    cleanIp.endsWith('.localhost') ||
    cleanIp === 'metadata.google.internal' ||
    cleanIp === '169.254.169.254'
  ) {
    return {
      valid: false,
      error: 'Security Error: Cloud metadata endpoints and internal network zones are blocked.',
      cleanIp,
      cleanPort,
    };
  }

  // IPv4 Validation and Private Subnet Check
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = cleanIp.match(ipv4Regex);
  if (ipMatch) {
    const o1 = parseInt(ipMatch[1], 10);
    const o2 = parseInt(ipMatch[2], 10);
    const o3 = parseInt(ipMatch[3], 10);
    const o4 = parseInt(ipMatch[4], 10);

    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) {
      return { valid: false, error: 'Invalid IPv4 octet value specified.', cleanIp, cleanPort };
    }

    // Block 10.0.0.0/8
    if (o1 === 10) {
      return { valid: false, error: 'Security Error: Private network address (10.0.0.0/8) is not permitted.', cleanIp, cleanPort };
    }
    // Block 172.16.0.0/12
    if (o1 === 172 && o2 >= 16 && o2 <= 31) {
      return { valid: false, error: 'Security Error: Private network address (172.16.0.0/12) is not permitted.', cleanIp, cleanPort };
    }
    // Block 192.168.0.0/16
    if (o1 === 192 && o2 === 168) {
      return { valid: false, error: 'Security Error: Private network address (192.168.0.0/16) is not permitted.', cleanIp, cleanPort };
    }
    // Block 169.254.0.0/16 (link local)
    if (o1 === 169 && o2 === 254) {
      return { valid: false, error: 'Security Error: Link-local address (169.254.0.0/16) is not permitted.', cleanIp, cleanPort };
    }
    // Block 127.0.0.0/8
    if (o1 === 127) {
      return { valid: false, error: 'Security Error: Loopback subnet (127.0.0.0/8) is not permitted.', cleanIp, cleanPort };
    }
  } else {
    // Validate Hostname / Domain Syntax
    const hostRegex = /^(?=.{1,253}$)(?!-)[a-zA-Z0-9_-]{1,63}(?<!-)(\.[a-zA-Z0-9_-]{1,63})*$/;
    if (!hostRegex.test(cleanIp)) {
      return {
        valid: false,
        error: 'Invalid Hostname: Must be a valid server domain (e.g., play.beastmc.net or Pterodactyl node host) or public IP address.',
        cleanIp,
        cleanPort,
      };
    }
  }

  return { valid: true, cleanIp, cleanPort };
}

// Helper function to query a real Minecraft Java / Paper server via live TCP ping protocols
async function querySingleMinecraftServer(
  ip: string,
  port: number = 25565,
  isBedrock: boolean = false
): Promise<{
  online: boolean;
  status: 'online' | 'offline' | 'unavailable';
  ip: string;
  port: number;
  players: {
    online: number;
    max: number;
    list: Array<{ name: string; uuid?: string }>;
  };
  version: {
    name: string;
  };
  motd: {
    clean: string;
  };
  icon: string | null;
  latency: number | null;
}> {
  let cleanIp = (ip || 'play.beastmc.net').trim();
  let cleanPort = Number(port) || (isBedrock ? 19132 : 25565);

  if (cleanIp.includes(':') && !cleanIp.includes('::')) {
    const parts = cleanIp.split(':');
    if (parts.length === 2 && /^\d+$/.test(parts[1])) {
      cleanIp = parts[0].trim();
      const extracted = parseInt(parts[1], 10);
      if (extracted >= 1 && extracted <= 65535) {
        cleanPort = extracted;
      }
    }
  }

  const protocol = isBedrock ? 'bedrock' : 'java';

  // 1. Primary Query: mcstatus.io API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.mcstatus.io/v2/status/${protocol}/${encodeURIComponent(cleanIp)}:${cleanPort}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.online === true) {
        let playerList: Array<{ name: string; uuid?: string }> = [];
        if (Array.isArray(data.players?.list)) {
          playerList = data.players.list
            .map((p: any) => ({
              name: p.name_clean || p.name_raw || p.name || 'Player',
              uuid: p.uuid || undefined,
            }))
            .filter((p: any) => p.name && p.name !== 'Anonymous Player');
        }

        return {
          online: true,
          status: 'online',
          ip: cleanIp,
          port: cleanPort,
          players: {
            online: typeof data.players?.online === 'number' ? data.players.online : 0,
            max: typeof data.players?.max === 'number' ? data.players.max : 0,
            list: playerList,
          },
          version: {
            name: data.version?.name_clean || data.version?.name_raw || (isBedrock ? 'Geyser Bedrock' : 'Paper / Minecraft Java'),
          },
          motd: {
            clean: data.motd?.clean || '',
          },
          icon: data.icon || null,
          latency: typeof data.round_trip_latency === 'number' ? data.round_trip_latency : null,
        };
      } else if (data.online === false) {
        // Real server is explicitly offline
        return {
          online: false,
          status: 'offline',
          ip: cleanIp,
          port: cleanPort,
          players: { online: 0, max: 0, list: [] },
          version: { name: isBedrock ? 'Bedrock' : 'Paper' },
          motd: { clean: 'Server is currently offline.' },
          icon: null,
          latency: null,
        };
      }
    }
  } catch (err) {
    // Try fallback provider
  }

  // 2. Secondary Query: mcsrvstat.us API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const url = isBedrock
      ? `https://api.mcsrvstat.us/bedrock/3/${encodeURIComponent(cleanIp)}:${cleanPort}`
      : `https://api.mcsrvstat.us/3/${encodeURIComponent(cleanIp)}:${cleanPort}`;
    const res2 = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.online === true) {
        let playerList: Array<{ name: string; uuid?: string }> = [];
        if (Array.isArray(data2.players?.list)) {
          playerList = data2.players.list.map((p: any) => {
            if (typeof p === 'string') return { name: p };
            return { name: p.name || 'Player', uuid: p.uuid };
          });
        }

        return {
          online: true,
          status: 'online',
          ip: cleanIp,
          port: cleanPort,
          players: {
            online: typeof data2.players?.online === 'number' ? data2.players.online : 0,
            max: typeof data2.players?.max === 'number' ? data2.players.max : 0,
            list: playerList,
          },
          version: {
            name: data2.version || (isBedrock ? 'Geyser Bedrock' : 'Paper / Minecraft Java'),
          },
          motd: {
            clean: Array.isArray(data2.motd?.clean)
              ? data2.motd.clean.join(' ')
              : (data2.motd?.clean || ''),
          },
          icon: data2.icon || null,
          latency: null,
        };
      } else if (data2.online === false) {
        return {
          online: false,
          status: 'offline',
          ip: cleanIp,
          port: cleanPort,
          players: { online: 0, max: 0, list: [] },
          version: { name: isBedrock ? 'Bedrock' : 'Paper' },
          motd: { clean: 'Server is currently offline.' },
          icon: null,
          latency: null,
        };
      }
    }
  } catch (err2) {
    // Try third fallback
  }

  // 3. Third Query: mcapi.us (Java only)
  if (!isBedrock) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res3 = await fetch(`https://mcapi.us/server/status?ip=${encodeURIComponent(cleanIp)}&port=${cleanPort}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res3.ok) {
        const data3 = await res3.json();
        if (data3.online === true) {
          return {
            online: true,
            status: 'online',
            ip: cleanIp,
            port: cleanPort,
            players: {
              online: typeof data3.players?.now === 'number' ? data3.players.now : 0,
              max: typeof data3.players?.max === 'number' ? data3.players.max : 0,
              list: [],
            },
            version: {
              name: data3.server?.name || 'Paper / Minecraft Java',
            },
            motd: {
              clean: data3.motd || '',
            },
            icon: null,
            latency: null,
          };
        } else if (data3.online === false) {
          return {
            online: false,
            status: 'offline',
            ip: cleanIp,
            port: cleanPort,
            players: { online: 0, max: 0, list: [] },
            version: { name: 'Paper' },
            motd: { clean: 'Server is currently offline.' },
            icon: null,
            latency: null,
          };
        }
      }
    } catch (err3) {
      // Query failed
    }
  }

  // 4. Server cannot be reached / DNS not resolved
  return {
    online: false,
    status: 'unavailable',
    ip: cleanIp,
    port: cleanPort,
    players: { online: 0, max: 0, list: [] },
    version: { name: isBedrock ? 'Bedrock' : 'Paper' },
    motd: { clean: 'Status query currently unavailable. Ensure Paper server is running in Pterodactyl.' },
    icon: null,
    latency: null,
  };
}

// Task 2 & 3: Helper to query Paper server with optional GeyserMC Bedrock crossplay
async function queryPaperWithCrossplay(
  ip: string,
  javaPort: number = 25565,
  bedrockPort: number = 19132,
  crossplayEnabled: boolean = true
) {
  // Query Java on Paper
  const javaStatus = await querySingleMinecraftServer(ip, javaPort, false);

  if (!crossplayEnabled) {
    return javaStatus;
  }

  // If crossplay is enabled, also check Bedrock listener if different port
  if (bedrockPort && bedrockPort !== javaPort) {
    try {
      const bedrockStatus = await querySingleMinecraftServer(ip, bedrockPort, true);
      if (bedrockStatus.online && !javaStatus.online) {
        // If Bedrock responded while Java query was slow
        return {
          ...bedrockStatus,
          serverType: 'paper',
        };
      } else if (bedrockStatus.online && javaStatus.online) {
        // GeyserMC players are reported through Paper server, merge any unique player list entries
        const seen = new Set<string>();
        const mergedList: Array<{ name: string; uuid?: string }> = [];

        for (const p of javaStatus.players.list || []) {
          if (p.name && !seen.has(p.name.toLowerCase())) {
            seen.add(p.name.toLowerCase());
            mergedList.push(p);
          }
        }
        for (const p of bedrockStatus.players.list || []) {
          if (p.name && !seen.has(p.name.toLowerCase())) {
            seen.add(p.name.toLowerCase());
            mergedList.push(p);
          }
        }

        // Avoid double counting
        const totalOnline = Math.max(javaStatus.players.online, mergedList.length);
        const maxSlots = Math.max(javaStatus.players.max, bedrockStatus.players.max);

        return {
          ...javaStatus,
          players: {
            online: totalOnline,
            max: maxSlots,
            list: mergedList,
          },
        };
      }
    } catch {
      // Fallback to javaStatus
    }
  }

  return javaStatus;
}

// Public Endpoint: Live Minecraft Server Status (Real Paper & BungeeCord Network)
app.get('/api/mc-status', async (req, res) => {
  try {
    const settingsList = await db.select().from(siteSettings).limit(1);
    const settings = settingsList[0];
    const serverIp = settings?.serverIp || 'play.beastmc.net';
    const serverPort = settings?.serverPort || 25565;
    const bedrockPort = settings?.bedrockPort || 19132;
    const crossplayEnabled = (settings?.crossplayEnabled ?? 1) === 1;
    const serverType = settings?.serverType || 'paper';
    const serverName = settings?.siteName || 'BeastMC Network';

    let networkServers: Array<{ id: string; name: string; ip: string; port: number }> = [];
    try {
      networkServers = typeof settings?.networkServers === 'string'
        ? JSON.parse(settings.networkServers)
        : (settings?.networkServers || []);
    } catch {
      networkServers = [];
    }

    // 11. BungeeCord Multi-Server Mode: Query proxy and sub-servers, aggregate unique total players
    if (serverType === 'bungeecord' && networkServers.length > 0) {
      const nodePromises = networkServers.map(async (node) => {
        const nodeStatus = await querySingleMinecraftServer(node.ip, node.port);
        return {
          id: node.id || node.name,
          name: node.name,
          ip: node.ip,
          port: node.port,
          online: nodeStatus.online,
          status: nodeStatus.status,
          players: nodeStatus.players,
          motd: nodeStatus.motd.clean,
        };
      });

      const [proxyStatus, subNodes] = await Promise.all([
        querySingleMinecraftServer(serverIp, serverPort),
        Promise.all(nodePromises),
      ]);

      const seenNames = new Set<string>();
      const combinedUniquePlayers: Array<{ name: string; uuid?: string }> = [];

      for (const node of subNodes) {
        if (node.players.list) {
          for (const p of node.players.list) {
            if (p.name && !seenNames.has(p.name.toLowerCase())) {
              seenNames.add(p.name.toLowerCase());
              combinedUniquePlayers.push(p);
            }
          }
        }
      }
      if (proxyStatus.players.list) {
        for (const p of proxyStatus.players.list) {
          if (p.name && !seenNames.has(p.name.toLowerCase())) {
            seenNames.add(p.name.toLowerCase());
            combinedUniquePlayers.push(p);
          }
        }
      }

      const subServersTotal = subNodes.reduce((acc, n) => acc + (n.online ? n.players.online : 0), 0);
      const subServersMax = subNodes.reduce((acc, n) => acc + (n.online ? n.players.max : 0), 0);

      const totalOnline = Math.max(proxyStatus.players.online, subServersTotal, combinedUniquePlayers.length);
      const totalMax = Math.max(proxyStatus.players.max, subServersMax);

      const isNetworkOnline = proxyStatus.online || subNodes.some((n) => n.online);
      const networkStatus = isNetworkOnline
        ? 'online'
        : (proxyStatus.status === 'unavailable' ? 'unavailable' : 'offline');

      return res.json({
        serverName,
        online: isNetworkOnline,
        status: networkStatus,
        serverType: 'bungeecord',
        ip: serverIp,
        port: serverPort,
        bedrockPort,
        crossplayEnabled,
        players: {
          online: totalOnline,
          max: totalMax,
          list: combinedUniquePlayers,
        },
        version: {
          name: proxyStatus.version.name || 'BungeeCord Network Proxy',
        },
        motd: {
          clean: proxyStatus.motd.clean || 'BeastMC BungeeCord Minecraft Network',
        },
        icon: proxyStatus.icon,
        latency: proxyStatus.latency,
        networkServers: subNodes,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Default: Standalone Real Paper Server Query (with Geyser Bedrock Crossplay support)
    const status = await queryPaperWithCrossplay(serverIp, serverPort, bedrockPort, crossplayEnabled);
    return res.json({
      ...status,
      serverName,
      serverType: 'paper',
      bedrockPort,
      crossplayEnabled,
      networkServers: [],
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Minecraft status query error:', error);
    res.json({
      serverName: 'BeastMC Network',
      online: false,
      status: 'unavailable',
      ip: 'play.beastmc.net',
      port: 25565,
      bedrockPort: 19132,
      crossplayEnabled: true,
      serverType: 'paper',
      players: { online: 0, max: 0, list: [] },
      version: { name: 'Paper' },
      motd: { clean: 'Status query currently unavailable.' },
      icon: null,
      latency: null,
      networkServers: [],
      lastUpdated: new Date().toISOString(),
    });
  }
});

// Task 5 & 9: Owner Test Minecraft Server Connection endpoint
app.post('/api/admin/minecraft/test', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { serverIp, serverPort, bedrockPort, crossplayEnabled, serverType } = req.body;

    const validation = validateMinecraftAddress(serverIp, serverPort);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        status: 'invalid_address',
        message: validation.error || 'Invalid Minecraft server address or port.',
        latency: null,
        players: { online: 0, max: 0, list: [] },
      });
    }

    const isCrossplay = crossplayEnabled === 1 || crossplayEnabled === true;
    const cleanBedrock = bedrockPort ? Number(bedrockPort) : 19132;

    const startTime = Date.now();
    let result;
    if (serverType === 'bungeecord') {
      result = await querySingleMinecraftServer(validation.cleanIp, validation.cleanPort, false);
    } else {
      result = await queryPaperWithCrossplay(validation.cleanIp, validation.cleanPort, cleanBedrock, isCrossplay);
    }
    const roundTrip = Date.now() - startTime;

    if (result.online) {
      return res.json({
        success: true,
        status: 'online',
        message: `Connection Successful! ${serverType === 'bungeecord' ? 'BungeeCord proxy' : 'Paper server'} at ${validation.cleanIp}:${validation.cleanPort} responded in ${result.latency || roundTrip}ms with ${result.players.online} active player(s).`,
        latency: result.latency || roundTrip,
        players: result.players,
        version: result.version,
        motd: result.motd,
        icon: result.icon,
        testedAt: new Date().toISOString(),
      });
    } else if (result.status === 'offline') {
      return res.json({
        success: false,
        status: 'offline',
        message: `Server Offline: Reached host (${validation.cleanIp}), but no Minecraft Paper server is running or listening on port ${validation.cleanPort}. Please start the server in your Pterodactyl Panel.`,
        latency: null,
        players: { online: 0, max: 0, list: [] },
        version: result.version,
        motd: result.motd,
        testedAt: new Date().toISOString(),
      });
    } else {
      return res.json({
        success: false,
        status: 'unavailable',
        message: `Status Unavailable / Connection Timed Out: Could not establish a connection to ${validation.cleanIp}:${validation.cleanPort}. Verify your Pterodactyl port allocation, node IP, and DNS records.`,
        latency: null,
        players: { online: 0, max: 0, list: [] },
        version: result.version,
        motd: result.motd,
        testedAt: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'unavailable',
      message: `Status API Unavailable: ${error.message || 'An error occurred while testing server connection.'}`,
      latency: null,
      players: { online: 0, max: 0, list: [] },
    });
  }
});

// Task 1 & 9: Owner-Only Save Minecraft Server Settings
app.put('/api/admin/minecraft/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Only the Owner can modify Minecraft server settings
    if (req.user?.role !== 'owner') {
      return res.status(403).json({
        error: 'Permission denied: Only the Owner can modify Minecraft Server Settings.',
      });
    }

    const {
      siteName,
      serverIp,
      serverPort,
      bedrockPort,
      serverType,
      crossplayEnabled,
      networkServers,
    } = req.body;

    const validation = validateMinecraftAddress(serverIp, serverPort);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    let cleanBedrockPort = bedrockPort ? Number(bedrockPort) : 19132;
    if (isNaN(cleanBedrockPort) || cleanBedrockPort < 1 || cleanBedrockPort > 65535) {
      cleanBedrockPort = 19132;
    }

    const list = await db.select().from(siteSettings).limit(1);
    let updated;

    if (list.length === 0) {
      [updated] = await db.insert(siteSettings).values({
        siteName: siteName ? siteName.trim() : 'BeastMC Network',
        serverIp: validation.cleanIp,
        serverPort: validation.cleanPort,
        bedrockPort: cleanBedrockPort,
        serverType: serverType === 'bungeecord' ? 'bungeecord' : 'paper',
        crossplayEnabled: crossplayEnabled === 0 ? 0 : 1,
        networkServers: typeof networkServers === 'string' ? networkServers : JSON.stringify(networkServers || []),
      }).returning();
    } else {
      [updated] = await db.update(siteSettings).set({
        siteName: siteName !== undefined ? siteName.trim() : list[0].siteName,
        serverIp: validation.cleanIp,
        serverPort: validation.cleanPort,
        bedrockPort: cleanBedrockPort,
        serverType: serverType === 'bungeecord' ? 'bungeecord' : 'paper',
        crossplayEnabled: crossplayEnabled === 0 ? 0 : 1,
        networkServers: networkServers !== undefined
          ? (typeof networkServers === 'string' ? networkServers : JSON.stringify(networkServers))
          : (list[0].networkServers || '[]'),
        updatedAt: new Date(),
      }).where(eq(siteSettings.id, list[0].id)).returning();
    }

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'MINECRAFT_SETTINGS_UPDATED',
      details: `Owner updated Minecraft server settings: ${updated.serverIp}:${updated.serverPort} (Bedrock: ${updated.bedrockPort}, Type: ${updated.serverType}, Crossplay: ${updated.crossplayEnabled ? 'Yes' : 'No'})`,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save Minecraft server settings' });
  }
});

// Public Site Settings
app.get('/api/settings', async (req, res) => {
  try {
    const tz = getConfiguredTimezone();
    const season = await getDatabaseSeasonSettings();
    const list = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1);

    if (list.length === 0) {
      return res.json({
        id: 1,
        siteName: 'BeastMC Network',
        serverIp: 'play.beastmc.net',
        serverPort: 25565,
        bedrockPort: 19132,
        crossplayEnabled: 1,
        discordUrl: 'https://discord.gg/beastmc',
        logoUrl: '',
        heroTitle: 'WELCOME TO BEASTMC NETWORK',
        heroSubtitle: 'The ultimate Minecraft competitive survival and minigames server.',
        heroBgUrl: '',
        bannerUrl: '',
        faviconUrl: '',
        supportEmail: 'support@beastmc.net',
        serverType: 'paper',
        networkServers: '[]',
        announcementText: 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted',
        announcementEnabled: 1,
        timezone: tz,
        seasonSettings: season,
        seasonTitle: season.seasonTitle,
        seasonNumber: season.seasonNumber,
        seasonSubtitle: season.seasonSubtitle,
      });
    }
    res.json({
      ...list[0],
      announcementText: list[0].announcementText ?? 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted',
      announcementEnabled: list[0].announcementEnabled ?? 1,
      timezone: tz,
      seasonSettings: season,
      seasonTitle: season.seasonTitle,
      seasonNumber: season.seasonNumber,
      seasonSubtitle: season.seasonSubtitle,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

// Admin: Get and Update Configured Website Timezone
app.get('/api/admin/settings/timezone', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  res.json({ timezone: getConfiguredTimezone() });
});

app.put('/api/admin/settings/timezone', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  const { timezone } = req.body;
  if (!timezone || typeof timezone !== 'string') {
    return res.status(400).json({ error: 'Valid timezone string is required' });
  }
  setConfiguredTimezone(timezone.trim());
  res.json({ success: true, timezone: timezone.trim() });
});

// ==========================================
// SEASON SETTINGS & RANK COMPARISON ROUTES
// ==========================================

// Public: Get dynamic Season Settings
app.get('/api/season-settings', async (_req, res) => {
  try {
    const season = await getDatabaseSeasonSettings();
    res.json(season);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch season settings' });
  }
});

// Admin: Update Season Settings
app.put('/api/admin/season-settings', requireAuth, requirePermission('manage_settings'), async (req: AuthRequest, res) => {
  try {
    const updated = await saveDatabaseSeasonSettings(req.body);
    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'SEASON_SETTINGS_UPDATED',
      details: `Updated Season Title to "${updated.seasonTitle}", Season #${updated.seasonNumber}`,
    });
    res.json({ success: true, seasonSettings: updated });
  } catch (error: any) {
    console.error('Update season settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to save season settings' });
  }
});

// Public: Get Rank Comparison Matrix (auto-synced with real database ranks)
app.get('/api/rank-comparison', async (_req, res) => {
  try {
    const features = await getDatabaseRankComparison();
    const ranks = await db
      .select()
      .from(products)
      .where(eq(products.category, 'rank'))
      .orderBy(products.sortOrder);

    res.json({ features, ranks });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch rank comparison' });
  }
});

// Admin: Save Rank Comparison Matrix
app.put('/api/admin/rank-comparison', requireAuth, requirePermission('manage_settings'), async (req: AuthRequest, res) => {
  try {
    const { features } = req.body;
    if (!Array.isArray(features)) {
      return res.status(400).json({ error: 'Features array is required' });
    }
    const saved = await saveDatabaseRankComparison(features);
    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'RANK_COMPARISON_UPDATED',
      details: `Saved Rank Comparison Matrix with ${saved.length} features permanently`,
    });
    res.json({ success: true, features: saved });
  } catch (error: any) {
    console.error('Update rank comparison error:', error);
    res.status(500).json({ error: error.message || 'Failed to save rank comparison' });
  }
});

// Public Store Products
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let query = db.select().from(products).where(eq(products.isActive, 1));

    const allProducts = await query;
    const filtered = category
      ? allProducts.filter((p) => p.category === category)
      : allProducts;

    // Sort by sortOrder ascending
    filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch products' });
  }
});

// Single product by slug
app.get('/api/products/:slug', async (req, res) => {
  try {
    const found = await db.select().from(products).where(eq(products.slug, req.params.slug)).limit(1);
    if (found.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(found[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch product' });
  }
});

// Public Payment Methods
app.get('/api/payment-methods', async (req, res) => {
  try {
    const methods = await db.select().from(paymentMethods).where(eq(paymentMethods.isActive, 1));
    res.json(methods);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch payment methods' });
  }
});

// ==========================================
// 2. AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username, minecraftUsername } = req.body;

    if (!email || !password || !username || !minecraftUsername) {
      return res.status(400).json({ error: 'All fields (email, password, username, minecraft username) are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if email already registered
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const uid = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    const isOwnerEmail = email.toLowerCase().trim() === 'mhaseebahmed0@gmail.com';
    const allPerms = [
      'manage_settings',
      'manage_products',
      'manage_payments',
      'verify_orders',
      'deliver_orders',
      'manage_admins',
      'view_audit_logs',
    ];
    const initialRole = isOwnerEmail ? 'owner' : 'player';
    const initialPerms = isOwnerEmail ? JSON.stringify(allPerms) : '[]';

    const [newUser] = await db.insert(users).values({
      uid,
      email: email.toLowerCase().trim(),
      username: username.trim(),
      minecraftUsername: minecraftUsername.trim(),
      passwordHash,
      role: initialRole,
      permissions: initialPerms,
      isBanned: 0,
    }).returning();

    const token = signUserToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        uid: newUser.uid,
        email: newUser.email,
        username: newUser.username,
        minecraftUsername: newUser.minecraftUsername,
        role: newUser.role,
        permissions: isOwnerEmail ? allPerms : [],
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Block all demo endpoints permanently
app.all(['/api/auth/demo*', '/api/demo*'], (_req, res) => {
  return res.status(403).json({
    error: 'Demo access and demo staff roles have been permanently disabled. Visitors cannot gain Owner or Admin privileges through demo features.',
  });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (
      normalizedEmail === 'owner@beastmc.net' ||
      normalizedEmail === 'admin@beastmc.net' ||
      normalizedEmail === 'mod@beastmc.net' ||
      normalizedEmail === 'player@beastmc.net'
    ) {
      return res.status(403).json({
        error: 'Demo accounts and demo staff logins have been permanently disabled. Please sign in with your verified BeastMC staff or player account.',
      });
    }

    const found = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (found.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = found[0];
    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been suspended by BeastMC Administration' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Please sign in with Google' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.email.toLowerCase().trim() === 'mhaseebahmed0@gmail.com' && user.role !== 'owner') {
      const allPerms = [
        'manage_settings',
        'manage_products',
        'manage_payments',
        'verify_orders',
        'deliver_orders',
        'manage_admins',
        'view_audit_logs',
      ];
      await db.update(users).set({
        role: 'owner',
        permissions: JSON.stringify(allPerms),
      }).where(eq(users.id, user.id));
      user.role = 'owner';
      user.permissions = JSON.stringify(allPerms);
    }

    const token = signUserToken(user);
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(user.permissions || '[]');
    } catch {
      permissions = [];
    }

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        minecraftUsername: user.minecraftUsername,
        role: user.role,
        permissions,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Sync Google Auth / Firebase
app.post('/api/auth/google-sync', async (req, res) => {
  try {
    const { idToken, minecraftUsername } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase idToken' });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email || `${decoded.uid}@beastmc.net`;
    const defaultName = (decoded.name || email.split('@')[0] || 'Player').replace(/\s+/g, '_');

    let user = (await db.select().from(users).where(eq(users.uid, decoded.uid)).limit(1))[0];

    if (!user) {
      // Check if user with this email exists
      user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
      if (user) {
        // Link uid
        await db.update(users).set({ uid: decoded.uid }).where(eq(users.id, user.id));
      } else {
        // Create user
        const [created] = await db.insert(users).values({
          uid: decoded.uid,
          email,
          username: defaultName,
          minecraftUsername: minecraftUsername || defaultName,
          role: 'player',
          permissions: '[]',
          isBanned: 0,
        }).returning();
        user = created;
      }
    }

    if (user && email.toLowerCase().trim() === 'mhaseebahmed0@gmail.com' && user.role !== 'owner') {
      const allPerms = [
        'manage_settings',
        'manage_products',
        'manage_payments',
        'verify_orders',
        'deliver_orders',
        'manage_admins',
        'view_audit_logs',
      ];
      await db.update(users).set({
        role: 'owner',
        permissions: JSON.stringify(allPerms),
      }).where(eq(users.id, user.id));
      user.role = 'owner';
      user.permissions = JSON.stringify(allPerms);
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const token = signUserToken(user);
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(user.permissions || '[]');
    } catch {
      permissions = [];
    }

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        minecraftUsername: user.minecraftUsername,
        role: user.role,
        permissions,
      },
    });
  } catch (error: any) {
    console.error('Google sync error:', error);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// Current User Profile
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// Update Profile (e.g. Minecraft username)
app.put('/api/auth/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { minecraftUsername, username } = req.body;
    const updateData: any = { updatedAt: new Date() };

    if (minecraftUsername && minecraftUsername.trim()) {
      updateData.minecraftUsername = minecraftUsername.trim();
    }
    if (username && username.trim()) {
      updateData.username = username.trim();
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, req.user!.id))
      .returning();

    let permissions: string[] = [];
    try {
      permissions = JSON.parse(updated.permissions || '[]');
    } catch {
      permissions = [];
    }

    res.json({
      user: {
        id: updated.id,
        uid: updated.uid,
        email: updated.email,
        username: updated.username,
        minecraftUsername: updated.minecraftUsername,
        role: updated.role,
        permissions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

// ==========================================
// 3. ORDERS & MANUAL PAYMENT CHECKOUT
// ==========================================

// Create new order (Login required!)
app.post('/api/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      productId,
      minecraftUsername,
      paymentMethodId,
      transactionId,
      senderNote,
      paymentScreenshotUrl,
    } = req.body;

    if (!productId || !minecraftUsername || !paymentMethodId || !transactionId) {
      return res.status(400).json({
        error: 'Missing required checkout information: Product, Minecraft Username, Payment Method, and Transaction ID are required.',
      });
    }

    // Verify product
    const productList = await db.select().from(products).where(eq(products.id, Number(productId))).limit(1);
    if (productList.length === 0) {
      return res.status(404).json({ error: 'Selected product was not found' });
    }
    const product = productList[0];

    // Verify payment method
    const methodList = await db.select().from(paymentMethods).where(eq(paymentMethods.id, Number(paymentMethodId))).limit(1);
    if (methodList.length === 0) {
      return res.status(404).json({ error: 'Selected payment method was not found' });
    }
    const method = methodList[0];

    // Generate unique order code (e.g. BMC-2026-XXXX)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `BMC-${new Date().getFullYear()}-${randomSuffix}`;

    const initialHistory = JSON.stringify([
      {
        action: 'Order Created',
        timestamp: new Date().toISOString(),
        adminEmail: 'System',
        note: `Order placed for ${product.name} ($${(product.price / 100).toFixed(2)}) via ${method.name}.`,
      },
      {
        action: 'Payment Submitted',
        timestamp: new Date().toISOString(),
        adminEmail: req.user!.email,
        note: `Transaction ID: ${transactionId.trim()}.${paymentScreenshotUrl ? ' Proof screenshot uploaded.' : ''}`,
      },
    ]);

    const [newOrder] = await db.insert(orders).values({
      orderCode,
      userId: req.user!.id,
      userEmail: req.user!.email,
      minecraftUsername: minecraftUsername.trim(),
      productId: product.id,
      productName: product.name,
      amount: product.price,
      currency: method.currency || 'USD',
      paymentMethodId: method.id,
      paymentMethodName: method.name,
      transactionId: transactionId.trim(),
      senderNote: senderNote || '',
      paymentScreenshotUrl: paymentScreenshotUrl || '',
      status: 'Pending',
      deliveryNotice: '',
      deliveryEmailSent: 0,
      paymentVerified: 0,
      orderHistory: initialHistory,
      isDeleted: 0,
    }).returning();

    res.status(201).json({
      message: 'Order created successfully. Manual payment verification is pending.',
      order: newOrder,
    });
  } catch (error: any) {
    console.error('Order creation failed:', error);
    res.status(500).json({ error: error.message || 'Failed to place order' });
  }
});

// Get Current Player's Orders
app.get('/api/orders/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userOrders = await db
      .select({
        id: orders.id,
        orderCode: orders.orderCode,
        userId: orders.userId,
        userEmail: orders.userEmail,
        minecraftUsername: orders.minecraftUsername,
        productId: orders.productId,
        productName: orders.productName,
        amount: orders.amount,
        currency: orders.currency,
        paymentMethodId: orders.paymentMethodId,
        paymentMethodName: orders.paymentMethodName,
        transactionId: orders.transactionId,
        senderNote: orders.senderNote,
        status: orders.status,
        rejectionReason: orders.rejectionReason,
        approvedAt: orders.approvedAt,
        deliveredAt: orders.deliveredAt,
        deliveryNotice: orders.deliveryNotice,
        deliveryEmailSent: orders.deliveryEmailSent,
        paymentVerified: orders.paymentVerified,
        paymentVerifiedAt: orders.paymentVerifiedAt,
        paymentVerifiedBy: orders.paymentVerifiedBy,
        orderHistory: orders.orderHistory,
        isDeleted: orders.isDeleted,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(eq(orders.userId, req.user!.id), or(eq(orders.isDeleted, 0), sql`${orders.isDeleted} IS NULL`)))
      .orderBy(desc(orders.createdAt));

    // Fetch product details to map category & package type
    const productList = await db.select().from(products);
    const productMap = new Map(productList.map((p) => [p.id, p]));

    const enriched = userOrders.map((o) => {
      const prod = o.productId ? productMap.get(o.productId) : null;
      let category = prod ? prod.category : 'rank';
      if (!prod) {
        if (o.productName.toLowerCase().includes('coin')) category = 'coins';
        else if (o.productName.toLowerCase().includes('crate') || o.productName.toLowerCase().includes('key')) category = 'crate';
        else if (o.productName.toLowerCase().includes('bundle')) category = 'bundle';
      }

      // Calculate 24-hour delivery deadline if approved
      let deliveryDeadline: string | null = null;
      if (o.approvedAt) {
        const approvedTime = new Date(o.approvedAt).getTime();
        deliveryDeadline = new Date(approvedTime + 24 * 60 * 60 * 1000).toISOString();
      }

      const packageType =
        category === 'rank'
          ? 'Rank Package'
          : category === 'coins'
          ? 'Coins Package'
          : category === 'crate'
          ? 'Crates & Keys'
          : 'Special Bundle';

      return {
        ...o,
        productCategory: category,
        packageType,
        deliveryDeadline,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch your orders' });
  }
});

// Track order by code (Public or authenticated)
app.get('/api/orders/track/:orderCode', async (req, res) => {
  try {
    const found = await db
      .select()
      .from(orders)
      .where(eq(orders.orderCode, req.params.orderCode.trim().toUpperCase()))
      .limit(1);

    if (found.length === 0) {
      return res.status(404).json({ error: 'Order not found with this code' });
    }

    const order = found[0];
    // Return sanitized tracking view
    res.json({
      orderCode: order.orderCode,
      minecraftUsername: order.minecraftUsername,
      productName: order.productName,
      amount: order.amount,
      currency: order.currency,
      paymentMethodName: order.paymentMethodName,
      status: order.status,
      rejectionReason: order.rejectionReason,
      approvedAt: order.approvedAt,
      deliveredAt: order.deliveredAt,
      deliveryNotice: order.deliveryNotice,
      createdAt: order.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to track order' });
  }
});

// ==========================================
// 4. ADMIN & STAFF MANAGEMENT ROUTES
// ==========================================

// Helper to append events to chronological order history
function appendOrderHistory(
  existingJson: string | null | undefined,
  event: { action: string; timestamp: string; adminEmail: string; note?: string }
): string {
  let list: any[] = [];
  try {
    list = existingJson ? JSON.parse(existingJson) : [];
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  list.push(event);
  return JSON.stringify(list);
}

// Admin: Overview stats (Excludes soft-deleted orders)
app.get('/api/admin/stats', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allOrdersRaw = await db.select().from(orders);
    const allOrders = allOrdersRaw.filter((o) => o.isDeleted !== 1);
    const allUsers = await db.select().from(users);

    const pendingPaymentCount = allOrders.filter(
      (o) => o.status === 'Pending' || o.status === 'Pending Payment Verification'
    ).length;
    const deliveryPendingCount = allOrders.filter(
      (o) => o.status === 'Approved' || o.status === 'Delivery Pending'
    ).length;
    const deliveredCount = allOrders.filter(
      (o) => o.status === 'Completed' || o.status === 'Delivered'
    ).length;
    const rejectedCount = allOrders.filter(
      (o) => o.status === 'Rejected' || o.status === 'Payment Rejected'
    ).length;

    const totalRevenueCents = allOrders
      .filter(
        (o) =>
          o.status === 'Completed' ||
          o.status === 'Delivered' ||
          o.status === 'Approved' ||
          o.status === 'Delivery Pending'
      )
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    res.json({
      totalUsers: allUsers.length,
      totalOrders: allOrders.length,
      pendingPaymentCount,
      deliveryPendingCount,
      deliveredCount,
      rejectedCount,
      totalRevenueUsd: (totalRevenueCents / 100).toFixed(2),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch admin statistics' });
  }
});

// Admin: Advanced Order & Payment Management (Server-side database filtering, date ranges, combined search, real statistics)
app.get('/api/admin/orders', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      status,
      search,
      datePreset,
      startDate,
      endDate,
      timezone: clientTz,
      orderId,
      minecraftUsername,
      customerEmail,
      productName,
      format,
    } = req.query;

    const tz = (typeof clientTz === 'string' && clientTz.trim()) || getConfiguredTimezone() || 'UTC';

    // Build SQL conditions for server-side database filtering
    const conditions = [eq(orders.isDeleted, 0)];

    // 1. Date Filtering
    let startFilter: Date | null = null;
    let endFilter: Date | null = null;

    if (datePreset && datePreset !== 'all_time') {
      const range = getDateRangeForPreset(
        datePreset as DatePreset,
        tz,
        typeof startDate === 'string' ? startDate : undefined,
        typeof endDate === 'string' ? endDate : undefined
      );
      startFilter = range.start;
      endFilter = range.end;
    } else if (startDate || endDate) {
      if (typeof startDate === 'string' && startDate.trim()) {
        startFilter = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
      }
      if (typeof endDate === 'string' && endDate.trim()) {
        endFilter = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
      }
    }

    if (startFilter && !isNaN(startFilter.getTime())) {
      conditions.push(gte(orders.createdAt, startFilter));
    }
    if (endFilter && !isNaN(endFilter.getTime())) {
      conditions.push(lte(orders.createdAt, endFilter));
    }

    // 2. Status Filtering
    if (status && status !== 'all') {
      const st = String(status).toLowerCase().trim();
      if (st === 'pending') {
        conditions.push(
          or(
            sql`LOWER(${orders.status}) = 'pending'`,
            sql`LOWER(${orders.status}) = 'pending payment verification'`
          )!
        );
      } else if (st === 'payment_verified' || st === 'payment verified') {
        conditions.push(
          or(
            sql`LOWER(${orders.status}) = 'payment verified'`,
            eq(orders.paymentVerified, 1)
          )!
        );
      } else if (st === 'awaiting_delivery' || st === 'awaiting delivery') {
        conditions.push(
          or(
            sql`LOWER(${orders.status}) = 'awaiting delivery'`,
            sql`LOWER(${orders.status}) = 'delivery pending'`
          )!
        );
      } else if (st === 'approved') {
        conditions.push(
          or(
            sql`LOWER(${orders.status}) = 'approved'`,
            sql`LOWER(${orders.status}) = 'delivery pending'`,
            sql`LOWER(${orders.status}) = 'awaiting delivery'`
          )!
        );
      } else if (st === 'rejected') {
        conditions.push(
          or(
            sql`LOWER(${orders.status}) = 'rejected'`,
            sql`LOWER(${orders.status}) = 'payment rejected'`
          )!
        );
      } else if (st === 'completed') {
        conditions.push(
          or(
            sql`LOWER(${orders.status}) = 'completed'`,
            sql`LOWER(${orders.status}) = 'delivered'`
          )!
        );
      } else {
        conditions.push(sql`LOWER(${orders.status}) = ${st}`);
      }
    }

    // 3. Specific Combined Search Filters
    if (orderId && typeof orderId === 'string' && orderId.trim()) {
      const cleanOrderId = orderId.trim().replace(/^#/, '');
      conditions.push(ilike(orders.orderCode, `%${cleanOrderId}%`));
    }

    if (minecraftUsername && typeof minecraftUsername === 'string' && minecraftUsername.trim()) {
      conditions.push(ilike(orders.minecraftUsername, `%${minecraftUsername.trim()}%`));
    }

    if (customerEmail && typeof customerEmail === 'string' && customerEmail.trim()) {
      conditions.push(ilike(orders.userEmail, `%${customerEmail.trim()}%`));
    }

    if (productName && typeof productName === 'string' && productName.trim()) {
      conditions.push(ilike(orders.productName, `%${productName.trim()}%`));
    }

    // 4. Combined General Search across Order Code, Minecraft IGN, Email, Product, Transaction ID, and Customer Username
    if (search && typeof search === 'string' && search.trim()) {
      const q = `%${search.trim().replace(/^#/, '')}%`;
      conditions.push(
        or(
          ilike(orders.orderCode, q),
          ilike(orders.minecraftUsername, q),
          ilike(orders.userEmail, q),
          ilike(orders.productName, q),
          ilike(orders.transactionId, q),
          ilike(users.username, q)
        )!
      );
    }

    // Execute server-side database query with leftJoin on users to get customerUsername
    const rows = await db
      .select({
        order: orders,
        customerUsername: users.username,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    const resultOrders = rows.map((r) => ({
      ...r.order,
      customerUsername:
        r.customerUsername ||
        r.order.minecraftUsername ||
        (r.order.userEmail ? r.order.userEmail.split('@')[0] : 'Guest Player'),
    }));

    // 5. Compute real database statistics for currently selected filters
    const totalOrders = resultOrders.length;
    const pendingOrders = resultOrders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return s === 'pending' || s === 'pending payment verification';
    }).length;

    const paymentVerifiedOrders = resultOrders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return s === 'payment verified' || o.paymentVerified === 1;
    }).length;

    const awaitingDeliveryOrders = resultOrders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return s === 'awaiting delivery' || s === 'delivery pending';
    }).length;

    const approvedOrders = resultOrders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return s === 'approved' || s === 'delivery pending' || s === 'awaiting delivery';
    }).length;

    const rejectedOrders = resultOrders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return s === 'rejected' || s === 'payment rejected';
    }).length;

    const completedOrders = resultOrders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return s === 'completed' || s === 'delivered';
    }).length;

    const totalOrderValue = resultOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalOrderValueFormatted = `$${(totalOrderValue / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;

    const stats = {
      totalOrders,
      pendingOrders,
      paymentVerifiedOrders,
      awaitingDeliveryOrders,
      approvedOrders,
      rejectedOrders,
      completedOrders,
      totalOrderValue,
      totalOrderValueFormatted,
    };

    if (format === 'legacy') {
      return res.json(resultOrders);
    }

    res.json({
      orders: resultOrders,
      stats,
      timezone: tz,
    });
  } catch (error: any) {
    console.error('Fetch filtered orders error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch orders' });
  }
});

// Task 5: Manual Payment Evidence Verification (Explicit confirmation of bank/payment receipt)
app.post(
  '/api/admin/orders/:id/verify-payment',
  requireAuth,
  requirePermission('verify_orders'),
  async (req: AuthRequest, res) => {
    try {
      const orderId = Number(req.params.id);
      const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (found.length === 0 || found[0].isDeleted === 1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = found[0];

      const updatedHistory = appendOrderHistory(order.orderHistory, {
        action: 'Payment Verified',
        timestamp: new Date().toISOString(),
        adminEmail: req.user!.email,
        note: `Payment proof manually verified and matched with financial records. TID: ${order.transactionId}.`,
      });

      const isPending = (order.status || '').toLowerCase().includes('pending');
      const nextStatus = isPending ? 'Payment Verified' : order.status;

      const [updated] = await db
        .update(orders)
        .set({
          status: nextStatus,
          paymentVerified: 1,
          paymentVerifiedAt: new Date(),
          paymentVerifiedBy: req.user!.username,
          deliveryNotice: 'Payment verified by Owner. Awaiting manual delivery queue.',
          orderHistory: updatedHistory,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      await db.insert(auditLogs).values({
        adminEmail: req.user!.email,
        action: 'PAYMENT_VERIFIED',
        details: `Verified payment proof for Order #${order.orderCode} (Amount: $${(order.amount / 100).toFixed(2)}, Method: ${order.paymentMethodName}, TID: ${order.transactionId})`,
      });

      res.json({
        message: 'Payment evidence verified successfully.',
        order: updated,
      });
    } catch (error: any) {
      console.error('Verify payment proof error:', error);
      res.status(500).json({ error: error.message || 'Failed to verify payment proof' });
    }
  }
);

// Task 2 & 7: Owner Reopen Rejected Order (Restores to Pending Review, preserves proof & details, no auto delivery)
app.post(
  '/api/admin/orders/:id/reopen',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      // Only the Owner can reopen rejected orders
      if (req.user?.role !== 'owner') {
        return res.status(403).json({
          error: 'Permission Denied: Only the Server Owner can reopen rejected orders.',
        });
      }

      const orderId = Number(req.params.id);
      const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (found.length === 0 || found[0].isDeleted === 1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = found[0];

      const updatedHistory = appendOrderHistory(order.orderHistory, {
        action: 'Order Reopened',
        timestamp: new Date().toISOString(),
        adminEmail: req.user!.email,
        note: 'Order reopened by Owner and restored to Pending Review. Preserved original payment screenshot and customer details for reverification.',
      });

      const [updated] = await db
        .update(orders)
        .set({
          status: 'Pending',
          rejectionReason: '',
          deliveryNotice: '',
          paymentVerified: 0,
          paymentVerifiedAt: null,
          paymentVerifiedBy: '',
          orderHistory: updatedHistory,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      await db.insert(auditLogs).values({
        adminEmail: req.user!.email,
        action: 'ORDER_REOPENED',
        details: `Owner reopened rejected Order #${order.orderCode} (${order.productName}) for ${order.minecraftUsername}. Restored to Pending Review without automatic delivery.`,
      });

      res.json({
        message: 'Order reopened successfully and restored to Pending Review. You can now review proof and verify payment.',
        order: updated,
      });
    } catch (error: any) {
      console.error('Reopen order error:', error);
      res.status(500).json({ error: error.message || 'Failed to reopen order' });
    }
  }
);

// Task 1, 2 & 7: Verify Payment (Approve or Reject with Duplicate Processing Prevention)
app.post(
  '/api/admin/orders/:id/verify',
  requireAuth,
  requirePermission('verify_orders'),
  async (req: AuthRequest, res) => {
    try {
      const orderId = Number(req.params.id);
      const { action, rejectionReason } = req.body;

      if (!action || (action !== 'approve' && action !== 'reject')) {
        return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
      }

      const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (found.length === 0 || found[0].isDeleted === 1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = found[0];

      if (action === 'approve') {
        // Prevent duplicate payment processing & duplicate product delivery
        if (order.status === 'Completed' || order.status === 'Delivered' || order.deliveredAt) {
          return res.status(400).json({
            error: 'Duplicate Prevention: This order has already been fulfilled and delivered.',
          });
        }

        const updatedHistory = appendOrderHistory(order.orderHistory, {
          action: 'Order Approved',
          timestamp: new Date().toISOString(),
          adminEmail: req.user!.email,
          note: 'Payment approved. Ready for in-game product delivery.',
        });

        const [updated] = await db
          .update(orders)
          .set({
            status: 'Approved',
            approvedAt: new Date(),
            rejectionReason: '',
            paymentVerified: 1,
            paymentVerifiedAt: order.paymentVerifiedAt || new Date(),
            paymentVerifiedBy: order.paymentVerifiedBy || req.user!.username,
            deliveryNotice:
              'Your payment has been verified. Your order will be delivered within 24 hours.',
            orderHistory: updatedHistory,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId))
          .returning();

        // Audit log
        await db.insert(auditLogs).values({
          adminEmail: req.user!.email,
          action: 'ORDER_APPROVED',
          details: `Approved payment for Order #${order.orderCode} (${order.productName}) by ${order.minecraftUsername}`,
        });

        return res.json({
          message: 'Payment verified and approved. Order status changed to Approved.',
          order: updated,
        });
      } else {
        // Reject
        const reason =
          rejectionReason ||
          'Payment transaction verification failed. Please check your transaction ID or receipt and contact support.';

        const updatedHistory = appendOrderHistory(order.orderHistory, {
          action: 'Order Rejected',
          timestamp: new Date().toISOString(),
          adminEmail: req.user!.email,
          note: `Rejection reason: ${reason}`,
        });

        const [updated] = await db
          .update(orders)
          .set({
            status: 'Rejected',
            rejectionReason: reason,
            deliveryNotice: '',
            orderHistory: updatedHistory,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId))
          .returning();

        // Audit log
        await db.insert(auditLogs).values({
          adminEmail: req.user!.email,
          action: 'ORDER_REJECTED',
          details: `Rejected payment for Order #${order.orderCode} (${order.productName}). Reason: ${reason}`,
        });

        return res.json({
          message: 'Payment marked as rejected.',
          order: updated,
        });
      }
    } catch (error: any) {
      console.error('Verify payment error:', error);
      res.status(500).json({ error: error.message || 'Failed to verify payment' });
    }
  }
);

// Task 1 & 7: Owner Arbitrary Order Status Update
app.put(
  '/api/admin/orders/:id/status',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'owner') {
        return res.status(403).json({
          error: 'Permission Denied: Only the Server Owner can override order statuses.',
        });
      }

      const orderId = Number(req.params.id);
      const { status, note } = req.body;

      const validStatuses = [
        'Pending',
        'Payment Verified',
        'Awaiting Delivery',
        'Approved',
        'Rejected',
        'Completed',
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (found.length === 0 || found[0].isDeleted === 1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = found[0];

      // Prevent duplicate product delivery if transitioning to Completed when already delivered
      if (
        status === 'Completed' &&
        (order.status === 'Completed' || order.status === 'Delivered' || order.deliveredAt)
      ) {
        return res.status(400).json({
          error: 'Duplicate Prevention: This order has already been fulfilled and delivered.',
        });
      }

      const actionMap: Record<string, string> = {
        Pending: 'Order Reopened',
        'Payment Verified': 'Payment Verified',
        'Awaiting Delivery': 'Order Approved',
        Approved: 'Order Approved',
        Rejected: 'Order Rejected',
        Completed: 'Order Completed',
      };

      const updatedHistory = appendOrderHistory(order.orderHistory, {
        action: actionMap[status] || 'Order Status Updated',
        timestamp: new Date().toISOString(),
        adminEmail: req.user!.email,
        note: note || `Owner directly changed status from "${order.status}" to "${status}".`,
      });

      const updateData: any = {
        status,
        orderHistory: updatedHistory,
        updatedAt: new Date(),
      };

      if (status === 'Pending') {
        updateData.rejectionReason = '';
        updateData.deliveryNotice = '';
        updateData.paymentVerified = 0;
      } else if (status === 'Payment Verified') {
        updateData.paymentVerified = 1;
        updateData.paymentVerifiedAt = new Date();
        updateData.paymentVerifiedBy = req.user!.username;
        updateData.deliveryNotice = 'Payment has been verified by the Owner. Awaiting delivery queue.';
        updateData.rejectionReason = '';
      } else if (status === 'Awaiting Delivery' || status === 'Approved') {
        updateData.approvedAt = new Date();
        updateData.deliveryNotice = 'Payment approved. Owner will manually deliver the Minecraft product within 24 hours.';
        updateData.rejectionReason = '';
        updateData.paymentVerified = 1;
        if (!order.paymentVerifiedAt) {
          updateData.paymentVerifiedAt = new Date();
          updateData.paymentVerifiedBy = req.user!.username;
        }
      } else if (status === 'Rejected') {
        updateData.rejectionReason = note || 'Rejected by Owner';
        updateData.deliveryNotice = '';
      } else if (status === 'Completed') {
        updateData.deliveredAt = new Date();
        updateData.deliveredByAdmin = req.user!.username;
        updateData.deliveryNotice = 'Delivered successfully! Your rank/items are active in-game.';
      }

      const [updated] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning();

      await db.insert(auditLogs).values({
        adminEmail: req.user!.email,
        action: 'ORDER_STATUS_CHANGED',
        details: `Owner changed status of Order #${order.orderCode} from "${order.status}" to "${status}". Note: ${note || 'None'}`,
      });

      res.json({
        message: `Order status updated to ${status}.`,
        order: updated,
      });
    } catch (error: any) {
      console.error('Update order status error:', error);
      res.status(500).json({ error: error.message || 'Failed to update order status' });
    }
  }
);

// Task 1 & 7: Mark Delivered / Completed (Triggers 24-hr delivery completion & email, prevents duplicate delivery)
app.post(
  '/api/admin/orders/:id/deliver',
  requireAuth,
  requirePermission('deliver_orders'),
  async (req: AuthRequest, res) => {
    try {
      const orderId = Number(req.params.id);
      const { customDiscordLink } = req.body;

      const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (found.length === 0 || found[0].isDeleted === 1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = found[0];

      // Prevent duplicate product delivery
      if (order.status === 'Completed' || order.status === 'Delivered' || order.deliveredAt) {
        return res.status(400).json({
          error: 'Duplicate Prevention: This order has already been marked as Delivered and fulfilled.',
        });
      }

      // Fetch site settings for discord and support email
      const settings = (await db.select().from(siteSettings).limit(1))[0];
      const discordLink = customDiscordLink || settings?.discordUrl || 'https://discord.gg/beastmc';
      const supportEmail = settings?.supportEmail || 'support@beastmc.net';

      const updatedHistory = appendOrderHistory(order.orderHistory, {
        action: 'Order Completed',
        timestamp: new Date().toISOString(),
        adminEmail: req.user!.email,
        note: `Order fulfilled in-game by ${req.user!.username}. Official BeastMC Support delivery email dispatched.`,
      });

      // Update Order Status to Completed (and Delivered)
      const [updated] = await db
        .update(orders)
        .set({
          status: 'Completed',
          deliveredAt: new Date(),
          deliveredByAdmin: req.user!.username,
          deliveryNotice: 'Delivered successfully! Your rank/items are active in-game.',
          deliveryEmailSent: 1,
          orderHistory: updatedHistory,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Dispatch Official BeastMC Support Email
      const emailResult = await sendDeliveryConfirmationEmail({
        orderId: order.id,
        orderCode: order.orderCode,
        recipientEmail: order.userEmail,
        minecraftUsername: order.minecraftUsername,
        productName: order.productName,
        amount: order.amount,
        currency: order.currency || 'USD',
        discordLink,
        supportEmail,
      });

      // Audit log
      await db.insert(auditLogs).values({
        adminEmail: req.user!.email,
        action: 'ORDER_DELIVERED',
        details: `Order #${order.orderCode} marked as Delivered to ${order.minecraftUsername}. Sent email notification to ${order.userEmail}.`,
      });

      res.json({
        message: 'Order marked as Delivered/Completed and confirmation email sent from BeastMC Support.',
        order: updated,
        emailResult,
      });
    } catch (error: any) {
      console.error('Deliver order error:', error);
      res.status(500).json({ error: error.message || 'Failed to deliver order' });
    }
  }
);

// Task 3 & 7: Owner Individual Order Soft Deletion (Preserves payment & audit records)
app.delete(
  '/api/admin/orders/:id',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'owner') {
        return res.status(403).json({
          error: 'Permission Denied: Only the Server Owner can delete orders.',
        });
      }

      const orderId = Number(req.params.id);
      const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (found.length === 0 || found[0].isDeleted === 1) {
        return res.status(404).json({ error: 'Order not found or already deleted' });
      }

      const order = found[0];

      const updatedHistory = appendOrderHistory(order.orderHistory, {
        action: 'Order Deleted',
        timestamp: new Date().toISOString(),
        adminEmail: req.user!.email,
        note: `Order soft-deleted from active dashboard by Owner. Financial records and transaction audit preserved.`,
      });

      const [updated] = await db
        .update(orders)
        .set({
          isDeleted: 1,
          deletedAt: new Date(),
          deletedByAdmin: req.user!.email,
          orderHistory: updatedHistory,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      await db.insert(auditLogs).values({
        adminEmail: req.user!.email,
        action: 'ORDER_DELETED',
        details: `Owner soft-deleted Order #${order.orderCode} (${order.productName}) for ${order.minecraftUsername}. Amount: $${(order.amount / 100).toFixed(2)}, Status was: ${order.status}`,
      });

      res.json({
        message: `Order #${order.orderCode} removed successfully. Financial audit trail preserved.`,
        order: updated,
      });
    } catch (error: any) {
      console.error('Delete order error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete order' });
    }
  }
);

// Task 3, 4 & 7: Owner Bulk Order Soft Deletion
app.post(
  '/api/admin/orders/bulk-delete',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'owner') {
        return res.status(403).json({
          error: 'Permission Denied: Only the Server Owner can delete orders in bulk.',
        });
      }

      const { deleteType, orderIds } = req.body;
      const allActive = await db
        .select()
        .from(orders)
        .where(or(eq(orders.isDeleted, 0), sql`${orders.isDeleted} IS NULL`));

      let targetOrders = [...allActive];

      if (deleteType === 'selected') {
        if (!Array.isArray(orderIds) || orderIds.length === 0) {
          return res.status(400).json({ error: 'No orders selected for deletion.' });
        }
        const idSet = new Set(orderIds.map(Number));
        targetOrders = targetOrders.filter((o) => idSet.has(o.id));
      } else if (deleteType === 'rejected') {
        targetOrders = targetOrders.filter(
          (o) => o.status === 'Rejected' || o.status === 'Payment Rejected'
        );
      } else if (deleteType === 'approved') {
        targetOrders = targetOrders.filter(
          (o) => o.status === 'Approved' || o.status === 'Delivery Pending'
        );
      } else if (deleteType === 'completed') {
        targetOrders = targetOrders.filter(
          (o) => o.status === 'Completed' || o.status === 'Delivered'
        );
      } else if (deleteType === 'pending') {
        targetOrders = targetOrders.filter(
          (o) => o.status === 'Pending' || o.status === 'Pending Payment Verification'
        );
      } else {
        return res.status(400).json({ error: 'Invalid deleteType parameter specified.' });
      }

      if (targetOrders.length === 0) {
        return res.json({
          message: 'No orders found matching the criteria to delete.',
          deletedCount: 0,
        });
      }

      const now = new Date();
      for (const ord of targetOrders) {
        const updatedHistory = appendOrderHistory(ord.orderHistory, {
          action: 'Order Deleted',
          timestamp: now.toISOString(),
          adminEmail: req.user!.email,
          note: `Bulk deleted (${deleteType}) by Owner. Audit history preserved.`,
        });

        await db
          .update(orders)
          .set({
            isDeleted: 1,
            deletedAt: now,
            deletedByAdmin: req.user!.email,
            orderHistory: updatedHistory,
            updatedAt: now,
          })
          .where(eq(orders.id, ord.id));
      }

      await db.insert(auditLogs).values({
        adminEmail: req.user!.email,
        action: 'BULK_ORDERS_DELETED',
        details: `Owner bulk soft-deleted ${targetOrders.length} order(s) (Type: ${deleteType}). Order Codes: ${targetOrders.map((o) => o.orderCode).slice(0, 8).join(', ')}${targetOrders.length > 8 ? '...' : ''}`,
      });

      res.json({
        message: `Successfully removed ${targetOrders.length} order(s). Financial records preserved.`,
        deletedCount: targetOrders.length,
      });
    } catch (error: any) {
      console.error('Bulk delete orders error:', error);
      res.status(500).json({ error: error.message || 'Failed to bulk delete orders' });
    }
  }
);

// Admin: Products Management (CRUD)
app.get('/api/admin/products', requireAuth, requirePermission('manage_products'), async (req, res) => {
  try {
    const all = await db.select().from(products).orderBy(products.sortOrder);
    res.json(all);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch products' });
  }
});

app.post('/api/admin/products', requireAuth, requirePermission('manage_products'), async (req: AuthRequest, res) => {
  try {
    const {
      name,
      slug,
      category,
      price,
      originalPrice,
      description,
      perks,
      badge,
      color,
      icon,
      imageUrl,
      isFeatured,
      isActive,
      sortOrder,
    } = req.body;

    if (!name || !slug || !category || price === undefined) {
      return res.status(400).json({ error: 'Name, slug, category, and price are required' });
    }

    const perksArray = Array.isArray(perks) ? perks : [perks].filter(Boolean);

    const [created] = await db.insert(products).values({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      category: category.trim(),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      description: description || '',
      perks: JSON.stringify(perksArray),
      badge: badge || '',
      color: color || '#10b981',
      icon: icon || 'Shield',
      imageUrl: imageUrl || '',
      isFeatured: isFeatured ? 1 : 0,
      isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    }).returning();

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'PRODUCT_CREATED',
      details: `Created product: ${created.name} (${created.category})`,
    });

    // If rank product created, auto-sync rank comparison table
    if (created.category === 'rank') {
      try {
        await getDatabaseRankComparison();
      } catch (syncErr) {
        console.error('Failed to auto-sync rank comparison on create:', syncErr);
      }
    }

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', requireAuth, requirePermission('manage_products'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const {
      name,
      slug,
      category,
      price,
      originalPrice,
      description,
      perks,
      badge,
      color,
      icon,
      imageUrl,
      isFeatured,
      isActive,
      sortOrder,
    } = req.body;

    const updateObj: any = {};
    if (name) updateObj.name = name.trim();
    if (slug) updateObj.slug = slug.trim().toLowerCase();
    if (category) updateObj.category = category.trim();
    if (price !== undefined) updateObj.price = Number(price);
    if (originalPrice !== undefined) updateObj.originalPrice = originalPrice ? Number(originalPrice) : null;
    if (description !== undefined) updateObj.description = description;
    if (perks !== undefined) updateObj.perks = Array.isArray(perks) ? JSON.stringify(perks) : perks;
    if (badge !== undefined) updateObj.badge = badge;
    if (color !== undefined) updateObj.color = color;
    if (icon !== undefined) updateObj.icon = icon;
    if (imageUrl !== undefined) updateObj.imageUrl = imageUrl;
    if (isFeatured !== undefined) updateObj.isFeatured = isFeatured ? 1 : 0;
    if (isActive !== undefined) updateObj.isActive = isActive ? 1 : 0;
    if (sortOrder !== undefined) updateObj.sortOrder = Number(sortOrder);

    const [updated] = await db.update(products).set(updateObj).where(eq(products.id, id)).returning();

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'PRODUCT_UPDATED',
      details: `Updated product #${id} (${updated.name})`,
    });

    // If rank product updated, auto-sync rank comparison table
    if (updated.category === 'rank') {
      try {
        await getDatabaseRankComparison();
      } catch (syncErr) {
        console.error('Failed to auto-sync rank comparison on update:', syncErr);
      }
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', requireAuth, requirePermission('manage_products'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const [deletedProd] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    await db.delete(products).where(eq(products.id, id));

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'PRODUCT_DELETED',
      details: `Deleted product #${id}`,
    });

    // If deleted product was a rank, auto-sync rank comparison table to remove it without affecting other ranks
    if (deletedProd?.category === 'rank') {
      try {
        await getDatabaseRankComparison();
      } catch (syncErr) {
        console.error('Failed to auto-sync rank comparison on delete:', syncErr);
      }
    }

    res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete product' });
  }
});

// Admin: Payment Methods Management (CRUD - unlimited methods)
app.get('/api/admin/payment-methods', requireAuth, requirePermission('manage_payments'), async (req, res) => {
  try {
    const all = await db.select().from(paymentMethods).orderBy(paymentMethods.id);
    res.json(all);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch payment methods' });
  }
});

app.post('/api/admin/payment-methods', requireAuth, requirePermission('manage_payments'), async (req: AuthRequest, res) => {
  try {
    const {
      name,
      accountTitle,
      accountNumber,
      iban,
      bankName,
      qrCodeUrl,
      instructions,
      currency,
      exchangeRate,
      isActive,
    } = req.body;

    if (!name || !accountTitle || !accountNumber || !instructions) {
      return res.status(400).json({
        error: 'Payment Method Name, Account Title, Account Number, and Instructions are required.',
      });
    }

    const [created] = await db.insert(paymentMethods).values({
      name: name.trim(),
      accountTitle: accountTitle.trim(),
      accountNumber: accountNumber.trim(),
      iban: iban ? iban.trim() : '',
      bankName: bankName ? bankName.trim() : '',
      qrCodeUrl: qrCodeUrl ? qrCodeUrl.trim() : '',
      instructions: instructions.trim(),
      currency: currency || 'USD',
      exchangeRate: exchangeRate || '1.0',
      isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
    }).returning();

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'PAYMENT_METHOD_CREATED',
      details: `Created manual payment method: ${created.name}`,
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create payment method' });
  }
});

app.put('/api/admin/payment-methods/:id', requireAuth, requirePermission('manage_payments'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const {
      name,
      accountTitle,
      accountNumber,
      iban,
      bankName,
      qrCodeUrl,
      instructions,
      currency,
      exchangeRate,
      isActive,
    } = req.body;

    const updateObj: any = {};
    if (name) updateObj.name = name.trim();
    if (accountTitle) updateObj.accountTitle = accountTitle.trim();
    if (accountNumber) updateObj.accountNumber = accountNumber.trim();
    if (iban !== undefined) updateObj.iban = iban.trim();
    if (bankName !== undefined) updateObj.bankName = bankName.trim();
    if (qrCodeUrl !== undefined) updateObj.qrCodeUrl = qrCodeUrl.trim();
    if (instructions !== undefined) updateObj.instructions = instructions.trim();
    if (currency) updateObj.currency = currency;
    if (exchangeRate) updateObj.exchangeRate = exchangeRate;
    if (isActive !== undefined) updateObj.isActive = isActive ? 1 : 0;

    const [updated] = await db.update(paymentMethods).set(updateObj).where(eq(paymentMethods.id, id)).returning();

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'PAYMENT_METHOD_UPDATED',
      details: `Updated manual payment method #${id} (${updated.name})`,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update payment method' });
  }
});

app.delete('/api/admin/payment-methods/:id', requireAuth, requirePermission('manage_payments'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'PAYMENT_METHOD_DELETED',
      details: `Deleted payment method #${id}`,
    });

    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete payment method' });
  }
});

// Admin: Update Site Settings
app.put('/api/admin/settings', requireAuth, requirePermission('manage_settings'), async (req: AuthRequest, res) => {
  try {
    const {
      siteName,
      serverIp,
      serverPort,
      bedrockPort,
      crossplayEnabled,
      discordUrl,
      logoUrl,
      heroTitle,
      heroSubtitle,
      heroBgUrl,
      bannerUrl,
      faviconUrl,
      supportEmail,
      serverType,
      networkServers,
      announcementText,
      announcementEnabled,
    } = req.body;

    const list = await db.select().from(siteSettings).limit(1);
    let updated;

    if (list.length === 0) {
      [updated] = await db.insert(siteSettings).values({
        siteName: siteName || 'BeastMC Network',
        serverIp: serverIp || 'play.beastmc.net',
        serverPort: serverPort ? Number(serverPort) : 25565,
        bedrockPort: bedrockPort ? Number(bedrockPort) : 19132,
        crossplayEnabled: crossplayEnabled === 0 ? 0 : 1,
        discordUrl: discordUrl || 'https://discord.gg/beastmc',
        logoUrl: logoUrl || '',
        heroTitle: heroTitle || 'WELCOME TO BEASTMC NETWORK',
        heroSubtitle: heroSubtitle || '',
        heroBgUrl: heroBgUrl || '',
        bannerUrl: bannerUrl || '',
        faviconUrl: faviconUrl || '',
        supportEmail: supportEmail || 'support@beastmc.net',
        serverType: serverType || 'paper',
        networkServers: typeof networkServers === 'string' ? networkServers : JSON.stringify(networkServers || []),
        announcementText: announcementText !== undefined
          ? announcementText.trim()
          : 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted',
        announcementEnabled: announcementEnabled !== undefined
          ? (announcementEnabled === 0 || announcementEnabled === false ? 0 : 1)
          : 1,
      }).returning();
    } else {
      [updated] = await db.update(siteSettings).set({
        siteName: siteName !== undefined ? siteName.trim() : list[0].siteName,
        serverIp: serverIp !== undefined ? serverIp.trim() : list[0].serverIp,
        serverPort: serverPort !== undefined ? Number(serverPort) : list[0].serverPort,
        bedrockPort: bedrockPort !== undefined ? Number(bedrockPort) : list[0].bedrockPort,
        crossplayEnabled: crossplayEnabled !== undefined ? (crossplayEnabled === 0 ? 0 : 1) : list[0].crossplayEnabled,
        discordUrl: discordUrl !== undefined ? discordUrl.trim() : list[0].discordUrl,
        logoUrl: logoUrl !== undefined ? logoUrl.trim() : list[0].logoUrl,
        heroTitle: heroTitle !== undefined ? heroTitle.trim() : list[0].heroTitle,
        heroSubtitle: heroSubtitle !== undefined ? heroSubtitle.trim() : list[0].heroSubtitle,
        heroBgUrl: heroBgUrl !== undefined ? heroBgUrl.trim() : list[0].heroBgUrl,
        bannerUrl: bannerUrl !== undefined ? bannerUrl.trim() : (list[0].bannerUrl || ''),
        faviconUrl: faviconUrl !== undefined ? faviconUrl.trim() : (list[0].faviconUrl || ''),
        supportEmail: supportEmail !== undefined ? supportEmail.trim() : list[0].supportEmail,
        serverType: serverType !== undefined ? serverType : (list[0].serverType || 'paper'),
        networkServers: networkServers !== undefined
          ? (typeof networkServers === 'string' ? networkServers : JSON.stringify(networkServers))
          : (list[0].networkServers || '[]'),
        announcementText: announcementText !== undefined
          ? announcementText.trim()
          : (list[0].announcementText || 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted'),
        announcementEnabled: announcementEnabled !== undefined
          ? (announcementEnabled === 0 || announcementEnabled === false ? 0 : 1)
          : (list[0].announcementEnabled ?? 1),
        updatedAt: new Date(),
      }).where(eq(siteSettings.id, list[0].id)).returning();
    }

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'SETTINGS_UPDATED',
      details: `Updated site settings: ${updated.siteName}, Announcement: ${updated.announcementEnabled ? 'Enabled' : 'Disabled'} ("${updated.announcementText}"), IP: ${updated.serverIp}:${updated.serverPort}`,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

// Admin: Dedicated Endpoint to Update Announcement Bar
app.put('/api/admin/settings/announcement', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { announcementText, announcementEnabled } = req.body;
    const list = await db.select().from(siteSettings).limit(1);
    let updated;

    const newText = announcementText !== undefined
      ? String(announcementText).trim()
      : (list[0]?.announcementText || 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted');
    const newEnabled = announcementEnabled !== undefined
      ? (announcementEnabled === 0 || announcementEnabled === false || announcementEnabled === '0' ? 0 : 1)
      : (list[0]?.announcementEnabled ?? 1);

    if (list.length === 0) {
      [updated] = await db.insert(siteSettings).values({
        siteName: 'BeastMC Network',
        serverIp: 'play.beastmc.net',
        announcementText: newText,
        announcementEnabled: newEnabled,
      }).returning();
    } else {
      [updated] = await db.update(siteSettings).set({
        announcementText: newText,
        announcementEnabled: newEnabled,
        updatedAt: new Date(),
      }).where(eq(siteSettings.id, list[0].id)).returning();
    }

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'ANNOUNCEMENT_UPDATED',
      details: `Updated Announcement Bar: ${newEnabled ? 'Enabled' : 'Disabled'}, Text: "${newText}"`,
    });

    res.json({
      success: true,
      announcementText: updated.announcementText,
      announcementEnabled: updated.announcementEnabled,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update announcement settings' });
  }
});

// Helper function to detect image format by binary magic bytes
function detectImageFormat(buffer: Buffer): 'png' | 'jpg' | 'webp' | null {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return 'webp';
  }

  return null;
}

// Admin: Upload Image (Website Logo, Favicon, Hero Background, Banners, Products)
app.post('/api/admin/upload', requireAuth, async (req: AuthRequest, res) => {
  try {
    // 14. Only authorized admins or Owner can upload images
    const userRole = req.user?.role;
    let userPerms: string[] = [];
    try {
      userPerms = typeof req.user?.permissions === 'string'
        ? JSON.parse(req.user.permissions)
        : (req.user?.permissions || []);
    } catch {
      userPerms = [];
    }

    const isAuthorized =
      userRole === 'owner' ||
      userRole === 'admin' ||
      userPerms.includes('manage_settings') ||
      userPerms.includes('manage_products');

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Access denied: Only authorized administrators or the Owner can upload images',
      });
    }

    const { image, data, category } = req.body;
    const rawImageStr = image || data;

    if (!rawImageStr || typeof rawImageStr !== 'string') {
      return res.status(400).json({
        error: 'No image data provided. Please select an image file to upload.',
      });
    }

    // Strip Base64 data URL header if present
    const base64Content = rawImageStr.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
    if (!base64Content) {
      return res.status(400).json({ error: 'Invalid or empty base64 image data.' });
    }

    const buffer = Buffer.from(base64Content, 'base64');

    // 13. Validate image size (Max 10MB)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 Megabytes
    if (buffer.length > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        error: `Image size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB. Please upload a smaller image.`,
      });
    }

    if (buffer.length < 16) {
      return res.status(400).json({ error: 'Image file is corrupted or too small.' });
    }

    // 12 & 13. Validate image format (PNG, JPG, WebP) via binary magic bytes inspection
    const detectedFormat = detectImageFormat(buffer);
    if (!detectedFormat) {
      return res.status(400).json({
        error: 'Unsupported file format. Only PNG, JPG, and WebP images are allowed on BeastMC Network.',
      });
    }

    // 8. Save image to persistent storage (/public/uploads)
    const safeCategory = (category || 'asset').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const filename = `${safeCategory}_${Date.now()}_${randomSuffix}.${detectedFormat}`;
    const destinationPath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(destinationPath, buffer);

    // Image reference URL to be stored in database and displayed on website
    const publicUrl = `/uploads/${filename}`;

    // Record in audit logs
    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'IMAGE_UPLOADED',
      details: `Uploaded ${safeCategory} image (${detectedFormat.toUpperCase()}, ${(buffer.length / 1024).toFixed(1)} KB) -> ${publicUrl}`,
    });

    res.json({
      success: true,
      url: publicUrl,
      filename,
      size: buffer.length,
      format: detectedFormat,
      message: 'Image uploaded and stored successfully!',
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Admin: Remove / Delete Stored Image
app.delete('/api/admin/upload', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Only admins can delete images.' });
    }

    const targetUrl = req.body?.url || (req.query?.url as string);
    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Only allow deletion of files inside /uploads/ to prevent path traversal
    if (targetUrl.startsWith('/uploads/')) {
      const filename = path.basename(targetUrl);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        await db.insert(auditLogs).values({
          adminEmail: req.user!.email,
          action: 'IMAGE_DELETED',
          details: `Deleted image file: ${filename}`,
        });
      }
    }

    res.json({ success: true, message: 'Image removed successfully' });
  } catch (error: any) {
    console.error('Image deletion error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete image' });
  }
});

// Admin: Users & Staff Management (Multi-Admin with roles Owner, Admin, Moderator)
app.get('/api/admin/users', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const sanitized = allUsers.map((u) => {
      let parsedPerms: string[] = [];
      try {
        parsedPerms = JSON.parse(u.permissions || '[]');
      } catch {
        parsedPerms = [];
      }
      return {
        id: u.id,
        uid: u.uid,
        email: u.email,
        username: u.username,
        minecraftUsername: u.minecraftUsername,
        role: u.role,
        permissions: parsedPerms,
        isBanned: u.isBanned,
        createdAt: u.createdAt,
      };
    });
    res.json(sanitized);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Admin: Update User Role & Granular Permissions
app.put('/api/admin/users/:id/role', requireAuth, requirePermission('manage_admins'), async (req: AuthRequest, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const { role, permissions } = req.body;

    if (!role || !['player', 'moderator', 'admin', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required: player, moderator, admin, owner' });
    }

    // Only Owner can assign or revoke the Owner role
    if (role === 'owner' && req.user!.role !== 'owner') {
      return res.status(403).json({ error: 'Only the current Owner can assign the Owner role.' });
    }

    const permsArray = Array.isArray(permissions) ? permissions : [];

    const [updated] = await db
      .update(users)
      .set({
        role,
        permissions: JSON.stringify(permsArray),
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId))
      .returning();

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'USER_ROLE_CHANGED',
      details: `Changed role of user #${targetUserId} (${updated.email}) to ${role} with perms: [${permsArray.join(', ')}]`,
    });

    res.json({
      message: 'Role and permissions updated successfully',
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        role: updated.role,
        permissions: permsArray,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update user role' });
  }
});

// Owner: Delete User Account
app.delete('/api/admin/users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    // 6. Only the Owner can delete users
    if (req.user!.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Only the server Owner can delete users.' });
    }

    const targetUserId = Number(req.params.id);
    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID provided.' });
    }

    // Never allow deletion of the requester's own account
    if (req.user!.id === targetUserId) {
      return res.status(400).json({ error: 'You cannot delete your own Owner account.' });
    }

    const found = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (found.length === 0) {
      return res.status(404).json({ error: 'User not found in database.' });
    }

    const targetUser = found[0];

    // 7. Never allow deletion of any Owner account
    if (targetUser.role === 'owner' || targetUser.email.toLowerCase().trim() === 'mhaseebahmed0@gmail.com') {
      return res.status(400).json({ error: 'The Owner account cannot be deleted.' });
    }

    // 8. Preserve related order and payment records safely
    // Safely unlinks userId on orders so orders, payments, transaction IDs and proofs remain fully intact
    await db.update(orders).set({ userId: null }).where(eq(orders.userId, targetUserId));

    // 5. Delete the selected user from the database
    await db.delete(users).where(eq(users.id, targetUserId));

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'USER_DELETED',
      details: `Owner deleted user account #${targetUserId} (${targetUser.email}, IGN: ${targetUser.minecraftUsername})`,
    });

    res.json({
      success: true,
      message: `User account "${targetUser.email}" (${targetUser.minecraftUsername}) deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// Owner: Initiate Secure Password Reset
app.post('/api/admin/users/:id/reset-password', requireAuth, requirePermission('manage_admins'), async (req: AuthRequest, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const found = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (found.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = found[0];

    // Generate a secure temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let tempPassword = 'Beast!';
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await db.update(users).set({
      passwordHash,
      updatedAt: new Date(),
    }).where(eq(users.id, targetUserId));

    await db.insert(auditLogs).values({
      adminEmail: req.user!.email,
      action: 'PASSWORD_RESET_INITIATED',
      details: `Initiated secure password reset for user #${targetUserId} (${targetUser.email})`,
    });

    res.json({
      success: true,
      message: `Password reset successfully for ${targetUser.email}`,
      temporaryPassword: tempPassword,
      email: targetUser.email,
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

// Admin: Audit Logs
app.get('/api/admin/audit-logs', requireAuth, requirePermission('view_audit_logs'), async (req, res) => {
  try {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});

// Admin: Dispatched Delivery Emails Audit
app.get('/api/admin/sent-emails', requireAuth, requirePermission('view_audit_logs'), async (req, res) => {
  try {
    const emails = await db.select().from(sentEmails).orderBy(desc(sentEmails.createdAt)).limit(100);
    res.json(emails);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch sent emails' });
  }
});

// ==========================================
// 5. DEV & PROD SERVING SETUP
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Serve production build from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Integrate Vite development server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BeastMC Network server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
