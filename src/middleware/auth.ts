import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'beastmc-production-super-secret-key-2026';

export interface AuthenticatedUser {
  id: number;
  uid: string;
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

  // 1. Try custom JWT verification first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; uid: string; email: string };
    if (decoded && decoded.id) {
      const found = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
      if (found.length > 0) {
        userRecord = found[0];
      }
    }
  } catch (jwtErr) {
    // 2. Try Firebase ID token verification
    try {
      const decodedFirebase = await adminAuth.verifyIdToken(token);
      if (decodedFirebase && decodedFirebase.uid) {
        const found = await db.select().from(users).where(eq(users.uid, decodedFirebase.uid)).limit(1);
        if (found.length > 0) {
          userRecord = found[0];
        } else {
          // If user authenticated via Firebase Google Sign-In but not yet in DB, create them
          const newUsername = (decodedFirebase.name || decodedFirebase.email?.split('@')[0] || 'Player').replace(/\s+/g, '_');
          const [created] = await db.insert(users).values({
            uid: decodedFirebase.uid,
            email: decodedFirebase.email || `${decodedFirebase.uid}@beastmc.net`,
            username: newUsername,
            minecraftUsername: newUsername,
            role: 'player',
            permissions: '[]',
          }).returning();
          userRecord = created;
        }
      }
    } catch (fbErr) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  if (!userRecord) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
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
