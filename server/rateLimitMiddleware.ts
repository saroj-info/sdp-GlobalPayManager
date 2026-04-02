import { RequestHandler } from "express";

// In-memory store for rate limiting (use Redis in production for distributed systems)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware for 2FA verification endpoints
 * Limits requests per IP address to prevent brute force attacks
 * 
 * @param maxAttempts - Maximum number of attempts allowed in the window
 * @param windowMs - Time window in milliseconds (default: 30 seconds)
 */
export function twoFARateLimiter(
  maxAttempts: number = 5,
  windowMs: number = 30000
): RequestHandler {
  return (req: any, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.body?.userId || req.user?.userId || '';
    
    // Create unique key combining IP and userId for more granular rate limiting
    const key = `2fa:${ip}:${userId}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry) {
      // First request from this IP/user
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (now > entry.resetTime) {
      // Window has expired, reset counter
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (entry.count >= maxAttempts) {
      // Rate limit exceeded
      const remainingTime = Math.ceil((entry.resetTime - now) / 1000);
      
      return res.status(429).json({
        message: `Too many verification attempts. Please try again in ${remainingTime} seconds.`,
        retryAfter: remainingTime,
      });
    }

    // Increment counter
    entry.count += 1;
    rateLimitStore.set(key, entry);
    next();
  };
}

/**
 * General rate limiter for API endpoints
 * 
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function apiRateLimiter(
  maxRequests: number = 100,
  windowMs: number = 60000
): RequestHandler {
  return (req: any, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `api:${ip}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (now > entry.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (entry.count >= maxRequests) {
      const remainingTime = Math.ceil((entry.resetTime - now) / 1000);
      
      return res.status(429).json({
        message: `Rate limit exceeded. Please try again in ${remainingTime} seconds.`,
        retryAfter: remainingTime,
      });
    }

    entry.count += 1;
    rateLimitStore.set(key, entry);
    next();
  };
}

/**
 * Clear rate limit entry for a specific key (useful after successful verification)
 */
export function clearRateLimit(ip: string, userId: string): void {
  const key = `2fa:${ip}:${userId}`;
  rateLimitStore.delete(key);
}
