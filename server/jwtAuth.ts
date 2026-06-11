import jwt from 'jsonwebtoken';
import { RequestHandler } from 'express';

// JWT secret from environment or default for development
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-change-in-production';
const JWT_EXPIRY = '24h'; // Tokens expire in 24 hours
const PENDING_2FA_EXPIRY = '5m'; // Pending 2FA tokens expire in 5 minutes

export interface JWTPayload {
  id: string;
  email: string;
  userType: string;
  name: string;
  sdpRole?: string | null;
  accessibleCountries?: string[];
  accessibleBusinessIds?: string[];
  activeRole?: string;        // Dual-role: the role the session is currently acting as. Defaults to userType.
  availableRoles?: string[];  // Dual-role: roles this user may switch between ([userType] plus addedRole when set).
  type: 'auth' | 'pending_2fa'; // Distinguish between full auth and pending 2FA
}

/**
 * Create a full authentication JWT token
 */
export function createAuthToken(userData: {
  id: string;
  email: string;
  userType: string;
  name: string;
  sdpRole?: string | null;
  accessibleCountries?: string[];
  accessibleBusinessIds?: string[];
  activeRole?: string;
  availableRoles?: string[];
}): { token: string; userData: JWTPayload } {
  const payload: JWTPayload = {
    ...userData,
    type: 'auth',
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });

  console.log('JWT auth token created for user:', userData.name);
  return { token, userData: payload };
}

/**
 * Create a pending 2FA session token (short-lived)
 */
export function createPending2FASession(userData: {
  id: string;
  email: string;
  userType: string;
  name: string;
  sdpRole?: string | null;
  accessibleCountries?: string[];
  accessibleBusinessIds?: string[];
  activeRole?: string;
  availableRoles?: string[];
}): string {
  const payload: JWTPayload = {
    ...userData,
    type: 'pending_2fa',
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: PENDING_2FA_EXPIRY,
  });

  console.log('Pending 2FA token created for user:', userData.name);
  return token;
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid token');
    } else {
      console.error('Token verification error:', error);
    }
    return null;
  }
}

/**
 * Get pending 2FA session data from token
 */
export function getPending2FASession(pendingToken: string): JWTPayload | null {
  const payload = verifyToken(pendingToken);
  
  if (payload && payload.type === 'pending_2fa') {
    return payload;
  }
  
  return null;
}

/**
 * Middleware to verify JWT authentication
 */
export const jwtAuthMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized - No token' });
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);

  if (!payload || payload.type !== 'auth') {
    return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }

  // Attach user to request (matching expected format with userId field).
  //
  // Dual-role: `userType` is OVERLOADED with the EFFECTIVE (active) role so that
  // every existing authorization branch in routes.ts (`req.user.userType === ...`)
  // transparently follows the active view with no per-branch edits. This enforces
  // strict isolation — in worker view the user is treated exactly as a worker
  // everywhere; in business view, exactly as a business. `primaryRole` preserves
  // the immutable account type for the few places that genuinely need it
  // (e.g. the role-switch / profile-setup endpoints).
  const active = effectiveRole(payload);
  (req as any).user = {
    id: payload.id,
    userId: payload.id, // Add userId for backward compatibility
    email: payload.email,
    userType: active,           // EFFECTIVE role (overloaded)
    primaryRole: payload.userType,
    name: payload.name,
    isAuthenticated: true,
    sdpRole: payload.sdpRole,
    accessibleCountries: payload.accessibleCountries || [],
    accessibleBusinessIds: payload.accessibleBusinessIds || [],
    activeRole: active,
    availableRoles: payload.availableRoles || [payload.userType],
  };

  next();
};

/**
 * Get authenticated user from JWT token
 */
export function getUserFromToken(token: string): any | null {
  const payload = verifyToken(token);
  
  if (!payload || payload.type !== 'auth') {
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
    // Overload `userType` with the EFFECTIVE (active) role so the ~129 frontend
    // `user.userType` reads transparently follow the active view. `primaryRole`
    // preserves the immutable account type for the switcher / settings UI.
    userType: effectiveRole(payload),
    primaryRole: payload.userType,
    activeRole: payload.activeRole || payload.userType,
    availableRoles: payload.availableRoles || [payload.userType],
    name: payload.name,
    firstName: payload.name.split(' ')[0],
    lastName: payload.name.split(' ').slice(1).join(' ') || '',
    sdpRole: payload.sdpRole,
    accessibleCountries: payload.accessibleCountries || [],
    accessibleBusinessIds: payload.accessibleBusinessIds || [],
  };
}

/**
 * Dual-role: the role the request should be authorized as.
 * SDP internal users are NEVER switchable — always 'sdp_internal'.
 * Otherwise the session's activeRole, falling back to the primary userType
 * (so tokens issued before this feature keep working).
 */
export function effectiveRole(user: { userType: string; activeRole?: string | null }): string {
  if (user.userType === 'sdp_internal') return 'sdp_internal';
  return user.activeRole || user.userType;
}

/**
 * Dual-role: the set of roles a user may switch between.
 * SDP internal is single-role. Otherwise [userType] plus addedRole when present.
 */
export function computeAvailableRoles(user: { userType?: string | null; addedRole?: string | null }): string[] {
  const primary = user.userType || 'business_user';
  if (primary === 'sdp_internal') return ['sdp_internal'];
  const roles = [primary];
  if (user.addedRole && user.addedRole !== primary) roles.push(user.addedRole);
  return roles;
}

// Role-based middleware for SDP internal users
export const requireSdpRole = (allowedRoles: string | string[]): RequestHandler => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: any, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (user.userType !== 'sdp_internal') {
      return res.status(403).json({ message: 'Access denied - SDP internal users only' });
    }

    if (!roles.includes(user.sdpRole)) {
      return res.status(403).json({ message: 'Access denied - Insufficient role permissions' });
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
