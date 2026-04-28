import { RequestHandler } from "express";
import { storage } from "./storage";

// Test authentication - including documented test accounts
const TEST_USERS = {
  // === SUPER ADMIN (from secure environment variables) ===
  [process.env.SUPER_ADMIN_USERNAME || 'sdpultimateadmin']: {
    password: process.env.SUPER_ADMIN_PASSWORD || 'admin123',
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@sdpglobalpay.com',
    userType: 'sdp_internal',
    name: `${process.env.SUPER_ADMIN_FIRST_NAME || 'System'} ${process.env.SUPER_ADMIN_LAST_NAME || 'Administrator'}`,
    sdpRole: 'sdp_super_admin',
    accessibleCountries: [], // Empty means all countries
    accessibleBusinessIds: [] // Empty means all businesses
  },
  
  // === DOCUMENTED TEST ACCOUNTS ===
  // SDP admin user for testing (as documented in replit.md)
  'admin': {
    password: 'admin123',
    email: 'admin@sdpglobalpay.com',
    userType: 'sdp_internal',
    name: 'SDP Administrator',
    sdpRole: 'sdp_super_admin',
    accessibleCountries: [], // Empty means all countries
    accessibleBusinessIds: [] // Empty means all businesses
  },
  // Business user for testing
  'business1': {
    password: 'business123',
    email: 'business1@test.com',
    userType: 'business_user',
    name: 'Test Business User'
  }
};

// In-memory token store (cleared for fresh start)
const activeTokens = new Map<string, any>();

// Set longer token expiry (24 hours)
const TOKEN_EXPIRY_HOURS = 24;

function isTokenExpired(tokenData: any): boolean {
  if (!tokenData || !tokenData.expiresAt) return false;
  return Date.now() > tokenData.expiresAt;
}

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const testLogin: RequestHandler = async (req, res) => {
  const { username, password } = req.body;
  
  console.log('Token-based login attempt:', { username, passwordLength: password?.length });
  
  const user = TEST_USERS[username as keyof typeof TEST_USERS];
  
  if (!user) {
    console.log(`User not found: ${username}. Available users:`, Object.keys(TEST_USERS));
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  if (user.password !== password) {
    console.log(`Password mismatch for ${username}. Expected: "${user.password}", Got: "${password}"`);
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  console.log(`Password authentication successful for ${username}`);
  
  // Map test users to their actual database IDs
  let databaseUserId;
  const userIdMap: Record<string, string> = {
    // SDP Admin Users
    'admin': 'admin-user-123',
    'sdpultimateadmin': 'test-user-sdpultimateadmin', // Super admin from env vars
    'sdp_admin': 'sdp-admin-456', 
    'sdp_agent': 'sdp-agent-789',
    
    // Business Users
    'business1': '45003452', // Raj Sesha's actual database ID
    'business2': 'business-user-001',
    'business3': 'business-user-002', 
    'business4': 'business-user-003',
    
    // Worker Users
    'worker': '7e427cdc8811e97efcf1b90488b2ff8f', // Maps to Test User worker in database
    'worker1': 'worker-user-789',
    'contractor1': 'contractor-user-001',
    'contractor2': 'contractor-user-002',
    'employee1': 'employee-user-001',
    'employee2': 'employee-user-002',
    
    // Invitation Test Users
    'inviter': 'inviter-user-001',
    'invitee': 'invitee-user-002'
  };
  
  databaseUserId = userIdMap[username] || `test-user-${username}`;
  
  // SECURITY FIX: Check if 2FA is enabled BEFORE issuing auth token
  const { is2FAEnabled } = await import('./twoFactorAuth');
  const requires2FA = await is2FAEnabled(databaseUserId);
  
  if (requires2FA) {
    // User has 2FA enabled - do NOT issue auth token yet
    console.log(`2FA required for user ${username}, creating pending session`);
    
    // Create a temporary pending session (short-lived, 5 min expiry)
    const pendingToken = generateToken();
    const pendingSession = {
      id: databaseUserId,
      email: user.email,
      userType: user.userType,
      name: user.name,
      isAuthenticated: false, // NOT authenticated until 2FA verified
      isPending2FA: true,
      sdpRole: (user as any).sdpRole || null,
      accessibleCountries: (user as any).accessibleCountries || [],
      accessibleBusinessIds: (user as any).accessibleBusinessIds || [],
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes only
    };
    
    activeTokens.set(pendingToken, pendingSession);
    
    return res.json({
      message: "Password verified - 2FA required",
      requiresTwoFactor: true,
      userId: databaseUserId,
      pendingToken: pendingToken, // Frontend uses this for 2FA verification
      user: {
        email: user.email,
        name: user.name
      }
    });
  }
  
  // No 2FA required - issue a JWT auth token so jwtAuthMiddleware can validate it
  const { createAuthToken } = await import('./jwtAuth');
  const { token, userData: jwtPayload } = createAuthToken({
    id: databaseUserId,
    email: user.email,
    userType: user.userType,
    name: user.name,
    sdpRole: (user as any).sdpRole || null,
    accessibleCountries: (user as any).accessibleCountries || [],
    accessibleBusinessIds: (user as any).accessibleBusinessIds || [],
  });

  const userData = { ...jwtPayload, isAuthenticated: true };
  console.log('JWT token created for test user:', userData.name);

  res.json({
    message: "Login successful",
    token: token,
    user: userData
  });
};

/**
 * Create a full authenticated token for a user (used after 2FA verification)
 */
export function createAuthToken(userData: {
  id: string;
  email: string;
  userType: string;
  name: string;
  sdpRole?: string | null;
  accessibleCountries?: string[];
  accessibleBusinessIds?: string[];
}): { token: string; userData: any } {
  const token = generateToken();
  const fullUserData = {
    ...userData,
    isAuthenticated: true,
    expiresAt: Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
  };
  
  activeTokens.set(token, fullUserData);
  console.log('Full auth token created:', token, 'for user:', fullUserData.name);
  
  return { token, userData: fullUserData };
}

/**
 * Get pending 2FA session data (for verification)
 */
export function getPending2FASession(pendingToken: string): any | null {
  const sessionData = activeTokens.get(pendingToken);
  if (sessionData && sessionData.isPending2FA && !isTokenExpired(sessionData)) {
    return sessionData;
  }
  return null;
}

/**
 * Delete a pending 2FA session
 */
export function deletePending2FASession(pendingToken: string): void {
  activeTokens.delete(pendingToken);
}

export const testLogout: RequestHandler = (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    activeTokens.delete(token);
    console.log('Token deleted:', token);
  }
  res.json({ message: "Logout successful" });
};

export const testAuthMiddleware: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized - No token" });
  }
  
  const userData = activeTokens.get(token);
  if (!userData?.isAuthenticated || isTokenExpired(userData)) {
    if (isTokenExpired(userData)) {
      activeTokens.delete(token); // Clean up expired token
    }
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
  
  // Attach user to request
  (req as any).user = userData;
  next();
};

export const getTestUser: RequestHandler = async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  console.log('Get user request with token:', token ? 'present' : 'missing');
  console.log('Cookies:', req.headers.cookie);
  console.log('Session exists:', !!(req as any).session);
  console.log('Session user:', (req as any).session?.user ? 'present' : 'missing');
  
  // Check for token-based auth first
  if (token) {
    const userData = activeTokens.get(token);
    if (userData?.isAuthenticated && !isTokenExpired(userData)) {
      console.log('User found for token:', userData.name);
      
      // Get business info for business users
      let business = null;
      if (userData.userType === 'business_user' && userData.id) {
        try {
          business = await storage.getBusinessByOwnerId(userData.id);
        } catch (error) {
          console.error('Error getting business for user:', error);
        }
      }
      
      return res.json({
        id: userData.id,
        email: userData.email,
        userType: userData.userType,
        name: userData.name,
        firstName: userData.name.split(' ')[0],
        lastName: userData.name.split(' ')[1] || '',
        sdpRole: userData.sdpRole,
        accessibleCountries: userData.accessibleCountries,
        accessibleBusinessIds: userData.accessibleBusinessIds,
        business: business
      });
    }
    
    if (isTokenExpired(userData)) {
      activeTokens.delete(token); // Clean up expired token
      console.log('Token expired');
    } else {
      console.log('Token not found or invalid');
    }
    // Token was provided but invalid - fall through to check session
  }
  
  // Fallback to session-based auth
  const sessionUser = (req as any).session?.user;
  if (!sessionUser) {
    return res.status(401).json({ message: "Unauthorized - No token" });
  }
  
  const userData = {
    id: sessionUser.id,
    email: sessionUser.email,
    userType: sessionUser.userType,
    name: `${sessionUser.firstName} ${sessionUser.lastName}`,
    firstName: sessionUser.firstName,
    lastName: sessionUser.lastName,
    sdpRole: sessionUser.sdpRole,
    accessibleCountries: sessionUser.accessibleCountries || [],
    accessibleBusinessIds: sessionUser.accessibleBusinessIds || []
  };
  
  // Get business info for business users
  let business = null;
  if (userData.userType === 'business_user' && userData.id) {
    try {
      business = await storage.getBusinessByOwnerId(userData.id);
    } catch (error) {
      console.error('Error getting business for user:', error);
    }
  }
  
  res.json({
    id: userData.id,
    email: userData.email,
    userType: userData.userType,
    name: userData.name,
    firstName: userData.name.split(' ')[0],
    lastName: userData.name.split(' ')[1] || '',
    sdpRole: userData.sdpRole,
    accessibleCountries: userData.accessibleCountries,
    accessibleBusinessIds: userData.accessibleBusinessIds,
    business: business
  });
};

// Role-based middleware for SDP internal users
export const requireSdpRole = (allowedRoles: string | string[]): RequestHandler => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: any, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.userType !== 'sdp_internal') {
      return res.status(403).json({ message: "Access denied - SDP internal users only" });
    }

    if (!roles.includes(user.sdpRole)) {
      return res.status(403).json({ message: "Access denied - Insufficient role permissions" });
    }

    next();
  };
};

// Utility functions for scope checking
export const canAccessCountry = (user: any, countryId: string): boolean => {
  if (user.userType !== 'sdp_internal') return false;
  if (!user.accessibleCountries || user.accessibleCountries.length === 0) return true; // Empty means all
  return user.accessibleCountries.includes(countryId);
};

export const canAccessBusiness = (user: any, businessId: string): boolean => {
  if (user.userType !== 'sdp_internal') return false;
  if (!user.accessibleBusinessIds || user.accessibleBusinessIds.length === 0) return true; // Empty means all
  return user.accessibleBusinessIds.includes(businessId);
};