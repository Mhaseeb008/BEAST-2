import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifySupabaseToken } from '../lib/supabase-server.ts';
import { db, pool } from '../db/index.ts';
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
  role: 'user' | 'player' | 'moderator' | 'admin' | 'owner';
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
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1].trim();
  } else if (req.body && typeof req.body.token === 'string' && req.body.token.trim()) {
    token = req.body.token.trim();
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [rawName, ...valParts] = cookie.trim().split('=');
      const name = rawName?.trim();
      const val = valParts.join('=').trim();
      if (!name || !val) continue;
      if (
        name === 'sb-access-token' ||
        name === 'beastmc_token' ||
        (name.startsWith('sb-') && name.endsWith('-auth-token'))
      ) {
        try {
          const decodedVal = decodeURIComponent(val);
          if (decodedVal.startsWith('{') || decodedVal.startsWith('[')) {
            const parsed = JSON.parse(decodedVal);
            token = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || decodedVal);
          } else {
            token = decodedVal;
          }
        } catch {
          token = val;
        }
        break;
      }
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  let userRecord: any = null;

  // 1. Try Supabase Auth Token verification first
  try {
    const supabaseUser = await verifySupabaseToken(token);
    if (supabaseUser && supabaseUser.id) {
      const email = (supabaseUser.email || `${supabaseUser.id}@beastmc.net`).toLowerCase().trim();
      
      try {
        // Look up user strictly by authenticated Supabase UUID first
        let found = await db
          .select()
          .from(users)
          .where(eq(users.supabaseUid, supabaseUser.id))
          .limit(1);

        if (found.length === 0) {
          found = await db
            .select()
            .from(users)
            .where(eq(users.uid, supabaseUser.id))
            .limit(1);
        }

        if (found.length > 0) {
          userRecord = found[0];
        } else {
          // Check if an existing profile exists for this verified email to prevent duplicate key error
          const existingByEmail = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existingByEmail.length > 0) {
            userRecord = existingByEmail[0];
            try {
              await db
                .update(users)
                .set({ supabaseUid: supabaseUser.id, updatedAt: new Date() })
                .where(eq(users.id, userRecord.id));
              userRecord.supabaseUid = supabaseUser.id;
            } catch (updateErr) {
              console.warn('Non-fatal update warning in requireAuth:', updateErr);
            }
          }
        }
      } catch (colErr: any) {
        if (colErr?.code === '42703' || colErr?.message?.includes('supabase_uid')) {
          // Fallback to raw SQL when supabase_uid column is not yet present
          try {
            const rawRes = await pool.query(
              'SELECT id, uid, email, username, minecraft_username, password_hash, role, permissions, is_banned, created_at, updated_at FROM users WHERE email = $1 OR uid = $2 LIMIT 1',
              [email, supabaseUser.id]
            );
            if (rawRes.rows.length > 0) {
              const r = rawRes.rows[0];
              userRecord = {
                id: r.id,
                uid: r.uid,
                supabaseUid: supabaseUser.id,
                email: r.email,
                username: r.username,
                minecraftUsername: r.minecraft_username,
                passwordHash: r.password_hash,
                role: r.role,
                permissions: r.permissions,
                isBanned: r.is_banned,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
              };
            }
          } catch (rawErr) {
            console.error('Raw SQL auth fallback error in requireAuth:', rawErr);
          }
        } else {
          throw colErr;
        }
      }

      if (!userRecord) {
        // Create user in PostgreSQL synchronized with Supabase Auth
        const meta = supabaseUser.user_metadata || {};
        const newUsername = (meta.username || meta.full_name || email.split('@')[0] || 'Player')
          .replace(/\s+/g, '_')
          .slice(0, 30);
        const newMinecraft = (meta.minecraft_username || newUsername).slice(0, 30);

        try {
          const [created] = await db
            .insert(users)
            .values({
              uid: supabaseUser.id,
              supabaseUid: supabaseUser.id,
              email,
              username: newUsername,
              minecraftUsername: newMinecraft,
              role: 'user',
              permissions: '[]',
              isBanned: 0,
            })
            .returning();
          userRecord = created;
        } catch (insertErr) {
          console.warn('Collision during requireAuth user creation, recovering:', insertErr);
          try {
            const [recovered] = await db
              .select()
              .from(users)
              .where(or(eq(users.supabaseUid, supabaseUser.id), eq(users.email, email)))
              .limit(1);
            userRecord = recovered;
          } catch {
            const rawRec = await pool.query('SELECT * FROM users WHERE email = $1 OR uid = $2 LIMIT 1', [email, supabaseUser.id]);
            if (rawRec.rows.length > 0) userRecord = rawRec.rows[0];
          }
        }
      }
    }
  } catch (supabaseErr) {
    console.warn('Supabase token verification error in requireAuth:', supabaseErr);
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
