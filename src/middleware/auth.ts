import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifySupabaseToken } from '../lib/supabase-server.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq, or } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'beastmc-production-super-secret-key-2026';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  supabaseUid?: string;
  email: string;
  username: string;
  minecraftUsername: string;
  role: 'player' | 'moderator' | 'admin' | 'owner';
  permissions: string[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const signUserToken = (user: { id: number; uid: string; email: string; role: string }) => {
  return jwt.sign(
    { id: user.id, uid: user.uid, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token is empty' });
  }

  let userRecord: any = null;

  // 1. Try Supabase Auth Token verification first
  try {
    const supabaseUser = await verifySupabaseToken(token);
    if (supabaseUser && supabaseUser.id) {
      const email = (supabaseUser.email || `${supabaseUser.id}@beastmc.net`).toLowerCase().trim();
      
      // Look up user strictly by authenticated Supabase UUID (do not auto-link old accounts by email)
      const found = await db
        .select()
        .from(users)
        .where(eq(users.supabaseUid, supabaseUser.id))
        .limit(1);

      if (found.length > 0) {
        userRecord = found[0];
      } else {
        // Create user in PostgreSQL synchronized with Supabase Auth
        const meta = supabaseUser.user_metadata || {};
        const newUsername = (meta.username || meta.full_name || email.split('@')[0] || 'Player')
          .replace(/\s+/g, '_')
          .slice(0, 30);
        const newMinecraft = (meta.minecraft_username || newUsername).slice(0, 30);

        const [created] = await db
          .insert(users)
          .values({
            uid: supabaseUser.id,
            supabaseUid: supabaseUser.id,
            email,
            username: newUsername,
            minecraftUsername: newMinecraft,
            role: 'player',
            permissions: '[]',
            isBanned: 0,
          })
          .returning();
        userRecord = created;
      }
    }
  } catch (supabaseErr) {
    console.error('Supabase token verification error:', supabaseErr);
  }

  // 2. Fallback: JWT verification (custom application tokens / session tokens)
  if (!userRecord) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; uid: string; email: string };
      if (decoded && decoded.id) {
        const found = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
        if (found.length > 0) {
          userRecord = found[0];
        }
      }
    } catch {
      // Token is invalid for both Supabase and custom JWT
    }
  }

  if (!userRecord) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid or expired. Please sign in again.' });
  }

  if (userRecord.isBanned) {
    return res.status(403).json({ error: 'Your account has been suspended by BeastMC Administration' });
  }

  let parsedPermissions: string[] = [];
  try {
    parsedPermissions = JSON.parse(userRecord.permissions || '[]');
  } catch {
    parsedPermissions = [];
  }

  req.user = {
    id: userRecord.id,
    uid: userRecord.uid,
    supabaseUid: userRecord.supabaseUid || undefined,
    email: userRecord.email,
    username: userRecord.username,
    minecraftUsername: userRecord.minecraftUsername,
    role: userRecord.role as any,
    permissions: parsedPermissions,
  };

  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Forbidden: Staff access required' });
  }
  next();
};

export const requirePermission = (permissionKey: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Owner has unrestricted access to everything
    if (req.user.role === 'owner') {
      return next();
    }

    // Check if permission is present in permissions list
    const hasPerm = req.user.permissions.includes(permissionKey);
    if (!hasPerm) {
      return res.status(403).json({
        error: `Permission Denied: You need the "${permissionKey}" permission to perform this action. Contact the Server Owner.`
      });
    }

    next();
  };
};
