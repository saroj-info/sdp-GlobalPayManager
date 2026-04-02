import { RequestHandler } from "express";
import { storage } from "./storage";

// Simple in-memory session store for development
const sessions = new Map<string, any>();

const TEST_USERS = {
  [process.env.SUPER_ADMIN_USERNAME || 'admin']: {
    password: process.env.SUPER_ADMIN_PASSWORD || 'admin123',
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@sdpglobalpay.com',
    userType: 'sdp_internal',
    name: `${process.env.SUPER_ADMIN_FIRST_NAME || 'System'} ${process.env.SUPER_ADMIN_LAST_NAME || 'Administrator'}`
  }
};

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const simpleLogin: RequestHandler = async (req, res) => {
  const { username, password } = req.body;
  
  const user = TEST_USERS[username as keyof typeof TEST_USERS];
  
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  const sessionId = generateSessionId();
  
  // Store session data
  sessions.set(sessionId, {
    email: user.email,
    userType: user.userType,
    name: user.name,
    isAuthenticated: true,
    createdAt: new Date()
  });
  
  // Set cookie with multiple fallback options
  res.cookie('simple-session', sessionId, {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
  
  // Also set header for immediate use
  res.setHeader('X-Session-Token', sessionId);
  
  console.log('Simple login successful for:', user.email, 'Session:', sessionId);
  
  res.json({ 
    message: "Login successful",
    user: {
      email: user.email,
      userType: user.userType,
      name: user.name
    },
    token: sessionId // Return token for localStorage storage
  });
};

export const simpleLogout: RequestHandler = (req, res) => {
  const sessionId = req.cookies['simple-session'];
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.clearCookie('simple-session');
  res.json({ message: "Logout successful" });
};

export const simpleAuthMiddleware: RequestHandler = async (req: any, res, next) => {
  // Try multiple sources for the session token
  let sessionId = req.cookies['simple-session'] || 
                  req.headers['x-session-token'] ||
                  req.headers['authorization']?.replace('Bearer ', '');
  
  if (!sessionId) {
    console.log('No session token found in cookies or headers', {
      cookies: req.cookies,
      authHeader: req.headers['authorization'],
      xSessionToken: req.headers['x-session-token']
    });
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const sessionData = sessions.get(sessionId);
  
  if (!sessionData?.isAuthenticated) {
    console.log('Invalid session:', sessionId);
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Get user from database
  const user = await storage.getUserByEmail(sessionData.email);
  if (!user) {
    console.log('User not found for email:', sessionData.email);
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  req.user = {
    id: user.id,
    email: user.email,
    userType: sessionData.userType
  };
  
  console.log('Simple auth success for:', sessionData.email);
  next();
};

export const getSimpleUser: RequestHandler = async (req: any, res) => {
  const sessionId = req.cookies['simple-session'];
  
  if (!sessionId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const sessionData = sessions.get(sessionId);
  
  if (!sessionData?.isAuthenticated) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUserByEmail(sessionData.email);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Get business data if business user
  let businessData = null;
  if (sessionData.userType === 'business_user') {
    businessData = await storage.getBusinessByOwnerId(user.id);
  }
  
  res.json({
    ...user,
    userType: sessionData.userType,
    business: businessData
  });
};