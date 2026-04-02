import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { db } from './db';
import { userTwoFactorAuth, twoFactorAuditLog, trustedDevices } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

// SECURITY: Encryption key MUST be set in environment variables
// Fail immediately if not provided - no insecure fallback
if (!process.env.TOTP_ENCRYPTION_KEY) {
  throw new Error(
    'CRITICAL SECURITY ERROR: TOTP_ENCRYPTION_KEY environment variable is not set!\n' +
    'This key is required for encrypting 2FA secrets.\n' +
    'Generate a secure 32-byte key and set it in Replit Secrets:\n' +
    '  Example: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
  );
}

if (process.env.TOTP_ENCRYPTION_KEY.length < 32) {
  throw new Error(
    'CRITICAL SECURITY ERROR: TOTP_ENCRYPTION_KEY must be at least 32 characters long for AES-256 encryption!'
  );
}

// Encryption key from environment (32 bytes for AES-256)
const ENCRYPTION_KEY = Buffer.from(process.env.TOTP_ENCRYPTION_KEY, 'utf8').slice(0, 32);
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt sensitive data (TOTP secrets)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data (TOTP secrets)
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(userEmail: string, issuer: string = 'SDP Global Pay'): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = new Secret({ size: 20 }); // 160 bits
  const totp = new TOTP({
    issuer,
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return {
    secret: secret.base32,
    otpauthUrl: totp.toString(),
  };
}

/**
 * Generate QR code as data URL for enrollment
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify TOTP code with time window tolerance
 */
export function verifyTOTPCode(secret: string, token: string, window: number = 1): boolean {
  try {
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    });

    // Verify with window tolerance (±1 period = ±30 seconds)
    const delta = totp.validate({ token, window });
    return delta !== null;
  } catch (error) {
    console.error('Error verifying TOTP code:', error);
    return false;
  }
}

/**
 * Generate cryptographically secure backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Hash backup codes for secure storage
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const saltRounds = 12;
  const hashedCodes = await Promise.all(
    codes.map((code) => bcrypt.hash(code, saltRounds))
  );
  return hashedCodes;
}

/**
 * Verify a backup code against hashed codes
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; usedIndex: number }> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const isValid = await bcrypt.compare(code, hashedCodes[i]);
    if (isValid) {
      return { valid: true, usedIndex: i };
    }
  }
  return { valid: false, usedIndex: -1 };
}

/**
 * Log 2FA audit event
 */
export async function log2FAEvent(params: {
  userId: string;
  eventType: string;
  eventDetails?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  success: boolean;
}): Promise<void> {
  try {
    await db.insert(twoFactorAuditLog).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      eventType: params.eventType,
      eventDetails: params.eventDetails,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      deviceFingerprint: params.deviceFingerprint,
      success: params.success,
    });
  } catch (error) {
    console.error('Error logging 2FA event:', error);
  }
}

/**
 * Get user's 2FA settings
 */
export async function getUserTwoFactorAuth(userId: string) {
  const [twoFactorAuth] = await db
    .select()
    .from(userTwoFactorAuth)
    .where(eq(userTwoFactorAuth.userId, userId));
  
  return twoFactorAuth || null;
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  const twoFactorAuth = await getUserTwoFactorAuth(userId);
  return twoFactorAuth?.isEnabled || false;
}

/**
 * Generate device fingerprint from request
 */
export function generateDeviceFingerprint(ipAddress: string, userAgent: string): string {
  const data = `${ipAddress}:${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Check if device is trusted
 */
export async function isDeviceTrusted(
  userId: string,
  deviceFingerprint: string
): Promise<boolean> {
  const [device] = await db
    .select()
    .from(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceFingerprint, deviceFingerprint),
        eq(trustedDevices.isTrusted, true)
      )
    );
  
  return !!device;
}

/**
 * Trust a device
 */
export async function trustDevice(params: {
  userId: string;
  deviceFingerprint: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  // Check if device already exists
  const [existingDevice] = await db
    .select()
    .from(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, params.userId),
        eq(trustedDevices.deviceFingerprint, params.deviceFingerprint)
      )
    );

  if (existingDevice) {
    // Update last used timestamp
    await db
      .update(trustedDevices)
      .set({ 
        lastUsedAt: new Date(),
        isTrusted: true 
      })
      .where(eq(trustedDevices.id, existingDevice.id));
  } else {
    // Create new trusted device
    await db.insert(trustedDevices).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      deviceFingerprint: params.deviceFingerprint,
      deviceName: params.deviceName,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      isTrusted: true,
      lastUsedAt: new Date(),
    });
  }
}

/**
 * Get recent 2FA audit logs for a user
 */
export async function getRecentAuditLogs(userId: string, limit: number = 20) {
  return await db
    .select()
    .from(twoFactorAuditLog)
    .where(eq(twoFactorAuditLog.userId, userId))
    .orderBy(desc(twoFactorAuditLog.createdAt))
    .limit(limit);
}
