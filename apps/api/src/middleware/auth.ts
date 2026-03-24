import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface AuthRequest extends Request {
  userId?: string;
  deviceId?: string;
  jti?: string;
  prisma?: any;
}

// In-memory token blacklist (production: use Redis)
const tokenBlacklist = new Set<string>();

export function blacklistToken(jti: string, expiresInMs: number): void {
  tokenBlacklist.add(jti);
  // Auto-cleanup after token would have expired anyway
  setTimeout(() => tokenBlacklist.delete(jti), expiresInMs);
}

export function isTokenBlacklisted(jti: string): boolean {
  return tokenBlacklist.has(jti);
}

// Generate JWT with JTI + device binding
export function generateToken(userId: string, deviceId?: string): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { userId, jti, deviceId: deviceId || 'unknown' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '24h', issuer: 'fridgescan-api', audience: 'fridgescan-mobile' }
  );
}

// Generate refresh token (longer lived)
export function generateRefreshToken(userId: string, deviceId?: string): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { userId, jti, deviceId: deviceId || 'unknown', type: 'refresh' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '30d', issuer: 'fridgescan-api', audience: 'fridgescan-mobile' }
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, error: 'Token lipsă' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', {
      issuer: 'fridgescan-api',
      audience: 'fridgescan-mobile',
    }) as { userId: string; jti: string; deviceId: string };

    // Check blacklist
    if (decoded.jti && isTokenBlacklisted(decoded.jti)) {
      res.status(401).json({ success: false, error: 'Token revocat' });
      return;
    }

    // Check device binding (warn but don't block for now)
    const requestDeviceId = req.headers['x-device-id'] as string;
    if (requestDeviceId && decoded.deviceId !== 'unknown' && decoded.deviceId !== requestDeviceId) {
      console.warn(`[SECURITY] Token device mismatch: user=${decoded.userId}, expected=${decoded.deviceId}, got=${requestDeviceId}`);
    }

    req.userId = decoded.userId;
    req.jti = decoded.jti;
    req.deviceId = decoded.deviceId;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'Token expirat', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ success: false, error: 'Token invalid' });
  }
}

// ===== LOGIN ATTEMPT TRACKING (brute force protection) =====

interface LoginAttemptRecord {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number;
  lockCount: number;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();

// Cleanup old records every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts) {
    if (now - record.lastAttempt > 24 * 60 * 60 * 1000) {
      loginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);

export function checkLoginAttempt(identifier: string): {
  allowed: boolean;
  retryAfterSeconds: number;
  attemptsRemaining: number;
} {
  const record = loginAttempts.get(identifier);
  const now = Date.now();

  if (!record) {
    return { allowed: true, retryAfterSeconds: 0, attemptsRemaining: 5 };
  }

  // Check if locked
  if (record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
      attemptsRemaining: 0,
    };
  }

  // Reset if lock expired
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    record.attempts = 0;
    record.lockedUntil = 0;
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    attemptsRemaining: Math.max(0, 5 - record.attempts),
  };
}

export function recordLoginFailure(identifier: string): void {
  const record = loginAttempts.get(identifier) || {
    attempts: 0, lastAttempt: 0, lockedUntil: 0, lockCount: 0
  };

  record.attempts++;
  record.lastAttempt = Date.now();

  if (record.attempts >= 5) {
    // Progressive lockout: 15min, 30min, 1h, 4h, 24h
    record.lockCount++;
    const lockDurations = [15, 30, 60, 240, 1440]; // minutes
    const lockMinutes = lockDurations[Math.min(record.lockCount - 1, lockDurations.length - 1)];
    record.lockedUntil = Date.now() + lockMinutes * 60 * 1000;
    record.attempts = 0;
  }

  loginAttempts.set(identifier, record);
}

export function recordLoginSuccess(identifier: string): void {
  loginAttempts.delete(identifier);
}

// ===== PASSWORD POLICY =====

const COMMON_PASSWORDS = new Set([
  'password1234', '123456789012', 'qwertyuiop12', 'admin1234567',
  'letmein12345', 'welcome12345', 'password1111', 'iloveyou1234',
  'sunshine1234', 'princess1234', 'football1234', 'charlie12345',
  'shadow123456', 'master123456', 'dragon123456', 'monkey1234567',
]);

export function validatePassword(password: string, email?: string, name?: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Parola trebuie să aibă minim 12 caractere');
  }
  if (password.length > 128) {
    errors.push('Parola nu poate depăși 128 caractere');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin o literă mare');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin o literă mică');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin o cifră');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Parola este prea comună. Alege una mai puternică');
  }
  if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
    errors.push('Parola nu poate conține adresa de email');
  }
  if (name && name.length > 2 && password.toLowerCase().includes(name.toLowerCase())) {
    errors.push('Parola nu poate conține numele tău');
  }

  return { valid: errors.length === 0, errors };
}
