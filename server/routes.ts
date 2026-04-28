import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import * as OTPAuth from "otpauth";
import * as twoFactorAuth from "./twoFactorAuth";
import { storage } from "./storage";

// Simple in-memory rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }>();

function isLoginRateLimited(key: string): { limited: boolean; remainingTime?: number } {
  const attempts = loginAttempts.get(key);
  if (!attempts) return { limited: false };

  const now = new Date();
  
  // Check if account is temporarily locked
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    const remainingMs = attempts.lockedUntil.getTime() - now.getTime();
    return { limited: true, remainingTime: Math.ceil(remainingMs / 1000) };
  }

  // Reset if last attempt was more than 15 minutes ago
  if (now.getTime() - attempts.lastAttempt.getTime() > 15 * 60 * 1000) {
    loginAttempts.delete(key);
    return { limited: false };
  }

  return { limited: false };
}

function recordLoginAttempt(key: string, success: boolean) {
  const attempts = loginAttempts.get(key) || { count: 0, lastAttempt: new Date() };
  
  if (success) {
    // Clear rate limit on successful login
    loginAttempts.delete(key);
    return;
  }

  // Increment failed attempts
  attempts.count += 1;
  attempts.lastAttempt = new Date();

  // Lock account after 5 failed attempts for 15 minutes
  if (attempts.count >= 5) {
    attempts.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }

  loginAttempts.set(key, attempts);
}
// Using Stripe integration for payment processing
import Stripe from "stripe";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { emailService } from "./emailService";
import { 
  insertBusinessSchema,
  insertWorkerSchema,
  insertContractSchema,
  insertRoleTitleSchema,
  insertContractTemplateSchema,
  insertContractInstanceSchema,
  insertTimesheetSchema,
  insertTimesheetEntrySchema,
  insertLeaveRequestSchema,
  insertPayslipSchema,
  insertInvoiceSchema,
  insertSdpInvoiceSchema,
  sdpInvoices,
  insertSdpUserInviteSchema,
  insertBusinessUserInviteSchema,
  insertBusinessInvitationSchema,
  createBusinessInvitationInputSchema,
  insertWorkerApprovalSchema,
  insertCountrySchema,
  insertCountryPartySchema,
  insertCountryPartyContactSchema,
  insertCountryAdvisorFeeSchema,
  insertCountryDocumentSchema,
  type InsertRemunerationLineType,
} from "@shared/schema";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { type ContractInstance, type Contract, type Worker, type Country, type RoleTitle, type Business } from "@shared/schema";
import { getDerivedContractStatus } from "@shared/contractHelpers";
import { registerEmailTestRoutes } from "./routes/emailTestRoute";
import { getBusinessInvitationTemplate, getWorkerApprovalRequestTemplate, getEmailBaseUrl } from "./emailService";

// Using test authentication system

// Helper function to generate signing tokens
function generateSigningToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to normalize date fields
function normalizeDateFields(obj: Record<string, any>) {
  const dateFields = ['endDate', 'signedAt', 'emailSentAt', 'workerSignedAt', 'businessSignedAt', 'sentAt', 'expiresAt', 'declinedAt', 'createdAt'];
  const normalized = { ...obj };
  
  for (const field of dateFields) {
    if (normalized[field] && typeof normalized[field] === 'string') {
      normalized[field] = new Date(normalized[field]);
    }
  }
  
  return normalized;
}

// Helper function to add remuneration lines to contracts
// requesterUserType: if provided and is a business user, salary contracts in pending_sdp_review will have remuneration lines suppressed
async function addRemunerationLinesToContracts<T extends { id: string; rateType?: string | null; status?: string | null }>(
  contracts: T[],
  requesterUserType?: string
): Promise<(T & { remunerationLines: any[] })[]> {
  if (contracts.length === 0) return [];
  
  const contractIds = contracts.map(c => c.id);
  const allRemunerationLines = await Promise.all(
    contractIds.map(id => storage.getRemunerationLinesByContractId(id))
  );
  
  const remunerationLinesByContractId = new Map<string, any[]>();
  contractIds.forEach((id, index) => {
    remunerationLinesByContractId.set(id, allRemunerationLines[index]);
  });
  
  const isBusinessUser = requesterUserType && requesterUserType !== 'sdp_internal' && requesterUserType !== 'sdp_super_admin';

  return contracts.map(contract => {
    // Suppress remuneration lines for salary contracts in pending_sdp_review for business users
    if (isBusinessUser && contract.rateType === 'annual' && contract.status === 'pending_sdp_review') {
      return { ...contract, remunerationLines: [] };
    }
    return {
      ...contract,
      remunerationLines: remunerationLinesByContractId.get(contract.id) || []
    };
  });
}

// Helper to add SDP billing lines to contracts — SDP internal users only
async function addBillingLinesToContracts<T extends { id: string }>(contracts: T[]): Promise<(T & { billingLines: any[] })[]> {
  if (contracts.length === 0) return [];
  const contractIds = contracts.map(c => c.id);
  const allBillingLines = await Promise.all(
    contractIds.map(id => storage.getContractBillingLines(id))
  );
  const billingLinesByContractId = new Map<string, any[]>();
  contractIds.forEach((id, index) => {
    billingLinesByContractId.set(id, allBillingLines[index]);
  });
  return contracts.map(contract => ({
    ...contract,
    billingLines: billingLinesByContractId.get(contract.id) || []
  }));
}

// Helper function to add derived status to contracts
async function addDerivedStatusToContracts<T extends Record<string, any>>(contracts: T[]) {
  // PERFORMANCE FIX: Fetch all contract instances once instead of in the loop (N+1 fix)
  const allInstances = await storage.getContractInstances();
  
  // Index instances by businessId|workerId|countryId for O(1) lookup
  const instancesByKey = new Map<string, any[]>();
  for (const instance of allInstances) {
    const key = `${instance.businessId}|${instance.workerId}|${instance.countryId}`;
    if (!instancesByKey.has(key)) {
      instancesByKey.set(key, []);
    }
    instancesByKey.get(key)!.push(instance);
  }
  
  const contractsWithStatus = contracts.map((contract) => {
    try {
      // Look up instances for this contract from the indexed map
      const key = `${contract.businessId}|${contract.workerId}|${contract.countryId}`;
      const instances = instancesByKey.get(key) || [];
      
      // Normalize date fields to ensure proper Date object comparison
      const normalizedContract = normalizeDateFields(contract);
      const normalizedInstances = instances.map(normalizeDateFields);
      
      // Compute derived status using our helper
      const derivedStatus = getDerivedContractStatus(normalizedContract as any, normalizedInstances as any);
      
      return {
        ...contract,
        derivedSignatureStatus: derivedStatus.signatureStatus,
        termExpired: derivedStatus.termExpired,
        sourceInstance: derivedStatus.sourceInstance
      };
    } catch (error: any) {
      console.error(`Error deriving status for contract ${contract.id}:`, error);
      // Return original contract if status derivation fails
      return {
        ...contract,
        derivedSignatureStatus: 'draft',
        termExpired: false
      };
    }
  });
  
  return contractsWithStatus;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware FIRST before any routes
  const { getSession } = await import('./replitAuth');
  app.use(getSession());

  // Auth middleware
  await setupAuth(app);

  // Initialize countries on startup
  await storage.initializeCountries();

  // Use the working test authentication system
  const { testLogin, testLogout, getTestUser } = await import('./testAuth');
  const { jwtAuthMiddleware, requireSdpRole } = await import('./jwtAuth');
  
  // Use JWT middleware as default auth middleware
  const authMiddleware = jwtAuthMiddleware;

  // Initialize Stripe for payment processing (referenced from Stripe integration blueprint)
  let stripe: Stripe | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
    });
  }

  // Register email test routes (for development/testing)
  registerEmailTestRoutes(app);

  // Email configuration diagnostic endpoint
  app.get('/api/email-config', (req, res) => {
    const config = (emailService as any).defaultFrom;
    const domain = config ? config.split('@')[1] : 'not configured';
    const isPlatformDomain = domain.includes('platform.');
    
    res.json({
      fromAddress: config,
      domain: domain,
      isPlatformDomain: isPlatformDomain,
      status: isPlatformDomain ? '❌ Using platform domain' : '✅ Using correct domain'
    });
  });

  // Email audit endpoint - shows the last email configuration used
  app.get('/api/email-last-audit', (req, res) => {
    const lastAudit = (emailService as any).getLastEmailAudit();
    res.json({
      lastEmailSent: lastAudit || null,
      message: lastAudit ? 'Last email audit available' : 'No email audit records yet'
    });
  });

  // Working test authentication routes (legacy - kept for compatibility)
  app.post('/api/test-login', testLogin);
  app.post('/api/test-logout', testLogout);
  
  // JWT-based auth endpoint for getting current user
  app.get('/api/auth/user', async (req: any, res) => {
    const authHeader = req.headers.authorization;
    
    // Try JWT auth first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { getUserFromToken } = await import('./jwtAuth');
      const userData = getUserFromToken(token);
      
      if (userData) {
        // Get business info for business users
        let business = null;
        if (userData.userType === 'business_user' && userData.id) {
          try {
            business = await storage.getBusinessByOwnerId(userData.id);
          } catch (error: any) {
            console.error('Error getting business for user:', error);
          }
        }
        
        return res.json({
          ...userData,
          business
        });
      }
    }
    
    // Fallback to session-based auth (for legacy/Replit OAuth)
    const sessionUser = req.session?.user;
    if (sessionUser) {
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
        } catch (error: any) {
          console.error('Error getting business for user:', error);
        }
      }
      
      return res.json({
        ...userData,
        business
      });
    }
    
    return res.status(401).json({ message: 'Unauthorized - No token' });
  });

  // Two-Factor Authentication Routes
  // =====================================
  const {
    generateTOTPSecret,
    generateQRCode,
    verifyTOTPCode,
    generateBackupCodes,
    hashBackupCodes,
    verifyBackupCode,
    log2FAEvent,
    getUserTwoFactorAuth,
    is2FAEnabled,
    generateDeviceFingerprint,
    isDeviceTrusted,
    trustDevice,
    getRecentAuditLogs,
    encrypt,
    decrypt,
  } = await import('./twoFactorAuth');

  // Import rate limiting middleware
  const { twoFARateLimiter, clearRateLimit } = await import('./rateLimitMiddleware');

  // Check if user has 2FA enabled
  app.get('/api/2fa/status', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const twoFactorAuth = await getUserTwoFactorAuth(userId);
      res.json({
        enabled: twoFactorAuth?.isEnabled || false,
        method: twoFactorAuth?.method || null,
        enabledAt: twoFactorAuth?.enabledAt || null,
      });
    } catch (error: any) {
      console.error('Error checking 2FA status:', error);
      res.status(500).json({ message: 'Failed to check 2FA status' });
    }
  });

  // Start 2FA enrollment - generate secret and QR code
  app.post('/api/2fa/enroll', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const userEmail = req.user?.email;

      if (!userId || !userEmail) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if 2FA is already enabled
      const existing2FA = await getUserTwoFactorAuth(userId);
      if (existing2FA?.isEnabled) {
        return res.status(400).json({ message: '2FA is already enabled' });
      }

      // Generate TOTP secret
      const { secret, otpauthUrl } = generateTOTPSecret(userEmail);

      // Generate QR code
      const qrCodeDataUrl = await generateQRCode(otpauthUrl);

      // Store encrypted secret (but don't enable yet - requires verification)
      const encryptedSecret = encrypt(secret);

      // Upsert 2FA record
      await storage.upsertUserTwoFactorAuth({
        userId,
        method: 'totp',
        totpSecret: encryptedSecret,
        isEnabled: false,
      });

      // Log enrollment started
      await log2FAEvent({
        userId,
        eventType: 'enrollment_started',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      });

      res.json({
        secret,
        qrCodeDataUrl,
        message: 'Scan QR code with your authenticator app',
      });
    } catch (error: any) {
      console.error('Error starting 2FA enrollment:', error);
      res.status(500).json({ message: 'Failed to start 2FA enrollment' });
    }
  });

  // Verify enrollment - confirm TOTP code and enable 2FA (rate limited)
  app.post('/api/2fa/verify-enrollment', authMiddleware, twoFARateLimiter(5, 30000), async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: 'Verification code is required' });
      }

      // Get 2FA record
      const twoFactorAuth = await getUserTwoFactorAuth(userId);
      if (!twoFactorAuth || !twoFactorAuth.totpSecret) {
        return res.status(400).json({ message: '2FA enrollment not started' });
      }

      // Decrypt secret and verify code
      const secret = decrypt(twoFactorAuth.totpSecret);
      const isValid = verifyTOTPCode(secret, code);

      if (!isValid) {
        await log2FAEvent({
          userId,
          eventType: 'enrollment_verification_failed',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: false,
        });

        return res.status(400).json({ message: 'Invalid verification code' });
      }

      // Generate backup codes
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = await hashBackupCodes(backupCodes);

      // Enable 2FA
      await storage.enableUserTwoFactorAuth(userId, hashedBackupCodes);

      // Log enrollment completed
      await log2FAEvent({
        userId,
        eventType: 'enrollment_completed',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      });

      res.json({
        message: '2FA enabled successfully',
        backupCodes,
      });
    } catch (error: any) {
      console.error('Error verifying 2FA enrollment:', error);
      res.status(500).json({ message: 'Failed to verify 2FA enrollment' });
    }
  });

  // Verify 2FA code during login (rate limited - most critical endpoint)
  app.post('/api/2fa/verify-login', twoFARateLimiter(5, 30000), async (req, res) => {
    try {
      const { userId, code, useBackupCode, trustThisDevice, pendingToken } = req.body;

      if (!userId || !code) {
        return res.status(400).json({ message: 'User ID and code are required' });
      }

      // SECURITY FIX: Verify pending session exists and is valid
      const { getPending2FASession, createAuthToken } = await import('./jwtAuth');
      
      if (pendingToken) {
        const pendingSession = getPending2FASession(pendingToken);
        if (!pendingSession || pendingSession.id !== userId) {
          return res.status(401).json({ message: 'Invalid or expired session' });
        }
      }

      // Get 2FA record
      const twoFactorAuth = await getUserTwoFactorAuth(userId);
      if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
        return res.status(400).json({ message: '2FA not enabled for this user' });
      }

      let isValid = false;

      if (useBackupCode) {
        // Verify backup code
        const { valid, usedIndex } = await verifyBackupCode(
          code,
          twoFactorAuth.backupCodes || []
        );

        if (valid && usedIndex !== -1) {
          isValid = true;

          // Remove used backup code
          await storage.removeUsedBackupCode(userId, usedIndex);

          await log2FAEvent({
            userId,
            eventType: 'backup_code_used',
            eventDetails: `Backup code at index ${usedIndex} used`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            success: true,
          });
        }
      } else {
        // Verify TOTP code
        const secret = decrypt(twoFactorAuth.totpSecret!);
        isValid = verifyTOTPCode(secret, code);
      }

      if (!isValid) {
        await log2FAEvent({
          userId,
          eventType: 'verification_failed',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: false,
        });

        return res.status(401).json({ message: 'Invalid verification code' });
      }

      // Trust device if requested
      if (trustThisDevice) {
        const deviceFingerprint = generateDeviceFingerprint(
          req.ip || '',
          req.get('user-agent') || ''
        );

        await trustDevice({
          userId,
          deviceFingerprint,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      await log2FAEvent({
        userId,
        eventType: 'verification_success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      });

      // Clear rate limit on successful verification to allow immediate re-authentication
      clearRateLimit(req.ip || '', userId);

      // SECURITY FIX: Issue full auth token after successful 2FA verification
      if (pendingToken) {
        // Get user data from pending session
        const pendingSession = getPending2FASession(pendingToken);
        if (pendingSession) {
          // No need to delete JWT pending token - it auto-expires
          
          // Create full auth token
          const { token, userData } = createAuthToken({
            id: pendingSession.id,
            email: pendingSession.email,
            userType: pendingSession.userType,
            name: pendingSession.name,
            sdpRole: pendingSession.sdpRole,
            accessibleCountries: pendingSession.accessibleCountries,
            accessibleBusinessIds: pendingSession.accessibleBusinessIds,
          });

          return res.json({
            message: '2FA verification successful - authenticated',
            verified: true,
            token,
            user: userData,
          });
        }
      }

      // Fallback for legacy flow (no pending token)
      res.json({
        message: '2FA verification successful',
        verified: true,
      });
    } catch (error: any) {
      console.error('Error verifying 2FA login:', error);
      res.status(500).json({ message: 'Failed to verify 2FA' });
    }
  });

  // Generate new backup codes
  app.post('/api/2fa/regenerate-backup-codes', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const twoFactorAuth = await getUserTwoFactorAuth(userId);
      if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
        return res.status(400).json({ message: '2FA not enabled' });
      }

      // Generate new backup codes
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = await hashBackupCodes(backupCodes);

      // Update backup codes
      await storage.updateBackupCodes(userId, hashedBackupCodes);

      await log2FAEvent({
        userId,
        eventType: 'backup_codes_regenerated',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      });

      res.json({
        message: 'Backup codes regenerated successfully',
        backupCodes,
      });
    } catch (error: any) {
      console.error('Error regenerating backup codes:', error);
      res.status(500).json({ message: 'Failed to regenerate backup codes' });
    }
  });

  // Disable 2FA (rate limited)
  app.post('/api/2fa/disable', authMiddleware, twoFARateLimiter(5, 30000), async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!code) {
        return res.status(400).json({ message: 'Verification code is required to disable 2FA' });
      }

      const twoFactorAuth = await getUserTwoFactorAuth(userId);
      if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
        return res.status(400).json({ message: '2FA not enabled' });
      }

      // Verify code before disabling
      const secret = decrypt(twoFactorAuth.totpSecret!);
      const isValid = verifyTOTPCode(secret, code);

      if (!isValid) {
        await log2FAEvent({
          userId,
          eventType: 'disable_failed',
          eventDetails: 'Invalid verification code',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: false,
        });

        return res.status(401).json({ message: 'Invalid verification code' });
      }

      // Disable 2FA
      await storage.disableUserTwoFactorAuth(userId);

      await log2FAEvent({
        userId,
        eventType: 'disabled',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      });

      res.json({ message: '2FA disabled successfully' });
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({ message: 'Failed to disable 2FA' });
    }
  });

  // Get 2FA audit logs
  app.get('/api/2fa/audit-logs', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const logs = await getRecentAuditLogs(userId, 50);
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching 2FA audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  // Check if device is trusted
  app.post('/api/2fa/check-trusted-device', async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const deviceFingerprint = generateDeviceFingerprint(
        req.ip || '',
        req.get('user-agent') || ''
      );

      const trusted = await isDeviceTrusted(userId, deviceFingerprint);

      res.json({ trusted });
    } catch (error: any) {
      console.error('Error checking trusted device:', error);
      res.status(500).json({ message: 'Failed to check trusted device' });
    }
  });

  // Email Template Management Routes (SDP Super Admin Only)
  // =====================================================
  
  // Get all email template definitions with metadata
  app.get('/api/admin/email-template-definitions', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const definitions = await storage.getEmailTemplateDefinitions();
      res.json(definitions);
    } catch (error: any) {
      console.error('Error fetching email template definitions:', error);
      res.status(500).json({ error: 'Failed to fetch email template definitions' });
    }
  });

  // Get specific email template definition by key
  app.get('/api/admin/email-template-definitions/:key', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const definition = await storage.getEmailTemplateDefinitionByKey(req.params.key);
      if (!definition) {
        return res.status(404).json({ error: 'Email template definition not found' });
      }
      res.json(definition);
    } catch (error: any) {
      console.error('Error fetching email template definition:', error);
      res.status(500).json({ error: 'Failed to fetch email template definition' });
    }
  });

  // Get all email templates
  app.get('/api/admin/email-templates', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ error: 'Failed to fetch email templates' });
    }
  });

  // Jurisdiction Management Routes (SDP Super Admin Only)
  // =====================================================

  // Get all jurisdictions
  app.get('/api/admin/jurisdictions', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const jurisdictions = await storage.getJurisdictions();
      res.json(jurisdictions);
    } catch (error: any) {
      console.error('Error fetching jurisdictions:', error);
      res.status(500).json({ error: 'Failed to fetch jurisdictions' });
    }
  });

  // Get all jurisdictions (public access for resources calculator)
  app.get('/api/jurisdictions/all', async (req, res) => {
    try {
      const jurisdictions = await storage.getJurisdictions();
      res.json(jurisdictions);
    } catch (error: any) {
      console.error('Error fetching all jurisdictions:', error);
      res.status(500).json({ error: 'Failed to fetch jurisdictions' });
    }
  });

  // Get jurisdictions by country
  app.get('/api/jurisdictions/:countryId', async (req, res) => {
    try {
      const { countryId } = req.params;
      const jurisdictions = await storage.getJurisdictionsByCountry(countryId);
      res.json(jurisdictions);
    } catch (error: any) {
      console.error('Error fetching jurisdictions by country:', error);
      res.status(500).json({ error: 'Failed to fetch jurisdictions' });
    }
  });

  // Get specific jurisdiction
  app.get('/api/admin/jurisdictions/:id', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const jurisdiction = await storage.getJurisdictionById(id);
      if (!jurisdiction) {
        return res.status(404).json({ error: 'Jurisdiction not found' });
      }
      res.json(jurisdiction);
    } catch (error: any) {
      console.error('Error fetching jurisdiction:', error);
      res.status(500).json({ error: 'Failed to fetch jurisdiction' });
    }
  });

  // Create new jurisdiction
  app.post('/api/admin/jurisdictions', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const jurisdictionData = req.body;
      const jurisdiction = await storage.createJurisdiction(jurisdictionData);
      res.status(201).json(jurisdiction);
    } catch (error: any) {
      console.error('Error creating jurisdiction:', error);
      res.status(400).json({ error: 'Failed to create jurisdiction', details: error.message });
    }
  });

  // Update jurisdiction
  app.patch('/api/admin/jurisdictions/:id', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const jurisdiction = await storage.updateJurisdiction(id, updates);
      res.json(jurisdiction);
    } catch (error: any) {
      console.error('Error updating jurisdiction:', error);
      res.status(400).json({ error: 'Failed to update jurisdiction', details: error.message });
    }
  });

  // Delete jurisdiction
  app.delete('/api/admin/jurisdictions/:id', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteJurisdiction(id);
      res.json({ message: 'Jurisdiction deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting jurisdiction:', error);
      res.status(400).json({ error: 'Failed to delete jurisdiction', details: error.message });
    }
  });

  // Seed jurisdiction data (SDP super admin only)
  app.post('/api/admin/jurisdictions/seed', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const DEFAULT_JURISDICTIONS = {
        Australia: {
          "New South Wales": [
            { id: "nsw_payroll_tax", name: "Payroll tax (NSW)", type: "percent_above_threshold", value: 5.45, thresholdAmount: 1000000, note: "Example: 5.45% above A$1m — edit to current" },
          ],
          Victoria: [
            { id: "vic_payroll_tax", name: "Payroll tax (VIC)", type: "percent_above_threshold", value: 4.85, thresholdAmount: 700000, note: "Example — edit to current" },
          ],
          Queensland: [
            { id: "qld_payroll_tax", name: "Payroll tax (QLD)", type: "percent_above_threshold", value: 4.75, thresholdAmount: 1300000, note: "Example — edit to current" },
          ],
          "South Australia": [
            { id: "sa_payroll_tax", name: "Payroll tax (SA)", type: "percent_above_threshold", value: 4.95, thresholdAmount: 1200000, note: "Example — edit to current" },
          ],
          "Western Australia": [
            { id: "wa_payroll_tax", name: "Payroll tax (WA)", type: "percent_above_threshold", value: 5.5, thresholdAmount: 1000000, note: "Example — edit to current" },
          ],
          Tasmania: [
            { id: "tas_payroll_tax", name: "Payroll tax (TAS)", type: "percent_above_threshold", value: 4, thresholdAmount: 1250000, note: "Example — edit to current" },
          ],
          "Australian Capital Territory": [
            { id: "act_payroll_tax", name: "Payroll tax (ACT)", type: "percent_above_threshold", value: 6.85, thresholdAmount: 2200000, note: "Example — edit to current" },
          ],
          "Northern Territory": [
            { id: "nt_payroll_tax", name: "Payroll tax (NT)", type: "percent_above_threshold", value: 5.5, thresholdAmount: 1500000, note: "Example — edit to current" },
          ],
        },
        USA: {
          "California": [
            { id: "ca_suta", name: "CA UI (SUTA)", type: "percent_with_cap", value: 3.4, capAmount: 7000, note: "New employers; experience-rated thereafter" },
            { id: "ca_edi", name: "CA ETT/SDI (employer portion)", type: "flat", value: 0, note: "Typically employee-paid; leave at 0 or add flat" },
          ],
          "New York": [
            { id: "ny_suta", name: "NY UI (SUTA)", type: "percent_with_cap", value: 4.1, capAmount: 12000, note: "Illustrative; edit for actual rate" },
          ],
          Texas: [
            { id: "tx_suta", name: "TX UI (SUTA)", type: "percent_with_cap", value: 2.7, capAmount: 9000, note: "Illustrative; edit for actual rate" },
          ],
          Florida: [
            { id: "fl_suta", name: "FL UI (SUTA)", type: "percent_with_cap", value: 2.7, capAmount: 7000, note: "Illustrative; edit for actual rate" },
          ],
          "Washington": [
            { id: "wa_suta", name: "WA UI (SUTA)", type: "percent_with_cap", value: 1.2, capAmount: 68000, note: "Wage base much higher; illustrative" },
          ],
        },
      };

      let seedCount = 0;
      for (const [countryId, states] of Object.entries(DEFAULT_JURISDICTIONS)) {
        for (const [stateProvince, rules] of Object.entries(states)) {
          for (const rule of rules) {
            await storage.createJurisdiction({
              countryId,
              stateProvince,
              name: rule.name,
              calculationType: rule.type as 'flat' | 'percent' | 'percent_with_cap' | 'percent_above_threshold',
              value: rule.value,
              capAmount: rule.capAmount || null,
              thresholdAmount: rule.thresholdAmount || null,
              note: rule.note,
              isActive: true
            });
            seedCount++;
          }
        }
      }

      res.json({ message: `Successfully seeded ${seedCount} jurisdiction rules` });
    } catch (error: any) {
      console.error('Error seeding jurisdiction data:', error);
      res.status(500).json({ error: 'Failed to seed jurisdiction data', details: error.message });
    }
  });

  // Get templates for specific definition
  app.get('/api/admin/email-templates/definition/:definitionId', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const templates = await storage.getEmailTemplatesByDefinition(req.params.definitionId);
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching email templates by definition:', error);
      res.status(500).json({ error: 'Failed to fetch email templates' });
    }
  });

  // Get published template for preview/testing
  app.get('/api/admin/email-templates/:key/published', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const { locale = 'en', scopeType = 'global', scopeId } = req.query;
      const template = await storage.getPublishedEmailTemplate(
        req.params.key,
        locale as string,
        scopeType as string,
        scopeId as string
      );
      
      if (!template) {
        return res.status(404).json({ error: 'Published email template not found' });
      }
      
      res.json(template);
    } catch (error: any) {
      console.error('Error fetching published email template:', error);
      res.status(500).json({ error: 'Failed to fetch published email template' });
    }
  });

  // Create new email template
  app.post('/api/admin/email-templates', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const user = req.user;
      if (!user?.id) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const templateData = {
        ...req.body,
        createdByUserId: user.id,
      };

      const template = await storage.createEmailTemplate(templateData);
      res.status(201).json(template);
    } catch (error: any) {
      console.error('Error creating email template:', error);
      res.status(500).json({ error: 'Failed to create email template' });
    }
  });

  // Update email template
  app.put('/api/admin/email-templates/:id', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const template = await storage.updateEmailTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error: any) {
      console.error('Error updating email template:', error);
      res.status(500).json({ error: 'Failed to update email template' });
    }
  });

  // Publish email template
  app.post('/api/admin/email-templates/:id/publish', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const user = req.user;
      if (!user?.id) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const template = await storage.publishEmailTemplate(req.params.id, user.id);
      res.json(template);
    } catch (error: any) {
      console.error('Error publishing email template:', error);
      res.status(500).json({ error: 'Failed to publish email template' });
    }
  });

  // Get template versions
  app.get('/api/admin/email-templates/:id/versions', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const versions = await storage.getEmailTemplateVersions(req.params.id);
      res.json(versions);
    } catch (error: any) {
      console.error('Error fetching email template versions:', error);
      res.status(500).json({ error: 'Failed to fetch email template versions' });
    }
  });

  // Create template version (for history tracking)
  app.post('/api/admin/email-templates/:id/versions', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const user = req.user;
      if (!user?.id) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const versionData = {
        ...req.body,
        templateId: req.params.id,
        createdByUserId: user.id,
      };

      const version = await storage.createEmailTemplateVersion(versionData);
      res.status(201).json(version);
    } catch (error: any) {
      console.error('Error creating email template version:', error);
      res.status(500).json({ error: 'Failed to create email template version' });
    }
  });

  // Get email settings
  app.get('/api/admin/email-settings', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const settings = await storage.getEmailSettings();
      res.json(settings || {});
    } catch (error: any) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ error: 'Failed to fetch email settings' });
    }
  });

  // Update email settings
  app.put('/api/admin/email-settings', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const settings = await storage.updateEmailSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ error: 'Failed to update email settings' });
    }
  });

  // Render template with variables (for preview)
  app.post('/api/admin/email-templates/:key/render', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const { variables = {}, locale = 'en', scopeType = 'global', scopeId } = req.body;
      
      const rendered = await storage.renderEmailTemplate(req.params.key, variables, {
        locale,
        scopeType,
        scopeId,
      });
      
      if (!rendered) {
        return res.status(404).json({ error: 'Template not found or could not be rendered' });
      }
      
      res.json(rendered);
    } catch (error: any) {
      console.error('Error rendering email template:', error);
      res.status(500).json({ error: 'Failed to render email template' });
    }
  });

  // Send test email using template
  app.post('/api/admin/email-templates/:key/test-send', authMiddleware, requireSdpRole('sdp_super_admin'), async (req, res) => {
    try {
      const { to, variables = {}, locale = 'en', scopeType = 'global', scopeId } = req.body;
      
      if (!to) {
        return res.status(400).json({ error: 'Recipient email address is required' });
      }
      
      const rendered = await storage.renderEmailTemplate(req.params.key, variables, {
        locale,
        scopeType,
        scopeId,
      });
      
      if (!rendered) {
        return res.status(404).json({ error: 'Template not found or could not be rendered' });
      }
      
      const success = await emailService.sendEmail({
        to,
        subject: `[TEST] ${rendered.subject}`,
        html: rendered.html,
        text: rendered.text,
      });
      
      if (success) {
        res.json({ message: 'Test email sent successfully' });
      } else {
        res.status(500).json({ error: 'Failed to send test email' });
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  });

  // Worker invite token lookup — returns pre-fill data for the signup form (public, no auth)
  app.get('/api/worker-invite/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      if (!token) return res.status(400).json({ message: 'Token is required' });

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const worker = await storage.getWorkerByInvitationToken(tokenHash);

      if (!worker) return res.status(404).json({ message: 'Invalid or expired invitation link' });

      if (worker.invitationTokenExpiresAt && new Date() > worker.invitationTokenExpiresAt) {
        return res.status(410).json({ message: 'This invitation link has expired. Please ask to be re-invited.' });
      }

      // Return only the data needed to pre-fill the signup form
      res.json({
        firstName: worker.firstName,
        lastName: worker.lastName,
        email: worker.email,
        phoneNumber: worker.phoneNumber || '',
      });
    } catch (error: any) {
      console.error('Worker invite lookup error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Signup endpoint
  app.post('/api/signup', async (req: any, res) => {
    try {
      const signupSchema = z.object({
        accountType: z.enum(['contractor', 'enterprise', 'agency']),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        password: z.string()
          .min(8, "Password must be at least 8 characters long")
          .regex(/(?=.*[a-z])/, "Password must contain at least one lowercase letter")
          .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
          .regex(/(?=.*\d)/, "Password must contain at least one number"),
        confirmPassword: z.string(),
        company: z.string().optional(),
        jobTitle: z.string().optional(),
        country: z.string().optional(),
        phoneNumber: z.string().optional(),
        teamSize: z.string().optional(),
        agreedToTerms: z.boolean().refine(val => val === true, {
          message: "You must agree to the terms and conditions"
        }),
        marketingEmails: z.boolean().optional(),
        inviteToken: z.string().optional(), // present when signing up via business invite link
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });

      const data = signupSchema.parse(req.body);

      // ── INVITE TOKEN FLOW ──────────────────────────────────────────────────
      // When a business (or SDP admin) adds a worker they receive an invite link
      // with a token. In this case we must NOT create a new worker record —
      // we link the new users row to the existing workers row.
      if (data.inviteToken) {
        const tokenHash = crypto.createHash('sha256').update(data.inviteToken).digest('hex');
        const existingWorker = await storage.getWorkerByInvitationToken(tokenHash);

        if (!existingWorker) {
          return res.status(400).json({ message: 'Invalid or expired invitation link.' });
        }
        if (existingWorker.invitationTokenExpiresAt && new Date() > existingWorker.invitationTokenExpiresAt) {
          return res.status(400).json({ message: 'This invitation link has expired. Please ask to be re-invited.' });
        }
        if (existingWorker.userId) {
          return res.status(400).json({ message: 'This invitation has already been used.' });
        }

        // Check email matches (safety check — prevents token-sharing abuse)
        if (existingWorker.email.toLowerCase() !== data.email.toLowerCase()) {
          return res.status(400).json({ message: 'The email address does not match the invitation.' });
        }

        // Check no user already exists for this email
        const existingUser = await storage.getUserByEmail(data.email);
        if (existingUser) {
          return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(data.password, saltRounds);
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationTokenHash = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
        const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const userId = crypto.randomBytes(16).toString('hex');

        // Create users row only
        const user = await storage.upsertUser({
          id: userId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          userType: 'worker',
          passwordHash,
          emailVerified: false,
          emailVerificationToken: emailVerificationTokenHash,
          emailVerificationExpiresAt,
          isActive: true,
        });

        // Link existing worker row to new user, clear invite token
        await storage.updateWorkerProfile(existingWorker.id, {
          userId,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber || existingWorker.phoneNumber || '',
          invitationToken: null,
          invitationTokenExpiresAt: null,
          onboardingCompleted: false,
        });

        try {
          await emailService.sendEmailVerification(data.email, data.firstName, emailVerificationToken);
        } catch (emailError: any) {
          console.error('Failed to send verification email after invite signup:', emailError);
        }

        req.session.user = user;
        return res.json({
          message: "Account created successfully",
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, userType: user.userType },
        });
      }
      // ── END INVITE TOKEN FLOW ──────────────────────────────────────────────

      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        // Don't reveal that user already exists - use generic response to prevent enumeration
        return res.status(200).json({
          message: "Account registration completed. If this is a new email address, you will receive a welcome email shortly."
        });
      }

      // Convert country code to country ID if provided
      let countryId: string | null = null;
      if (data.country) {
        const allCountries = await storage.getAllCountries();
        const country = allCountries.find(c => c.code === data.country);
        if (!country) {
          return res.status(400).json({ message: "Invalid country selected" });
        }
        countryId = country.id;
      }

      const userId = crypto.randomBytes(16).toString('hex');
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(data.password, saltRounds);
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationTokenHash = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
      const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const userType = data.accountType === 'contractor' ? 'worker' : 'business_user';

      let user, worker, business;
      try {
        user = await storage.upsertUser({
          id: userId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          userType: userType as any,
          passwordHash: passwordHash,
          emailVerified: false,
          emailVerificationToken: emailVerificationTokenHash,
          emailVerificationExpiresAt: emailVerificationExpiresAt,
          isActive: true
        });

        // If contractor self-signup (no invite), create a new worker record
        if (data.accountType === 'contractor') {
          worker = await storage.createWorker({
            userId: userId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phoneNumber: data.phoneNumber || '',
            countryId: countryId,
            workerType: 'contractor',
            personalDetailsCompleted: false,
            bankDetailsCompleted: false,
            onboardingCompleted: false
          });
        }

        if (data.accountType === 'enterprise' || data.accountType === 'agency') {
          if (data.company) {
            business = await storage.createBusiness({
              name: data.company,
              ownerId: userId,
              accessibleCountries: countryId ? [countryId] : []
            });
          }
        }

      } catch (dbError: any) {
        console.error("Database error during signup:", dbError);
        try {
          if (user) await storage.upsertUser({ ...user, isActive: false });
        } catch (cleanupError: any) {
          console.error("Error during signup cleanup:", cleanupError);
        }
        return res.status(500).json({
          message: "Failed to create account. Please try again.",
          error: "Database error during account creation"
        });
      }

      try {
        if (data.accountType === 'contractor') {
          await emailService.sendContractorRegistrationConfirmation(data.email, data.firstName);
        } else {
          await emailService.sendBusinessRegistrationConfirmation(data.email, data.firstName, data.accountType);
        }
        await emailService.sendEmailVerification(data.email, data.firstName, emailVerificationToken);
      } catch (emailError: any) {
        console.error('Failed to send welcome or verification email:', emailError);
      }

      req.session.user = user;

      res.json({
        message: "Account created successfully",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType
        }
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email verification endpoint
  app.get('/api/verify-email/:token', async (req: any, res) => {
    const frontendUrl = getEmailBaseUrl();
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.redirect(`${frontendUrl}/login?verification_error=invalid`);
      }

      const providedTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const user = await storage.getUserByEmailVerificationToken(providedTokenHash);
      
      if (!user) {
        return res.redirect(`${frontendUrl}/login?verification_error=invalid`);
      }

      if (user.emailVerificationExpiresAt && new Date() > user.emailVerificationExpiresAt) {
        return res.redirect(`${frontendUrl}/login?verification_error=expired&email=${encodeURIComponent(user.email || '')}`);
      }

      if (user.emailVerified) {
        return res.redirect(`${frontendUrl}/login?verified=already`);
      }

      await storage.upsertUser({
        ...user,
        emailVerified: true,
      });

      res.redirect(`${frontendUrl}/login?verified=true`);
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.redirect(`${frontendUrl}/login?verification_error=error`);
    }
  });

  // Resend email verification endpoint
  app.post('/api/resend-verification', async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Generic response to prevent email enumeration
      const genericResponse = { message: "If the email address is registered and unverified, a verification email has been sent." };
      
      if (!user) {
        // Don't reveal that the user doesn't exist
        return res.status(200).json(genericResponse);
      }

      // Check if email is already verified
      if (user.emailVerified) {
        // Don't reveal that the email is already verified
        return res.status(200).json(genericResponse);
      }

      // Rate limiting: check if token was created in the last 5 minutes
      // emailVerificationExpiresAt is 24 hours from token creation, so we can calculate when token was created
      if (user.emailVerificationExpiresAt) {
        const tokenCreatedAt = new Date(user.emailVerificationExpiresAt.getTime() - 24 * 60 * 60 * 1000);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        console.log(`Rate limit check - Token created: ${tokenCreatedAt}, Five minutes ago: ${fiveMinutesAgo}`);
        
        if (tokenCreatedAt > fiveMinutesAgo) {
          console.log('Rate limit triggered - too soon to resend');
          return res.status(429).json({ 
            message: "Please wait a few minutes before requesting another verification email." 
          });
        }
      }

      // Generate new verification token and hash it
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationTokenHash = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
      const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new hashed token
      await storage.upsertUser({
        ...user,
        emailVerificationToken: emailVerificationTokenHash,
        emailVerificationExpiresAt: emailVerificationExpiresAt
      });

      // Send verification email (use plaintext token in email, not the hash)
      try {
        await emailService.sendEmailVerification(
          user.email ?? '',
          user.firstName ?? '',
          emailVerificationToken
        );
      } catch (emailError: any) {
        console.error('Failed to send verification email:', emailError);
        // Still return success to prevent email enumeration
      }

      res.json(genericResponse);
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Unable to process request. Please try again." });
    }
  });

  // Password-based login endpoint
  app.post('/api/login', async (req: any, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().min(1, "Email or username is required"),
        password: z.string().min(1, "Password is required")
      });

      const { email: identifier, password } = loginSchema.parse(req.body);

      // Check rate limiting for this identifier and IP
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const identifierKey = `identifier:${identifier}`;
      const ipKey = `ip:${clientIP}`;
      
      const identifierRateLimit = isLoginRateLimited(identifierKey);
      const ipRateLimit = isLoginRateLimited(ipKey);
      
      if (identifierRateLimit.limited || ipRateLimit.limited) {
        const remainingTime = Math.max(identifierRateLimit.remainingTime || 0, ipRateLimit.remainingTime || 0);
        return res.status(429).json({ 
          message: `Too many login attempts. Please try again in ${Math.ceil(remainingTime / 60)} minutes.` 
        });
      }

      // Find user by email or username (ID)
      // First check if identifier looks like an email
      let user;
      if (identifier.includes('@')) {
        // Looks like an email - search by email
        user = await storage.getUserByEmail(identifier);
      } else {
        // Looks like a username - try to find by ID
        // First try as-is (in case it's the full ID like 'test-user-sdpultimateadmin')
        user = await storage.getUser(identifier);
        
        // If not found and doesn't start with 'test-user-', try prepending it
        if (!user && !identifier.startsWith('test-user-')) {
          user = await storage.getUser(`test-user-${identifier}`);
        }
      }
      
      if (!user) {
        // Record failed attempt and return generic error to prevent enumeration
        recordLoginAttempt(identifierKey, false);
        recordLoginAttempt(ipKey, false);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Special authentication for super admin - check against SUPER_ADMIN_PASSWORD secret
      let isPasswordValid = false;
      if (user.id === 'test-user-sdpultimateadmin' || user.id === 'sdpultimateadmin') {
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
        if (superAdminPassword) {
          isPasswordValid = password === superAdminPassword;
        } else {
          // Fall back to database hash if secret not set
          isPasswordValid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
        }
      } else {
        // For all other users, verify password using bcrypt against database hash
        if (!user.passwordHash) {
          recordLoginAttempt(identifierKey, false);
          recordLoginAttempt(ipKey, false);
          return res.status(401).json({ message: "Invalid email or password" });
        }
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      }
      
      if (!isPasswordValid) {
        // Record failed attempt
        recordLoginAttempt(identifierKey, false);
        recordLoginAttempt(ipKey, false);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Record successful attempt (clears rate limiting)
      recordLoginAttempt(identifierKey, true);
      recordLoginAttempt(ipKey, true);

      // Check if email is verified (optional enforcement - can be made stricter)
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email address before logging in. Check your inbox for a verification link.",
          requiresEmailVerification: true,
          email: user.email
        });
      }

      // Check if user has 2FA enabled (especially for SDP users who must have 2FA)
      const { getUserTwoFactorAuth } = await import('./twoFactorAuth');
      const twoFactorAuth = await getUserTwoFactorAuth(user.id);
      
      if (twoFactorAuth && twoFactorAuth.isEnabled) {
        // User has 2FA enabled - create pending session and require 2FA verification
        const { createPending2FASession } = await import('./jwtAuth');
        const pendingToken = createPending2FASession({
          id: user.id,
          email: user.email ?? '',
          userType: user.userType ?? '',
          name: `${user.firstName} ${user.lastName}`,
          sdpRole: user.sdpRole,
          accessibleCountries: user.accessibleCountries ?? undefined,
          accessibleBusinessIds: user.accessibleBusinessIds ?? undefined,
        });
        
        return res.json({
          message: "2FA verification required",
          requiresTwoFactor: true,
          userId: user.id,
          pendingToken
        });
      }

      // No 2FA - create auth token (JWT-based)
      const { createAuthToken } = await import('./jwtAuth');
      const { token, userData } = createAuthToken({
        id: user.id,
        email: user.email ?? '',
        userType: user.userType ?? '',
        name: `${user.firstName} ${user.lastName}`,
        sdpRole: user.sdpRole,
        accessibleCountries: user.accessibleCountries ?? undefined,
        accessibleBusinessIds: user.accessibleBusinessIds ?? undefined,
      });

      // Return user info with token
      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          emailVerified: user.emailVerified
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Unable to process login. Please try again." });
    }
  });

  // Logout endpoint
  app.post('/api/logout', async (req: any, res) => {
    try {
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Unable to logout. Please try again." });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.json({ message: "Logout successful" });
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Unable to logout. Please try again." });
    }
  });

  // Password Reset Routes
  // Request password reset - send email with reset link
  app.post('/api/password-reset/request', async (req: any, res) => {
    try {
      const requestSchema = z.object({
        email: z.string().email("Please enter a valid email address")
      });

      const { email } = requestSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      // Even if user doesn't exist, we return success
      if (!user) {
        return res.json({ 
          message: "If an account exists with this email, you will receive password reset instructions shortly." 
        });
      }

      // Block super admin from password reset - their password is managed via SUPER_ADMIN_PASSWORD secret
      if (user.id === 'test-user-sdpultimateadmin' || user.id === 'sdpultimateadmin') {
        console.log('Password reset blocked for super admin user');
        return res.json({ 
          message: "If an account exists with this email, you will receive password reset instructions shortly." 
        });
      }

      // Generate reset token (secure random token)
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      // Save token to database
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      // Send password reset email
      const frontendUrl = process.env.FRONTEND_URL || 'https://sdpglobalpay.com';
      const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
      
      try {
        await emailService.sendPasswordResetEmail(
          user.email!,
          user.firstName ?? '',
          resetLink
        );
        console.log('Password reset email sent to:', user.email);
      } catch (emailError: any) {
        console.error('Failed to send password reset email:', emailError);
        // Don't reveal to user that email failed - they'll retry if they don't receive it
      }

      res.json({ 
        message: "If an account exists with this email, you will receive password reset instructions shortly." 
      });
    } catch (error: any) {
      console.error("Password reset request error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid email address", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Unable to process request. Please try again." });
    }
  });

  // Reset password with token
  app.post('/api/password-reset/reset', async (req: any, res) => {
    try {
      const resetSchema = z.object({
        token: z.string().min(1, "Reset token is required"),
        password: z.string().min(8, "Password must be at least 8 characters long")
      });

      const { token, password } = resetSchema.parse(req.body);

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Reset password (this also validates token and expiry)
      const success = await storage.resetPassword(token, passwordHash);

      if (!success) {
        return res.status(400).json({ 
          message: "Invalid or expired reset token. Please request a new password reset." 
        });
      }

      res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (error: any) {
      console.error("Password reset error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Unable to reset password. Please try again." });
    }
  });

  // Change password (authenticated). Verifies current password, then sets a new one.
  app.post('/api/account/change-password', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const schema = z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters'),
      });
      const { currentPassword, newPassword } = schema.parse(req.body);
      if (currentPassword === newPassword) {
        return res.status(400).json({ message: 'New password must be different from current password' });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: 'Cannot change password for this account' });
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updatePasswordHash(userId, newHash);
      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || 'Invalid input' });
      }
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Failed to update password' });
    }
  });

  // Profile Management Routes
  // Get user profile
  app.get('/api/profile', authMiddleware, async (req: any, res) => {
    try {
      // Prevent all caching and disable ETag
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': ''
      });

      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get fresh user data from storage to ensure latest profile info
      const freshUser = await storage.getUser(user.id);
      if (!freshUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return combined user and profile information
      const profileData = {
        id: freshUser.id,
        firstName: freshUser.firstName,
        lastName: freshUser.lastName,
        email: freshUser.email,
        userType: freshUser.userType,
        profileImageUrl: freshUser.profileImageUrl || "",
        // Additional profile fields that can be extended
        phoneNumber: freshUser.phoneNumber || "",
        jobTitle: freshUser.jobTitle || "",
        company: freshUser.company || "",
        address: freshUser.address || "",
        city: freshUser.city || "",
        state: freshUser.state || "",
        postcode: freshUser.postcode || "",
        country: freshUser.country || ""
      };

      res.json(profileData);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Update user profile
  app.put('/api/profile', authMiddleware, async (req: any, res) => {
    try {
      // Prevent caching for profile updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profileSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        profileImageUrl: z.string().optional(),
        phoneNumber: z.string().optional(),
        jobTitle: z.string().optional(),
        company: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        country: z.string().optional()
      });

      const data = profileSchema.parse(req.body);

      // Handle profile image URL normalization and ACL setting
      let normalizedProfileImageUrl = data.profileImageUrl;
      
      if (data.profileImageUrl && data.profileImageUrl.trim() !== '') {
        console.log("Processing profile image URL:", data.profileImageUrl);
        const objectStorageService = new ObjectStorageService();
        
        // First normalize the path to see if it's a valid object storage URL
        try {
          const normalizedPath = objectStorageService.normalizeObjectEntityPath(data.profileImageUrl);
          console.log("Normalized path:", normalizedPath);
          
          // Only process if it's a valid object storage path (starts with /objects/)
          if (normalizedPath.startsWith("/objects/")) {
            try {
              // Try to set ACL policy to make it public
              normalizedProfileImageUrl = await objectStorageService.trySetObjectEntityAclPolicy(
                data.profileImageUrl,
                {
                  owner: user.id,
                  visibility: "public", // Profile pictures should be publicly accessible
                }
              );
              console.log("ACL policy set successfully, final normalized URL:", normalizedProfileImageUrl);
            } catch (aclError: any) {
              console.log("File doesn't exist yet or ACL setting failed:", aclError.message);
              // File doesn't exist yet, but we can still store the normalized path
              // The ACL will be set when the file is actually uploaded or accessed
              normalizedProfileImageUrl = normalizedPath;
              console.log("Using normalized path without ACL:", normalizedProfileImageUrl);
            }
          } else {
            // External URL or invalid format - keep as is
            console.log("Not an object storage URL, keeping as is:", data.profileImageUrl);
            normalizedProfileImageUrl = data.profileImageUrl;
          }
        } catch (objectError: any) {
          console.error("Error processing profile image:", objectError);
          // If it's not a valid object storage URL, keep as is (might be external URL)
          normalizedProfileImageUrl = data.profileImageUrl;
        }
      }

      // Update user information
      const updatedUser = await storage.upsertUser({
        id: user.id,
        ...data,
        profileImageUrl: normalizedProfileImageUrl, // Use the normalized URL
        userType: user.userType, // Preserve userType
        isActive: user.isActive // Preserve status
      });

      // Update session with new profile data
      if (req.session.user && updatedUser) {
        req.session.user = { ...req.session.user, ...updatedUser };
      }

      res.json({ 
        message: "Profile updated successfully",
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Profile picture upload URL
  app.get('/api/profile/upload-url', authMiddleware, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const objectStorage = new ObjectStorageService();
      const uploadUrl = await objectStorage.getProfilePictureUploadURL();
      
      res.json({ uploadUrl });
    } catch (error: any) {
      console.error("Error generating profile picture upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Delete profile picture permanently
  app.delete('/api/profile/delete-picture', authMiddleware, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Permanently delete profile picture by setting profileImageUrl to null
      const updatedUser = await storage.upsertUser({
        ...user,
        profileImageUrl: null,
      });

      // Update session
      if (req.session.user) {
        req.session.user.profileImageUrl = null;
      }

      res.json({ 
        message: "Profile picture deleted permanently",
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Error deleting profile picture:", error);
      res.status(500).json({ message: "Failed to delete profile picture" });
    }
  });

  // Simple base64 profile picture upload
  app.post('/api/profile/upload-picture', authMiddleware, async (req: any, res) => {
    try {
      // Prevent caching for profile updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { imageData } = req.body;
      
      if (!imageData || !imageData.startsWith('data:image/')) {
        return res.status(400).json({ message: "Invalid image data" });
      }

      // Extract base64 data and mime type
      const matches = imageData.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ message: "Invalid base64 image format" });
      }

      const base64Data = matches[2];
      
      // Convert base64 to buffer to check file size
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Validate file size (2MB max for base64 storage)
      const maxSize = 2 * 1024 * 1024;
      if (buffer.length > maxSize) {
        return res.status(400).json({ message: "Image too large. Maximum size is 2MB" });
      }

      // Safely update only the profileImageUrl field by preserving all existing data
      const updatedUser = await storage.upsertUser({
        ...user, // Preserve ALL existing user data
        profileImageUrl: imageData, // Only update the profile image
      });

      // Update session with new profile picture
      if (req.session.user) {
        req.session.user.profileImageUrl = imageData;
      }

      res.json({ 
        message: "Profile picture uploaded successfully",
        imageUrl: imageData,
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // SDP User Management Routes
  // Generate invitation token
  function generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Invite new SDP user
  app.post('/api/sdp-users/invite', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userSdpRole = req.user?.sdpRole;
      
      const data = insertSdpUserInviteSchema.parse(req.body);
      
      // Admin users can only invite agents, not other admins or super admins
      if (userSdpRole === 'sdp_admin' && data.sdpRole !== 'sdp_agent') {
        return res.status(403).json({ message: "Admin users can only invite agents" });
      }
      
      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        // Don't reveal that user already exists - use generic response to prevent enumeration
        return res.status(200).json({ message: "Invitation processed. If the email is valid and available, an invitation will be sent." });
      }
      
      // Check if there's already a pending invite for this email
      const existingInvite = await storage.getSdpUserInviteByEmail(data.email);
      if (existingInvite && !existingInvite.acceptedAt) {
        return res.status(400).json({ message: "Invitation already sent for this email" });
      }
      
      const token = generateInviteToken();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      
      const invite = await storage.createSdpUserInvite({
        ...data,
        invitedByUserId: userId,
        token,
        expiresAt
      });
      
      // Send invitation email
      try {
        await emailService.sendSdpUserInvite(
          data.email,
          token,
          req.user.name,
          data.sdpRole
        );
      } catch (emailError: any) {
        console.error('Failed to send invitation email:', emailError);
        // Continue anyway - they can copy the link
      }
      
      res.json({ 
        message: "Invitation sent successfully",
        inviteId: invite.id,
        inviteLink: `${process.env.FRONTEND_URL || 'https://sdpglobalpay.com'}/invite/${token}`
      });
    } catch (error: any) {
      console.error("Error creating SDP user invitation:", error);
      if (error.name === 'ZodError') {
        const firstError = error.errors?.[0];
        const message = firstError 
          ? `${firstError.path.join('.')}: ${firstError.message}`
          : "Validation failed";
        return res.status(400).json({ message });
      }
      res.status(400).json({ message: error.message || "Failed to create invitation" });
    }
  });

  // Get invitation details by token (public endpoint for invite page)
  app.get('/api/sdp-users/invite/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      const invite = await storage.getSdpUserInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invalid invitation token" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "Invitation already accepted" });
      }
      
      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invitation expired" });
      }
      
      // Return limited info (don't expose sensitive data)
      res.json({
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        phoneNumber: invite.phoneNumber,
        sdpRole: invite.sdpRole,
      });
    } catch (error: any) {
      console.error("Error fetching invitation:", error);
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });

  // Accept invitation - SDP users set up password and 2FA
  app.post('/api/sdp-users/accept', async (req: any, res) => {
    try {
      const { token, password, totpSecret, totpVerificationCode } = req.body;
      
      // Validate required fields
      if (!token || !password || !totpSecret || !totpVerificationCode) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Validate password strength (minimum 8 characters)
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      // Get invitation details
      const invite = await storage.getSdpUserInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invalid invitation token" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "Invitation already accepted" });
      }
      
      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invitation expired" });
      }
      
      // Verify the TOTP code before proceeding
      // The totpSecret from frontend is a base32 string, need to convert to Secret object
      const secret = OTPAuth.Secret.fromBase32(totpSecret);
      const totp = new OTPAuth.TOTP({
        secret: secret,
        label: `SDP Global Pay (${invite.email})`,
        issuer: 'SDP Global Pay',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      
      const isValidCode = totp.validate({ token: totpVerificationCode, window: 1 }) !== null;
      if (!isValidCode) {
        return res.status(400).json({ message: "Invalid verification code. Please check your authenticator app and try again." });
      }
      
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Encrypt the TOTP secret
      const encryptedTotpSecret = twoFactorAuth.encrypt(totpSecret);
      
      // Generate backup codes (10 codes)
      const backupCodes = Array.from({ length: 10 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, 10))
      );
      const encryptedBackupCodes = hashedBackupCodes.map(hash => twoFactorAuth.encrypt(hash));
      
      // Try to create the user - if it already exists (from a previous partial attempt), use it
      let user;
      try {
        user = await storage.createUser({
          email: invite.email,
          firstName: invite.firstName,
          lastName: invite.lastName,
          phoneNumber: invite.phoneNumber,
          userType: 'sdp_internal',
          sdpRole: invite.sdpRole,
          accessibleCountries: invite.accessibleCountries,
          accessibleBusinessIds: invite.accessibleBusinessIds,
          passwordHash,
          emailVerified: true, // SDP users are pre-verified via invitation
          isActive: true
        });
      } catch (createError: any) {
        // If user already exists (duplicate key), fetch and use the existing user
        if (createError.message?.includes('duplicate') || createError.code === '23505') {
          const existingUser = await storage.getUserByEmail(invite.email);
          if (!existingUser) {
            throw new Error("User creation failed with duplicate error, but user not found");
          }
          user = existingUser;
          console.log(`User ${invite.email} already exists, continuing with existing user`);
        } else {
          throw createError;
        }
      }
      
      // Enable 2FA for the user
      // First create the 2FA record with the TOTP secret
      await storage.upsertUserTwoFactorAuth({
        userId: user.id,
        method: 'totp',
        totpSecret: encryptedTotpSecret,
        isEnabled: false // Will be enabled in next step
      });
      
      // Then enable 2FA and add backup codes
      await storage.enableUserTwoFactorAuth(user.id, encryptedBackupCodes);
      
      // Mark invitation as accepted
      await storage.updateSdpUserInvite(invite.id, { acceptedAt: new Date() });
      
      // Send registration confirmation email
      if (user.email) {
        try {
          await emailService.sendBusinessRegistrationConfirmation(
            user.email,
            invite.firstName,
            'enterprise' // SDP internal users get business-style welcome
          );
          console.log('Registration confirmation email sent to SDP user:', user.email);
        } catch (emailError: any) {
          console.error('Failed to send registration confirmation email to SDP user:', emailError);
          // Don't fail the registration if email sending fails
        }
      }
      
      res.json({ 
        message: "Account created successfully",
        userId: user.id,
        backupCodes // Return backup codes to user (they should save these)
      });
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      res.status(400).json({ 
        message: error.message || "Failed to create account",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // List SDP users
  app.get('/api/sdp-users', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const userSdpRole = req.user?.sdpRole;
      
      const users = await storage.getSdpUsers();
      
      // Admin users can only see agents and themselves
      const filteredUsers = userSdpRole === 'sdp_admin' 
        ? users.filter(user => user.sdpRole === 'sdp_agent' || user.id === req.user.id)
        : users;
      
      res.json(filteredUsers);
    } catch (error: any) {
      console.error("Error fetching SDP users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // List pending SDP user invitations
  app.get('/api/sdp-users/invites/pending', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const userSdpRole = req.user?.sdpRole;
      
      const invites = await storage.getPendingSdpUserInvites();
      
      // Admin users can only see agent invitations
      const filteredInvites = userSdpRole === 'sdp_admin' 
        ? invites.filter(invite => invite.sdpRole === 'sdp_agent')
        : invites;
      
      res.json(filteredInvites);
    } catch (error: any) {
      console.error("Error fetching pending SDP user invitations:", error);
      res.status(500).json({ message: "Failed to fetch pending invitations" });
    }
  });

  // Resend invitation email
  app.post('/api/sdp-users/invites/:id/resend', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userSdpRole = req.user?.sdpRole;
      
      const invite = await storage.getSdpUserInviteById(id);
      if (!invite) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Admin users can only resend agent invitations
      if (userSdpRole === 'sdp_admin' && invite.sdpRole !== 'sdp_agent') {
        return res.status(403).json({ message: "Cannot resend this invitation" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "Invitation already accepted" });
      }
      
      // Resend the email (allow resending even if expired)
      try {
        await emailService.sendSdpUserInvite(
          invite.email,
          invite.token,
          req.user.name,
          invite.sdpRole
        );
        res.json({ message: "Invitation resent successfully" });
      } catch (emailError: any) {
        console.error('Failed to resend invitation email:', emailError);
        res.status(500).json({ message: "Failed to resend invitation email" });
      }
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      res.status(400).json({ message: "Failed to resend invitation" });
    }
  });

  // Update SDP user
  app.patch('/api/sdp-users/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userSdpRole = req.user?.sdpRole;
      const updates = req.body;
      
      const targetUser = await storage.getSdpUserById(id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Admin users can only update agents, not other admins or super admins
      if (userSdpRole === 'sdp_admin' && targetUser.sdpRole !== 'sdp_agent') {
        return res.status(403).json({ message: "Cannot update this user" });
      }
      
      // Don't allow users to update their own role
      if (targetUser.id === userId && updates.sdpRole) {
        return res.status(403).json({ message: "Cannot update your own role" });
      }
      
      const updatedUser = await storage.updateSdpUser(id, updates);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating SDP user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  // List business users (non-SDP users) by country
  app.get('/api/business-users', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { country } = req.query;
      
      const users = await storage.getBusinessUsersByCountry(country);
      
      res.json(users);
    } catch (error: any) {
      console.error('Error fetching business users:', error);
      res.status(500).json({ message: "Failed to fetch business users" });
    }
  });

  // Business Users Overview - Get all business users grouped by country
  app.get('/api/business-users-overview', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const businessUsersByCountry = await storage.getBusinessUsersOverview();
      res.json(businessUsersByCountry);
    } catch (error: any) {
      console.error('Error fetching business users overview:', error);
      res.status(500).json({ message: "Failed to fetch business users overview" });
    }
  });

  // ===== SUPER ADMIN COUNTRY MANAGEMENT ROUTES =====
  // Only Super Admins can manage countries (create, update, delete, activate)
  
  // Get all countries including inactive (Super Admin and Admin only)
  app.get('/api/admin/countries', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const countries = await storage.getAllCountriesAdmin();
      res.json(countries);
    } catch (error: any) {
      console.error("Error fetching all countries:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  // Create new country (Super Admin and Admin only)
  app.post('/api/admin/countries', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { entities, ...countryData } = req.body;
      const data = insertCountrySchema.parse(countryData);
      
      // Check if country with this ID already exists
      const existingCountry = await storage.getCountryById(data.id);
      if (existingCountry) {
        return res.status(400).json({ 
          message: "Country with this ID already exists",
          errors: [{ field: "id", message: "Country ID must be unique" }]
        });
      }
      
      // Create the country first
      const country = await storage.createCountry(data);
      
      // If entities are provided, create them
      if (entities) {
        const user = req.user;
        const createdEntities: {
          shareholders: any[];
          directors: any[];
          taxAdvisors: any[];
          documents: any[];
        } = {
          shareholders: [],
          directors: [],
          taxAdvisors: [],
          documents: []
        };

        try {
          // Create shareholders
          if (entities.shareholders && entities.shareholders.length > 0) {
            for (const shareholder of entities.shareholders) {
              const shareholderData = insertCountryPartySchema.parse({
                ...shareholder,
                countryId: country.id,
                type: 'shareholder',
                ownershipPercent: shareholder.equity || null
              });
              const createdShareholder = await storage.createCountryParty(shareholderData);
              createdEntities.shareholders.push(createdShareholder);
            }
          }

          // Create directors
          if (entities.directors && entities.directors.length > 0) {
            for (const director of entities.directors) {
              const directorData = insertCountryPartySchema.parse({
                ...director,
                countryId: country.id,
                type: 'director',
                titleOrRole: director.role || null
              });
              const createdDirector = await storage.createCountryParty(directorData);
              createdEntities.directors.push(createdDirector);
            }
          }

          // Create tax advisors
          if (entities.taxAdvisors && entities.taxAdvisors.length > 0) {
            for (const taxAdvisor of entities.taxAdvisors) {
              const taxAdvisorData = insertCountryPartySchema.parse({
                ...taxAdvisor,
                countryId: country.id,
                type: 'tax_advisor',
                titleOrRole: taxAdvisor.specialization || null
              });
              const createdTaxAdvisor = await storage.createCountryParty(taxAdvisorData);
              createdEntities.taxAdvisors.push(createdTaxAdvisor);
            }
          }

          // Create documents
          if (entities.documents && entities.documents.length > 0) {
            for (const document of entities.documents) {
              const documentData = insertCountryDocumentSchema.parse({
                ...document,
                countryId: country.id,
                uploadedByUserId: user?.id
              });
              const createdDocument = await storage.createCountryDocument(documentData);
              createdEntities.documents.push(createdDocument);
            }
          }

          // Return country with created entities
          res.status(201).json({
            ...country,
            entities: createdEntities
          });
        } catch (entityError: any) {
          console.error("Error creating entities for country:", entityError);
          // Country was created but entities failed - log this but don't fail the request
          // In a production system, you might want to implement cleanup or transaction rollback
          res.status(201).json({
            ...country,
            entities: createdEntities,
            warnings: ["Some entities could not be created"]
          });
        }
      } else {
        res.status(201).json(country);
      }
    } catch (error: any) {
      console.error("Error creating country:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed",
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      res.status(500).json({ message: "Failed to create country" });
    }
  });

  // Get specific country by ID (Super Admin and Admin only)
  app.get('/api/admin/countries/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const country = await storage.getCountryById(id);
      
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      res.json(country);
    } catch (error: any) {
      console.error("Error fetching country:", error);
      res.status(500).json({ message: "Failed to fetch country" });
    }
  });

  // Update existing country (Super Admin and Admin only)
  app.put('/api/admin/countries/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if country exists
      const existingCountry = await storage.getCountryById(id);
      if (!existingCountry) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      // Validate the update data (excluding id from validation since it's in params)
      const updateData = insertCountrySchema.omit({ id: true }).parse(req.body);
      
      const updatedCountry = await storage.updateCountry(id, updateData);
      res.json(updatedCountry);
    } catch (error: any) {
      console.error("Error updating country:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed",
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      res.status(500).json({ message: "Failed to update country" });
    }
  });

  // Soft delete country (Super Admin and Admin only)
  app.delete('/api/admin/countries/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if country exists
      const existingCountry = await storage.getCountryById(id);
      if (!existingCountry) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      if (!existingCountry.isActive) {
        return res.status(400).json({ message: "Country is already inactive" });
      }
      
      await storage.deleteCountry(id);
      res.json({ message: "Country deactivated successfully" });
    } catch (error: any) {
      console.error("Error deleting country:", error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      res.status(500).json({ message: "Failed to deactivate country" });
    }
  });

  // Reactivate country (Super Admin and Admin only)
  app.put('/api/admin/countries/:id/activate', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if country exists
      const existingCountry = await storage.getCountryById(id);
      if (!existingCountry) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      if (existingCountry.isActive) {
        return res.status(400).json({ message: "Country is already active" });
      }
      
      const reactivatedCountry = await storage.activateCountry(id);
      res.json(reactivatedCountry);
    } catch (error: any) {
      console.error("Error reactivating country:", error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      res.status(500).json({ message: "Failed to reactivate country" });
    }
  });

  // Country Entity Management Routes (Super Admin and Admin only)
  
  // Get country with complete entity information including parties, contacts, fees, and documents
  app.get('/api/admin/countries/:id/entities', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const countryWithEntities = await storage.getCountryWithParties(id);
      
      if (!countryWithEntities) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      res.json(countryWithEntities);
    } catch (error: any) {
      console.error("Error fetching country entities:", error);
      res.status(500).json({ message: "Failed to fetch country entities" });
    }
  });

  // Country Parties Routes
  // Get all parties for a country
  app.get('/api/admin/countries/:countryId/parties', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { countryId } = req.params;
      const { type } = req.query;
      
      let parties;
      if (type && ['shareholder', 'director', 'tax_advisor'].includes(type)) {
        parties = await storage.getCountryPartiesByType(countryId, type as 'shareholder' | 'director' | 'tax_advisor');
      } else {
        parties = await storage.getCountryParties(countryId);
      }
      
      res.json(parties);
    } catch (error: any) {
      console.error("Error fetching country parties:", error);
      res.status(500).json({ message: "Failed to fetch country parties" });
    }
  });

  // Create new country party
  app.post('/api/admin/countries/:countryId/parties', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { countryId } = req.params;
      const data = insertCountryPartySchema.parse({
        ...req.body,
        countryId
      });
      
      const party = await storage.createCountryParty(data);
      res.status(201).json(party);
    } catch (error: any) {
      console.error("Error creating country party:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create country party" });
    }
  });

  // Get specific country party
  app.get('/api/admin/parties/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const party = await storage.getCountryPartyById(id);
      
      if (!party) {
        return res.status(404).json({ message: "Country party not found" });
      }
      
      res.json(party);
    } catch (error: any) {
      console.error("Error fetching country party:", error);
      res.status(500).json({ message: "Failed to fetch country party" });
    }
  });

  // Update country party
  app.put('/api/admin/parties/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertCountryPartySchema.partial().parse(req.body);
      
      const party = await storage.updateCountryParty(id, updates);
      res.json(party);
    } catch (error: any) {
      console.error("Error updating country party:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      if (error.message?.includes('not found')) {
        return res.status(404).json({ message: "Country party not found" });
      }
      res.status(500).json({ message: "Failed to update country party" });
    }
  });

  // Delete country party
  app.delete('/api/admin/parties/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCountryParty(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting country party:", error);
      res.status(500).json({ message: "Failed to delete country party" });
    }
  });

  // Country Party Contacts Routes
  // Get contacts for a party
  app.get('/api/admin/parties/:partyId/contacts', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { partyId } = req.params;
      const contacts = await storage.getCountryPartyContacts(partyId);
      res.json(contacts);
    } catch (error: any) {
      console.error("Error fetching party contacts:", error);
      res.status(500).json({ message: "Failed to fetch party contacts" });
    }
  });

  // Create new party contact
  app.post('/api/admin/parties/:partyId/contacts', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { partyId } = req.params;
      const data = insertCountryPartyContactSchema.parse({
        ...req.body,
        partyId
      });
      
      const contact = await storage.createCountryPartyContact(data);
      res.status(201).json(contact);
    } catch (error: any) {
      console.error("Error creating party contact:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create party contact" });
    }
  });

  // Update party contact
  app.put('/api/admin/contacts/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertCountryPartyContactSchema.partial().parse(req.body);
      
      const contact = await storage.updateCountryPartyContact(id, updates);
      res.json(contact);
    } catch (error: any) {
      console.error("Error updating party contact:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      if (error.message?.includes('not found')) {
        return res.status(404).json({ message: "Party contact not found" });
      }
      res.status(500).json({ message: "Failed to update party contact" });
    }
  });

  // Delete party contact
  app.delete('/api/admin/contacts/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCountryPartyContact(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting party contact:", error);
      res.status(500).json({ message: "Failed to delete party contact" });
    }
  });

  // Country Advisor Fees Routes (for tax advisors only)
  // Get fees for a tax advisor party
  app.get('/api/admin/parties/:partyId/fees', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { partyId } = req.params;
      const fees = await storage.getCountryAdvisorFees(partyId);
      res.json(fees);
    } catch (error: any) {
      console.error("Error fetching advisor fees:", error);
      res.status(500).json({ message: "Failed to fetch advisor fees" });
    }
  });

  // Create new advisor fee
  app.post('/api/admin/parties/:partyId/fees', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { partyId } = req.params;
      const data = insertCountryAdvisorFeeSchema.parse({
        ...req.body,
        partyId
      });
      
      const fee = await storage.createCountryAdvisorFee(data);
      res.status(201).json(fee);
    } catch (error: any) {
      console.error("Error creating advisor fee:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create advisor fee" });
    }
  });

  // Update advisor fee
  app.put('/api/admin/fees/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertCountryAdvisorFeeSchema.partial().parse(req.body);
      
      const fee = await storage.updateCountryAdvisorFee(id, updates);
      res.json(fee);
    } catch (error: any) {
      console.error("Error updating advisor fee:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      if (error.message?.includes('not found')) {
        return res.status(404).json({ message: "Advisor fee not found" });
      }
      res.status(500).json({ message: "Failed to update advisor fee" });
    }
  });

  // Delete advisor fee
  app.delete('/api/admin/fees/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCountryAdvisorFee(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting advisor fee:", error);
      res.status(500).json({ message: "Failed to delete advisor fee" });
    }
  });

  // Country Documents Routes
  // Get documents for a country
  app.get('/api/admin/countries/:countryId/documents', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { countryId } = req.params;
      const { category } = req.query;
      
      let documents;
      if (category) {
        documents = await storage.getCountryDocumentsByCategory(countryId, category as string);
      } else {
        documents = await storage.getCountryDocuments(countryId);
      }
      
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching country documents:", error);
      res.status(500).json({ message: "Failed to fetch country documents" });
    }
  });

  // Create new country document
  app.post('/api/admin/countries/:countryId/documents', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { countryId } = req.params;
      const user = req.user;
      
      const data = insertCountryDocumentSchema.parse({
        ...req.body,
        countryId,
        uploadedBy: user?.id
      });
      
      const document = await storage.createCountryDocument(data);
      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error creating country document:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create country document" });
    }
  });

  // Delete country document
  app.delete('/api/admin/documents/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCountryDocument(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting country document:", error);
      res.status(500).json({ message: "Failed to delete country document" });
    }
  });

  // Country Notes Routes
  // Update country entity notes
  app.put('/api/admin/countries/:id/notes', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      if (typeof notes !== 'string') {
        return res.status(400).json({ message: "Notes must be a string" });
      }
      
      const country = await storage.updateCountryNotes(id, notes);
      res.json(country);
    } catch (error: any) {
      console.error("Error updating country notes:", error);
      if (error.message?.includes('not found')) {
        return res.status(404).json({ message: "Country not found" });
      }
      res.status(500).json({ message: "Failed to update country notes" });
    }
  });


  // Business User Invitation Routes
  // Invite new business user
  app.post('/api/business-users/invite', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Only business users can send invites
      if (userType !== 'business_user') {
        return res.status(403).json({ message: "Only business users can send invitations" });
      }
      
      // Get the business for this user (owner or accessible)
      const business = await storage.getPrimaryBusinessForUser(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found for user" });
      }
      
      const data = insertBusinessUserInviteSchema.parse(req.body);
      
      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        // Don't reveal that user already exists - use generic response to prevent enumeration
        return res.status(200).json({ message: "Invitation processed. If the email is valid and available, an invitation will be sent." });
      }
      
      // Check if there's already a pending invite for this email and business
      const existingInvite = await storage.getBusinessUserInviteByEmail(data.email);
      if (existingInvite && !existingInvite.acceptedAt && existingInvite.businessId === business.id) {
        return res.status(400).json({ message: "Invitation already sent for this email" });
      }
      
      const token = generateInviteToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const invite = await storage.createBusinessUserInvite({
        ...data,
        businessId: business.id,
        invitedByUserId: userId,
        token,
        expiresAt
      });
      
      // Send invitation email
      try {
        await emailService.sendBusinessUserInvite(
          data.email,
          token,
          req.user.firstName || req.user.email,
          business.name
        );
      } catch (emailError: any) {
        console.error('Failed to send invitation email:', emailError);
        // Continue anyway - they can copy the link
      }
      
      res.json({ 
        message: "Invitation sent successfully",
        inviteId: invite.id,
        inviteLink: `${process.env.FRONTEND_URL || 'https://sdpglobalpay.com'}/invite/business/${token}`
      });
    } catch (error: any) {
      console.error("Error creating business user invitation:", error);
      res.status(400).json({ message: "Failed to create invitation" });
    }
  });

  // Get business user invitation details by token (public endpoint)
  app.get('/api/business-users/invite/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      const invite = await storage.getBusinessUserInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invalid invitation token" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "Invitation already accepted" });
      }
      
      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invitation expired" });
      }
      
      // Return limited info (don't expose sensitive data)
      res.json({
        email: invite.email,
        businessId: invite.businessId,
      });
    } catch (error: any) {
      console.error("Error fetching business user invitation:", error);
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });

  // Accept business user invitation - requires password and 2FA setup
  app.post('/api/business-users/accept', async (req: any, res) => {
    try {
      const { token, firstName, lastName, password, totpSecret, totpVerificationCode } = req.body;
      
      // Validate required fields
      if (!token || !firstName || !lastName || !password || !totpSecret || !totpVerificationCode) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Validate password strength (minimum 8 characters)
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      const invite = await storage.getBusinessUserInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invalid invitation token" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "Invitation already accepted" });
      }
      
      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invitation expired" });
      }
      
      // Verify the TOTP code before proceeding
      const secret = OTPAuth.Secret.fromBase32(totpSecret);
      const totp = new OTPAuth.TOTP({
        secret: secret,
        label: `SDP Global Pay (${invite.email})`,
        issuer: 'SDP Global Pay',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      
      const isValidCode = totp.validate({ token: totpVerificationCode, window: 1 }) !== null;
      if (!isValidCode) {
        return res.status(400).json({ message: "Invalid verification code. Please check your authenticator app and try again." });
      }
      
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Encrypt the TOTP secret
      const encryptedTotpSecret = twoFactorAuth.encrypt(totpSecret);
      
      // Generate backup codes (10 codes)
      const backupCodes = Array.from({ length: 10 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, 10))
      );
      const encryptedBackupCodes = hashedBackupCodes.map(hash => twoFactorAuth.encrypt(hash));
      
      // Check if user already exists with this email
      let user = await storage.getUserByEmail(invite.email);
      let isNewUser = false;
      
      if (user) {
        // User exists - update their business access and credentials
        const existingBusinessIds = user.accessibleBusinessIds || [];
        if (!existingBusinessIds.includes(invite.businessId)) {
          existingBusinessIds.push(invite.businessId);
        }
        
        // Update user with new business access, password, and ensure they're a business user
        user = await storage.upsertUser({
          id: user.id,
          email: user.email,
          firstName: firstName,
          lastName: lastName,
          userType: 'business_user',
          accessibleBusinessIds: existingBusinessIds,
          passwordHash,
          emailVerified: true, // Business users are pre-verified via invitation
          isActive: true
        });
      } else {
        // Create new user
        isNewUser = true;
        user = await storage.createUser({
          email: invite.email,
          firstName,
          lastName,
          userType: 'business_user',
          accessibleBusinessIds: [invite.businessId],
          passwordHash,
          emailVerified: true, // Business users are pre-verified via invitation
          isActive: true
        });
      }
      
      // Create or update 2FA record
      await storage.upsertUserTwoFactorAuth({
        userId: user.id,
        method: 'totp',
        totpSecret: encryptedTotpSecret,
        isEnabled: true,
      });
      await storage.enableUserTwoFactorAuth(user.id, encryptedBackupCodes);
      
      // Send registration confirmation email for new business users
      if (isNewUser && user.email) {
        try {
          await emailService.sendBusinessRegistrationConfirmation(
            user.email,
            firstName,
            'enterprise' // Business users get enterprise-style welcome
          );
          console.log('Registration confirmation email sent to business user:', user.email);
        } catch (emailError: any) {
          console.error('Failed to send registration confirmation email to business user:', emailError);
          // Don't fail the registration if email sending fails
        }
      }
      
      // Mark invitation as accepted
      await storage.updateBusinessUserInvite(invite.id, { acceptedAt: new Date() });
      
      res.json({ 
        message: "Account created successfully",
        userId: user.id,
        backupCodes // Return backup codes to display to the user
      });
    } catch (error: any) {
      console.error("Error accepting business user invitation:", error);
      res.status(400).json({ message: "Failed to create account" });
    }
  });

  // List business user invitations for current business
  app.get('/api/business-users/invites', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Only business users can list invites
      if (userType !== 'business_user') {
        return res.status(403).json({ message: "Only business users can list invitations" });
      }
      
      // Get the business for this user (owner or accessible)
      const business = await storage.getPrimaryBusinessForUser(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found for user" });
      }
      
      const invites = await storage.getBusinessUserInvitesByBusiness(business.id);
      
      res.json(invites);
    } catch (error: any) {
      console.error("Error fetching business user invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Cancel business user invitation
  app.delete('/api/business-users/invites/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Only business users can cancel invites
      if (userType !== 'business_user') {
        return res.status(403).json({ message: "Only business users can cancel invitations" });
      }
      
      // Get the business for this user (owner or accessible)
      const business = await storage.getPrimaryBusinessForUser(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found for user" });
      }
      
      // Get the invite to verify it belongs to this business
      const invites = await storage.getBusinessUserInvitesByBusiness(business.id);
      const invite = invites.find(inv => inv.id === id);
      
      if (!invite) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "Cannot cancel accepted invitation" });
      }
      
      // Mark as expired by setting expiresAt to now
      await storage.updateBusinessUserInvite(id, { expiresAt: new Date() });
      
      res.json({ message: "Invitation cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling business user invitation:", error);
      res.status(500).json({ message: "Failed to cancel invitation" });
    }
  });

  // ===== BUSINESS INVITATIONS (Contractor-initiated) =====
  
  // Create business invitation - workers invite businesses to register
  app.post('/api/business-invitations', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Only workers can send business invitations
      if (userType !== 'worker') {
        return res.status(403).json({ message: "Only workers can invite businesses" });
      }
      
      // Get the worker profile - check if user exists in database first
      let worker = await storage.getWorkerByUserId(userId);
      if (!worker) {
        // Check if user exists in the users table before creating worker profile
        const dbUser = await storage.getUser(userId);
        if (!dbUser) {
          // For test users that don't exist in database, create user record first
          const user = req.user;
          await storage.upsertUser({
            id: userId,
            email: user.email || `${userId}@example.com`,
            firstName: user.firstName || user.name?.split(' ')[0] || 'Worker',
            lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
            profileImageUrl: null,
          });
        }
        
        // Now create worker profile
        const user = req.user;
        worker = await storage.createWorker({
          userId: userId,
          firstName: user.firstName || user.name?.split(' ')[0] || 'Worker',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email || `${userId}@example.com`,
          phoneNumber: '',
          workerType: 'contractor', // Default for invitation feature
          countryId: null,
          businessId: null,
          personalDetailsCompleted: false,
          businessDetailsCompleted: false,
          bankDetailsCompleted: false,
          onboardingCompleted: false
        });
      }
      
      const data = createBusinessInvitationInputSchema.parse(req.body);
      
      // Generate unique token and set expiration
      const token = generateInviteToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const invitation = await storage.createBusinessInvitation({
        ...data,
        contractorId: worker.id,
        token,
        expiresAt
      });
      
      // Send business invitation email
      try {
        await emailService.sendEmail({
          to: data.businessEmail,
          ...getBusinessInvitationTemplate(
            `${worker.firstName} ${worker.lastName}`,
            data.businessName,
            data.contractorMessage ?? null,
            token
          )
        });
        console.log('Business invitation email sent to:', data.businessEmail);
      } catch (emailError: any) {
        console.error('Failed to send business invitation email:', emailError);
        // Continue anyway - they can share the link manually
      }
      
      res.json({ 
        message: "Business invitation sent successfully",
        invitationId: invitation.id,
        invitationLink: `${process.env.FRONTEND_URL || 'https://sdpglobalpay.com'}/invite/business/${token}`
      });
    } catch (error: any) {
      console.error("Error creating business invitation:", error);
      res.status(400).json({ message: "Failed to create business invitation" });
    }
  });

  // Get business invitations for current worker
  app.get('/api/business-invitations', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType !== 'worker') {
        return res.status(403).json({ message: "Only workers can view their business invitations" });
      }
      
      const worker = await storage.getWorkerByUserId(userId);
      if (!worker) {
        // Return empty array if worker profile not found (instead of 404)
        // This allows all workers to access the feature even if they haven't completed onboarding
        res.json([]);
        return;
      }
      
      const invitations = await storage.getBusinessInvitationsByContractor(worker.id);
      res.json(invitations);
    } catch (error: any) {
      console.error("Error fetching business invitations:", error);
      res.status(500).json({ message: "Failed to fetch business invitations" });
    }
  });

  // Get business invitation details by token (public endpoint)
  app.get('/api/business-invitations/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      const invitation = await storage.getBusinessInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }
      
      if (invitation.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      if (invitation.status !== 'sent') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }
      
      // Return only safe invitation details (no sensitive data)
      res.json({
        businessName: invitation.businessName,
        contractorMessage: invitation.contractorMessage,
        expiresAt: invitation.expiresAt
      });
    } catch (error: any) {
      console.error("Error fetching business invitation:", error);
      res.status(500).json({ message: "Failed to fetch business invitation" });
    }
  });

  // Business registration through invitation (public endpoint)
  app.post('/api/business-invitations/:token/register', async (req: any, res) => {
    try {
      const { token } = req.params;
      const { firstName, lastName, businessName, businessEmail } = req.body;
      
      if (!firstName || !lastName || !businessName || !businessEmail) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const invitation = await storage.getBusinessInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }
      
      if (invitation.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      if (invitation.status !== 'sent') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }
      
      // SECURITY: Strict email validation - businessEmail must match invitation.businessEmail
      if (businessEmail.toLowerCase() !== invitation.businessEmail.toLowerCase()) {
        return res.status(400).json({ message: "Email address must match the invitation recipient" });
      }
      
      // IDEMPOTENCY: Prevent duplicate registrations
      if ((invitation.status as string) === 'registered' && invitation.registeredBusinessId) {
        return res.status(400).json({ message: "This invitation has already been processed" });
      }
      
      // Check if user already exists with this email
      let user = await storage.getUserByEmail(businessEmail);
      let business;
      
      if (user) {
        // Existing user - check if they already have a business
        business = await storage.getBusinessByOwnerId(user.id);
        if (!business) {
          // Create business for existing user
          business = await storage.createBusiness({
            name: businessName,
            ownerId: user.id
          });
        }
      } else {
        // Create new user
        user = await storage.upsertUser({
          email: businessEmail,
          firstName,
          lastName,
          userType: 'business_user'
        });
        
        // Create business for new user
        business = await storage.createBusiness({
          name: businessName,
          ownerId: user.id
        });
        
        // Send registration confirmation email for new business users
        try {
          await emailService.sendBusinessRegistrationConfirmation(
            businessEmail,
            firstName,
            'enterprise'
          );
          console.log('Registration confirmation email sent to business:', businessEmail);
        } catch (emailError: any) {
          console.error('Failed to send registration confirmation email:', emailError);
        }
      }
      
      // Update invitation status
      await storage.updateBusinessInvitation(invitation.id, {
        status: 'registered',
        registeredBusinessId: business.id,
        registeredAt: new Date()
      });
      
      // Create worker approval token for the contractor
      const approvalToken = generateInviteToken();
      const approvalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const workerApproval = await storage.createWorkerApproval({
        workerId: invitation.contractorId,
        businessId: business.id,
        businessInvitationId: invitation.id,
        token: approvalToken,
        expiresAt: approvalExpiresAt
      });
      
      // Send worker approval request email to contractor
      try {
        const contractor = await storage.getWorkerById(invitation.contractorId);
        if (contractor && contractor.email) {
          await emailService.sendEmail({
            to: contractor.email,
            ...getWorkerApprovalRequestTemplate(
              `${contractor.firstName} ${contractor.lastName}`,
              businessName,
              businessEmail,
              approvalToken
            )
          });
          console.log('Worker approval request email sent to contractor:', contractor.email);
        }
      } catch (emailError: any) {
        console.error('Failed to send worker approval request email:', emailError);
      }
      
      res.json({
        message: "Registration successful! The contractor will be notified to approve working with your business.",
        businessId: business.id,
        userId: user.id
      });
    } catch (error: any) {
      console.error("Error processing business registration:", error);
      res.status(400).json({ message: "Failed to process registration" });
    }
  });

  // Worker approval endpoint - SECURITY: Changed to POST to prevent CSRF attacks
  app.post('/api/worker-approval/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const { action } = req.body; // 'approve' or 'reject' - moved from query to body for CSRF protection
      
      const approval = await storage.getWorkerApprovalByToken(token);
      if (!approval) {
        return res.status(404).json({ message: "Invalid or expired approval link" });
      }
      
      if (approval.expiresAt < new Date()) {
        return res.status(400).json({ message: "Approval link has expired" });
      }
      
      if (approval.status !== 'pending') {
        return res.status(400).json({ message: "This approval has already been processed" });
      }
      
      if (action === 'approve') {
        // Approve the worker-business association
        await storage.updateWorkerApproval(approval.id, {
          status: 'approved',
          approvedAt: new Date()
        });
        
        // Create worker-business association
        await storage.createWorkerBusinessAssociation({
          workerId: approval.workerId,
          businessId: approval.businessId,
          status: 'active',
          addedViaInvitation: true,
          businessInvitationId: approval.businessInvitationId
        });
        
        res.json({ 
          message: "Approval successful! You can now work with this business through SDP Global Pay.",
          status: 'approved'
        });
      } else if (action === 'reject') {
        // Reject the association
        await storage.updateWorkerApproval(approval.id, {
          status: 'rejected',
          rejectedAt: new Date()
        });
        
        res.json({ 
          message: "You have declined to work with this business.",
          status: 'rejected'
        });
      } else {
        return res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'" });
      }
    } catch (error: any) {
      console.error("Error processing worker approval:", error);
      res.status(500).json({ message: "Failed to process approval" });
    }
  });

  // Contact form endpoint (public - no auth required)
  app.post('/api/contact', async (req: any, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        phone, 
        country, 
        company, 
        hiringCountry, 
        subject, 
        message,
        spamProtection
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !country || !company || !hiringCountry || !subject || !message || !spamProtection) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Basic spam protection - check if spamProtection is a reasonable number
      const spamAnswer = parseInt(spamProtection);
      if (isNaN(spamAnswer) || spamAnswer < 2 || spamAnswer > 20) {
        return res.status(400).json({ message: 'Invalid spam protection answer' });
      }

      // Send notification email to SDP team
      const contactSubject = `New Contact Form Submission: ${subject}`;
      const contactHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">New Contact Form Submission</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #334155; margin-top: 0;">Contact Information</h3>
            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Company:</strong> ${company}</p>
            <p><strong>Country:</strong> ${country}</p>
            <p><strong>Looking to hire in:</strong> ${hiringCountry}</p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #334155; margin-top: 0;">Inquiry Details</h3>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #3b82f6;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #64748b; font-size: 14px;">
              Submitted on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `;

      // Send email to SDP team
      const emailSent = await emailService.sendEmail({
        to: 'team@sdpglobalpay.com',
        subject: contactSubject,
        html: contactHtml,
        text: `New contact form submission from ${firstName} ${lastName} (${email})\n\nCompany: ${company}\nCountry: ${country}\nLooking to hire in: ${hiringCountry}\n\nSubject: ${subject}\nMessage: ${message}`
      });

      // Send confirmation email to user
      const confirmationSubject = 'Thank you for contacting SDP Global Pay';
      const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #1e40af;">SDP Global Pay</h1>
          </div>
          
          <h2 style="color: #334155;">Thank you for contacting us!</h2>
          
          <p>Hi ${firstName},</p>
          
          <p>Thank you for reaching out to SDP Global Pay. We've received your inquiry about international hiring and our team will get back to you within 24 hours.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #334155; margin-top: 0;">Your inquiry details:</h3>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Company:</strong> ${company}</p>
            <p><strong>Looking to hire in:</strong> ${hiringCountry}</p>
          </div>
          
          <p>In the meantime, feel free to explore our resources:</p>
          <ul>
            <li><a href="${process.env.FRONTEND_URL || 'https://sdpglobalpay.com'}/solutions" style="color: #3b82f6;">Our Solutions</a></li>
            <li><a href="${process.env.FRONTEND_URL || 'https://sdpglobalpay.com'}/resources" style="color: #3b82f6;">Cost Calculator & Resources</a></li>
            <li><a href="${process.env.FRONTEND_URL || 'https://sdpglobalpay.com'}/country-guides" style="color: #3b82f6;">Country Guides</a></li>
          </ul>
          
          <p>Best regards,<br>The SDP Global Pay Team</p>
          
          <div style="border-top: 1px solid #e2e8f0; margin: 30px 0; padding-top: 20px; text-align: center; color: #64748b; font-size: 14px;">
            <p>SDP Global Pay - Making Global Contracting and Employment Easy</p>
          </div>
        </div>
      `;

      await emailService.sendEmail({
        to: email,
        subject: confirmationSubject,
        html: confirmationHtml,
        text: `Thank you for contacting SDP Global Pay, ${firstName}. We've received your inquiry and will get back to you within 24 hours.`
      });

      res.json({ 
        message: 'Contact form submitted successfully',
        success: true 
      });

    } catch (error: any) {
      console.error('Error processing contact form:', error);
      res.status(500).json({ 
        message: 'Failed to process contact form submission',
        success: false 
      });
    }
  });

  // Serve favicon
  app.get('/favicon.png', (req, res) => {
    const faviconPath = path.join(process.cwd(), 'client', 'favicon.png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.sendFile(faviconPath, (err) => {
      if (err && !res.headersSent) {
        console.error('Error serving favicon:', err);
        res.status(404).send('Favicon not found');
      }
    });
  });

  // Serve assets (videos and images) from attached_assets folder
  app.get('/attached-assets/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'attached_assets', filename);
    
    // Set appropriate content type based on file extension
    if (filename.endsWith('.mp4') || filename.endsWith('.webm') || filename.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filename.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filename.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filename.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        console.error('Error serving asset file:', err);
        res.status(404).json({ error: 'Asset file not found' });
      }
    });
  });

  // Serve video poster image - actual frame from the video
  app.get('/api/placeholder-video-poster.jpg', (req, res) => {
    const posterPath = path.join(process.cwd(), 'attached_assets', 'video_poster.jpg');
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(posterPath, (err) => {
      if (err && !res.headersSent) {
        console.error('Error serving video poster:', err);
        res.status(404).json({ error: 'Video poster not found' });
      }
    });
  });

  // Contract Template Management Routes (SDP Super Admin and Admin only)
  app.get('/api/contract-templates', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const templates = await storage.getContractTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching contract templates:', error);
      res.status(500).json({ message: 'Failed to fetch contract templates' });
    }
  });

  // Get contract templates filtered by country (for contract creation)
  app.get('/api/contract-templates/country/:countryId', authMiddleware, async (req: any, res) => {
    try {
      const { countryId } = req.params;
      const { employmentType } = req.query;

      console.log(`[TEMPLATE FILTER] Country: ${countryId}, Employment Type: ${employmentType}`);
      const templates = await storage.getContractTemplatesByCountry(countryId, employmentType as string);
      console.log(`[TEMPLATE FILTER] Found ${templates.length} templates:`, templates.map(t => ({ name: t.name, employmentType: t.employmentType, countryId: t.countryId })));
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching contract templates by country:', error);
      res.status(500).json({ message: 'Failed to fetch contract templates' });
    }
  });

  app.post('/api/contract-templates', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const userId = req.user?.id;

      const data = insertContractTemplateSchema.parse({
        ...req.body,
        uploadedBy: userId,
      });

      const template = await storage.createContractTemplate(data);
      res.json(template);
    } catch (error: any) {
      console.error('Error creating contract template:', error);
      res.status(400).json({ message: 'Failed to create contract template' });
    }
  });

  app.put('/api/contract-templates/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;

      const data = insertContractTemplateSchema.parse(req.body);
      const template = await storage.updateContractTemplate(id, data);
      res.json(template);
    } catch (error: any) {
      console.error('Error updating contract template:', error);
      res.status(400).json({ message: 'Failed to update contract template' });
    }
  });

  app.delete('/api/contract-templates/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;

      await storage.deleteContractTemplate(id);
      res.json({ message: 'Contract template deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting contract template:', error);
      res.status(400).json({ message: 'Failed to delete contract template' });
    }
  });

  // Universal Contract Generation Routes
  app.get('/api/contracts/universal-template', authMiddleware, async (req: any, res) => {
    try {
      // Get the universal independent contractor agreement template
      const templates = await storage.getContractTemplates();
      const universalTemplate = templates.find(t => 
        t.name === 'Universal Independent Contractor Agreement' && t.countryId === null
      );
      
      if (!universalTemplate) {
        return res.status(404).json({ message: 'Universal contract template not found' });
      }

      res.json(universalTemplate);
    } catch (error: any) {
      console.error('Error fetching universal contract template:', error);
      res.status(500).json({ message: 'Failed to fetch universal contract template' });
    }
  });

  app.post('/api/contracts/universal/preview', authMiddleware, async (req: any, res) => {
    try {
      const { templateId, businessId, workerId, contractData } = req.body;
      
      if (!templateId || !businessId || !workerId) {
        return res.status(400).json({ 
          message: 'Template ID, business ID, and worker ID are required' 
        });
      }

      // Generate contract preview without saving
      const result = await storage.generateUniversalContract(
        templateId, 
        businessId, 
        workerId, 
        contractData || {}
      );

      res.json({
        content: result.content,
        variables: result.variables,
        message: 'Contract preview generated successfully'
      });
    } catch (error: any) {
      console.error('Error generating universal contract preview:', error);
      res.status(400).json({ message: 'Failed to generate contract preview', error: error.message });
    }
  });

  app.post('/api/contracts/universal/generate', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { templateId, businessId, workerId, contractData } = req.body;
      
      if (!templateId || !businessId || !workerId) {
        return res.status(400).json({ 
          message: 'Template ID, business ID, and worker ID are required' 
        });
      }

      // Verify user has access to create contracts for this business
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.userType === 'business_user') {
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business || business.id !== businessId) {
          return res.status(403).json({ message: 'Access denied - not your business' });
        }
      } else if (user.userType !== 'sdp_internal') {
        return res.status(403).json({ message: 'Access denied - insufficient permissions' });
      }

      // Generate the contract content
      const result = await storage.generateUniversalContract(
        templateId, 
        businessId, 
        workerId, 
        contractData || {}
      );

      // Get business and worker for contract instance data
      const business = await storage.getBusinessById(businessId);
      const worker = await storage.getWorkerById(workerId);
      const template = await storage.getContractTemplateById(templateId);

      if (!business || !worker || !template) {
        return res.status(404).json({ message: 'Business, worker, or template not found' });
      }

      // Create the contract instance
      const contractInstance = await storage.createContractInstance({
        templateId,
        businessId,
        workerId,
        countryId: contractData.countryId || (business.accessibleCountries?.[0]) || 'us',
        contractTitle: `${template.name} - ${worker.firstName} ${worker.lastName}`,
        workerName: `${worker.firstName} ${worker.lastName}`,
        businessName: business.name,
        startDate: contractData.startDate ? new Date(contractData.startDate) : undefined,
        endDate: contractData.endDate ? new Date(contractData.endDate) : undefined,
        salaryAmount: contractData.rateAmount || '0',
        currency: contractData.rateCurrency || 'USD',
        rateType: contractData.rateType as any || 'hourly',
        contractContent: result.content,
        signatureStatus: 'draft',
        createdBy: userId,
      });

      res.json({
        contractInstance,
        content: result.content,
        variables: result.variables,
        message: 'Universal contract generated and saved successfully'
      });
    } catch (error: any) {
      console.error('Error generating universal contract:', error);
      res.status(400).json({ message: 'Failed to generate contract', error: error.message });
    }
  });

  // Contract Instance Management Routes
  app.get('/api/contract-instances', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let contracts;
      if (user.userType === 'sdp_internal') {
        // SDP internal users can see all contracts
        contracts = await storage.getContractInstances();
      } else if (user.userType === 'business_user') {
        // Business users can see contracts for their business
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business) {
          return res.status(404).json({ message: 'Business not found' });
        }
        contracts = await storage.getContractInstancesByBusinessId(business.id);
      } else if (user.userType === 'worker') {
        // Workers can see contracts assigned to them
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: 'Worker profile not found' });
        }
        contracts = await storage.getContractInstancesByWorkerId(worker.id);
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(contracts);
    } catch (error: any) {
      console.error('Error fetching contract instances:', error);
      res.status(500).json({ message: 'Failed to fetch contract instances' });
    }
  });

  app.post('/api/contract-instances', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      // Only business users can create contract instances
      if (!user || user.userType !== 'business_user') {
        return res.status(403).json({ message: 'Access denied - business user required' });
      }

      const business = await storage.getBusinessByOwnerId(userId);
      if (!business) {
        return res.status(404).json({ message: 'Business not found' });
      }

      // Get template and worker details for pre-filling
      const template = await storage.getContractTemplateById(req.body.templateId);
      const worker = await storage.getWorkerById(req.body.workerId);
      
      if (!template || !worker) {
        return res.status(404).json({ message: 'Template or worker not found' });
      }

      // Generate contract content by replacing template variables
      const contractContent = await storage.generateContractContent(template, {
        workerName: `${worker.firstName} ${worker.lastName}`,
        businessName: business.name,
        startDate: req.body.startDate || '',
        endDate: req.body.endDate || '',
        salaryAmount: req.body.salaryAmount || '',
        currency: req.body.currency || 'AUD',
      });

      const data = insertContractInstanceSchema.parse({
        ...req.body,
        businessId: business.id,
        countryId: worker.countryId,
        workerName: `${worker.firstName} ${worker.lastName}`,
        businessName: business.name,
        contractContent,
        createdBy: userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      const contractInstance = await storage.createContractInstance(data);

      // Send contract for signature via email
      try {
        const workerName = `${worker.firstName} ${worker.lastName}`;
        await emailService.sendContractReadyEmail(
          worker.email,
          workerName,
          business.name,
          req.body.contractTitle
        );

        // Update sent status
        await storage.updateContractInstanceStatus(contractInstance.id, {
          signatureStatus: 'sent_for_signature',
          sentAt: new Date(),
        });
      } catch (emailError: any) {
        console.error("Failed to send contract email:", emailError);
        // Don't fail the request if email fails
      }

      res.json(contractInstance);
    } catch (error: any) {
      console.error('Error creating contract instance:', error);
      res.status(400).json({ message: 'Failed to create contract instance' });
    }
  });

  // Contract signing endpoints
  app.put('/api/contract-instances/:id/sign', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      const { signatureType } = req.body; // 'worker' or 'business'
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const contract = await storage.getContractInstances().then(contracts => 
        contracts.find(c => c.id === id)
      );
      
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      // Verify user can sign this contract
      if (signatureType === 'worker' && user.userType !== 'worker') {
        return res.status(403).json({ message: 'Only workers can provide worker signature' });
      }
      
      if (signatureType === 'business' && user.userType !== 'business_user') {
        return res.status(403).json({ message: 'Only business users can provide business signature' });
      }

      const updates: Partial<ContractInstance> = {};
      
      if (signatureType === 'worker') {
        updates.workerSignedAt = new Date();
        updates.signatureStatus = 'partially_signed';
      } else if (signatureType === 'business') {
        updates.businessSignedAt = new Date();
        updates.signatureStatus = 'partially_signed';
      }

      // If both parties have signed, mark as fully signed
      if (contract.workerSignedAt && signatureType === 'business') {
        updates.signatureStatus = 'fully_signed';
      } else if (contract.businessSignedAt && signatureType === 'worker') {
        updates.signatureStatus = 'fully_signed';
      }

      await storage.updateContractInstanceStatus(id, updates);

      // If fully signed, notify SDP internal team
      if (updates.signatureStatus === 'fully_signed') {
        updates.sdpNotifiedAt = new Date();
        await storage.updateContractInstanceStatus(id, { sdpNotifiedAt: new Date() });
      }

      res.json({ message: 'Contract signed successfully', status: updates.signatureStatus });
    } catch (error: any) {
      console.error('Error signing contract:', error);
      res.status(400).json({ message: 'Failed to sign contract' });
    }
  });

  app.put('/api/contract-instances/:id/decline', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.updateContractInstanceStatus(id, {
        signatureStatus: 'declined',
        declinedAt: new Date(),
        declineReason: reason,
      });

      res.json({ message: 'Contract declined successfully' });
    } catch (error: any) {
      console.error('Error declining contract:', error);
      res.status(400).json({ message: 'Failed to decline contract' });
    }
  });


  // Dashboard analytics routes
  app.get('/api/dashboard/analytics', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType === 'worker') {
        // For workers, show their own worker analytics
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: "Worker profile not found" });
        }
        
        // Return worker-specific analytics
        res.json({
          totalWorkers: 1,
          activeContracts: 0,
          totalRevenue: 0,
          workerProfile: worker
        });
        return;
      }
      
      if (userType === 'sdp_internal') {
        // For SDP internal users, show global analytics across all countries they can access
        const allCountries = await storage.getAllCountries();
        const countryIds = allCountries.map(c => c.id);
        
        const analytics = await storage.getSDPInternalAnalytics(countryIds);
        res.json(analytics);
        return;
      }
      
      const business = await storage.getBusinessByOwnerId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const analytics = await storage.getBusinessAnalytics(business.id);
      res.json(analytics);
    } catch (error: any) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Contract history and insights for personalized dashboard
  app.get("/api/dashboard/contract-history", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let contracts: any[] = [];
      let insights: any = {};

      if (userType === 'sdp_internal') {
        // SDP internal users see all contracts
        contracts = await storage.getAllContracts();
        
        // Calculate global insights
        const totalContracts = contracts.length;
        const activeContracts = contracts.filter((c: any) => c.status === 'active' || c.status === 'signed').length;
        const pendingContracts = contracts.filter((c: any) => c.status === 'pending_signature' || c.status === 'sent').length;
        const draftContracts = contracts.filter((c: any) => c.status === 'draft').length;
        
        // Monthly trends (last 6 months)
        const monthlyTrends = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const monthContracts = contracts.filter((c: any) => {
            const createdAt = new Date(c.createdAt);
            return createdAt >= monthStart && createdAt <= monthEnd;
          });
          
          monthlyTrends.push({
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            contracts: monthContracts.length,
            active: monthContracts.filter((c: any) => c.status === 'active' || c.status === 'signed').length
          });
        }
        
        insights = {
          totalContracts,
          activeContracts,
          pendingContracts,
          draftContracts,
          monthlyTrends,
          successRate: totalContracts > 0 ? Math.round((activeContracts / totalContracts) * 100) : 0
        };
        
      } else if (userType === 'business_user') {
        // Business users see their own contracts
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        contracts = await storage.getContractsByBusiness(business.id);
        
        const totalContracts = contracts.length;
        const activeContracts = contracts.filter((c: any) => c.status === 'active' || c.status === 'signed').length;
        const pendingContracts = contracts.filter((c: any) => c.status === 'pending_signature' || c.status === 'sent').length;
        const draftContracts = contracts.filter((c: any) => c.status === 'draft').length;
        
        // Recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentContracts = contracts.filter((c: any) => 
          new Date(c.createdAt) >= thirtyDaysAgo
        );
        
        insights = {
          totalContracts,
          activeContracts,
          pendingContracts,
          draftContracts,
          recentActivity: recentContracts.length,
          successRate: totalContracts > 0 ? Math.round((activeContracts / totalContracts) * 100) : 0
        };
        
      } else if (userType === 'worker') {
        // Workers see their own contracts
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: "Worker profile not found" });
        }
        
        contracts = await storage.getContractsByWorker(worker.id);
        
        const totalContracts = contracts.length;
        const activeContracts = contracts.filter((c: any) => c.status === 'active' || c.status === 'signed').length;
        const completedContracts = contracts.filter((c: any) => c.status === 'completed' || c.status === 'expired').length;
        
        insights = {
          totalContracts,
          activeContracts,
          completedContracts,
          totalEarnings: contracts.reduce((sum: number, c: any) => {
            if (c.status === 'active' || c.status === 'signed') {
              return sum + (parseFloat(c.rate) || 0);
            }
            return sum;
          }, 0)
        };
      }

      // Format contracts for display
      const formattedContracts = contracts.slice(0, 10).map((contract: any) => ({
        id: contract.id,
        workerName: `${contract.worker?.firstName || ''} ${contract.worker?.lastName || ''}`.trim(),
        businessName: contract.business?.name || 'Unknown Business',
        countryName: contract.country?.name || 'Unknown Country',
        employmentType: contract.employmentType,
        status: contract.status,
        rate: contract.rate,
        startDate: contract.startDate,
        endDate: contract.endDate,
        createdAt: contract.createdAt
      }));

      res.json({
        contracts: formattedContracts,
        insights,
        totalRecords: contracts.length
      });

    } catch (error: any) {
      console.error("Error fetching contract history:", error);
      res.status(500).json({ message: "Failed to fetch contract history" });
    }
  });

  // SDP Global Pay specific analytics for internal users
  app.get("/api/dashboard/sdp-analytics", authMiddleware, async (req: any, res) => {
    try {
      // Only SDP internal users can access this endpoint
      const user = req.user;
      
      if (!user || user.userType !== 'sdp_internal') {
        return res.status(403).json({ error: "Access denied. SDP internal users only." });
      }

      // Get all data needed for SDP analytics
      const contracts = await storage.getContracts();
      const workers = await storage.getWorkers();
      const countries = await storage.getCountries();
      const allUsers = await storage.getAllUsers();
      const businesses = await storage.getBusinesses();
      
      // 1. Contracts by Country with Status
      const contractsByCountry = countries.map((country: any) => {
        const countryContracts = contracts.filter((c: any) => c.countryId === country.id);
        
        return {
          countryId: country.id,
          countryName: country.name,
          pending: countryContracts.filter((c: any) => c.status === 'pending_signature' || c.status === 'sent').length,
          signed: countryContracts.filter((c: any) => c.status === 'signed' || c.status === 'active').length,
          expired: countryContracts.filter((c: any) => c.status === 'expired' || c.status === 'cancelled').length,
          total: countryContracts.length,
        };
      });

      // 2. Business Users by Country
      const businessUsersByCountry = countries.map((country: any) => {
        const countryBusinesses = businesses.filter((b: any) => 
          b.accessibleCountries && b.accessibleCountries.includes(country.id)
        );
        
        const businessUsers = allUsers.filter((u: any) => 
          u.userType === 'business_user' && 
          countryBusinesses.some((b: any) => b.ownerId === u.id)
        );
        
        return {
          countryId: country.id,
          countryName: country.name,
          activeUsers: businessUsers.length,
          totalBusinesses: countryBusinesses.length,
        };
      });

      // 3. Get Real Approved Timesheets
      const allTimesheets = await storage.getAllTimesheets();
      const approvedTimesheetsData = allTimesheets.filter((ts: any) => ts.status === 'approved');
      
      const approvedTimesheets = approvedTimesheetsData.map((ts: any) => {
        const worker = workers.find((w: any) => w.id === ts.workerId);
        const business = businesses.find((b: any) => b.id === ts.businessId);
        const country = countries.find((c: any) => c.id === worker?.countryId);
        
        return {
          id: ts.id,
          workerName: worker ? `${worker.firstName} ${worker.lastName}` : 'Unknown Worker',
          businessName: business?.name || 'Unknown Business',
          countryName: country?.name || 'Unknown Country',
          totalHours: ts.totalHours || 0,
          amount: ts.totalAmount || 0,
          approvedDate: ts.approvedAt?.toISOString() || ts.updatedAt?.toISOString() || new Date().toISOString(),
        };
      });

      // 4. Get Real Payments to Process (Approved Invoices and Payslips)
      const allInvoices = await storage.getAllInvoices();
      const allCountryIds = countries.map((c: any) => c.id);
      const allPayslips = await storage.getPayslipsByCountries(allCountryIds);
      
      const paymentsToProcess = [
        // Add approved/pending invoices
        ...allInvoices
          .filter((inv: any) => inv.status === 'approved' || inv.status === 'pending')
          .map((inv: any) => {
            const worker = workers.find((w: any) => w.id === inv.contractorId);
            const business = businesses.find((b: any) => b.id === inv.businessId);
            const country = countries.find((c: any) => c.id === worker?.countryId);
            const now = new Date();
            const dueDate = new Date(inv.dueDate);
            
            return {
              id: inv.id,
              type: 'Invoice',
              workerName: worker ? `${worker.firstName} ${worker.lastName}` : 'Unknown Worker',
              businessName: business?.name || 'Unknown Business',
              countryName: country?.name || 'Unknown Country',
              amount: parseFloat(inv.amount) || 0,
              dueDate: inv.dueDate,
              status: dueDate < now ? 'overdue' : 'pending',
            };
          }),
        // Add unpaid payslips
        ...allPayslips
          .filter((ps: any) => ps.status === 'approved' || ps.status === 'processed')
          .map((ps: any) => {
            const worker = workers.find((w: any) => w.id === ps.workerId);
            const business = businesses.find((b: any) => b.id === ps.businessId);
            const country = countries.find((c: any) => c.id === worker?.countryId);
            const now = new Date();
            const payDate = new Date(ps.paymentDate);
            
            return {
              id: ps.id,
              type: 'Salary',
              workerName: worker ? `${worker.firstName} ${worker.lastName}` : 'Unknown Worker',
              businessName: business?.name || 'Unknown Business',
              countryName: country?.name || 'Unknown Country',
              amount: parseFloat(ps.netPay) || 0,
              dueDate: ps.paymentDate,
              status: payDate < now ? 'overdue' : 'pending',
            };
          }),
      ];

      const totalPaymentsValue = paymentsToProcess.reduce((sum, payment) => sum + payment.amount, 0);
      const totalApprovedHours = approvedTimesheets.reduce((sum, ts) => sum + ts.totalHours, 0);

      res.json({
        contractsByCountry,
        businessUsersByCountry,
        approvedTimesheets,
        paymentsToProcess,
        totalPaymentsValue,
        totalApprovedHours,
      });
    } catch (error: any) {
      console.error("Error fetching SDP analytics:", error);
      res.status(500).json({ error: "Failed to fetch SDP analytics" });
    }
  });

  // Business routes
  app.post('/api/businesses', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const data = insertBusinessSchema.parse({
        ...req.body,
        ownerId: userId,
      });
      
      const business = await storage.createBusiness(data);
      res.json(business);
    } catch (error: any) {
      console.error("Error creating business:", error);
      res.status(400).json({ message: "Failed to create business" });
    }
  });

  app.get('/api/businesses', authMiddleware, async (req: any, res) => {
    try {
      const userType = req.user?.userType;
      const userId = req.user?.id;
      const accessibleBusinessIds = req.user?.accessibleBusinessIds;
      
      // SDP internal users can fetch all businesses, business users can fetch their own
      if (userType === 'sdp_internal') {
        const allBusinesses = await storage.getBusinesses();
      
        // Filter businesses based on user's accessible business IDs
        // Super admins (no restrictions) can see all businesses
        let accessibleBusinesses = allBusinesses;
        
        if (accessibleBusinessIds && accessibleBusinessIds.length > 0) {
          accessibleBusinesses = allBusinesses.filter(business => 
            accessibleBusinessIds.includes(business.id)
          );
        }
        
        return res.json(accessibleBusinesses);
      } else if (userType === 'business_user') {
        // Business users can only fetch their own businesses
        const userBusinesses = await storage.getBusinessesForUser(userId);
        return res.json(userBusinesses);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
    } catch (error: any) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  app.get('/api/businesses/host-clients', authMiddleware, async (req: any, res) => {
    try {
      const userType = req.user?.userType;
      const userId = req.user?.id;
      const accessibleBusinessIds = req.user?.accessibleBusinessIds;

      if (userType === 'sdp_internal') {
        const allBusinesses = await storage.getBusinesses();
        const hostClients = allBusinesses.filter((b: any) => !b.isRegistered);
        let accessible = hostClients;
        if (accessibleBusinessIds && accessibleBusinessIds.length > 0) {
          accessible = hostClients.filter((b: any) => accessibleBusinessIds.includes(b.parentBusinessId));
        }
        return res.json(accessible);
      } else if (userType === 'business_user') {
        const primaryBusiness = await storage.getPrimaryBusinessForUser(userId);
        if (!primaryBusiness) {
          return res.json([]);
        }
        const hostClients = await storage.getHostClientsForBusiness(primaryBusiness.id);
        return res.json(hostClients);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
    } catch (error: any) {
      console.error("Error fetching host clients:", error);
      res.status(500).json({ message: "Failed to fetch host clients" });
    }
  });

  app.post('/api/businesses/host-clients', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const { name, contactEmail, contactName, parentBusinessId } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Host client name is required" });
      }

      let parentId = parentBusinessId;

      if (userType === 'business_user') {
        const primaryBusiness = await storage.getPrimaryBusinessForUser(userId);
        if (!primaryBusiness) {
          return res.status(400).json({ message: "No business found for user" });
        }
        parentId = primaryBusiness.id;
      } else if (userType === 'sdp_internal') {
        if (!parentBusinessId) {
          return res.status(400).json({ message: "parentBusinessId is required for SDP users" });
        }
        const parentBusiness = await storage.getBusinessById(parentBusinessId);
        if (!parentBusiness) {
          return res.status(404).json({ message: "Parent business not found" });
        }
        const accessibleBusinessIds = req.user?.accessibleBusinessIds;
        if (accessibleBusinessIds && accessibleBusinessIds.length > 0 && !accessibleBusinessIds.includes(parentBusinessId)) {
          return res.status(403).json({ message: "You do not have access to this business" });
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      const hostClient = await storage.createHostClient({
        name: name.trim(),
        contactEmail: contactEmail?.trim() || undefined,
        contactName: contactName?.trim() || undefined,
        parentBusinessId: parentId,
        ownerId: userId,
      });

      // If a contact email was supplied, provision a login for the host client and email creds.
      // Failures here must not roll back the host client creation.
      let loginCreated = false;
      if (contactEmail?.trim()) {
        try {
          const cleanedEmail = contactEmail.trim().toLowerCase();
          const existing = await storage.getUserByEmail(cleanedEmail);
          if (!existing) {
            const tempPassword = crypto.randomBytes(8).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
            const passwordHash = await bcrypt.hash(tempPassword, 10);
            const nameParts = (contactName || '').trim().split(/\s+/);
            const firstName = nameParts[0] || hostClient.name;
            const lastName = nameParts.slice(1).join(' ') || '';
            const newUser = await storage.createUser({
              email: cleanedEmail,
              firstName,
              lastName,
              userType: 'business_user',
              accessibleBusinessIds: [hostClient.id],
              passwordHash,
              emailVerified: true,
              isActive: true,
            } as any);
            // Make the new user the owner so getBusinessByOwnerId resolves on login
            try {
              await storage.updateBusiness(hostClient.id, { ownerId: newUser.id } as any);
            } catch (ownerErr: any) {
              console.warn('Could not update host client ownerId to new user:', ownerErr);
            }
            await emailService.sendHostClientCredentialsEmail(cleanedEmail, firstName, hostClient.name, tempPassword);
            loginCreated = true;
          }
        } catch (loginErr: any) {
          console.error('Host client login provisioning failed (host client still created):', loginErr);
        }
      }

      res.status(201).json({ ...hostClient, loginCreated });
    } catch (error: any) {
      console.error("Error creating host client:", error);
      res.status(500).json({ message: "Failed to create host client" });
    }
  });

  app.get('/api/businesses/me', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const business = await storage.getBusinessByOwnerId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      res.json(business);
    } catch (error: any) {
      console.error("Error fetching business:", error);
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  app.patch('/api/businesses/:id/countries', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { countryIds } = req.body;
      
      if (!Array.isArray(countryIds)) {
        return res.status(400).json({ message: "countryIds must be an array" });
      }
      
      await storage.updateBusinessCountryAccess(id, countryIds);
      res.json({ message: "Country access updated successfully" });
    } catch (error: any) {
      console.error("Error updating country access:", error);
      res.status(400).json({ message: "Failed to update country access" });
    }
  });

  // Country routes
  app.get('/api/countries', async (req, res) => {
    try {
      const countries = await storage.getAllCountries();
      res.json(countries);
    } catch (error: any) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  // Worker routes
  app.get('/api/workers', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType === 'worker') {
        // Workers see their own profile
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: "Worker profile not found" });
        }
        res.json([worker]); // Return as array to match expected format
        return;
      }
      
      if (userType === 'sdp_internal') {
        // SDP internal users can see all workers
        const allWorkers = await storage.getAllWorkers();
        res.json(allWorkers);
        return;
      }
      
      const business = await storage.getBusinessByOwnerId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const workers = await storage.getWorkersByBusiness(business.id);
      res.json(workers);
    } catch (error: any) {
      console.error("Error fetching workers:", error);
      res.status(500).json({ message: "Failed to fetch workers" });
    }
  });

  // Get workers by specific business (for SDP internal filtering)
  app.get('/api/workers/business/:businessId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const { businessId } = req.params;
      
      // Only SDP internal users can filter by any business
      if (userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Access denied. SDP internal users only." });
      }
      
      const workers = await storage.getWorkersByBusiness(businessId);
      res.json(workers);
    } catch (error: any) {
      console.error("Error fetching workers by business:", error);
      res.status(500).json({ message: "Failed to fetch workers" });
    }
  });

  // Returns workers provided TO the current business by other businesses (host client scenario)
  app.get('/api/workers/provided', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      if (userType === 'worker' || userType === 'sdp_internal') {
        return res.json([]);
      }

      const business = await storage.getBusinessByOwnerId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const contractsForCustomer = await storage.getContractsByCustomerBusiness(business.id);

      // Group workers by providing business
      const workerMap = new Map<string, any>();
      for (const contract of contractsForCustomer) {
        const workerId = contract.worker.id;
        if (!workerMap.has(workerId)) {
          workerMap.set(workerId, {
            ...contract.worker,
            providedByBusinessId: contract.business.id,
            providedByBusinessName: contract.business.name,
            contractCountry: contract.country.name,
            contractStatus: contract.status,
          });
        }
      }

      res.json(Array.from(workerMap.values()));
    } catch (error: any) {
      console.error("Error fetching provided workers:", error);
      res.status(500).json({ message: "Failed to fetch provided workers" });
    }
  });

  app.post('/api/workers', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const accessibleBusinessIds = req.user?.accessibleBusinessIds;
      
      // Validate onBehalf control fields
      const controlFieldsSchema = z.object({
        onBehalf: z.boolean().optional(),
        selectedBusinessId: z.string().optional().transform(val => val === '' ? undefined : val),
        workerType: z.string(),
        sendInvitation: z.boolean().optional().default(true), // Default to true for backward compatibility
      }).refine((data) => {
        // If onBehalf is true, selectedBusinessId must be provided
        if (data.onBehalf === true && !data.selectedBusinessId) {
          return false;
        }
        return true;
      }, {
        message: "selectedBusinessId is required when onBehalf is true",
      });
      
      const parsedControlFields = controlFieldsSchema.parse(req.body);
      const { workerType, onBehalf, selectedBusinessId, sendInvitation } = parsedControlFields;
      const workerData = { ...req.body };
      delete workerData.workerType;
      delete workerData.onBehalf;
      delete workerData.selectedBusinessId;
      delete workerData.sendInvitation;
      
      let business;
      let targetBusinessId;
      let auditFields: { createdByUserId: any; createdOnBehalfOfBusinessId: string | null } = {
        createdByUserId: userId,
        createdOnBehalfOfBusinessId: null,
      };

      // Handle on-behalf creation for SDP internal users
      if (onBehalf && userType === 'sdp_internal') {
        if (!selectedBusinessId) {
          return res.status(400).json({ message: "Selected business ID is required when creating on behalf" });
        }
        
        const sdpRole = req.user?.sdpRole;
        
        // Super admins and admins have global access, agents must be restricted by accessibleBusinessIds
        if (sdpRole !== 'sdp_super_admin' && sdpRole !== 'sdp_admin') {
          if (!accessibleBusinessIds || !Array.isArray(accessibleBusinessIds) || accessibleBusinessIds.length === 0) {
            return res.status(403).json({ message: "Access denied: No accessible businesses configured for your account" });
          }
          
          if (!accessibleBusinessIds.includes(selectedBusinessId)) {
            return res.status(403).json({ message: "Access denied: You don't have permission to create workers for this business" });
          }
        }
        
        // Get the selected business
        business = await storage.getBusinessById(selectedBusinessId);
        if (!business) {
          return res.status(404).json({ message: "Selected business not found" });
        }
        
        targetBusinessId = business.id;
        auditFields.createdOnBehalfOfBusinessId = business.id;
        
      } else {
        // Standard creation - get business by owner
        business = await storage.getBusinessByOwnerId(userId);
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        targetBusinessId = business.id;
      }
      
      // Check if a worker with this email already exists
      const workerEmail = workerData.email?.trim()?.toLowerCase();
      if (workerEmail) {
        const existingWorker = await storage.getWorkerByEmail(workerEmail);
        if (existingWorker) {
          return res.status(400).json({ message: "A worker with this email already exists" });
        }
      }

      let thirdPartyBusinessId = null;

      // Handle third-party worker creation
      if (workerType === 'third_party_worker') {
        const {
          thirdPartyBusinessName,
          thirdPartyContactPerson,
          thirdPartyEmail,
          thirdPartyPhone,
          thirdPartyCountryId,
          ...cleanWorkerData
        } = workerData;
        
        // Check if third-party business already exists
        let thirdPartyBusiness = await storage.getThirdPartyBusinessByDetails(
          thirdPartyBusinessName,
          thirdPartyEmail,
          targetBusinessId
        );
        
        // Create third-party business if it doesn't exist
        if (!thirdPartyBusiness) {
          thirdPartyBusiness = await storage.createThirdPartyBusiness({
            name: thirdPartyBusinessName,
            contactPerson: thirdPartyContactPerson,
            email: thirdPartyEmail,
            phone: thirdPartyPhone,
            countryId: thirdPartyCountryId,
            employingBusinessId: targetBusinessId,
          });
        }
        
        thirdPartyBusinessId = thirdPartyBusiness.id;
        
        // Update worker data for third-party worker
        const data = insertWorkerSchema.parse({
          ...cleanWorkerData,
          workerType,
          businessId: targetBusinessId,
          thirdPartyBusinessId,
          ...auditFields,
        });
        
        const worker = await storage.createWorker(data);
        
        // Send invitation email to third-party worker contact (only if sendInvitation is true)
        if (sendInvitation) {
          try {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const tokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

            await storage.updateWorkerProfile(worker.id, {
              invitationToken: tokenHash,
              invitationTokenExpiresAt: tokenExpiresAt,
              invitationSent: true,
            });

            await emailService.sendWorkerInvitationEmail(
              thirdPartyBusiness.email,
              worker.firstName,
              rawToken,
              thirdPartyBusiness.name
            );
            console.log(`Third-party worker invitation sent to ${thirdPartyBusiness.email}`);
          } catch (emailError: any) {
            console.error('Failed to send third-party worker invitation:', emailError);
            // Continue anyway - worker was created successfully
          }
        } else {
          console.log(`Worker created without sending invitation (sendInvitation=${sendInvitation})`);
        }
        
        res.json({ worker, thirdPartyBusiness });
      } else {
        // Handle regular employee/contractor creation
        const data = insertWorkerSchema.parse({
          ...workerData,
          workerType,
          businessId: targetBusinessId, // Explicitly override any incoming businessId
          ...auditFields,
        });
        
        const worker = await storage.createWorker(data);

        // Generate invite token and send onboarding link (only if sendInvitation is true)
        if (sendInvitation) {
          try {
            const business = worker.businessId ? await storage.getBusinessById(worker.businessId) : undefined;
            const businessName = business?.name || 'SDP Global Pay';

            // Generate a secure invite token
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const tokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

            // Store hashed token on worker record
            await storage.updateWorkerProfile(worker.id, {
              invitationToken: tokenHash,
              invitationTokenExpiresAt: tokenExpiresAt,
              invitationSent: true,
            });

            // Send invite email with signup link containing the raw token
            await emailService.sendWorkerInvitationEmail(
              worker.email,
              worker.firstName,
              rawToken,
              businessName
            );
            console.log(`Worker invitation email sent to ${worker.email}`);
          } catch (emailError: any) {
            console.error('Failed to send worker invitation email:', emailError);
            // Continue anyway - worker was created successfully
          }
        } else {
          console.log(`Worker created without sending invitation (sendInvitation=${sendInvitation})`);
        }

        res.json({ worker });
      }
    } catch (error: any) {
      console.error("Error creating worker:", error);
      
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({ 
          message: "Validation error", 
          details: errorMessages
        });
      }
      
      // Handle database constraint errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '23505') {
          return res.status(400).json({ message: "A worker with this email already exists" });
        }
        if (error.code === '23503') {
          return res.status(400).json({ message: "Invalid business or country reference" });
        }
        if (error.code === '23502') {
          return res.status(400).json({ message: "Missing required fields. Please fill in all required information." });
        }
      }
      
      res.status(400).json({ message: "Failed to create worker. Please check your information and try again." });
    }
  });

  // Worker profile routes
  app.get('/api/workers/profile', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Only workers can access this endpoint
      if (userType !== 'worker') {
        return res.status(403).json({ message: "Access denied - workers only" });
      }
      
      const worker = await storage.getWorkerByUserId(userId);
      if (!worker) {
        return res.status(404).json({ message: "Worker profile not found" });
      }
      
      res.json(worker);
    } catch (error: any) {
      console.error('Error fetching worker profile:', error);
      res.status(500).json({ message: 'Failed to fetch worker profile' });
    }
  });

  app.patch('/api/workers/profile', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      // Only workers can access this endpoint
      if (userType !== 'worker') {
        return res.status(403).json({ message: "Access denied - workers only" });
      }

      const worker = await storage.getWorkerByUserId(userId);
      if (!worker) {
        return res.status(404).json({ message: "Worker profile not found" });
      }

      // Convert dateOfBirth string to Date object if present
      const updates = { ...req.body };
      if (updates.dateOfBirth && typeof updates.dateOfBirth === 'string') {
        updates.dateOfBirth = new Date(updates.dateOfBirth);
      }

      // Auto-derive completion flags from the merged record
      const merged: any = { ...worker, ...updates };
      const nonEmpty = (v: any) => v !== null && v !== undefined && String(v).trim() !== '';

      if (nonEmpty(merged.firstName) && nonEmpty(merged.lastName) && nonEmpty(merged.email)
          && nonEmpty(merged.phoneNumber) && nonEmpty(merged.dateOfBirth)
          && nonEmpty(merged.streetAddress) && nonEmpty(merged.suburb)
          && nonEmpty(merged.state) && nonEmpty(merged.postcode)) {
        updates.personalDetailsCompleted = true;
      }

      if (nonEmpty(merged.accountName) && nonEmpty(merged.bankName) && nonEmpty(merged.accountNumber)) {
        updates.bankDetailsCompleted = true;
      }

      if (merged.workerType === 'contractor' && nonEmpty(merged.businessStructure)) {
        updates.businessDetailsCompleted = true;
      }

      const updatedWorker = await storage.updateWorkerProfile(worker.id, updates);
      res.json(updatedWorker);
    } catch (error: any) {
      console.error('Error updating worker profile:', error);
      res.status(500).json({ message: 'Failed to update worker profile' });
    }
  });

  // Admin endpoint to update any worker by ID
  app.patch('/api/workers/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const { id: workerId } = req.params;
      
      const worker = await storage.getWorkerById(workerId);
      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }
      
      // Convert dateOfBirth string to Date object if present
      const updates = { ...req.body };
      if (updates.dateOfBirth && typeof updates.dateOfBirth === 'string') {
        updates.dateOfBirth = new Date(updates.dateOfBirth);
      }
      
      // Allow SDP internal users or business owner to update worker
      if (userType === 'sdp_internal') {
        // SDP internal can update any worker
        const updatedWorker = await storage.updateWorkerProfile(workerId, updates);
        res.json(updatedWorker);
      } else {
        // Business owners can only update their own workers
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        if (worker.businessId !== business.id) {
          return res.status(403).json({ message: "Access denied - can only update your own workers" });
        }
        
        const updatedWorker = await storage.updateWorkerProfile(workerId, updates);
        res.json(updatedWorker);
      }
    } catch (error: any) {
      console.error('Error updating worker:', error);
      res.status(500).json({ message: 'Failed to update worker' });
    }
  });

  // Resend worker invitation email
  app.post('/api/workers/:id/resend-invitation', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const { id: workerId } = req.params;
      
      const worker = await storage.getWorkerById(workerId);
      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }
      
      // Allow SDP internal users or business owner to resend invitation
      if (userType !== 'sdp_internal') {
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        if (worker.businessId !== business.id) {
          return res.status(403).json({ message: "Access denied - can only resend invitations for your own workers" });
        }
      }
      
      // Resend the appropriate invitation email based on worker type
      try {
        const business = worker.businessId ? await storage.getBusinessById(worker.businessId) : undefined;
        const businessName = business?.name || 'SDP Global Pay';
        const workerName = `${worker.firstName} ${worker.lastName}`;
        
        if (worker.workerType === 'contractor') {
          await emailService.sendContractorRegistrationConfirmation(
            worker.email,
            worker.firstName,
            worker.lastName,
            worker.phoneNumber || undefined
          );
          console.log(`Contractor invitation email resent to ${worker.email}`);
        } else if (worker.workerType === 'third_party_worker') {
          // For third-party workers, send to the third-party business contact
          const thirdPartyBusiness = await storage.getThirdPartyBusinessById(worker.thirdPartyBusinessId!);
          if (thirdPartyBusiness) {
            await emailService.sendBusinessUserInvite(
              thirdPartyBusiness.email,
              'generated-invite-token',
              req.user.name || 'SDP Global Pay',
              thirdPartyBusiness.name
            );
            console.log(`Third-party business invitation resent to ${thirdPartyBusiness.email}`);
          }
        } else {
          // For employees, send the welcome email
          await emailService.sendWelcomeEmail(
            worker.email,
            workerName,
            businessName
          );
          console.log(`Welcome email resent to ${worker.email}`);
        }
        
        // Update worker to mark invitation as sent
        await storage.updateWorkerProfile(worker.id, { invitationSent: true });
        
        res.json({ 
          message: "Invitation email sent successfully",
          worker 
        });
      } catch (emailError: any) {
        console.error('Failed to resend invitation email:', emailError);
        res.status(500).json({ message: "Failed to send invitation email" });
      }
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      res.status(500).json({ message: 'Failed to resend invitation' });
    }
  });

  // Contract routes
  app.get('/api/contracts', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
   
      
      if (userType === 'worker') {
        // Workers see their own contracts
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: "Worker profile not found" });
        }
        const contracts = await storage.getContractsByWorker(worker.id);
  
        const contractsWithStatus = await addDerivedStatusToContracts(contracts);
        const contractsWithRemuneration = await addRemunerationLinesToContracts(contractsWithStatus, userType);
        res.json(contractsWithRemuneration);
        return;
      }
      
      if (userType === 'sdp_internal') {
        // SDP internal users can see all contracts including billing lines
        const allContracts = await storage.getAllContracts();
        const contractsWithStatus = await addDerivedStatusToContracts(allContracts);
        const contractsWithRemuneration = await addRemunerationLinesToContracts(contractsWithStatus, userType);
        const contractsWithBillingLines = await addBillingLinesToContracts(contractsWithRemuneration);
        res.json(contractsWithBillingLines);
        return;
      }
      
      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Contracts where this business is the employing business
      const ownContracts = await storage.getContractsByBusiness(business.id);
      // Contracts where this business is the host client (read-only view)
      const hostClientContracts = await storage.getContractsByCustomerBusiness(business.id);
      // Tag host-client contracts so the frontend can render them read-only
      const hostClientTagged = hostClientContracts.map((c: any) => ({ ...c, viewerRole: 'host_client', readOnly: true }));
      const ownTagged = ownContracts.map((c: any) => ({ ...c, viewerRole: 'employing_business', readOnly: false }));

      // Merge, dedupe by id (in case a business is both employing and host client somehow)
      const seen = new Set<string>();
      const merged = [...ownTagged, ...hostClientTagged].filter((c: any) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      const contractsWithStatus = await addDerivedStatusToContracts(merged);
      const contractsWithRemuneration = await addRemunerationLinesToContracts(contractsWithStatus, userType);

      // Enrich with customer business name for contracts with a host client
      const enriched = await Promise.all(
        contractsWithRemuneration.map(async (c: any) => {
          if (c.customerBusinessId) {
            const customerBusiness = await storage.getBusinessById(c.customerBusinessId);
            return { ...c, customerBusiness: customerBusiness || null };
          }
          return c;
        })
      );

      res.json(enriched);
    } catch (error: any) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Get contracts by specific business (for SDP internal filtering)
  app.get('/api/contracts/business/:businessId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const { businessId } = req.params;
      
      // Only SDP internal users can filter by any business
      if (userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Access denied. SDP internal users only." });
      }
      
      const contracts = await storage.getContractsByBusiness(businessId);
      const contractsWithStatus = await addDerivedStatusToContracts(contracts);
      const contractsWithRemuneration = await addRemunerationLinesToContracts(contractsWithStatus, userType);
      const contractsWithBillingLines = await addBillingLinesToContracts(contractsWithRemuneration);
      res.json(contractsWithBillingLines);
    } catch (error: any) {
      console.error("Error fetching contracts by business:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Get contracts by specific worker (for SDP/Business users creating timesheets on behalf)
  app.get('/api/contracts/worker/:workerId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const accessibleBusinessIds = req.user?.accessibleBusinessIds;
      const { workerId } = req.params;
      
      // Get all contracts for the worker
      let contracts = await storage.getContractsByWorker(workerId);
      
      // Filter based on user type and access
      if (userType === 'business_user') {
        // Business users can only see contracts for workers in their business
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        contracts = contracts.filter(contract => contract.businessId === business.id);
      } else if (userType === 'sdp_internal') {
        // SDP agents can only see contracts for their accessible businesses; admins see all
        const sdpRole = req.user?.sdpRole;
        if (sdpRole !== 'sdp_super_admin' && sdpRole !== 'sdp_admin') {
          if (!accessibleBusinessIds || !Array.isArray(accessibleBusinessIds) || accessibleBusinessIds.length === 0) {
            return res.json([]);
          }
          contracts = contracts.filter(contract => accessibleBusinessIds.includes(contract.businessId));
        }
      } else if (userType === 'worker') {
        // Workers can only see their own contracts
        return res.status(403).json({ message: "Access denied" });
      }
      
      const contractsWithStatus = await addDerivedStatusToContracts(contracts);
      const contractsWithRemuneration = await addRemunerationLinesToContracts(contractsWithStatus, userType);
      res.json(contractsWithRemuneration);
    } catch (error: any) {
      console.error("Error fetching contracts by worker:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post('/api/contracts', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const accessibleBusinessIds = req.user?.accessibleBusinessIds;
      
      // Validate onBehalf control fields
      const controlFieldsSchema = z.object({
        onBehalf: z.boolean().optional(),
        selectedBusinessId: z.string().min(1).optional(), // Business IDs are not UUIDs in this system
        workerId: z.string(),
      }).refine((data) => {
        // If onBehalf is true, selectedBusinessId must be provided
        if (data.onBehalf === true && !data.selectedBusinessId) {
          return false;
        }
        return true;
      }, {
        message: "selectedBusinessId is required when onBehalf is true",
      });
      
      const parsedControlFields = controlFieldsSchema.parse(req.body);
      const { onBehalf, selectedBusinessId, workerId } = parsedControlFields;
      const contractData = { ...req.body };
      delete contractData.onBehalf;
      delete contractData.selectedBusinessId;
      
      let business;
      let targetBusinessId;
      let auditFields: { createdByUserId: any; createdOnBehalfOfBusinessId: string | null } = {
        createdByUserId: userId,
        createdOnBehalfOfBusinessId: null,
      };

      // Handle on-behalf creation for SDP internal users
      if (onBehalf && userType === 'sdp_internal') {
        if (!selectedBusinessId) {
          return res.status(400).json({ message: "Selected business ID is required when creating on behalf" });
        }
        
        const sdpRole = req.user?.sdpRole;
        
        // Super admins and admins have global access, agents must be restricted by accessibleBusinessIds
        if (sdpRole !== 'sdp_super_admin' && sdpRole !== 'sdp_admin') {
          if (!accessibleBusinessIds || !Array.isArray(accessibleBusinessIds) || accessibleBusinessIds.length === 0) {
            return res.status(403).json({ message: "Access denied: No accessible businesses configured for your account" });
          }
          
          if (!accessibleBusinessIds.includes(selectedBusinessId)) {
            return res.status(403).json({ message: "Access denied: You don't have permission to create contracts for this business" });
          }
        }
        
        // Get the selected business
        business = await storage.getBusinessById(selectedBusinessId);
        if (!business) {
          return res.status(404).json({ message: "Selected business not found" });
        }
        
        // CRITICAL: Verify worker belongs to the target business (prevent cross-tenant linkage)
        if (!workerId) {
          return res.status(400).json({ message: "Worker ID is required" });
        }
        
        const worker = await storage.getWorkerById(workerId);
        if (!worker) {
          return res.status(404).json({ message: "Worker not found" });
        }
        
        if (worker.businessId !== selectedBusinessId) {
          return res.status(403).json({ message: "Access denied: Worker does not belong to the selected business" });
        }
        
        targetBusinessId = business.id;
        auditFields.createdOnBehalfOfBusinessId = business.id;
        
      } else if (userType === 'sdp_internal') {
        // Standard SDP internal creation - determine business from the selected worker
        if (!workerId) {
          return res.status(400).json({ message: "Worker ID is required" });
        }
        
        const worker = await storage.getWorkerById(workerId);
        if (!worker) {
          return res.status(404).json({ message: "Worker not found" });
        }
        
        business = worker.businessId ? await storage.getBusinessById(worker.businessId) : undefined;
        if (!business) {
          return res.status(404).json({ message: "Worker's business not found" });
        }
        targetBusinessId = business.id;
        
      } else {
        // For regular business users, get their own business
        business = await storage.getBusinessByOwnerId(userId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        // CRITICAL: Verify worker belongs to the user's business (prevent cross-tenant linkage)
        if (!workerId) {
          return res.status(400).json({ message: "Worker ID is required" });
        }
        
        const worker = await storage.getWorkerById(workerId);
        if (!worker) {
          return res.status(404).json({ message: "Worker not found" });
        }
        
        if (worker.businessId !== business.id) {
          return res.status(403).json({ message: "Access denied: Worker does not belong to your business" });
        }
        
        targetBusinessId = business.id;
      }
      
      // Parse contract data without audit fields (they're omitted from schema)
      const parseResult = insertContractSchema.safeParse({
        ...contractData,
        businessId: targetBusinessId, // Explicitly override any incoming businessId
      });
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return res.status(400).json({ message: firstError?.message || 'Invalid contract data', errors: parseResult.error.errors });
      }
      const data = parseResult.data;
      
      // Add audit fields after parsing (since they're omitted from insertContractSchema)
      const finalContractData = {
        ...data,
        ...auditFields,
      };
      
      // Validate customer billing fields for all client-work billing modes
      const billingMode = (finalContractData as any).billingMode;
      const requiresClientBilling = finalContractData.isForClient &&
        (billingMode === 'invoice_through_platform' || billingMode === 'invoice_separately' || billingMode === 'auto_invoice' || finalContractData.invoiceCustomer);

      if (requiresClientBilling) {
        if (!finalContractData.customerBusinessId) {
          return res.status(400).json({ message: "Host client (customer business) is required for client work contracts" });
        }
        const clientBillingType = (finalContractData as any).clientBillingType || 'rate_based';
        if (clientBillingType !== 'fixed_price' && !finalContractData.customerBillingRate) {
          return res.status(400).json({ message: "Customer billing rate is required for rate-based client billing" });
        }
        if (!finalContractData.customerCurrency) {
          return res.status(400).json({ message: "Customer currency is required for client work contracts" });
        }
        if (!finalContractData.invoicingFrequency) {
          return res.status(400).json({ message: "Invoicing frequency is required for client work contracts" });
        }
        if (!finalContractData.paymentTerms) {
          return res.status(400).json({ message: "Payment terms are required for client work contracts" });
        }
      }
      
      // If a custom role title is provided, create it as a reusable role title
      if (finalContractData.customRoleTitle && !finalContractData.roleTitleId) {
        try {
          const existingRole = await storage.getRoleTitleByName(finalContractData.customRoleTitle, targetBusinessId);
          if (!existingRole) {
            const newRoleTitle = await storage.createRoleTitle({
              title: finalContractData.customRoleTitle,
              description: finalContractData.jobDescription || '',
              businessId: targetBusinessId,
              applicableCountries: [finalContractData.countryId]
            });
            // Update the contract data to reference the newly created role title
            finalContractData.roleTitleId = newRoleTitle.id;
            finalContractData.customRoleTitle = null;
          } else {
            // Use the existing role title
            finalContractData.roleTitleId = existingRole.id;
            finalContractData.customRoleTitle = null;
          }
        } catch (roleError: any) {
          console.log("Could not create role title, proceeding with custom title:", roleError);
          // Continue with custom role title if creation fails
        }
      }
      
      const contract = await storage.createContract(finalContractData as any);

      // Handle remuneration lines if provided
      const remunerationLines = req.body.remunerationLines;
      if (remunerationLines && Array.isArray(remunerationLines) && remunerationLines.length > 0) {
        try {
          // Filter out lines with empty amounts and validate
          const validLines = remunerationLines
            .filter((line: any) => line.amount !== '' && line.amount !== null && line.amount !== undefined && !isNaN(Number(line.amount)))
            .map((line: any) => ({
              ...line,
              amount: String(line.amount),
              contractId: contract.id,
            }));
          if (validLines.length > 0) {
            await storage.createRemunerationLines(validLines);
          }
        } catch (remunError: any) {
          console.error('Failed to create remuneration lines:', remunError);
        }
      }

      // Send email notification to SDP users if contract requires review
      if (contract.status === 'pending_sdp_review') {
        try {
          // Get contract details for email
          const worker = await storage.getWorkerById(contract.workerId);
          const roleTitle = contract.roleTitleId 
            ? await storage.getRoleTitle(contract.roleTitleId)
            : null;
          const requestorUser = await storage.getUser(userId);
          
          const contractTypeDisplay = contract.employmentType
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
          
          const roleName = roleTitle?.title || contract.customRoleTitle || 'Unknown Role';
          const requestorName = requestorUser 
            ? `${requestorUser.firstName} ${requestorUser.lastName}`
            : 'Unknown User';

          // Get all SDP internal users to notify
          const sdpUsers = await storage.getUsersByType('sdp_internal');
          
          // Send email notification to all SDP users
          for (const sdpUser of sdpUsers) {
            if (sdpUser.email && emailService && worker) {
              await emailService.sendContractRequestEmail(
                sdpUser.email,
                business.name,
                `${worker.firstName} ${worker.lastName}`,
                contractTypeDisplay,
                roleName,
                requestorName
              );
            }
          }
        } catch (emailError: any) {
          console.error('Failed to send contract request notification email:', emailError);
          // Don't fail the contract creation if email fails
        }
      }

      // Send salary contract notification to SDP when a business user creates a salary contract
      if (contract.rateType === 'annual' && userType !== 'sdp_internal') {
        try {
          const notifyWorker = await storage.getWorkerById(contract.workerId);
          if (notifyWorker && emailService) {
            await emailService.sendSalaryContractNotification(contract, business, notifyWorker);
          }
        } catch (salaryEmailError: any) {
          console.error('Failed to send salary contract notification email:', salaryEmailError);
        }
      }

      res.json(contract);
    } catch (error: any) {
      console.error("Error creating contract:", error);
      console.error("Error details:", { message: error?.message, code: error?.code, detail: error?.detail, stack: error?.stack });

      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({
          message: "Validation error",
          details: errorMessages
        });
      }

      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '23505') {
          return res.status(400).json({ message: "A contract with these details already exists" });
        }
        if (error.code === '23503') {
          return res.status(400).json({ message: "Invalid reference: Please check the worker, business, country, or template selection", details: error?.detail });
        }
        if (error.code === '23502') {
          return res.status(400).json({ message: "Missing required fields. Please fill in all required contract information.", details: error?.detail });
        }
      }

      res.status(400).json({
        message: "Failed to create contract. Please check your information and try again.",
        details: error?.message || String(error),
      });
    }
  });

  app.put('/api/contracts/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Get the existing contract to verify ownership
      const existingContract = await storage.getContract(id);
      if (!existingContract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Check permissions
      if (userType !== 'sdp_internal') {
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business || existingContract.businessId !== business.id) {
          return res.status(403).json({ message: "Unauthorized to update this contract" });
        }
      }
      
      // Extract contractDocument before schema parsing (it's omitted from insertContractSchema)
      const { contractDocument, ...bodyWithoutDoc } = req.body;


      // If only contractDocument is being updated, skip full schema validation
      if (contractDocument !== undefined && Object.keys(bodyWithoutDoc).length === 0) {
        const updatedContract = await storage.updateContract(id, { contractDocument } as any);
        return res.json(updatedContract);
      }

      const data = insertContractSchema.parse({
        ...bodyWithoutDoc,
        businessId: existingContract.businessId, // Keep original business ID
      });

      // If contractDocument is provided alongside other fields, include it in the update
      const updateData = contractDocument !== undefined
        ? { ...data, contractDocument }
        : data;

      const updatedContract = await storage.updateContract(id, updateData as any);

      // Handle remuneration lines if provided
      const remunerationLines = req.body.remunerationLines;
      if (remunerationLines !== undefined) {
        try {
          await storage.deleteRemunerationLinesByContractId(id);
          if (Array.isArray(remunerationLines) && remunerationLines.length > 0) {
            const linesWithContractId: InsertRemunerationLineType[] = remunerationLines.map(line => ({
              ...line,
              contractId: id,
            }));
            await storage.createRemunerationLines(linesWithContractId);
          }
        } catch (remunError: any) {
          console.error('Failed to update remuneration lines:', remunError);
        }
      }
      
      res.json(updatedContract);
    } catch (error: any) {
      console.error("Error updating contract:", error?.message || String(error));

      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({ 
          message: "Validation error", 
          details: errorMessages
        });
      }
      
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '23505') {
          return res.status(400).json({ message: "A contract with these details already exists" });
        }
        if (error.code === '23503') {
          return res.status(400).json({ message: "Invalid reference: Please check the worker, business, country, or template selection" });
        }
        if (error.code === '23502') {
          return res.status(400).json({ message: "Missing required fields. Please fill in all required contract information." });
        }
      }
      
      res.status(400).json({ message: "Failed to update contract. Please check your information and try again." });
    }
  });

  app.patch('/api/contracts/:id/status', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      await storage.updateContractStatus(id, status);
      res.json({ message: "Contract status updated successfully" });
    } catch (error: any) {
      console.error("Error updating contract status:", error);
      res.status(400).json({ message: "Failed to update contract status" });
    }
  });

  // Get contract for signing (by token) - requires authentication
  app.get('/api/contracts/sign/:token', authMiddleware, async (req: any, res) => {
    try {
      const { token } = req.params;
      const contract = await storage.getContractBySigningToken(token);

      if (!contract) {
        return res.status(404).json({ message: "Contract not found or link expired" });
      }

      // Enrich response with worker, business, country and role title so the signing page can display them
      const [worker, business, roleTitle] = await Promise.all([
        storage.getWorkerById(contract.workerId),
        storage.getBusinessById(contract.businessId),
        contract.roleTitleId ? storage.getRoleTitle(contract.roleTitleId) : Promise.resolve(null),
      ]);

      res.json({
        ...contract,
        worker: worker ? { id: worker.id, firstName: worker.firstName, lastName: worker.lastName, email: worker.email } : null,
        business: business ? { id: business.id, name: business.name } : null,
        roleTitle: roleTitle ? { id: roleTitle.id, title: roleTitle.title } : null,
      });
    } catch (error: any) {
      console.error("Error fetching contract for signing:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  // Record contract view - requires authentication
  app.post('/api/contracts/:id/viewed', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      
      // Get location from IP (simplified for now)
      const location = {
        ip: ipAddress,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      };

      await storage.recordContractView(id, {
        ipAddress: ipAddress as string,
        location: JSON.stringify(location),
        userAgent: userAgent as string
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error recording contract view:", error);
      res.status(500).json({ message: "Failed to record view" });
    }
  });

  // Sign contract - requires authentication
  app.post('/api/contracts/:id/sign', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { signature, token } = req.body;
      
      if (!signature?.trim()) {
        return res.status(400).json({ message: "Signature is required" });
      }

      // Verify the token
      const contract = await storage.getContractBySigningToken(token);
      if (!contract || contract.id !== id) {
        return res.status(400).json({ message: "Invalid signing token" });
      }

      if (contract.signedAt) {
        return res.status(400).json({ message: "Contract already signed" });
      }

      const ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      
      // Get location from IP (simplified for now)
      const location = {
        ip: ipAddress,
        userAgent: userAgent,
        timestamp: new Date().toISOString(),
        city: "Unknown", // Would normally use IP geolocation service
        country: "Unknown"
      };

      await storage.signContract(id, {
        signature: signature.trim(),
        ipAddress: ipAddress as string,
        location: JSON.stringify(location),
        userAgent: userAgent as string
      });
      
      // Send confirmation email (you can implement this later)
      // await sendContractSignedEmail(contract);
      
      res.json({ success: true, message: "Contract signed successfully" });
    } catch (error: any) {
      console.error("Error signing contract:", error);
      res.status(500).json({ message: "Failed to sign contract" });
    }
  });

  // Get pending signature requests for the current user
  app.get('/api/contracts/pending-signatures', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType !== 'worker') {
        return res.json([]); // Only workers have contracts to sign
      }

      const pendingContracts = await storage.getPendingSignatureContracts(userId);
      res.json(pendingContracts);
    } catch (error: any) {
      console.error("Error fetching pending signature contracts:", error);
      res.status(500).json({ message: "Failed to fetch pending contracts" });
    }
  });

  // Send contract for signing via email
  app.post('/api/contracts/:id/send-for-signing', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const contract = await storage.getContract(id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check permissions
      const userType = req.user?.userType;
      if (userType !== 'sdp_internal') {
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business || contract.businessId !== business.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      // Generate signing token
      const signingToken = generateSigningToken();
      
      // Update contract with signing token and sent timestamp
      await storage.updateContractSigningInfo(id, {
        signingToken,
        emailSentAt: new Date()
      });

      // Build signing link using FRONTEND_URL for correct domain
      const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
      const signingLink = `${frontendUrl}/sign/${signingToken}`;

      // Get worker and business details for the email
      const worker = await storage.getWorkerById(contract.workerId);
      const business = await storage.getBusinessById(contract.businessId);

      if (worker?.email) {
        const workerName = `${worker.firstName || ''} ${worker.lastName || ''}`.trim();
        const businessName = business?.name || 'Unknown Business';
        const contractType = (contract.employmentType || '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

        await emailService.sendContractSigningEmail(
          worker.email,
          workerName,
          businessName,
          contractType,
          signingLink
        );
      }

      res.json({
        success: true,
        message: "Contract sent for signing",
      });
    } catch (error: any) {
      console.error("Error sending contract for signing:", error);
      res.status(500).json({ message: "Failed to send contract" });
    }
  });

  // Contract Rate Lines routes
  app.get('/api/contracts/:id/rate-lines', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      const lines = await storage.getContractRateLines(id);
      res.json(lines);
    } catch (error: any) {
      console.error("Error fetching contract rate lines:", error);
      res.status(500).json({ message: "Failed to fetch rate lines" });
    }
  });

  app.post('/api/contracts/:id/rate-lines', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      const line = await storage.createContractRateLine({ ...req.body, contractId: id });
      res.status(201).json(line);
    } catch (error: any) {
      console.error("Error creating contract rate line:", error);
      res.status(500).json({ message: "Failed to create rate line" });
    }
  });

  app.post('/api/contracts/:id/rate-lines/replace', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      const emptyToNull = (v: any) => (v === '' || v === undefined ? null : v);
      const lines = (req.body.lines || [])
        .filter((l: any) => l && l.projectName && l.rate !== '' && l.rate != null)
        .map((l: any, i: number) => ({
          ...l,
          contractId: id,
          sortOrder: i,
          rate: String(l.rate),
          clientRate: emptyToNull(l.clientRate),
          projectCode: emptyToNull(l.projectCode),
          startDate: l.startDate ? new Date(l.startDate) : null,
          endDate: l.endDate ? new Date(l.endDate) : null,
          notes: emptyToNull(l.notes),
        }));
      const saved = await storage.replaceContractRateLines(id, lines);
      res.json(saved);
    } catch (error: any) {
      console.error("Error replacing contract rate lines:", error);
      res.status(500).json({ message: "Failed to replace rate lines" });
    }
  });

  app.patch('/api/contracts/:id/rate-lines/:lineId', authMiddleware, async (req: any, res) => {
    try {
      const { lineId } = req.params;
      const line = await storage.updateContractRateLine(lineId, req.body);
      res.json(line);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update rate line" });
    }
  });

  app.delete('/api/contracts/:id/rate-lines/:lineId', authMiddleware, async (req: any, res) => {
    try {
      const { lineId } = req.params;
      await storage.deleteContractRateLine(lineId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete rate line" });
    }
  });

  // Contract Billing Lines — SDP internal only
  const sdpOnlyMiddleware = (req: any, res: any, next: any) => {
    const userType = req.user?.userType;
    const sdpRole = req.user?.sdpRole;
    if (userType !== 'sdp_internal' || (sdpRole !== 'sdp_super_admin' && sdpRole !== 'sdp_admin' && sdpRole !== 'sdp_agent')) {
      return res.status(403).json({ message: "Access denied. SDP internal users only." });
    }
    next();
  };

  app.get('/api/contracts/:id/billing-lines', authMiddleware, sdpOnlyMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      const lines = await storage.getContractBillingLines(id);
      res.json(lines);
    } catch (error: any) {
      console.error("Error fetching contract billing lines:", error);
      res.status(500).json({ message: "Failed to fetch billing lines" });
    }
  });

  app.post('/api/contracts/:id/billing-lines', authMiddleware, sdpOnlyMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });

      const { description, lineType, rate, amount, currency, frequency, isActive, sortOrder, notes } = req.body;
      if (!description || !description.trim()) {
        return res.status(400).json({ message: "Description is required" });
      }
      if (!lineType) {
        return res.status(400).json({ message: "Line type is required" });
      }

      const line = await storage.createContractBillingLine({
        contractId: id,
        description: description.trim(),
        lineType,
        rate: (rate !== '' && rate !== null && rate !== undefined) ? String(rate) : null,
        amount: (amount !== '' && amount !== null && amount !== undefined) ? String(amount) : null,
        currency: currency || contract.currency,
        frequency: frequency || 'per_timesheet_period',
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
        notes: notes || null,
      });
      res.status(201).json(line);
    } catch (error: any) {
      console.error("Error creating contract billing line:", error);
      res.status(500).json({ message: "Failed to create billing line" });
    }
  });

  app.put('/api/contracts/:id/billing-lines', authMiddleware, sdpOnlyMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      const lines = (req.body.lines || []).map((l: any, i: number) => ({ ...l, contractId: id, sortOrder: i }));
      const saved = await storage.replaceContractBillingLines(id, lines);
      res.json(saved);
    } catch (error: any) {
      console.error("Error replacing contract billing lines:", error);
      res.status(500).json({ message: "Failed to replace billing lines" });
    }
  });

  app.patch('/api/contracts/:id/billing-lines/:lineId', authMiddleware, sdpOnlyMiddleware, async (req: any, res) => {
    try {
      const { lineId } = req.params;
      const { id, contractId, createdAt, updatedAt, ...updates } = req.body;
      const line = await storage.updateContractBillingLine(lineId, updates);
      res.json(line);
    } catch (error: any) {
      console.error("Error updating billing line:", error);
      res.status(500).json({ message: "Failed to update billing line" });
    }
  });

  app.delete('/api/contracts/:id/billing-lines/:lineId', authMiddleware, sdpOnlyMiddleware, async (req: any, res) => {
    try {
      const { lineId } = req.params;
      await storage.deleteContractBillingLine(lineId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete billing line" });
    }
  });

  // Remuneration Lines — SDP internal management (individual CRUD)
  app.get('/api/contracts/:id/remuneration-lines', authMiddleware, sdpOnlyMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const lines = await storage.getRemunerationLinesByContractId(id);
      res.json(lines);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch remuneration lines" });
    }
  });

  app.post('/api/contracts/:id/remuneration-lines', authMiddleware, sdpOnlyMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      const line = await storage.createRemunerationLine({ ...req.body, contractId: id });
      res.json(line);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create remuneration line" });
    }
  });

  app.patch('/api/contracts/:id/remuneration-lines/:lineId', authMiddleware, sdpOnlyMiddleware, async (req: any, res) => {
    try {
      const { lineId } = req.params;
      const line = await storage.updateRemunerationLine(lineId, req.body);
      res.json(line);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update remuneration line" });
    }
  });

  app.delete('/api/contracts/:id/remuneration-lines/:lineId', authMiddleware, sdpOnlyMiddleware, async (req: any, res) => {
    try {
      const { lineId } = req.params;
      await storage.deleteRemunerationLine(lineId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete remuneration line" });
    }
  });

  // Contract Recall route
  app.post('/api/contracts/:id/recall', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;

      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });

      // Permission check
      if (userType !== 'sdp_internal') {
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business || contract.businessId !== business.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      // Find active contract instances and expire them
      const allInstances = await storage.getContractInstances();
      const activeInstances = allInstances.filter((ci: any) => ci.contractId === id && !['expired', 'cancelled'].includes(ci.signatureStatus));
      for (const ci of activeInstances) {
        await storage.updateContractInstanceStatus(ci.id, { signatureStatus: 'expired' });
      }

      // Reset contract status to ready_to_issue
      await storage.updateContractStatus(id, 'ready_to_issue');

      const updated = await storage.getContract(id);
      res.json(updated);
    } catch (error: any) {
      console.error("Error recalling contract:", error);
      res.status(500).json({ message: "Failed to recall contract" });
    }
  });

  // Purchase Orders routes
  app.get('/api/purchase-orders', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const { contractId, businessId: queryBusinessId } = req.query;

      if (contractId) {
        const pos = await storage.getPurchaseOrdersByContract(contractId as string);
        return res.json(pos);
      }

      if (userType === 'sdp_internal') {
        if (queryBusinessId) {
          const pos = await storage.getPurchaseOrdersForBusiness(queryBusinessId as string);
          return res.json(pos);
        }
        const pos = await storage.getAllPurchaseOrders();
        return res.json(pos);
      }

      const business = await storage.getBusinessByOwnerId(userId);
      if (!business) return res.json([]);
      const pos = await storage.getPurchaseOrdersForBusiness(business.id);
      res.json(pos);
    } catch (error: any) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.post('/api/purchase-orders', authMiddleware, async (req: any, res) => {
    try {
      const po = await storage.createPurchaseOrder(req.body);
      res.status(201).json(po);
    } catch (error: any) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.patch('/api/purchase-orders/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const po = await storage.updatePurchaseOrder(id, req.body);
      res.json(po);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  app.delete('/api/purchase-orders/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePurchaseOrder(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  // Role title routes
  app.get('/api/role-titles', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType === 'worker') {
        // Workers can see all available role titles for their profile
        const roleTitles = await storage.getAllRoleTitles();
        res.json(roleTitles);
        return;
      }
      
      if (userType === 'sdp_internal') {
        // SDP internal users can see all role titles
        const roleTitles = await storage.getAllRoleTitles();
        res.json(roleTitles);
        return;
      }
      
      const business = await storage.getBusinessByOwnerId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const [businessRoles, globalRoles] = await Promise.all([
        storage.getRoleTitlesByBusiness(business.id),
        storage.getGlobalRoleTitles(),
      ]);
      
      res.json([...globalRoles, ...businessRoles]);
    } catch (error: any) {
      console.error("Error fetching role titles:", error);
      res.status(500).json({ message: "Failed to fetch role titles" });
    }
  });

  app.post('/api/role-titles', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const business = await storage.getBusinessByOwnerId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const data = insertRoleTitleSchema.parse({
        ...req.body,
        businessId: business.id,
      });
      
      const roleTitle = await storage.createRoleTitle(data);
      res.json(roleTitle);
    } catch (error: any) {
      console.error("Error creating role title:", error);
      res.status(400).json({ message: "Failed to create role title" });
    }
  });

  // Contract template routes (admin only for now)
  app.get('/api/contract-templates', async (req, res) => {
    try {
      const templates = await storage.getContractTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching contract templates:", error);
      res.status(500).json({ message: "Failed to fetch contract templates" });
    }
  });

  app.post('/api/contract-templates', async (req, res) => {
    try {
      const data = insertContractTemplateSchema.parse(req.body);
      const template = await storage.createContractTemplate(data);
      res.json(template);
    } catch (error: any) {
      console.error("Error creating contract template:", error);
      res.status(400).json({ message: "Failed to create contract template" });
    }
  });

  // Timesheet routes
  app.get('/api/timesheets', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType === 'worker') {
        // Workers see their own timesheets
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: "Worker profile not found" });
        }
        const timesheets = await storage.getTimesheetsByWorker(worker.id);
        res.json(timesheets);
        return;
      }
      
      // Helper to attach the contract's approver role and customerBusinessId so the UI can gate buttons
      const attachContractMeta = async (ts: any) => {
        if (!ts.contractId) return ts;
        try {
          const c: any = await storage.getContractById(ts.contractId);
          return {
            ...ts,
            timesheetApproverRole: c?.timesheetApproverRole || null,
            contractEmployingBusinessId: c?.businessId || null,
            contractCustomerBusinessId: c?.customerBusinessId || null,
          };
        } catch {
          return ts;
        }
      };

      if (userType === 'sdp_internal') {
        // SDP internal users can see all timesheets; include sdpInvoiced flag
        const allTimesheets = await storage.getAllTimesheets();
        const timesheetsWithFlag = await Promise.all(allTimesheets.map(async (ts) => {
          const link = await storage.getTimesheetSdpInvoiceLink(ts.id);
          const sdpInvoiced = !!link && link.invoiceStatus !== 'void' && link.invoiceStatus !== 'cancelled';
          return await attachContractMeta({ ...ts, sdpInvoiced });
        }));
        res.json(timesheetsWithFlag);
        return;
      }

      const business = await storage.getBusinessByOwnerId(userId);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Get own timesheets (workers on contracts where this business is the employer)
      const ownTimesheets = await storage.getTimesheetsByBusiness(business.id);
      const ownTimesheetsWithFlag = await Promise.all(ownTimesheets.map(t => attachContractMeta({ ...t, isProvided: false, providedByBusinessName: null })));

      // Also get timesheets for workers provided TO this business by other businesses
      // (contracts where this business is the customerBusinessId — host client scenario)
      const providedTimesheets = await storage.getTimesheetsByCustomerBusiness(business.id);
      const providedTimesheetsWithFlag = await Promise.all(providedTimesheets.map(t => attachContractMeta({ ...t, isProvided: true })));

      res.json([...ownTimesheetsWithFlag, ...providedTimesheetsWithFlag]);
    } catch (error: any) {
      console.error("Error fetching timesheets:", error);
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  });

  app.get('/api/timesheets/worker/:workerId', authMiddleware, async (req: any, res) => {
    try {
      const { workerId } = req.params;
      const timesheets = await storage.getTimesheetsByWorker(workerId);
      res.json(timesheets);
    } catch (error: any) {
      console.error("Error fetching worker timesheets:", error);
      res.status(500).json({ message: "Failed to fetch worker timesheets" });
    }
  });

  app.post('/api/timesheets', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType === 'worker') {
        // Workers can create their own timesheets
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: "Worker profile not found" });
        }
        
        // Get an active contract for the worker to associate the timesheet with
        const contracts = await storage.getContractsByWorker(worker.id);
        const activeContract = contracts.find(c => c.status === 'active');
        
        if (!activeContract) {
          return res.status(400).json({ message: "No active contract found for worker" });
        }
        
        const timesheetData = {
          ...req.body,
          contractId: activeContract.id,
          workerId: worker.id,
          businessId: worker.businessId,
          createdBy: userId,
        };
        
        const timesheet = await storage.createTimesheetWithEntries(timesheetData);
        res.json(timesheet);
      } else if (userType === 'sdp_internal' || userType === 'business_user') {
        // SDP internal and business users can create timesheets on behalf of workers
        const { workerId, contractId } = req.body;
        
        // Validate required fields
        if (!workerId || !contractId) {
          return res.status(400).json({ message: "workerId and contractId are required" });
        }
        
        // Get the worker and verify access
        const worker = await storage.getWorkerById(workerId);
        if (!worker) {
          return res.status(404).json({ message: "Worker not found" });
        }
        
        // Business users can only create timesheets for workers in their accessible businesses
        if (userType === 'business_user') {
          const accessibleBusinessIds = req.user?.accessibleBusinessIds || [];
          const ownedBusiness = await storage.getBusinessByOwnerId(userId);
          const hasAccess = (ownedBusiness && ownedBusiness.id === worker.businessId) || 
                           accessibleBusinessIds.includes(worker.businessId);
          
          if (!hasAccess) {
            return res.status(403).json({ message: "Unauthorized to create timesheets for this worker" });
          }
        }
        
        // Get the contract and verify it belongs to the worker
        const contract = await storage.getContractById(contractId);
        if (!contract) {
          return res.status(404).json({ message: "Contract not found" });
        }
        
        if (contract.workerId !== workerId) {
          return res.status(400).json({ message: "Contract does not belong to the specified worker" });
        }
        
        if (!contract.requiresTimesheet) {
          return res.status(400).json({ message: "Contract does not require timesheets" });
        }
        
        const timesheetData = {
          ...req.body,
          businessId: worker.businessId,
          createdBy: userId,
        };
        
        const timesheet = await storage.createTimesheetWithEntries(timesheetData);
        res.json(timesheet);
      } else {
        return res.status(403).json({ message: "Unauthorized to create timesheets" });
      }
    } catch (error: any) {
      console.error("Error creating timesheet:", error);
      res.status(400).json({ message: "Failed to create timesheet" });
    }
  });

  app.patch('/api/timesheets/:id/status', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Get timesheet details before updating status
      const allTimesheets = await storage.getAllTimesheets();
      const timesheet = allTimesheets.find(t => t.id === id);
      
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }

      // Authorization: enforce the contract's `timesheetApproverRole` if set, fall back to legacy "any of {SDP, business, host client}" otherwise.
      if (userType === 'worker') {
        return res.status(403).json({ message: "Workers cannot approve timesheets" });
      }
      const authContract: any = await storage.getContractById(timesheet.contractId);
      if (!authContract) return res.status(404).json({ message: "Contract not found" });
      const approverRole: string | null = authContract.timesheetApproverRole || null;
      const labels: Record<string, string> = { sdp: 'SDP', business: 'Employing Business', host_client: 'Host Client' };
      const denyMsg = approverRole ? `Only ${labels[approverRole] || approverRole} can approve this timesheet` : "Unauthorized to update this timesheet status";

      if (userType === 'sdp_internal') {
        if (approverRole && approverRole !== 'sdp') {
          return res.status(403).json({ message: denyMsg });
        }
      } else if (userType === 'business_user') {
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business) return res.status(404).json({ message: "Business not found" });
        const isEmployingBusiness = authContract.businessId === business.id;
        const isHostClient = authContract.customerBusinessId === business.id;
        if (!approverRole) {
          // Legacy: keep prior behaviour (employing business or host client may approve)
          if (!isEmployingBusiness && !isHostClient) {
            return res.status(403).json({ message: denyMsg });
          }
        } else if (approverRole === 'business' && !isEmployingBusiness) {
          return res.status(403).json({ message: denyMsg });
        } else if (approverRole === 'host_client' && !isHostClient) {
          return res.status(403).json({ message: denyMsg });
        } else if (approverRole === 'sdp') {
          return res.status(403).json({ message: denyMsg });
        }
      }

      await storage.updateTimesheetStatus(id, status, userId, rejectionReason);
      console.log(`[invoice] PATCH /timesheets/${id}/status → status='${status}' contractId=${timesheet.contractId}`);

      // If approving a timesheet, auto-generate invoices based on contract billingMode
      if (status === 'approved') {
        const contract = await storage.getContractById(timesheet.contractId);
        console.log(`[invoice] approved branch reached — contract found=${!!contract} isForClient=${contract?.isForClient} billingMode=${(contract as any)?.billingMode} invoiceCustomer=${contract?.invoiceCustomer} rateType=${contract?.rateType}`);

        // Salary contracts (annual) do not generate auto-invoices — payroll handles this separately
        if (contract && contract.rateType === 'annual') {
          console.log(`Salary contract ${contract.id}: skipping auto-invoice on timesheet approval`);
        } else if (contract && contract.isForClient) {
          // Determine effective billing mode: use explicit billingMode if set, fall back to legacy invoiceCustomer boolean
          const billingMode = (contract as any).billingMode || (contract.invoiceCustomer ? 'invoice_through_platform' : null);
          
          if (billingMode) {
            try {
              const rateType = contract.rateType || 'hourly';
              const rateStructure = (contract as any).rateStructure || 'single';
              const clientBillingType = (contract as any).clientBillingType || 'rate_based';
              const workerRate = parseFloat(contract.rate);
              console.log(`[invoice] start contract=${contract.id} timesheet=${timesheet.id} billingMode=${billingMode} rateType=${rateType} rateStructure=${rateStructure} clientBillingType=${clientBillingType} workerRate=${workerRate} isForClient=${contract.isForClient}`);
              if (isNaN(workerRate)) {
                throw new Error(`Contract ${contract.id} has invalid/missing rate — cannot auto-generate invoice`);
              }

              // Fetch contract rate lines for multiple-rate calculations
              let rateLines: any[] = [];
              if (rateStructure === 'multiple') {
                rateLines = await storage.getContractRateLines(contract.id);
                console.log(`[invoice] multi-rate contract — ${rateLines.length} rate lines:`, rateLines.map((r: any) => ({ id: r.id, name: r.projectName, rate: r.rate, clientRate: r.clientRate, isDefault: r.isDefault })));
                console.log(`[invoice] timesheet entries (${timesheet.entries.length}):`, timesheet.entries.map((e: any) => ({ date: e.date, hours: e.hoursWorked, days: e.daysWorked, projectRateLineId: e.projectRateLineId })));
              }

              // Build a map of rateLineId → rate for quick lookup
              const rateLineMap = new Map<string, number>(
                rateLines.map((rl: any) => [rl.id, parseFloat(rl.rate)])
              );

              // Calculate worker cost
              let workerCost = 0;
              const workerCostLineItems: { description: string; quantity: string; unitPrice: string; amount: string; sortOrder: number }[] = [];

              if (rateStructure === 'multiple' && rateLines.length > 0) {
                // Group entries by their rate line
                const rateGroups = new Map<string, { hours: number; days: number; rate: number; label: string }>();
                for (const entry of timesheet.entries) {
                  console.log(`[invoice] processing timesheet entry — date=${entry.date} hours=${entry.hoursWorked} days=${entry.daysWorked} projectRateLineId=${entry.projectRateLineId}`);
                  const rateLineId = entry.projectRateLineId;
                  const entryRate = rateLineId ? (rateLineMap.get(rateLineId) ?? workerRate) : workerRate;
                  console.log(`[invoice] entry rate determined as ${entryRate} (rateLineId=${rateLineId})`);
                  const rl = rateLines.find((r: any) => r.id === rateLineId);
                  const label = rl?.description || 'Standard Rate';
                  const key = rateLineId || 'default';
                  if (!rateGroups.has(key)) rateGroups.set(key, { hours: 0, days: 0, rate: entryRate, label });
                  const g = rateGroups.get(key)!;
                  if (rateType === 'daily') {
                    const days = parseFloat(entry.daysWorked || '0') || 0;
                    g.days += days;
                    workerCost += days * entryRate;
                  } else {
                    const hours = parseFloat(entry.hoursWorked || '0') || 0;
                    g.hours += hours;
                    workerCost += hours * entryRate;
                  }
                }
                let sortIdx = 0;
                for (const [, g] of rateGroups) {
                  if (rateType === 'daily' && g.days > 0) {
                    const amt = g.days * g.rate;
                    workerCostLineItems.push({ description: `${g.label} — ${g.days}d @ ${contract.currency} ${g.rate}/day`, quantity: g.days.toString(), unitPrice: g.rate.toFixed(2), amount: amt.toFixed(2), sortOrder: sortIdx++ });
                  } else if (g.hours > 0) {
                    const amt = g.hours * g.rate;
                    workerCostLineItems.push({ description: `${g.label} — ${g.hours}h @ ${contract.currency} ${g.rate}/hr`, quantity: g.hours.toString(), unitPrice: g.rate.toFixed(2), amount: amt.toFixed(2), sortOrder: sortIdx++ });
                  }
                }
              } else if (rateType === 'daily') {
                const totalDays = timesheet.entries.reduce((sum: number, e: any) => {
                  const d = parseFloat(e.daysWorked || '0'); return sum + (isNaN(d) ? 0 : d);
                }, 0);
                workerCost = totalDays * workerRate;
                workerCostLineItems.push({ description: `${totalDays}d @ ${contract.currency} ${workerRate}/day`, quantity: totalDays.toString(), unitPrice: workerRate.toFixed(2), amount: workerCost.toFixed(2), sortOrder: 0 });
              } else {
                const totalHoursCalc = timesheet.entries.reduce((sum: number, e: any) => {
                  const h = parseFloat(e.hoursWorked || '0'); return sum + (isNaN(h) ? 0 : h);
                }, 0);
                workerCost = totalHoursCalc * workerRate;
                workerCostLineItems.push({ description: `${totalHoursCalc}h @ ${contract.currency} ${workerRate}/hr`, quantity: totalHoursCalc.toString(), unitPrice: workerRate.toFixed(2), amount: workerCost.toFixed(2), sortOrder: 0 });
              }

              if (workerCost <= 0) {
                throw new Error('Cannot create invoice for timesheet with zero or negative worker cost');
              }

              // Fetch SDP billing lines for this contract
              const contractBillingLines = await storage.getContractBillingLines(contract.id);
              const activeBillingLines = contractBillingLines.filter((bl: any) => bl.isActive);

              // Compute SDP→Business invoice total = workerCost + billing line contributions
              let sdpInvoiceTotal = workerCost;
              const sdpBillingLineItems: { description: string; quantity: string; unitPrice: string; amount: string; sortOrder: number }[] = [];
              // Base worker cost line first
              workerCostLineItems.forEach((li, i) => sdpBillingLineItems.push({ ...li, sortOrder: i }));
              let blSortIdx = workerCostLineItems.length;
              for (const bl of activeBillingLines) {
                let blAmount = 0;
                if (bl.lineType === 'percentage_of_pay') {
                  blAmount = workerCost * (parseFloat(bl.rate || '0') / 100);
                } else if (bl.lineType === 'fixed_percentage') {
                  blAmount = workerCost * (parseFloat(bl.rate || '0') / 100);
                } else {
                  blAmount = parseFloat(bl.amount || bl.rate || '0');
                }
                sdpInvoiceTotal += blAmount;
                sdpBillingLineItems.push({ description: bl.description, quantity: '1', unitPrice: blAmount.toFixed(2), amount: blAmount.toFixed(2), sortOrder: blSortIdx++ });
              }

              // Calculate client billing amount
              let customerBillingAmount = 0;
              const clientLineItems: { description: string; quantity: string; unitPrice: string; amount: string; sortOrder: number }[] = [];

              if (clientBillingType === 'fixed_price') {
                customerBillingAmount = parseFloat((contract as any).fixedBillingAmount || '0');
                clientLineItems.push({ description: `Fixed period billing — ${timesheet.periodStart} to ${timesheet.periodEnd}`, quantity: '1', unitPrice: customerBillingAmount.toFixed(2), amount: customerBillingAmount.toFixed(2), sortOrder: 0 });
              } else {
                // Rate-based client billing
                const topLevelCustomerRate = contract.customerBillingRate ? parseFloat(contract.customerBillingRate) : 0;
                // Fallback when neither the specific entry's rate line nor the contract have a client rate:
                // use the default rate line's clientRate, or the first line's clientRate.
                const defaultLineClientRate = (() => {
                  const def = rateLines.find((r: any) => r.isDefault && r.clientRate);
                  if (def) return parseFloat(def.clientRate);
                  const firstWith = rateLines.find((r: any) => r.clientRate);
                  return firstWith ? parseFloat(firstWith.clientRate) : 0;
                })();
                const customerRate = topLevelCustomerRate || defaultLineClientRate;
                if (rateStructure === 'multiple' && rateLines.length > 0) {
                  // Use per-entry rates for client invoice too
                  const rateGroups = new Map<string, { hours: number; days: number; rate: number; label: string }>();
                  for (const entry of timesheet.entries) {
                    const rateLineId = entry.projectRateLineId;
                    const rl = rateLines.find((r: any) => r.id === rateLineId);
                    const entryRate = rl ? (rl.clientRate ? parseFloat(rl.clientRate) : customerRate) : customerRate;
                    const label = rl?.description || 'Standard Rate';
                    const key = rateLineId || 'default';
                    if (!rateGroups.has(key)) rateGroups.set(key, { hours: 0, days: 0, rate: entryRate, label });
                    const g = rateGroups.get(key)!;
                    if (rateType === 'daily') {
                      const days = parseFloat(entry.daysWorked || '0') || 0;
                      g.days += days;
                      customerBillingAmount += days * entryRate;
                    } else {
                      const hours = parseFloat(entry.hoursWorked || '0') || 0;
                      g.hours += hours;
                      customerBillingAmount += hours * entryRate;
                    }
                  }
                  let idx = 0;
                  for (const [, g] of rateGroups) {
                    if (rateType === 'daily' && g.days > 0) {
                      const amt = g.days * g.rate;
                      clientLineItems.push({ description: `${g.label} — ${g.days}d`, quantity: g.days.toString(), unitPrice: g.rate.toFixed(2), amount: amt.toFixed(2), sortOrder: idx++ });
                    } else if (g.hours > 0) {
                      const amt = g.hours * g.rate;
                      clientLineItems.push({ description: `${g.label} — ${g.hours}h`, quantity: g.hours.toString(), unitPrice: g.rate.toFixed(2), amount: amt.toFixed(2), sortOrder: idx++ });
                    }
                  }
                } else if (rateType === 'daily') {
                  const totalDays = timesheet.entries.reduce((sum: number, e: any) => {
                    const d = parseFloat(e.daysWorked || '0'); return sum + (isNaN(d) ? 0 : d);
                  }, 0);
                  customerBillingAmount = totalDays * customerRate;
                  clientLineItems.push({ description: `${totalDays}d @ ${contract.customerCurrency || contract.currency} ${customerRate}/day`, quantity: totalDays.toString(), unitPrice: customerRate.toFixed(2), amount: customerBillingAmount.toFixed(2), sortOrder: 0 });
                } else {
                  const totalHoursCalc = timesheet.entries.reduce((sum: number, e: any) => {
                    const h = parseFloat(e.hoursWorked || '0'); return sum + (isNaN(h) ? 0 : h);
                  }, 0);
                  customerBillingAmount = totalHoursCalc * customerRate;
                  clientLineItems.push({ description: `${totalHoursCalc}h @ ${contract.customerCurrency || contract.currency} ${customerRate}/hr`, quantity: totalHoursCalc.toString(), unitPrice: customerRate.toFixed(2), amount: customerBillingAmount.toFixed(2), sortOrder: 0 });
                }
              }

              const suggestedMargin = customerBillingAmount - workerCost;
              console.log(`[invoice] computed workerCost=${workerCost} customerBillingAmount=${customerBillingAmount} margin=${suggestedMargin} currency=${contract.customerCurrency || contract.currency}`);
              const invoiceDate = new Date();
              const paymentTermsDays = parseInt(contract.paymentTerms || '30');
              const dueDate = new Date(invoiceDate);
              dueDate.setDate(dueDate.getDate() + paymentTermsDays);
              const currency = contract.customerCurrency || contract.currency;
              const allInvoices = await storage.getAllSdpInvoices();
              
              // Helper: create a Business→HostClient invoice (category: business_to_client)
              const createB2CInvoice = async () => {
                if (!contract.customerBusinessId) throw new Error('Contract missing customerBusinessId for B2C invoice');
                if (clientBillingType !== 'fixed_price' && customerBillingAmount <= 0) {
                  throw new Error(`Contract ${contract.id} has no customerBillingRate set — cannot create B2C invoice with 0 amount`);
                }
                const existing = allInvoices.find(inv =>
                  inv.timesheetId === timesheet.id && inv.invoiceCategory === 'business_to_client'
                );
                if (existing) { console.log(`B2C invoice already exists for timesheet ${id}, skipping`); return; }
                const invNum = await storage.generateSdpInvoiceNumber(contract.countryId);
                // Look up business and host client names for clear descriptions
                const fromBiz = await storage.getBusinessById(contract.businessId);
                const toHostClient = await storage.getBusinessById(contract.customerBusinessId!);
                const fromBizName = fromBiz?.name || 'Business';
                const toHostName = toHostClient?.name || 'Host Client';
                const inv = await storage.createSdpInvoice({
                  invoiceNumber: invNum,
                  invoiceDate,
                  dueDate,
                  invoiceCategory: 'business_to_client',
                  fromCountryId: contract.countryId,
                  fromBusinessId: contract.businessId,
                  toBusinessId: contract.customerBusinessId,
                  serviceType: `Business Billing - ${contract.employmentType}`,
                  description: `Invoice from ${fromBizName} to ${toHostName}. Payable by: ${toHostName}. Period: ${timesheet.periodStart} to ${timesheet.periodEnd}`,
                  subtotal: customerBillingAmount.toFixed(2),
                  currency,
                  totalAmount: customerBillingAmount.toFixed(2),
                  status: 'draft',
                  createdBy: userId,
                  timesheetId: timesheet.id,
                  contractId: contract.id,
                  workerId: contract.workerId,
                  periodStart: timesheet.periodStart,
                  periodEnd: timesheet.periodEnd,
                } as any);
                await storage.createSdpInvoiceLineItems(inv.id, clientLineItems);
                console.log(`Auto-generated B2C invoice ${invNum} for timesheet ${id}`);
              };
              
              // Helper: create SDP→HostClient invoice (category: customer_billing)
              const createCustomerBillingInvoice = async () => {
                if (!contract.customerBusinessId) throw new Error('Contract missing customerBusinessId for customer billing invoice');
                // For rate-based billing: either the top-level customerBillingRate OR per-line clientRate on rate lines must drive a positive amount
                if (clientBillingType !== 'fixed_price' && customerBillingAmount <= 0) {
                  throw new Error(`Contract ${contract.id} produced 0 customer billing amount — set customerBillingRate or clientRate on rate lines`);
                }
                if (!contract.customerCurrency) throw new Error('Contract missing customerCurrency');
                const existing = allInvoices.find(inv =>
                  inv.timesheetId === timesheet.id && inv.invoiceCategory === 'customer_billing'
                );
                if (existing) { console.log(`Customer billing invoice already exists for timesheet ${id}, skipping`); return; }
                const invNum = await storage.generateSdpInvoiceNumber(contract.countryId);
                // Look up host client name for clear description
                const custBizTo = await storage.getBusinessById(contract.customerBusinessId!);
                const custHostName = custBizTo?.name || 'Host Client';
                // Look up SDP country entity name
                const sdpCountry = await storage.getCountryById(contract.countryId);
                const sdpEntityName = sdpCountry?.companyName || `SDP ${sdpCountry?.name || 'Entity'}`;
                const inv = await storage.createSdpInvoice({
                  invoiceNumber: invNum,
                  invoiceDate,
                  dueDate,
                  invoiceCategory: 'customer_billing',
                  fromCountryId: contract.countryId,
                  toBusinessId: contract.customerBusinessId,
                  fromBusinessId: contract.businessId,
                  serviceType: `Customer Billing - ${contract.employmentType}`,
                  description: `Invoice from ${sdpEntityName} to ${custHostName}. Payable by: ${custHostName}. SDP acts as billing agent. Period: ${timesheet.periodStart} to ${timesheet.periodEnd}`,
                  subtotal: customerBillingAmount.toFixed(2),
                  currency,
                  totalAmount: customerBillingAmount.toFixed(2),
                  suggestedMargin: suggestedMargin.toFixed(2),
                  status: 'draft',
                  createdBy: userId,
                  timesheetId: timesheet.id,
                  contractId: contract.id,
                  workerId: contract.workerId,
                  periodStart: timesheet.periodStart,
                  periodEnd: timesheet.periodEnd,
                } as any);
                await storage.createSdpInvoiceLineItems(inv.id, clientLineItems);
                console.log(`Auto-generated customer billing invoice ${invNum} for timesheet ${id}`);
              };

              // Helper: create SDP→Business invoice (category: sdp_services)
              // Total includes worker cost + all active billing line contributions
              const createSdpToBusinessInvoice = async () => {
                const existingWorkerCost = allInvoices.find(inv =>
                  inv.timesheetId === timesheet.id && inv.invoiceCategory === 'sdp_services' &&
                  inv.toBusinessId === contract.businessId
                );
                if (existingWorkerCost) { console.log(`SDP service invoice already exists for timesheet ${id}, skipping`); return; }
                const invNum = await storage.generateSdpInvoiceNumber(contract.countryId);
                // Find an open PO for this contract to auto-link
                const contractPOs = await storage.getPurchaseOrdersByContract(contract.id);
                const openPO = contractPOs.find((p: any) => p.status === 'open');
                // Look up business and SDP entity names for clear description
                const sdpBizTo = await storage.getBusinessById(contract.businessId);
                const sdpBizName = sdpBizTo?.name || 'Business';
                const sdpCountryEntity = await storage.getCountryById(contract.countryId);
                const sdpName = sdpCountryEntity?.companyName || `SDP ${sdpCountryEntity?.name || 'Entity'}`;
                const inv = await storage.createSdpInvoice({
                  invoiceNumber: invNum,
                  invoiceDate,
                  dueDate,
                  invoiceCategory: 'sdp_services',
                  fromCountryId: contract.countryId,
                  toBusinessId: contract.businessId,
                  serviceType: `Employment Services - ${contract.employmentType}`,
                  description: `Invoice from ${sdpName} to ${sdpBizName}. Payable by: ${sdpBizName}. Worker cost + SDP fees. Period: ${timesheet.periodStart} to ${timesheet.periodEnd}`,
                  subtotal: sdpInvoiceTotal.toFixed(2),
                  currency: contract.currency,
                  totalAmount: sdpInvoiceTotal.toFixed(2),
                  status: 'draft',
                  createdBy: userId,
                  timesheetId: timesheet.id,
                  contractId: contract.id,
                  workerId: contract.workerId,
                  periodStart: timesheet.periodStart,
                  periodEnd: timesheet.periodEnd,
                  purchaseOrderId: openPO?.id ?? null,
                } as any);
                await storage.createSdpInvoiceLineItems(inv.id, sdpBillingLineItems);
                // Update PO invoiced amount if linked
                if (openPO) {
                  await storage.updatePurchaseOrderInvoicedAmount(openPO.id, sdpInvoiceTotal);
                }
                console.log(`Auto-generated SDP service invoice ${invNum} for timesheet ${id} (total: ${sdpInvoiceTotal.toFixed(2)})`);
              };
              
              // Route to correct invoice generation based on billingMode
              if (billingMode === 'invoice_through_platform') {
                // SDP → Host Client (SDP acts as billing entity)
                await createCustomerBillingInvoice();
              } else if (billingMode === 'invoice_separately') {
                // Business → Host Client (business invoices the client)
                await createB2CInvoice();
              } else if (billingMode === 'auto_invoice') {
                // Two invoices: SDP → Business (worker cost + billing lines), Business → Host Client (client billing)
                await createSdpToBusinessInvoice();
                await createB2CInvoice();
              }
            } catch (invoiceError: any) {
              console.error('[invoice] FAILED to auto-generate invoice on timesheet approval — message:', invoiceError?.message);
              console.error('[invoice] stack:', invoiceError?.stack);
              // Don't fail the timesheet approval if invoice generation fails
            }
          } else {
            console.log(`[invoice] skipping auto-invoice — contract ${contract?.id} has no billingMode and invoiceCustomer=${contract?.invoiceCustomer}`);
          }
        } else if (contract) {
          console.log(`[invoice] skipping auto-invoice — contract ${contract.id} isForClient=false`);
        }
      }
      
      res.json({ message: "Timesheet status updated successfully" });
    } catch (error: any) {
      console.error("Error updating timesheet status:", error);
      res.status(400).json({ message: "Failed to update timesheet status" });
    }
  });

  // Convenient endpoint for workers to submit timesheets
  app.patch('/api/timesheets/:id/submit', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      await storage.updateTimesheetStatus(id, 'submitted', userId);
      res.json({ message: "Timesheet submitted for approval" });
    } catch (error: any) {
      console.error("Error submitting timesheet:", error);
      res.status(400).json({ message: "Failed to submit timesheet" });
    }
  });

  // Update timesheet (only draft timesheets)
  app.patch('/api/timesheets/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Get the timesheet to verify access and status
      const timesheet = await storage.getTimesheetById(id);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Only draft timesheets can be edited
      if (timesheet.status !== 'draft') {
        return res.status(400).json({ message: "Only draft timesheets can be edited" });
      }
      
      // Authorization check
      if (userType === 'worker') {
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker || worker.id !== timesheet.workerId) {
          return res.status(403).json({ message: "Unauthorized to edit this timesheet" });
        }
      } else if (userType === 'business_user') {
        const accessibleBusinessIds = req.user?.accessibleBusinessIds || [];
        const ownedBusiness = await storage.getBusinessByOwnerId(userId);
        const hasAccess = (ownedBusiness && ownedBusiness.id === timesheet.businessId) || 
                         accessibleBusinessIds.includes(timesheet.businessId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Unauthorized to edit this timesheet" });
        }
      } else if (userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Unauthorized to edit timesheets" });
      }
      
      // Validate and whitelist only editable fields
      const updateTimesheetSchema = z.object({
        periodStart: z.string().optional(),
        periodEnd: z.string().optional(),
        notes: z.string().optional(),
        entries: z.array(z.object({
          date: z.string(),
          hoursWorked: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          breakHours: z.string().optional(),
          description: z.string().optional(),
        })).optional(),
      });
      
      const validatedData = updateTimesheetSchema.parse(req.body);
      const updatedTimesheet = await storage.updateTimesheet(id, validatedData as any);
      res.json(updatedTimesheet);
    } catch (error: any) {
      console.error("Error updating timesheet:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(400).json({ message: "Failed to update timesheet" });
    }
  });

  // Delete timesheet (only draft timesheets)
  app.delete('/api/timesheets/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Get the timesheet to verify access and status
      const timesheet = await storage.getTimesheetById(id);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Only draft timesheets can be deleted
      if (timesheet.status !== 'draft') {
        return res.status(400).json({ message: "Only draft timesheets can be deleted" });
      }
      
      // Authorization check
      if (userType === 'worker') {
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker || worker.id !== timesheet.workerId) {
          return res.status(403).json({ message: "Unauthorized to delete this timesheet" });
        }
      } else if (userType === 'business_user') {
        const accessibleBusinessIds = req.user?.accessibleBusinessIds || [];
        const ownedBusiness = await storage.getBusinessByOwnerId(userId);
        const hasAccess = (ownedBusiness && ownedBusiness.id === timesheet.businessId) || 
                         accessibleBusinessIds.includes(timesheet.businessId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Unauthorized to delete this timesheet" });
        }
      } else if (userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Unauthorized to delete timesheets" });
      }
      
      await storage.deleteTimesheet(id);
      res.json({ message: "Timesheet deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting timesheet:", error);
      res.status(400).json({ message: "Failed to delete timesheet" });
    }
  });

  // Timesheet attachment routes
  app.post('/api/timesheets/:id/attachments', authMiddleware, async (req: any, res) => {
    try {
      const { id: timesheetId } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;
      const { fileName, fileUrl, fileSize, mimeType } = req.body;
      
      // Validate required fields
      if (!fileName || !fileUrl) {
        return res.status(400).json({ message: "fileName and fileUrl are required" });
      }
      
      // Get the timesheet to verify access
      const timesheet = await storage.getTimesheetById(timesheetId);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Authorization check
      if (userType === 'worker') {
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker || worker.id !== timesheet.workerId) {
          return res.status(403).json({ message: "Unauthorized to add attachments to this timesheet" });
        }
      } else if (userType === 'business_user') {
        // Check if user has access to the business via ownership or accessibleBusinessIds
        const accessibleBusinessIds = req.user?.accessibleBusinessIds || [];
        const ownedBusiness = await storage.getBusinessByOwnerId(userId);
        const hasAccess = (ownedBusiness && ownedBusiness.id === timesheet.businessId) || 
                         accessibleBusinessIds.includes(timesheet.businessId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Unauthorized to add attachments to this timesheet" });
        }
      } else if (userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Unauthorized to add attachments" });
      }
      
      const attachment = await storage.createTimesheetAttachment({
        timesheetId,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        uploadedBy: userId,
      });
      
      res.json(attachment);
    } catch (error: any) {
      console.error("Error creating timesheet attachment:", error);
      res.status(400).json({ message: "Failed to create timesheet attachment" });
    }
  });

  app.get('/api/timesheets/:id/attachments', authMiddleware, async (req: any, res) => {
    try {
      const { id: timesheetId } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Get the timesheet to verify access
      const timesheet = await storage.getTimesheetById(timesheetId);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Authorization check
      if (userType === 'worker') {
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker || worker.id !== timesheet.workerId) {
          return res.status(403).json({ message: "Unauthorized to view attachments for this timesheet" });
        }
      } else if (userType === 'business_user') {
        // Check if user has access to the business via ownership or accessibleBusinessIds
        const accessibleBusinessIds = req.user?.accessibleBusinessIds || [];
        const ownedBusiness = await storage.getBusinessByOwnerId(userId);
        const hasAccess = (ownedBusiness && ownedBusiness.id === timesheet.businessId) || 
                         accessibleBusinessIds.includes(timesheet.businessId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Unauthorized to view attachments for this timesheet" });
        }
      } else if (userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Unauthorized to view attachments" });
      }
      
      const attachments = await storage.getTimesheetAttachments(timesheetId);
      res.json(attachments);
    } catch (error: any) {
      console.error("Error fetching timesheet attachments:", error);
      res.status(500).json({ message: "Failed to fetch timesheet attachments" });
    }
  });

  app.delete('/api/timesheets/:timesheetId/attachments/:attachmentId', authMiddleware, async (req: any, res) => {
    try {
      const { timesheetId, attachmentId } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      // Get the timesheet to verify access
      const timesheet = await storage.getTimesheetById(timesheetId);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Authorization check
      if (userType === 'worker') {
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker || worker.id !== timesheet.workerId) {
          return res.status(403).json({ message: "Unauthorized to delete attachments from this timesheet" });
        }
      } else if (userType === 'business_user') {
        // Check if user has access to the business via ownership or accessibleBusinessIds
        const accessibleBusinessIds = req.user?.accessibleBusinessIds || [];
        const ownedBusiness = await storage.getBusinessByOwnerId(userId);
        const hasAccess = (ownedBusiness && ownedBusiness.id === timesheet.businessId) || 
                         accessibleBusinessIds.includes(timesheet.businessId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Unauthorized to delete attachments from this timesheet" });
        }
      } else if (userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Unauthorized to delete attachments" });
      }
      
      await storage.deleteTimesheetAttachment(attachmentId);
      res.json({ message: "Attachment deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting timesheet attachment:", error);
      res.status(400).json({ message: "Failed to delete timesheet attachment" });
    }
  });

  // Timesheet Expense routes
  app.get('/api/timesheets/:id/expenses', authMiddleware, async (req: any, res) => {
    try {
      const expenses = await storage.getExpensesByTimesheetId(req.params.id);
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/timesheets/:id/expenses', authMiddleware, async (req: any, res) => {
    try {
      const { date, category, description, amount, currency, receiptUrl, notes } = req.body;
      if (!description || !amount || !date) {
        return res.status(400).json({ message: "date, description and amount are required" });
      }
      const expense = await storage.createTimesheetExpense({
        timesheetId: req.params.id,
        date,
        category: category || 'other',
        description,
        amount: String(amount),
        currency: currency || 'AUD',
        receiptUrl: receiptUrl || null,
        notes: notes || null,
      });
      res.json(expense);
    } catch (error: any) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch('/api/timesheets/:id/expenses/:expenseId', authMiddleware, async (req: any, res) => {
    try {
      const expense = await storage.updateTimesheetExpense(req.params.expenseId, req.body);
      res.json(expense);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete('/api/timesheets/:id/expenses/:expenseId', authMiddleware, async (req: any, res) => {
    try {
      await storage.deleteTimesheetExpense(req.params.expenseId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Leave request routes
  app.get('/api/leave-requests', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType === 'worker') {
        // Workers see their own leave requests
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: "Worker profile not found" });
        }
        const leaveRequests = await storage.getLeaveRequestsByWorker(worker.id);
        res.json(leaveRequests);
        return;
      }
      
      if (userType === 'sdp_internal') {
        // SDP internal users can see all leave requests
        const allLeaveRequests = await storage.getAllLeaveRequests();
        res.json(allLeaveRequests);
        return;
      }
      
      const business = await storage.getBusinessByOwnerId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      // IMPORTANT: Leave approval belongs to the employing business only (businessId).
      // Host clients (customerBusinessId) do NOT manage leave for workers provided to them —
      // they only manage leave for workers they hired directly (where they are the employer).
      const leaveRequests = await storage.getLeaveRequestsByBusiness(business.id);
      res.json(leaveRequests);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.post('/api/leave-requests', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType === 'worker') {
        // Workers can create their own leave requests
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: "Worker profile not found" });
        }
        
        const leaveRequestData = {
          ...req.body,
          workerId: worker.id,
          businessId: worker.businessId,
        };
        
        const leaveRequest = await storage.createLeaveRequest(leaveRequestData);
        res.json(leaveRequest);
      } else {
        // Business users and SDP internal
        const leaveRequest = await storage.createLeaveRequest(req.body);
        res.json(leaveRequest);
      }
    } catch (error: any) {
      console.error("Error creating leave request:", error);
      res.status(400).json({ message: "Failed to create leave request" });
    }
  });

  app.patch('/api/leave-requests/:id/status', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const userId = req.user?.id;
      
      await storage.updateLeaveRequestStatus(id, status, userId, rejectionReason);
      res.json({ message: "Leave request status updated successfully" });
    } catch (error: any) {
      console.error("Error updating leave request status:", error);
      res.status(400).json({ message: "Failed to update leave request status" });
    }
  });

  app.post('/api/timesheet-entries', authMiddleware, async (req: any, res) => {
    try {
      const data = insertTimesheetEntrySchema.parse(req.body);
      const entry = await storage.createTimesheetEntry(data);
      res.json(entry);
    } catch (error: any) {
      console.error("Error creating timesheet entry:", error);
      res.status(400).json({ message: "Failed to create timesheet entry" });
    }
  });

  app.patch('/api/timesheet-entries/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { hoursWorked, description } = req.body;
      
      await storage.updateTimesheetEntry(id, hoursWorked, description);
      res.json({ message: "Timesheet entry updated successfully" });
    } catch (error: any) {
      console.error("Error updating timesheet entry:", error);
      res.status(400).json({ message: "Failed to update timesheet entry" });
    }
  });

  app.get('/api/leave-requests/worker/:workerId', authMiddleware, async (req: any, res) => {
    try {
      const { workerId } = req.params;
      const leaveRequests = await storage.getLeaveRequestsByWorker(workerId);
      res.json(leaveRequests);
    } catch (error: any) {
      console.error("Error fetching worker leave requests:", error);
      res.status(500).json({ message: "Failed to fetch worker leave requests" });
    }
  });

  app.post('/api/leave-requests', authMiddleware, async (req: any, res) => {
    try {
      const data = insertLeaveRequestSchema.parse(req.body);
      const leaveRequest = await storage.createLeaveRequest(data);
      res.json(leaveRequest);
    } catch (error: any) {
      console.error("Error creating leave request:", error);
      res.status(400).json({ message: "Failed to create leave request" });
    }
  });

  app.patch('/api/leave-requests/:id/status', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const userId = req.user?.id;
      
      await storage.updateLeaveRequestStatus(id, status, userId, rejectionReason);
      res.json({ message: "Leave request status updated successfully" });
    } catch (error: any) {
      console.error("Error updating leave request status:", error);
      res.status(400).json({ message: "Failed to update leave request status" });
    }
  });

  // Payslip routes for SDP internal users
  app.get('/api/payslips', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user is SDP internal user with country access
      if (user.userType !== 'sdp_internal' || !user.accessibleCountries || user.accessibleCountries.length === 0) {
        return res.status(403).json({ message: "Access denied. SDP internal users only." });
      }
      
      const payslips = await storage.getPayslipsByCountries(user.accessibleCountries);
      res.json(payslips);
    } catch (error: any) {
      console.error("Error fetching payslips:", error);
      res.status(500).json({ message: "Failed to fetch payslips" });
    }
  });

  app.get('/api/payslips/business/:businessId', authMiddleware, async (req: any, res) => {
    try {
      const { businessId } = req.params;
      const userId = req.user?.id;
      const business = await storage.getBusinessByOwnerId(userId);
      
      if (!business || business.id !== businessId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const payslips = await storage.getPayslipsByBusiness(businessId);
      res.json(payslips);
    } catch (error: any) {
      console.error("Error fetching business payslips:", error);
      res.status(500).json({ message: "Failed to fetch business payslips" });
    }
  });

  app.get('/api/payslips/worker/:workerId', authMiddleware, async (req: any, res) => {
    try {
      const { workerId } = req.params;
      const payslips = await storage.getPayslipsByWorker(workerId);
      res.json(payslips);
    } catch (error: any) {
      console.error("Error fetching worker payslips:", error);
      res.status(500).json({ message: "Failed to fetch worker payslips" });
    }
  });

  app.post('/api/payslips', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Access denied. SDP internal users only." });
      }
      
      const data = insertPayslipSchema.parse({
        ...req.body,
        uploadedBy: userId,
      });
      
      const payslip = await storage.createPayslip(data);
      res.json(payslip);
    } catch (error: any) {
      console.error("Error creating payslip:", error);
      res.status(400).json({ message: "Failed to create payslip" });
    }
  });

  // Invoice routes
  app.get('/api/invoices', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let invoices;
      if (user.userType === 'sdp_internal') {
        // SDP internal users can see all invoices
        invoices = await storage.getAllInvoices();
      } else if (user.userType === 'business_user') {
        // Business users can see invoices for their business
        const business = await storage.getBusinessByOwnerId(userId);
        if (!business) {
          return res.status(404).json({ message: 'Business not found' });
        }
        invoices = await storage.getInvoicesByBusiness(business.id);
      } else if (user.userType === 'worker') {
        // Contractor workers can see their own invoices
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker) {
          return res.status(404).json({ message: 'Worker profile not found' });
        }
        if (worker.workerType !== 'contractor') {
          return res.status(403).json({ message: 'Only contractors can access invoices' });
        }
        invoices = await storage.getInvoicesByContractor(worker.id);
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(invoices);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });

  app.post('/api/invoices', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      let contractorId: string;
      let businessId: string;

      // Worker users creating their own invoices
      if (user.userType === 'worker') {
        const worker = await storage.getWorkerByUserId(userId);
        if (!worker || worker.workerType !== 'contractor') {
          return res.status(403).json({ message: 'Only contractors can create invoices' });
        }
        contractorId = worker.id;
        businessId = req.body.businessId;
        
        if (!businessId) {
          return res.status(400).json({ message: 'Business ID is required' });
        }
      } 
      // Business users creating invoices for their third-party workers
      else if (user.userType === 'business_user' || user.userType === 'sdp_internal') {
        contractorId = req.body.contractorId;
        businessId = req.body.businessId;
        
        if (!contractorId) {
          return res.status(400).json({ message: 'Contractor ID is required for business users' });
        }
        
        if (!businessId) {
          return res.status(400).json({ message: 'Business ID is required' });
        }

        // Verify the worker exists and is a third-party worker
        const worker = await storage.getWorkerById(contractorId);
        if (!worker) {
          return res.status(404).json({ message: 'Worker not found' });
        }

        // Verify business user has access to this worker
        if (user.userType === 'business_user') {
          const businesses = await storage.getBusinessesForUser(userId);
          const hasAccess = businesses.some((b: Business) => b.id === businessId && worker.businessId === b.id);
          
          if (!hasAccess) {
            return res.status(403).json({ message: 'You do not have access to create invoices for this worker' });
          }
        }
      } else {
        return res.status(403).json({ message: 'Unauthorized to create invoices' });
      }

      const data = insertInvoiceSchema.parse({
        ...req.body,
        contractorId,
        businessId,
      });

      const invoice = await storage.createInvoice(data);
      res.json(invoice);
    } catch (error: any) {
      console.error('Error creating invoice:', error?.message || String(error));
      res.status(400).json({ message: error?.message || 'Failed to create invoice' });
    }
  });

  app.post('/api/invoices/from-timesheet/:timesheetId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      const { timesheetId } = req.params;
      
      if (!user || user.userType !== 'worker') {
        return res.status(403).json({ message: 'Only worker users can create invoices from timesheets' });
      }

      const worker = await storage.getWorkerByUserId(userId);
      if (!worker || worker.workerType !== 'contractor') {
        return res.status(403).json({ message: 'Only contractors can create invoices' });
      }

      const invoice = await storage.createInvoiceFromTimesheet(timesheetId, req.body);
      res.json(invoice);
    } catch (error: any) {
      console.error('Error creating invoice from timesheet:', error);
      res.status(400).json({ message: 'Failed to create invoice from timesheet' });
    }
  });

  app.patch('/api/invoices/:id/status', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      // Only business users and SDP internal users can update invoice status
      if (!user || (user.userType !== 'business_user' && user.userType !== 'sdp_internal')) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get invoice details before updating for email purposes
      const invoice = await storage.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      await storage.updateInvoiceStatus(id, status, userId);

      // Send email notifications based on status change
      try {
        const contractor = await storage.getWorkerById(invoice.contractorId);
        if (contractor?.email) {
          const workerName = `${contractor.firstName} ${contractor.lastName}`;
          
          if (status === 'approved') {
            const amount = `${invoice.currency} ${parseFloat(invoice.totalAmount).toFixed(2)}`;
            await emailService.sendInvoiceApprovedEmail(
              contractor.email,
              workerName,
              invoice.invoiceNumber,
              amount
            );
          } else if (status === 'rejected' && rejectionReason) {
            await emailService.sendInvoiceRejectedEmail(
              contractor.email,
              workerName,
              invoice.invoiceNumber,
              rejectionReason
            );
          }
        }
      } catch (emailError: any) {
        console.error("Failed to send invoice status email:", emailError);
        // Don't fail the request if email fails
      }

      res.json({ message: 'Invoice status updated successfully' });
    } catch (error: any) {
      console.error('Error updating invoice status:', error);
      res.status(400).json({ message: 'Failed to update invoice status' });
    }
  });

  // SDP Invoice routes (for billing businesses)
  app.get('/api/sdp-invoices', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { businessId, countryId } = req.query;
      
      let invoices;
      if (businessId) {
        invoices = await storage.getSdpInvoicesByBusiness(businessId);
      } else if (countryId) {
        invoices = await storage.getSdpInvoicesByCountry(countryId);
      } else {
        invoices = await storage.getAllSdpInvoices();
      }
      
      // Attach line items, contract info, and timesheet info to all invoices
      const enrichedInvoices = await Promise.all(
        invoices.map(async (inv) => {
          const lineItems = await storage.getSdpInvoiceLineItems(inv.id);
          let contract = null;
          if (inv.contractId) {
            const c: any = await storage.getContractById(inv.contractId);
            if (c) {
              let resolvedTitle = c.customRoleTitle || '';
              if (!resolvedTitle && c.roleTitleId) {
                try {
                  const rt = await storage.getRoleTitle(c.roleTitleId);
                  resolvedTitle = rt?.title || '';
                } catch {}
              }
              contract = {
                id: c.id,
                jobTitle: resolvedTitle || c.jobDescription || '',
                rateType: c.rateType || '',
                rate: c.rate || '',
                currency: c.currency || '',
                status: c.status || '',
                startDate: c.startDate || null,
                endDate: c.endDate || null,
              };
            }
          }
          let timesheet = null;
          if (inv.timesheetId) {
            const ts: any = await storage.getTimesheetById(inv.timesheetId);
            if (ts) {
              // Derive totals from entries when the persisted columns are empty
              const totalHoursNum = (ts.entries || []).reduce((s: number, e: any) => s + (parseFloat(e.hoursWorked || '0') || 0), 0);
              const totalDaysNum = (ts.entries || []).reduce((s: number, e: any) => s + (parseFloat(e.daysWorked || '0') || 0), 0);
              timesheet = {
                id: ts.id,
                periodStart: ts.periodStart,
                periodEnd: ts.periodEnd,
                totalHours: (parseFloat(ts.totalHours || '0') > 0) ? ts.totalHours : totalHoursNum.toFixed(2),
                totalDays: ts.totalDays ?? (totalDaysNum > 0 ? totalDaysNum.toFixed(2) : null),
                status: ts.status,
                workerName: ts.worker ? `${ts.worker.firstName} ${ts.worker.lastName}` : undefined,
              };
            }
          }
          return { ...inv, lineItems, contract, timesheet };
        })
      );

      res.json(enrichedInvoices);
    } catch (error: any) {
      console.error('Error fetching SDP invoices:', error);
      res.status(500).json({ message: 'Failed to fetch SDP invoices' });
    }
  });

  // Business view of SDP invoices sent to them
  app.get('/api/business/sdp-invoices', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      // Only allow business users to access this endpoint
      if (userType !== 'business_user') {
        return res.status(403).json({ message: 'Access denied. Business users only.' });
      }

      // Get the business for this user
      const business = await storage.getBusinessByOwnerId(userId);
      if (!business) {
        return res.status(404).json({ message: 'Business not found for this user' });
      }

      // Get SDP invoices sent to this business
      const invoices = await storage.getSdpInvoicesByBusiness(business.id);

      // Attach line items, contract info, timesheet info, worker info
      const enrichedInvoices = await Promise.all(
        invoices.map(async (inv) => {
          const lineItems = await storage.getSdpInvoiceLineItems(inv.id);
          let contract = null;
          if (inv.contractId) {
            const c: any = await storage.getContractById(inv.contractId);
            if (c) {
              let resolvedTitle = c.customRoleTitle || '';
              if (!resolvedTitle && c.roleTitleId) {
                try {
                  const rt = await storage.getRoleTitle(c.roleTitleId);
                  resolvedTitle = rt?.title || '';
                } catch {}
              }
              contract = {
                id: c.id,
                jobTitle: resolvedTitle || c.jobDescription || '',
                employmentType: c.employmentType || '',
                rateType: c.rateType || '',
                rate: c.rate || '',
                currency: c.currency || '',
                rateStructure: c.rateStructure || '',
                billingMode: c.billingMode || '',
                paymentTerms: c.paymentTerms || '',
                status: c.status || '',
                startDate: c.startDate || null,
                endDate: c.endDate || null,
                noticePeriodDays: c.noticePeriodDays ?? null,
                timesheetFrequency: c.timesheetFrequency || '',
                timesheetApproverRole: c.timesheetApproverRole || null,
              };
            }
          }
          let timesheet = null;
          if (inv.timesheetId) {
            const ts: any = await storage.getTimesheetById(inv.timesheetId);
            if (ts) {
              const totalHoursNum = (ts.entries || []).reduce((s: number, e: any) => s + (parseFloat(e.hoursWorked || '0') || 0), 0);
              const totalDaysNum = (ts.entries || []).reduce((s: number, e: any) => s + (parseFloat(e.daysWorked || '0') || 0), 0);
              timesheet = {
                id: ts.id,
                periodStart: ts.periodStart,
                periodEnd: ts.periodEnd,
                totalHours: (parseFloat(ts.totalHours || '0') > 0) ? ts.totalHours : totalHoursNum.toFixed(2),
                totalDays: ts.totalDays ?? (totalDaysNum > 0 ? totalDaysNum.toFixed(2) : null),
                status: ts.status,
                entryCount: ts.entries?.length || 0,
                submittedAt: ts.submittedAt || null,
                approvedAt: ts.approvedAt || null,
                workerName: ts.worker ? `${ts.worker.firstName} ${ts.worker.lastName}` : undefined,
              };
            }
          }
          let worker = null;
          if (inv.workerId) {
            try {
              const w: any = await storage.getWorkerById(inv.workerId);
              if (w) worker = { id: w.id, firstName: w.firstName, lastName: w.lastName, email: w.email };
            } catch {}
          }
          return { ...inv, lineItems, contract, timesheet, worker };
        })
      );

      res.json(enrichedInvoices);
    } catch (error: any) {
      console.error('Error fetching business SDP invoices:', error);
      res.status(500).json({ message: 'Failed to fetch SDP invoices' });
    }
  });

  // Public invoice view route — no authentication required
  // Allows host clients (and anyone with the link) to view invoice details
  app.get('/api/invoice/view/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      // Find invoice by viewToken
      const invoiceRow = await storage.getSdpInvoiceByToken(token);
      
      if (!invoiceRow) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Enrich with line items
      const lineItems = await storage.getSdpInvoiceLineItems(invoiceRow.id);
      
      // Enrich with business names
      const toBusiness = invoiceRow.toBusinessId ? await storage.getBusinessById(invoiceRow.toBusinessId) : null;
      const fromBusiness = invoiceRow.fromBusinessId ? await storage.getBusinessById(invoiceRow.fromBusinessId) : null;
      const fromCountry = invoiceRow.fromCountryId ? await storage.getCountryById(invoiceRow.fromCountryId) : null;
      
      // Enrich with timesheet details if linked
      let timesheetDetails = null;
      if (invoiceRow.timesheetId) {
        const ts = await storage.getTimesheetById(invoiceRow.timesheetId);
        if (ts) {
          const worker = ts.workerId ? await storage.getWorkerById(ts.workerId) : null;
          const workerUser = worker?.userId ? await storage.getUser(worker.userId) : null;
          timesheetDetails = {
            periodStart: ts.periodStart,
            periodEnd: ts.periodEnd,
            totalHours: ts.totalHours,
            workerName: workerUser ? `${workerUser.firstName} ${workerUser.lastName}` : null,
            status: ts.status,
          };
        }
      }
      
      res.json({
        ...invoiceRow,
        lineItems,
        toBusiness: toBusiness ? { id: toBusiness.id, name: toBusiness.name } : null,
        fromBusiness: fromBusiness ? { id: fromBusiness.id, name: fromBusiness.name } : null,
        fromCountry: fromCountry ? { id: fromCountry.id, name: fromCountry.name } : null,
        timesheetDetails,
      });
    } catch (error: any) {
      console.error('Error fetching public invoice view:', error);
      res.status(500).json({ message: 'Failed to load invoice' });
    }
  });

  // Client invoices: invoices raised by a business TO their host clients.
  // Includes both auto-generated customer_billing (from timesheet approval) and
  // manually created business_to_client invoices. Both categories use fromBusinessId
  // to track which employing business they belong to.
  app.get('/api/client-invoices', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      // Helper: enrich an invoice with line items + contract + timesheet + worker + host client business
      const enrich = async (inv: any) => {
        const lineItems = await storage.getSdpInvoiceLineItems(inv.id);
        let contract: any = null;
        if (inv.contractId) {
          try {
            const c: any = await storage.getContractById(inv.contractId);
            if (c) {
              let title = c.customRoleTitle || '';
              if (!title && c.roleTitleId) {
                const rt = await storage.getRoleTitle(c.roleTitleId);
                title = rt?.title || '';
              }
              contract = {
                id: c.id,
                jobTitle: title || c.jobDescription || '',
                employmentType: c.employmentType,
                rateType: c.rateType,
                rate: c.rate,
                currency: c.currency,
                rateStructure: c.rateStructure,
                customerBillingRate: c.customerBillingRate,
                customerCurrency: c.customerCurrency,
                customerBillingRateType: c.customerBillingRateType,
                clientBillingType: c.clientBillingType,
                billingMode: c.billingMode,
                paymentTerms: c.paymentTerms,
                startDate: c.startDate,
                endDate: c.endDate,
                noticePeriodDays: c.noticePeriodDays ?? null,
                timesheetFrequency: c.timesheetFrequency || '',
                timesheetApproverRole: c.timesheetApproverRole || null,
                invoicingFrequency: c.invoicingFrequency || '',
              };
            }
          } catch {}
        }
        let timesheet: any = null;
        if (inv.timesheetId) {
          try {
            const ts: any = await storage.getTimesheetById(inv.timesheetId);
            if (ts) {
              const totalHoursNum = (ts.entries || []).reduce((s: number, e: any) => s + (parseFloat(e.hoursWorked || '0') || 0), 0);
              const totalDaysNum = (ts.entries || []).reduce((s: number, e: any) => s + (parseFloat(e.daysWorked || '0') || 0), 0);
              timesheet = {
                id: ts.id,
                periodStart: ts.periodStart,
                periodEnd: ts.periodEnd,
                totalHours: (parseFloat(ts.totalHours || '0') > 0) ? ts.totalHours : totalHoursNum.toFixed(2),
                totalDays: ts.totalDays ?? (totalDaysNum > 0 ? totalDaysNum.toFixed(2) : null),
                status: ts.status,
                entryCount: ts.entries?.length || 0,
                submittedAt: ts.submittedAt || null,
                approvedAt: ts.approvedAt || null,
              };
            }
          } catch {}
        }
        let worker: any = null;
        if (inv.workerId) {
          try {
            const w: any = await storage.getWorkerById(inv.workerId);
            if (w) worker = { id: w.id, firstName: w.firstName, lastName: w.lastName, email: w.email };
          } catch {}
        }
        let toBusiness: any = null;
        if (inv.toBusinessId) {
          try {
            const b: any = await storage.getBusinessById(inv.toBusinessId);
            if (b) toBusiness = { id: b.id, name: b.name, contactEmail: b.contactEmail, contactName: b.contactName };
          } catch {}
        }
        return { ...inv, lineItems, contract, timesheet, worker, toBusiness };
      };

      if (userType === 'sdp_internal') {
        const allInvoices = await storage.getAllSdpInvoices();
        const clientInvoices = allInvoices.filter(inv =>
          inv.invoiceCategory === 'business_to_client' || inv.invoiceCategory === 'customer_billing'
        );
        const enriched = await Promise.all(clientInvoices.map(enrich));
        return res.json(enriched);
      }

      if (userType !== 'business_user') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const business = await storage.getBusinessByOwnerId(userId);
      if (!business) return res.status(404).json({ message: 'Business not found' });

      const allInvoices = await storage.getAllSdpInvoices();
      const clientInvoices = allInvoices.filter(inv =>
        inv.fromBusinessId === business.id &&
        (inv.invoiceCategory === 'business_to_client' || inv.invoiceCategory === 'customer_billing')
      );
      const enriched = await Promise.all(clientInvoices.map(enrich));
      res.json(enriched);
    } catch (error: any) {
      console.error('Error fetching client invoices:', error);
      res.status(500).json({ message: 'Failed to fetch client invoices' });
    }
  });

  app.post('/api/client-invoices', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      if (userType !== 'business_user') {
        return res.status(403).json({ message: 'Only business users can create client invoices' });
      }

      const business = await storage.getBusinessByOwnerId(userId);
      if (!business) return res.status(404).json({ message: 'Business not found' });

      const {
        toBusinessId,
        contractId,
        description,
        lineItems,
        subtotal,
        totalAmount,
        currency,
        invoiceDate,
        dueDate,
        periodStart,
        periodEnd,
        notes,
        fromCountryId,
      } = req.body;

      if (!toBusinessId || !description || !subtotal || !totalAmount || !currency || !invoiceDate || !dueDate || !fromCountryId) {
        return res.status(400).json({ message: 'Missing required fields: toBusinessId, description, subtotal, totalAmount, currency, invoiceDate, dueDate, fromCountryId' });
      }

      // Generate invoice number
      const allInvoices = await storage.getAllSdpInvoices();
      const btcInvoices = allInvoices.filter(inv => inv.invoiceCategory === 'business_to_client');
      const invoiceNumber = `BTC-${String(btcInvoices.length + 1).padStart(5, '0')}`;

      const invoice = await storage.createSdpInvoice({
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        invoiceCategory: 'business_to_client' as any,
        fromCountryId,
        toBusinessId,
        fromBusinessId: business.id,
        contractId: contractId || null,
        subtotal: subtotal.toString(),
        gstVatAmount: '0',
        gstVatRate: '0',
        totalAmount: totalAmount.toString(),
        currency,
        description,
        serviceType: 'client_services',
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        isCrossBorder: false,
        businessCountry: null,
        status: 'draft' as any,
        notes: notes || null,
        createdBy: userId,
      } as any);

      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        await storage.createSdpInvoiceLineItems(invoice.id, lineItems);
      }

      res.status(201).json(invoice);
    } catch (error: any) {
      console.error('Error creating client invoice:', error);
      res.status(500).json({ message: 'Failed to create client invoice' });
    }
  });

  app.post('/api/sdp-invoices', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Parse and validate input, but ignore client-provided amounts
      const {
        fromCountryId,
        toBusinessId,
        serviceType,
        description,
        subtotal,
        currency,
        invoiceDate,
        dueDate,
        periodStart,
        periodEnd,
        ...otherFields
      } = req.body;

      // Validate basic fields
      if (!fromCountryId || !toBusinessId || !serviceType || !description || !subtotal || !currency) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Get business and country data for cross-border determination
      const [fromCountry, toBusiness] = await Promise.all([
        storage.getCountryById(fromCountryId),
        storage.getBusinessById(toBusinessId)
      ]);

      if (!fromCountry || !toBusiness) {
        return res.status(400).json({ message: 'Invalid country or business' });
      }

      // Determine business country (use primary country or first accessible)
      const businessCountry = (toBusiness as any).countryId || toBusiness.accessibleCountries?.[0];
      const isCrossBorder = businessCountry && businessCountry !== fromCountryId;

      // Server-side GST/VAT calculation
      const subtotalAmount = parseFloat(subtotal);
      let gstVatRate = 0;
      let gstVatAmount = 0;

      if (!isCrossBorder) {
        // Apply local GST/VAT rates based on country (simplified - real rates would come from country config)
        const countryGstRates: Record<string, number> = {
          'aus': 10,  // Australia
          'nzl': 15,  // New Zealand
          'gbr': 20,  // UK VAT
          'irl': 23,  // Ireland VAT
          'sgp': 8,   // Singapore GST
        };
        gstVatRate = countryGstRates[fromCountry.code.toLowerCase()] || 10;
        gstVatAmount = subtotalAmount * (gstVatRate / 100);
      }

      const totalAmount = subtotalAmount + gstVatAmount;

      // Generate invoice number
      const invoiceNumber = await storage.generateSdpInvoiceNumber(fromCountryId);

      const invoiceData = {
        invoiceNumber,
        fromCountryId,
        toBusinessId,
        serviceType,
        description,
        subtotal: subtotalAmount.toString(),
        gstVatAmount: gstVatAmount.toString(),
        gstVatRate: gstVatRate.toString(),
        totalAmount: totalAmount.toString(),
        currency,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        isCrossBorder: !!isCrossBorder,
        businessCountry,
        status: 'draft' as const,
        createdBy: userId,
        ...otherFields,
      };

      const invoice = await storage.createSdpInvoice(invoiceData);
      
      // Handle line items if provided
      const { lineItems, purchaseOrderId } = req.body;
      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        await storage.createSdpInvoiceLineItems(invoice.id, lineItems);
      }

      // Link PO and update invoiced amount
      if (purchaseOrderId) {
        try {
          const po = await storage.getPurchaseOrderById(purchaseOrderId);
          if (po && po.status === 'open') {
            await storage.updateSdpInvoice(invoice.id, { purchaseOrderId } as any);
            await storage.updatePurchaseOrderInvoicedAmount(purchaseOrderId, totalAmount);
          }
        } catch (poErr: any) {
          console.error('Failed to link PO to invoice:', poErr);
        }
      }
      
      // Fetch invoice with line items for response
      const invoiceWithLineItems = {
        ...invoice,
        purchaseOrderId: purchaseOrderId || null,
        lineItems: await storage.getSdpInvoiceLineItems(invoice.id),
      };
      
      res.json(invoiceWithLineItems);
    } catch (error: any) {
      console.error('Error creating SDP invoice:', error);
      res.status(400).json({ message: 'Failed to create SDP invoice' });
    }
  });

  app.post('/api/sdp-invoices/from-timesheet/:timesheetId', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { timesheetId } = req.params;
      const { purchaseOrderId } = req.body;
      
      const invoice = await storage.createSdpInvoiceFromTimesheet(timesheetId, {
        ...req.body,
        createdBy: userId,
      });

      // Link PO if provided
      if (purchaseOrderId) {
        try {
          const po = await storage.getPurchaseOrderById(purchaseOrderId);
          if (po && po.status === 'open') {
            await storage.updateSdpInvoice(invoice.id, { purchaseOrderId } as any);
            await storage.updatePurchaseOrderInvoicedAmount(purchaseOrderId, parseFloat(invoice.totalAmount));
          }
        } catch (poErr: any) {
          console.error('Failed to link PO on from-timesheet invoice:', poErr);
        }
      }
      
      res.json(invoice);
    } catch (error: any) {
      console.error('Error creating SDP invoice from timesheet:', error);
      res.status(400).json({ message: 'Failed to create SDP invoice from timesheet' });
    }
  });

  // Consolidated invoice — create a single SDP invoice for multiple workers/timesheets
  app.post('/api/sdp-invoices/consolidated', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { fromCountryId, toBusinessId, timesheetIds, currency, invoiceDate, dueDate, purchaseOrderId } = req.body;

      if (!fromCountryId || !toBusinessId || !Array.isArray(timesheetIds) || timesheetIds.length === 0 || !currency || !invoiceDate || !dueDate) {
        return res.status(400).json({ message: 'Missing required fields: fromCountryId, toBusinessId, timesheetIds, currency, invoiceDate, dueDate' });
      }

      // Check none of the timesheets are already linked to an active (non-void) SDP invoice
      const alreadyInvoiced: string[] = [];
      for (const tsId of timesheetIds) {
        const link = await storage.getTimesheetSdpInvoiceLink(tsId);
        if (link && link.invoiceStatus !== 'void' && link.invoiceStatus !== 'cancelled') {
          alreadyInvoiced.push(tsId);
        }
      }
      if (alreadyInvoiced.length > 0) {
        return res.status(409).json({ message: `${alreadyInvoiced.length} timesheet(s) are already included in an active SDP invoice. Retract or void the existing invoice first.`, timesheetIds: alreadyInvoiced });
      }

      // Load all timesheets with their contracts and workers
      const [fromCountry, toBusiness] = await Promise.all([
        storage.getCountryById(fromCountryId),
        storage.getBusinessById(toBusinessId),
      ]);
      if (!fromCountry || !toBusiness) {
        return res.status(400).json({ message: 'Invalid country or business' });
      }

      const lineItems: { description: string; quantity: string; unitPrice: string; amount: string; sortOrder: number }[] = [];
      let subtotalAmount = 0;

      for (let i = 0; i < timesheetIds.length; i++) {
        const ts = await storage.getTimesheetById(timesheetIds[i]);
        if (!ts) return res.status(400).json({ message: `Timesheet ${timesheetIds[i]} not found` });
        if (ts.status !== 'approved') return res.status(400).json({ message: `Timesheet ${timesheetIds[i]} is not approved` });

        const contract = await storage.getContractById(ts.contractId);
        if (!contract) return res.status(400).json({ message: `Contract not found for timesheet ${timesheetIds[i]}` });
        if (contract.businessId !== toBusinessId) return res.status(400).json({ message: `Timesheet ${timesheetIds[i]} does not belong to the selected business` });

        const workerName = ts.worker ? `${ts.worker.firstName} ${ts.worker.lastName}` : 'Worker';
        const rateType = contract.rateType || 'hourly';
        const rate = parseFloat(contract.rate || '0');
        let qty = 0;

        if (rateType === 'daily') {
          qty = ts.entries.reduce((sum: number, e: any) => sum + parseFloat(e.daysWorked || '0'), 0);
        } else {
          qty = ts.entries.reduce((sum: number, e: any) => sum + parseFloat(e.hoursWorked || '0'), 0);
        }

        const amount = qty * rate;
        subtotalAmount += amount;
        const unit = rateType === 'daily' ? 'day' : 'hr';
        const period = `${ts.periodStart?.toString().slice(0, 10) ?? ''} – ${ts.periodEnd?.toString().slice(0, 10) ?? ''}`;
        lineItems.push({
          description: `${workerName} — ${period} (${qty} ${unit}${qty !== 1 ? 's' : ''} @ ${contract.currency} ${rate}/${unit})`,
          quantity: qty.toFixed(2),
          unitPrice: rate.toFixed(2),
          amount: amount.toFixed(2),
          sortOrder: i,
        });
      }

      // GST/VAT calculation
      const businessCountry = (toBusiness as any).countryId || (toBusiness as any).accessibleCountries?.[0];
      const isCrossBorder = businessCountry && businessCountry !== fromCountryId;
      let gstVatRate = 0;
      let gstVatAmount = 0;
      if (!isCrossBorder) {
        const countryGstRates: Record<string, number> = { 'aus': 10, 'nzl': 15, 'gbr': 20, 'irl': 23, 'sgp': 8 };
        gstVatRate = countryGstRates[fromCountry.code.toLowerCase()] || 10;
        gstVatAmount = subtotalAmount * (gstVatRate / 100);
      }
      const totalAmount = subtotalAmount + gstVatAmount;

      const invoiceNumber = await storage.generateSdpInvoiceNumber(fromCountryId);
      const invoice = await storage.createSdpInvoice({
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        invoiceCategory: 'sdp_services',
        fromCountryId,
        toBusinessId,
        serviceType: 'Employment Services — Consolidated',
        description: `Consolidated worker invoice for ${timesheetIds.length} worker(s)`,
        subtotal: subtotalAmount.toFixed(2),
        gstVatAmount: gstVatAmount.toFixed(2),
        gstVatRate: gstVatRate.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        currency,
        isCrossBorder: !!isCrossBorder,
        businessCountry: businessCountry || null,
        status: 'draft',
        createdBy: userId,
        purchaseOrderId: purchaseOrderId || null,
      } as any);

      await storage.createSdpInvoiceLineItems(invoice.id, lineItems);
      await storage.linkTimesheetsToSdpInvoice(invoice.id, timesheetIds);

      if (purchaseOrderId) {
        try {
          const po = await storage.getPurchaseOrderById(purchaseOrderId);
          if (po && po.status === 'open') {
            await storage.updatePurchaseOrderInvoicedAmount(purchaseOrderId, totalAmount);
          }
        } catch (poErr: any) {
          console.error('Failed to link PO on consolidated invoice:', poErr);
        }
      }

      res.json({
        ...invoice,
        lineItems: await storage.getSdpInvoiceLineItems(invoice.id),
        timesheetIds,
      });
    } catch (error: any) {
      console.error('Error creating consolidated SDP invoice:', error);
      res.status(500).json({ message: 'Failed to create consolidated invoice' });
    }
  });

  // Get timesheets linked to an SDP invoice
  app.get('/api/sdp-invoices/:id/timesheets', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const rows = await storage.getSdpInvoiceTimesheets(id);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch invoice timesheets' });
    }
  });

  // Retract (void) an SDP invoice — frees linked timesheets for re-consolidation
  app.post('/api/sdp-invoices/:id/retract', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getSdpInvoiceById(id);
      if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
      if (invoice.status === 'paid') {
        return res.status(409).json({ message: 'Cannot retract an invoice where payment has been received.' });
      }
      await storage.updateSdpInvoice(id, { status: 'cancelled' } as any);
      // Reverse PO invoiced amount if linked
      if ((invoice as any).purchaseOrderId) {
        try {
          await storage.updatePurchaseOrderInvoicedAmount((invoice as any).purchaseOrderId, -parseFloat(invoice.totalAmount));
        } catch (poErr: any) { console.error('PO reversal failed:', poErr); }
      }
      const updated = await storage.getSdpInvoiceById(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error retracting SDP invoice:', error);
      res.status(500).json({ message: 'Failed to retract invoice' });
    }
  });

  // Delete an SDP invoice — blocked if paid
  app.delete('/api/sdp-invoices/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getSdpInvoiceById(id);
      if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
      if (invoice.status === 'paid') {
        return res.status(403).json({ message: 'Cannot delete an invoice where payment has been received.' });
      }
      // Reverse PO invoiced amount if linked
      if ((invoice as any).purchaseOrderId) {
        try {
          await storage.updatePurchaseOrderInvoicedAmount((invoice as any).purchaseOrderId, -parseFloat(invoice.totalAmount));
        } catch (poErr: any) { console.error('PO reversal on delete failed:', poErr); }
      }
      await storage.deleteSdpInvoiceById(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting SDP invoice:', error);
      res.status(500).json({ message: 'Failed to delete invoice' });
    }
  });

  app.patch('/api/sdp-invoices/:id/status', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      await storage.updateSdpInvoiceStatus(id, status, notes);
      
      // Get updated invoice for response
      const updatedInvoice = await storage.getSdpInvoiceById(id);
      res.json(updatedInvoice);
    } catch (error: any) {
      console.error('Error updating SDP invoice status:', error);
      res.status(500).json({ message: 'Failed to update SDP invoice status' });
    }
  });

  app.get('/api/sdp-invoices/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getSdpInvoiceById(id);
      
      if (!invoice) {
        return res.status(404).json({ message: 'SDP invoice not found' });
      }
      
      res.json(invoice);
    } catch (error: any) {
      console.error('Error fetching SDP invoice:', error);
      res.status(500).json({ message: 'Failed to fetch SDP invoice' });
    }
  });

  // Stripe Payment routes for SDP invoices (referenced from Stripe integration blueprint)
  app.post('/api/sdp-invoices/:id/create-payment-intent', authMiddleware, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: 'Payment processing is not configured. Please contact support.' });
      }

      const { id } = req.params;
      const userId = req.user?.id;
      
      // Check if user is authorized to pay this invoice (business user from the invoice's business)
      const invoice = await storage.getSdpInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: 'SDP invoice not found' });
      }

      // Only business users from the invoiced business can pay
      if (req.user?.userType !== 'business_user') {
        return res.status(403).json({ message: 'Only business users can pay invoices' });
      }

      // Verify the user belongs to the business being invoiced
      const userBusiness = await storage.getBusinessByOwnerId(userId);
      if (!userBusiness || userBusiness.id !== invoice.toBusinessId) {
        return res.status(403).json({ message: 'You can only pay invoices for your own business' });
      }

      // Only allow payment creation for issued or overdue invoices
      if (!['issued', 'overdue'].includes(invoice.status ?? '')) {
        return res.status(400).json({ message: 'Invoice cannot be paid in its current status' });
      }

      // Create payment intent for the total amount
      const totalAmountInCents = Math.round(parseFloat(invoice.totalAmount) * 100);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmountInCents,
        currency: invoice.currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true
        },
        metadata: {
          sdpInvoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          businessId: invoice.toBusinessId,
          userId: userId
        }
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        invoiceNumber: invoice.invoiceNumber
      });
    } catch (error: any) {
      console.error('Error creating payment intent for SDP invoice:', error);
      res.status(500).json({ message: 'Error creating payment intent: ' + error.message });
    }
  });

  app.post('/api/sdp-invoices/:id/confirm-payment', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { paymentIntentId } = req.body;
      const userId = req.user?.id;

      if (!stripe) {
        return res.status(503).json({ message: 'Payment processing is not configured' });
      }

      // Get the invoice and verify it exists
      const invoice = await storage.getSdpInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: 'SDP invoice not found' });
      }

      // Only business users from the invoiced business can confirm payment
      if (req.user?.userType !== 'business_user') {
        return res.status(403).json({ message: 'Only business users can confirm invoice payments' });
      }

      // Verify the user belongs to the business being invoiced
      const userBusiness = await storage.getBusinessByOwnerId(userId);
      if (!userBusiness || userBusiness.id !== invoice.toBusinessId) {
        return res.status(403).json({ message: 'You can only confirm payments for your own business invoices' });
      }

      // Only allow payment confirmation for issued or overdue invoices
      if (!['issued', 'overdue'].includes(invoice.status ?? '')) {
        return res.status(400).json({ message: 'Invoice cannot be paid in its current status' });
      }

      // Verify payment intent was successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: 'Payment was not successful' });
      }

      // CRITICAL SECURITY VALIDATION: Verify the payment intent matches this specific invoice
      if (paymentIntent.metadata.sdpInvoiceId !== id) {
        return res.status(400).json({ message: 'Payment intent does not match invoice' });
      }

      if (paymentIntent.metadata.businessId !== invoice.toBusinessId) {
        return res.status(400).json({ message: 'Payment intent business does not match invoice business' });
      }

      if (paymentIntent.metadata.userId !== userId) {
        return res.status(400).json({ message: 'Payment intent user does not match current user' });
      }

      // Verify payment amount matches invoice total (convert to cents for comparison)
      const invoiceAmountInCents = Math.round(parseFloat(invoice.totalAmount) * 100);
      if (paymentIntent.amount !== invoiceAmountInCents) {
        return res.status(400).json({ message: 'Payment amount does not match invoice total' });
      }

      // Verify currency matches
      if (paymentIntent.currency.toLowerCase() !== invoice.currency.toLowerCase()) {
        return res.status(400).json({ message: 'Payment currency does not match invoice currency' });
      }

      // Update invoice status to paid (this automatically sets paidAt timestamp)
      await storage.updateSdpInvoiceStatus(id, 'paid');

      const updatedInvoice = await storage.getSdpInvoiceById(id);
      
      res.json({ 
        message: 'Payment confirmed successfully',
        invoice: updatedInvoice,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error('Error confirming payment for SDP invoice:', error);
      res.status(500).json({ message: 'Error confirming payment: ' + error.message });
    }
  });

  // New SDP Invoice management endpoints
  
  // Edit SDP Invoice (only draft and issued status allowed)
  app.patch('/api/sdp-invoices/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Get current invoice to check status
      const currentInvoice = await storage.getSdpInvoiceById(id);
      if (!currentInvoice) {
        return res.status(404).json({ message: 'SDP invoice not found' });
      }
      
      // Only allow editing of draft and issued invoices
      if (!['draft', 'issued'].includes(currentInvoice.status ?? '')) {
        return res.status(400).json({ 
          message: 'Can only edit invoices in draft or issued status' 
        });
      }
      
      // Extract line items from updates (if present)
      const { lineItems, ...invoiceUpdates } = updates;
      
      // Convert date strings to Date objects if present
      const processedUpdates: any = { ...invoiceUpdates };
      if (processedUpdates.invoiceDate && typeof processedUpdates.invoiceDate === 'string') {
        processedUpdates.invoiceDate = new Date(processedUpdates.invoiceDate);
      }
      if (processedUpdates.dueDate && typeof processedUpdates.dueDate === 'string') {
        processedUpdates.dueDate = new Date(processedUpdates.dueDate);
      }
      if (processedUpdates.periodStart && typeof processedUpdates.periodStart === 'string') {
        processedUpdates.periodStart = new Date(processedUpdates.periodStart);
      }
      if (processedUpdates.periodEnd && typeof processedUpdates.periodEnd === 'string') {
        processedUpdates.periodEnd = new Date(processedUpdates.periodEnd);
      }
      
      // Update the invoice
      const updatedInvoice = await storage.updateSdpInvoice(id, processedUpdates);
      
      // Handle line items update if provided
      if (lineItems && Array.isArray(lineItems)) {
        await storage.updateSdpInvoiceLineItems(id, lineItems);
      }
      
      // Fetch invoice with line items for response
      const invoiceWithLineItems = {
        ...updatedInvoice,
        lineItems: await storage.getSdpInvoiceLineItems(id),
      };
      
      res.json(invoiceWithLineItems);
    } catch (error: any) {
      console.error('Error updating SDP invoice:', error);
      res.status(500).json({ message: 'Failed to update SDP invoice' });
    }
  });

  // Send SDP Invoice via email
  app.post('/api/sdp-invoices/:id/send', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get invoice details
      const invoice = await storage.getSdpInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: 'SDP invoice not found' });
      }
      
      // Only allow sending of issued invoices
      if (invoice.status !== 'issued') {
        return res.status(400).json({ 
          message: 'Can only send invoices in issued status' 
        });
      }
      
      // Get business details for email
      const business = await storage.getBusinessById(invoice.toBusinessId);
      if (!business) {
        return res.status(404).json({ message: 'Business not found' });
      }
      
      // Get business owner for email address
      const businessOwner = await storage.getUser(business.ownerId);
      if (!businessOwner || !businessOwner.email) {
        return res.status(400).json({ 
          message: 'Business owner email not found' 
        });
      }
      
      // Get country details for email
      const country = await storage.getCountryById(invoice.fromCountryId);
      if (!country) {
        return res.status(404).json({ message: 'Country not found' });
      }
      
      // Format due date for email
      const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Build secure view link for this invoice
      const baseUrl = process.env.FRONTEND_URL || 'https://sdpglobalpay.com';
      const viewLink = (invoice as any).viewToken ? `${baseUrl}/invoice/view/${(invoice as any).viewToken}` : null;
      
      // For unregistered host clients (no platform access), generate Stripe Payment Link
      // Registered businesses use the in-platform Stripe checkout instead
      let stripePaymentLink: string | null = null;
      if (business.isRegistered === false && stripe) {
        try {
          const amountInCents = Math.round(parseFloat(invoice.totalAmount) * 100);
          // Create a Stripe Price on-the-fly for this invoice amount
          const price = await stripe.prices.create({
            currency: invoice.currency.toLowerCase(),
            unit_amount: amountInCents,
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              metadata: { sdpInvoiceId: invoice.id },
            },
          });
          // Create Payment Link — payer bears Stripe processing fees (standard behaviour)
          const paymentLink = await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            metadata: { sdpInvoiceId: invoice.id },
            after_completion: { type: 'redirect', redirect: { url: viewLink || baseUrl } },
          });
          stripePaymentLink = paymentLink.url;
          // Persist the payment link on the invoice record
          await storage.updateSdpInvoice(id, { stripePaymentLink } as any);
          console.log(`Generated Stripe Payment Link for unregistered host client invoice ${invoice.invoiceNumber}`);
        } catch (stripeErr: any) {
          console.error('Failed to generate Stripe Payment Link:', stripeErr);
          // Don't block sending — payment link is optional
        }
      }
      
      // Determine recipient email: registered business uses ownerId, unregistered uses contactEmail
      const recipientEmail = businessOwner?.email || (business as any).contactEmail;
      if (!recipientEmail) {
        return res.status(400).json({ message: 'No email address found for invoice recipient' });
      }
      
      // Send email using the email service
      const emailSent = await emailService.sendSdpInvoiceEmail(
        recipientEmail,
        business.name,
        invoice.invoiceNumber,
        invoice.totalAmount,
        invoice.currency,
        dueDate,
        invoice.description,
        country.name,
        viewLink || undefined,
        stripePaymentLink || undefined
      );
      
      if (emailSent) {
        // Mark invoice as sent
        await storage.markSdpInvoiceAsSent(id);
        
        const updatedInvoice = await storage.getSdpInvoiceById(id);
        res.json({ 
          message: 'Invoice sent successfully',
          invoice: updatedInvoice,
          viewLink,
          stripePaymentLink,
        });
      } else {
        res.status(500).json({ message: 'Failed to send invoice email' });
      }
    } catch (error: any) {
      console.error('Error sending SDP invoice:', error);
      res.status(500).json({ message: 'Failed to send SDP invoice' });
    }
  });

  // Mark SDP Invoice as paid (manual payment tracking)
  app.post('/api/sdp-invoices/:id/mark-paid', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { paidAmount, paidDate } = req.body;
      
      // Validate required fields
      if (!paidAmount || isNaN(parseFloat(paidAmount))) {
        return res.status(400).json({ message: 'Valid paid amount is required' });
      }
      
      // Get current invoice
      const invoice = await storage.getSdpInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: 'SDP invoice not found' });
      }
      
      // Only allow marking as paid for sent, issued, or overdue invoices
      if (!['sent', 'issued', 'overdue'].includes(invoice.status ?? '')) {
        return res.status(400).json({ 
          message: 'Can only mark sent, issued, or overdue invoices as paid' 
        });
      }
      
      // Parse and validate dates
      const paymentDate = paidDate ? new Date(paidDate) : new Date();
      
      // Mark as paid
      await storage.markSdpInvoiceAsPaid(id, paidAmount, paymentDate);
      
      const updatedInvoice = await storage.getSdpInvoiceById(id);
      res.json({
        message: 'Invoice marked as paid successfully',
        invoice: updatedInvoice
      });
    } catch (error: any) {
      console.error('Error marking SDP invoice as paid:', error);
      res.status(500).json({ message: 'Failed to mark SDP invoice as paid' });
    }
  });

  // Resend SDP Invoice (re-sends email for already-sent invoices)
  app.post('/api/sdp-invoices/:id/resend', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;

      const invoice = await storage.getSdpInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: 'SDP invoice not found' });
      }

      if (!['issued', 'sent', 'overdue'].includes(invoice.status ?? '')) {
        return res.status(400).json({ message: 'Can only resend issued, sent, or overdue invoices' });
      }

      const business = await storage.getBusinessById(invoice.toBusinessId);
      if (!business) return res.status(404).json({ message: 'Business not found' });

      const businessOwner = await storage.getUser(business.ownerId);
      const country = await storage.getCountryById(invoice.fromCountryId);
      if (!country) return res.status(404).json({ message: 'Country not found' });

      const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      const baseUrl = process.env.FRONTEND_URL || 'https://sdpglobalpay.com';
      const viewLink = (invoice as any).viewToken ? `${baseUrl}/invoice/view/${(invoice as any).viewToken}` : null;

      let stripePaymentLink: string | null = (invoice as any).stripePaymentLink || null;
      if (!stripePaymentLink && business.isRegistered === false && stripe) {
        try {
          const amountInCents = Math.round(parseFloat(invoice.totalAmount) * 100);
          const price = await stripe.prices.create({
            currency: invoice.currency.toLowerCase(),
            unit_amount: amountInCents,
            product_data: { name: `Invoice ${invoice.invoiceNumber}`, metadata: { sdpInvoiceId: invoice.id } },
          });
          const paymentLink = await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            metadata: { sdpInvoiceId: invoice.id },
            after_completion: { type: 'redirect', redirect: { url: viewLink || baseUrl } },
          });
          stripePaymentLink = paymentLink.url;
          await storage.updateSdpInvoice(id, { stripePaymentLink } as any);
        } catch (stripeErr: any) {
          console.error('Failed to generate Stripe Payment Link on resend:', stripeErr);
        }
      }

      const recipientEmail = businessOwner?.email || (business as any).contactEmail;
      if (!recipientEmail) {
        return res.status(400).json({ message: 'No email address found for invoice recipient' });
      }

      const emailSent = await emailService.sendSdpInvoiceEmail(
        recipientEmail, business.name, invoice.invoiceNumber,
        invoice.totalAmount, invoice.currency, dueDate,
        invoice.description, country.name,
        viewLink || undefined, stripePaymentLink || undefined
      );

      if (emailSent) {
        if (invoice.status === 'issued') {
          await storage.markSdpInvoiceAsSent(id);
        }
        const updatedInvoice = await storage.getSdpInvoiceById(id);
        res.json({ message: 'Invoice resent successfully', invoice: updatedInvoice });
      } else {
        res.status(500).json({ message: 'Failed to resend invoice email' });
      }
    } catch (error: any) {
      console.error('Error resending SDP invoice:', error);
      res.status(500).json({ message: 'Failed to resend SDP invoice' });
    }
  });

  // Revise SDP Invoice (resets a sent invoice back to draft for re-editing)
  app.post('/api/sdp-invoices/:id/revise', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;

      const invoice = await storage.getSdpInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: 'SDP invoice not found' });
      }

      if (!['sent', 'overdue'].includes(invoice.status ?? '')) {
        return res.status(400).json({ message: 'Only sent or overdue invoices can be revised' });
      }

      await storage.updateSdpInvoice(id, {
        status: 'draft',
        sentAt: null,
        lastModified: new Date(),
      } as any);

      const updatedInvoice = await storage.getSdpInvoiceById(id);
      res.json({ message: 'Invoice reset to draft for revision', invoice: updatedInvoice });
    } catch (error: any) {
      console.error('Error revising SDP invoice:', error);
      res.status(500).json({ message: 'Failed to revise SDP invoice' });
    }
  });

  // Margin Payment routes (for tracking margin payments to businesses from customer invoices)
  app.get('/api/margin-payments', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { invoiceId, businessId } = req.query;
      
      let payments;
      if (invoiceId) {
        payments = await storage.getMarginPaymentsByInvoice(invoiceId);
      } else if (businessId) {
        payments = await storage.getMarginPaymentsByBusiness(businessId);
      } else {
        payments = await storage.getAllMarginPayments();
      }
      
      res.json(payments);
    } catch (error: any) {
      console.error('Error fetching margin payments:', error);
      res.status(500).json({ message: 'Failed to fetch margin payments' });
    }
  });

  app.post('/api/margin-payments', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { sdpInvoiceId, businessId, contractId, marginAmount, currency, status, paidDate, referenceNumber, suggestedMargin, notes } = req.body;
      
      // Validate required fields
      if (!sdpInvoiceId || !businessId || !marginAmount || !currency) {
        return res.status(400).json({ message: 'Invoice ID, business ID, margin amount, and currency are required' });
      }
      
      // Validate that the invoice exists and matches the business
      const invoice = await storage.getSdpInvoiceById(sdpInvoiceId);
      if (!invoice) {
        return res.status(404).json({ message: 'SDP invoice not found' });
      }
      
      if (invoice.toBusinessId !== businessId) {
        return res.status(400).json({ message: 'Business ID does not match invoice business' });
      }
      
      // Validate that the invoice is a customer billing invoice
      if (invoice.invoiceCategory !== 'customer_billing') {
        return res.status(400).json({ message: 'Margin payments can only be created for customer billing invoices' });
      }
      
      // Validate that currency matches invoice currency
      if (currency !== invoice.currency) {
        return res.status(400).json({ message: 'Margin payment currency must match invoice currency' });
      }
      
      // Create margin payment
      const payment = await storage.createMarginPayment({
        sdpInvoiceId,
        businessId,
        contractId: contractId || null,
        marginAmount,
        currency,
        status: status || 'pending',
        paidDate: paidDate ? new Date(paidDate) : undefined,
        paidByUserId: status === 'paid' ? userId : null,
        referenceNumber: referenceNumber || null,
        suggestedMargin: suggestedMargin || null,
        notes: notes || null,
      });
      
      res.json(payment);
    } catch (error: any) {
      console.error('Error creating margin payment:', error);
      res.status(500).json({ message: 'Failed to create margin payment' });
    }
  });

  app.patch('/api/margin-payments/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updates = req.body;
      
      // Get all payments to find the current one (needed to determine invoice ID)
      const allPayments = await storage.getAllMarginPayments();
      const currentPayment = allPayments.find(p => p.id === id);
      
      if (!currentPayment) {
        return res.status(404).json({ message: 'Margin payment not found' });
      }
      
      // If invoice ID or currency is being updated, validate
      if (updates.sdpInvoiceId || updates.currency) {
        const invoiceId = updates.sdpInvoiceId || currentPayment.sdpInvoiceId;
        const invoice = await storage.getSdpInvoiceById(invoiceId);
        
        if (!invoice) {
          return res.status(404).json({ message: 'SDP invoice not found' });
        }
        
        // Validate invoice category
        if (invoice.invoiceCategory !== 'customer_billing') {
          return res.status(400).json({ message: 'Margin payments can only be created for customer billing invoices' });
        }
        
        // Validate currency matches invoice
        const newCurrency = updates.currency || currentPayment.currency;
        if (newCurrency !== invoice.currency) {
          return res.status(400).json({ message: 'Margin payment currency must match invoice currency' });
        }
      }
      
      // If marking as paid, set paidByUserId
      if (updates.status === 'paid' && !updates.paidByUserId) {
        updates.paidByUserId = userId;
      }
      
      // Convert date strings to Date objects
      if (updates.paidDate) {
        updates.paidDate = new Date(updates.paidDate);
      }
      
      const payment = await storage.updateMarginPayment(id, updates);
      res.json(payment);
    } catch (error: any) {
      console.error('Error updating margin payment:', error);
      res.status(500).json({ message: 'Failed to update margin payment' });
    }
  });

  app.delete('/api/margin-payments/:id', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get the margin payment to check if it's paid
      const allPayments = await storage.getAllMarginPayments();
      const payment = allPayments.find(p => p.id === id);
      
      if (!payment) {
        return res.status(404).json({ message: 'Margin payment not found' });
      }
      
      // Prevent deletion of paid margin payments for auditability
      if (payment.status === 'paid' || payment.paidByUserId) {
        return res.status(400).json({ message: 'Cannot delete paid margin payments. This would undermine financial auditability.' });
      }
      
      await storage.deleteMarginPayment(id);
      res.json({ message: 'Margin payment deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting margin payment:', error);
      res.status(500).json({ message: 'Failed to delete margin payment' });
    }
  });

  // Worker Profile routes for onboarding
  app.get('/api/worker-profile', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const worker = await storage.getWorkerByUserId(userId);
      
      if (!worker) {
        return res.status(404).json({ message: 'Worker profile not found' });
      }

      res.json(worker);
    } catch (error: any) {
      console.error('Error fetching worker profile:', error);
      res.status(500).json({ message: 'Failed to fetch worker profile' });
    }
  });

  app.patch('/api/worker-profile', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const worker = await storage.getWorkerByUserId(userId);
      
      if (!worker) {
        return res.status(404).json({ message: 'Worker profile not found' });
      }

      const updates = req.body;
      const updatedWorker = await storage.updateWorkerProfile(worker.id, updates);
      
      res.json(updatedWorker);
    } catch (error: any) {
      console.error('Error updating worker profile:', error);
      res.status(500).json({ message: 'Failed to update worker profile' });
    }
  });

  // Reports routes for SDP internal users
  app.get('/api/reports/sdp-invoices', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const reportFiltersSchema = z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        countryId: z.string().optional(),
        businessId: z.string().optional(),
      });
      
      const filters = reportFiltersSchema.parse(req.query);
      const reportData = await storage.getSdpInvoiceReport(filters);
      res.json(reportData);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid query parameters', errors: error.errors });
      }
      console.error('Error generating SDP invoice report:', error);
      res.status(500).json({ message: 'Failed to generate SDP invoice report' });
    }
  });

  app.get('/api/reports/timesheets', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const reportFiltersSchema = z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        countryId: z.string().optional(),
        businessId: z.string().optional(),
      });
      
      const filters = reportFiltersSchema.parse(req.query);
      const reportData = await storage.getTimesheetReport(filters);
      res.json(reportData);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid query parameters', errors: error.errors });
      }
      console.error('Error generating timesheet report:', error);
      res.status(500).json({ message: 'Failed to generate timesheet report' });
    }
  });

  app.get('/api/reports/payslips', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const reportFiltersSchema = z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        countryId: z.string().optional(),
        businessId: z.string().optional(),
      });
      
      const filters = reportFiltersSchema.parse(req.query);
      const reportData = await storage.getPayslipReport(filters);
      res.json(reportData);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid query parameters', errors: error.errors });
      }
      console.error('Error generating payslip report:', error);
      res.status(500).json({ message: 'Failed to generate payslip report' });
    }
  });

  // Email report functionality
  app.post('/api/reports/email', authMiddleware, requireSdpRole(['sdp_super_admin', 'sdp_admin', 'sdp_agent']), async (req: any, res) => {
    try {
      const emailReportSchema = z.object({
        type: z.enum(['sdp-invoices', 'timesheets', 'payslips']),
        format: z.enum(['xlsx', 'pdf']),
        to: z.array(z.string().email()).min(1, 'At least one recipient is required'),
        subject: z.string().optional(),
        message: z.string().optional(),
        filters: z.object({
          from: z.string().optional(),
          to: z.string().optional(),
          countryId: z.string().optional(),
          businessId: z.string().optional(),
        }).optional(),
      });
      
      const { type, format, filters, to, subject, message } = emailReportSchema.parse(req.body);

      // Get report data based on type
      let reportData;
      const reportFilters = filters || {};
      
      switch (type) {
        case 'sdp-invoices':
          reportData = await storage.getSdpInvoiceReport(reportFilters);
          break;
        case 'timesheets':
          reportData = await storage.getTimesheetReport(reportFilters);
          break;
        case 'payslips':
          reportData = await storage.getPayslipReport(reportFilters);
          break;
        default:
          return res.status(400).json({ message: 'Invalid report type' });
      }

      if (reportData.length === 0) {
        return res.status(400).json({ message: 'No data found for the specified criteria' });
      }

      // Send email with report
      await emailService.sendReportEmail({
        to: to,
        subject: subject || `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
        message: message || 'Please find the attached report.',
        reportData,
        reportType: type,
        format,
      });

      res.json({ message: 'Report sent successfully' });
    } catch (error: any) {
      console.error('Error sending report via email:', error);
      res.status(500).json({ message: 'Failed to send report via email' });
    }
  });

  // Object storage routes for payslip files
  app.post("/api/objects/upload", authMiddleware, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Optional authentication middleware for objects - allows both authenticated and unauthenticated access
  // This is a simpler implementation that doesn't use authMiddleware to avoid response conflicts
  const optionalAuthMiddleware = (req: any, res: any, next: any) => {
    // For now, skip authentication for objects route and rely on ACL policies
    // Public objects with visibility: "public" will be accessible to everyone
    // Private objects will be blocked by the ACL check in the route handler
    req.user = undefined;
    next();
  };

  app.get("/objects/:objectPath(*)", optionalAuthMiddleware, async (req, res) => {
    const userId = req.user?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );

      // For profile pictures, try to set public ACL if it hasn't been set yet
      if (req.path.includes('/profile-pictures/')) {
        try {
          const currentAcl = await import('./objectAcl').then(m => m.getObjectAclPolicy(objectFile));
          if (!currentAcl) {
            console.log("Setting public ACL for profile picture:", req.path);
            await import('./objectAcl').then(m => m.setObjectAclPolicy(objectFile, {
              owner: userId || 'system',
              visibility: 'public'
            }));
          }
        } catch (aclError: any) {
          console.log("Could not set ACL for profile picture:", aclError.message);
          // Continue anyway - maybe it's already public or access will be checked below
        }
      }

      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: 'read' as any,
      });
      if (!canAccess) {
        return res.sendStatus(403);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.put("/api/payslip-documents", authMiddleware, async (req, res) => {
    if (!req.body.payslipURL) {
      return res.status(400).json({ error: "payslipURL is required" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);

    if (!user || user.userType !== 'sdp_internal') {
      return res.status(403).json({ message: "Access denied. SDP internal users only." });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.payslipURL,
        {
          owner: userId,
          visibility: "private", // Payslips are private documents
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error: any) {
      console.error("Error setting payslip document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Country document upload URL - Get signed URL for uploading country documents
  app.get("/api/countries/:countryId/documents/upload-url", authMiddleware, requireSdpRole(['sdp_admin', 'sdp_super_admin']), async (req, res) => {
    const { countryId } = req.params;
    const { documentType } = req.query;

    if (!documentType || typeof documentType !== 'string') {
      return res.status(400).json({ error: "documentType query parameter is required" });
    }

    try {
      // Verify country exists
      const country = await storage.getCountryById(countryId);
      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getCountryDocumentUploadURL(countryId, documentType);

      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error generating country document upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Country document ACL setup - Set ACL policy after upload
  app.put("/api/countries/:countryId/documents", authMiddleware, requireSdpRole(['sdp_admin', 'sdp_super_admin']), async (req, res) => {
    const { countryId } = req.params;
    const { documentURL, documentType, fileName, description } = req.body;

    if (!documentURL || !documentType || !fileName) {
      return res.status(400).json({ error: "documentURL, documentType, and fileName are required" });
    }

    const userId = req.user?.id;

    try {
      // Verify country exists
      const country = await storage.getCountryById(countryId);
      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }

      const objectStorageService = new ObjectStorageService();

      // Set ACL policy for the uploaded document (private, only accessible to SDP users)
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        documentURL,
        {
          owner: userId ?? '',
          visibility: "private", // Country documents are private
          aclRules: [
            {
              group: { type: "user_type", values: ["sdp_internal"] } as any,
              permission: "readwrite" as any
            }
          ]
        }
      );

      // Save document metadata to database
      const document = await storage.createCountryDocument({
        countryId,
        category: documentType,
        name: fileName,
        objectKey: objectPath,
      } as any);

      res.status(200).json({
        document,
        objectPath
      });
    } catch (error: any) {
      console.error("Error setting country document ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // List country documents
  app.get("/api/countries/:countryId/documents", authMiddleware, requireSdpRole(['sdp_admin', 'sdp_super_admin']), async (req, res) => {
    const { countryId } = req.params;

    try {
      // Verify country exists
      const country = await storage.getCountryById(countryId);
      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }

      const documents = await storage.getCountryDocuments(countryId);
      res.json({ documents });
    } catch (error: any) {
      console.error("Error fetching country documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Download country document
  app.get("/api/countries/:countryId/documents/:documentId", authMiddleware, requireSdpRole(['sdp_admin', 'sdp_super_admin']), async (req, res) => {
    const { countryId, documentId } = req.params;
    const userId = req.user?.id;

    try {
      // Verify country exists
      const country = await storage.getCountryById(countryId);
      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }

      // Get document metadata
      const allDocs = await storage.getCountryDocuments(countryId);
      const document = (allDocs as any[]).find((d) => d.id === documentId);
      if (!document || document.countryId !== countryId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(document.objectKey);

      // Check if user can access this document
      const canAccess = await objectStorageService.canAccessObjectEntity({
        userId,
        objectFile,
        requestedPermission: 'read' as any,
      });

      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Set appropriate headers for file download
      res.set({
        'Content-Disposition': `attachment; filename="${document.name}"`,
        'X-Document-Type': document.category,
      });

      await objectStorageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error("Error downloading country document:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Send entity information email
  app.post("/api/countries/:countryId/send-entity-info", authMiddleware, requireSdpRole(['sdp_admin', 'sdp_super_admin']), async (req, res) => {
    try {
      // Validate request body with Zod
      const sendEntityEmailSchema = z.object({
        recipientEmail: z.string().email('Invalid email format'),
        recipientName: z.string().min(1, 'Recipient name is required'),
        message: z.string().optional()
      });

      const { countryId } = req.params;
      const validatedBody = sendEntityEmailSchema.parse(req.body);
      const { recipientEmail, recipientName, message } = validatedBody;
      const userId = req.user?.id;

      // Verify country exists
      const country = await storage.getCountryById(countryId);
      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }

      // Get sender information
      const sender = userId ? await storage.getUser(userId) : undefined;
      if (!sender) {
        return res.status(404).json({ error: "Sender not found" });
      }

      // Gather entity information
      const parties = await storage.getCountryParties(countryId);
      const documents = await storage.getCountryDocuments(countryId);

      // Format party information by type
      const shareholders = (parties as any[]).filter(p => p.type === 'shareholder')
        .map((p: any) => `${p.name} (${p.ownershipPercent || 0}%)`)
        .join(', ') || 'None listed';

      const directors = (parties as any[]).filter(p => p.type === 'director')
        .map((p: any) => `${p.name} (${p.titleOrRole || 'Director'})`)
        .join(', ') || 'None listed';

      const taxAdvisors = (parties as any[]).filter(p => p.type === 'tax_advisor')
        .map((p: any) => `${p.name} (${p.titleOrRole || 'Tax Advisor'})`)
        .join(', ') || 'None listed';

      // Prepare email variables
      const emailVariables = {
        recipientName,
        senderName: `${sender.firstName} ${sender.lastName}`,
        countryName: country.name,
        countryCode: country.code,
        entityName: (country as any).entityName || `${country.name} SDP Entity`,
        shareholders,
        directors,
        taxAdvisors,
        documentsCount: documents.length.toString(),
        complianceNotes: country.entityNotes || 'No specific compliance notes recorded',
        lastUpdated: new Date().toLocaleDateString(),
        accessLink: `${process.env.FRONTEND_URL || 'https://sdpglobalpay.com'}/country-management`,
        supportEmail: 'support@sdpglobalpay.com'
      };

      // Send email using EmailService
      await emailService.sendEmail({
        to: recipientEmail,
        templateKey: 'entity_information_sharing',
        variables: emailVariables,
        options: {
          locale: 'en',
          scopeType: 'global'
        }
      } as any);

      // Log the activity
      console.log(`📧 Entity information email sent for ${country.name} (${country.code}) to ${recipientEmail} by ${sender.email}`);

      res.json({ 
        success: true, 
        message: `Entity information for ${country.name} has been sent to ${recipientEmail}`,
        emailVariables: {
          ...emailVariables,
          // Don't expose internal access link in response
          accessLink: undefined
        }
      });

    } catch (error: any) {
      console.error("Error sending entity information email:", error);
      
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      res.status(500).json({ error: "Failed to send entity information email" });
    }
  });

  // SDP Internal Analytics route
  app.get('/api/sdp-internal/analytics', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Access denied. SDP internal users only." });
      }
      
      // For SDP internal users, empty accessibleCountries means access to all countries
      const countries = (!user.accessibleCountries || user.accessibleCountries.length === 0) ? [] : user.accessibleCountries;
      
      const analytics = await storage.getSDPInternalAnalytics(countries);
      res.json(analytics);
    } catch (error: any) {
      console.error("Error fetching SDP internal analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Benefits package route for workers
  app.get('/api/benefits/package', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (userType !== 'worker') {
        return res.status(403).json({ message: "Access denied. Workers only." });
      }
      
      const worker = await storage.getWorkerByUserId(userId);
      if (!worker) {
        return res.status(404).json({ message: "Worker profile not found" });
      }
      
      // Mock benefits package for now - in real implementation, this would come from the business
      const mockBenefitsPackage = {
        id: 'benefits-123',
        businessId: worker.businessId,
        workerId: worker.id,
        packageName: 'Standard Employee Package',
        benefits: [
          {
            name: 'Health Insurance',
            description: 'Comprehensive medical coverage including dental and vision',
            value: '100% premium covered',
            category: 'health'
          },
          {
            name: 'Flexible Work Arrangement',
            description: 'Hybrid work-from-home policy with flexible hours',
            value: '3 days remote per week',
            category: 'flexibility'
          },
          {
            name: 'Professional Development',
            description: 'Annual budget for courses, conferences, and training',
            value: '$2,000 AUD annually',
            category: 'development'
          },
          {
            name: 'Wellness Program',
            description: 'Gym membership and mental health support',
            value: 'Fully covered',
            category: 'wellness'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      res.json(mockBenefitsPackage);
    } catch (error: any) {
      console.error("Error fetching benefits package:", error);
      res.status(500).json({ message: "Failed to fetch benefits package" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
