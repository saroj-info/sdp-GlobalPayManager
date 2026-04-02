import { RequestHandler } from "express";
import { storage } from "./storage";
import { userSessions, type UserSession } from "@shared/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { db } from "./db";
import crypto from "crypto";

// Test users for development
const TEST_USERS = {
  'admin': {
    password: 'admin123',
    email: 'admin@sdpglobalpay.com',
    userType: 'sdp_internal',
    name: 'System Administrator'
  }
};

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<UserSession> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const [session] = await db.insert(userSessions).values({
    id: crypto.randomUUID(),
    userId,
    token,
    expiresAt,
    ipAddress,
    userAgent,
  }).returning();
  
  return session;
}

async function getValidSession(token: string): Promise<UserSession | null> {
  const [session] = await db
    .select()
    .from(userSessions)
    .where(and(
      eq(userSessions.token, token),
      gt(userSessions.expiresAt, new Date())
    ));
    
  if (session) {
    // Update last used timestamp
    await db
      .update(userSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(userSessions.id, session.id));
  }
  
  return session || null;
}

async function deleteSession(token: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.token, token));
}

async function cleanupExpiredSessions(): Promise<void> {
  const now = new Date();
  await db.delete(userSessions).where(
    lt(userSessions.expiresAt, now)
  );
}

export const login: RequestHandler = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }
    
    const testUser = TEST_USERS[username as keyof typeof TEST_USERS];
    
    if (!testUser || testUser.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // Get or create user in database
    let user = await storage.getUserByEmail(testUser.email);
    if (!user) {
      user = await storage.upsertUser({
        id: crypto.randomUUID(),
        email: testUser.email,
        firstName: testUser.name.split(' ')[0],
        lastName: testUser.name.split(' ').slice(1).join(' '),
        profileImageUrl: null,
      });
    }
    
    // Create session
    const session = await createSession(
      user.id,
      req.ip,
      req.get('User-Agent')
    );
    
    // Set secure cookie
    res.cookie('auth-token', session.token, {
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: 'lax', // More permissive for development
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
    
    console.log('Login successful for:', testUser.email, 'Token:', session.token);
    
    res.json({ 
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: testUser.userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout: RequestHandler = async (req, res) => {
  try {
    const token = req.cookies['auth-token'];
    
    if (token) {
      await deleteSession(token);
    }
    
    res.clearCookie('auth-token');
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const authMiddleware: RequestHandler = async (req: any, res, next) => {
  try {
    const token = req.cookies['auth-token'];
    
    if (!token) {
      console.log('Auth middleware: No auth-token cookie found. Available cookies:', Object.keys(req.cookies || {}));
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const session = await getValidSession(token);
    
    if (!session) {
      res.clearCookie('auth-token');
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get user details
    const user = await storage.getUser(session.userId);
    
    if (!user) {
      await deleteSession(token);
      res.clearCookie('auth-token');
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      userType: user.userType
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCurrentUser: RequestHandler = async (req: any, res) => {
  try {
    const token = req.cookies['auth-token'];
    
    if (!token) {
      console.log('getCurrentUser: No auth-token cookie found. Available cookies:', Object.keys(req.cookies || {}));
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const session = await getValidSession(token);
    
    if (!session) {
      res.clearCookie('auth-token');
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(session.userId);
    
    if (!user) {
      await deleteSession(token);
      res.clearCookie('auth-token');
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Cleanup expired sessions periodically
setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Every hour