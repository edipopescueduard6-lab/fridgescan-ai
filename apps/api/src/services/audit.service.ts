/**
 * Serviciu de audit logging
 * Înregistrează toate acțiunile sensibile fără a stoca date personale/medicale
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Tipuri de evenimente de audit */
export enum AuditEventType {
  // Autentificare
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',

  // Profil medical
  MEDICAL_PROFILE_UPDATED = 'MEDICAL_PROFILE_UPDATED',
  MEDICAL_PROFILE_READ = 'MEDICAL_PROFILE_READ',

  // Consimțământ
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_WITHDRAWN = 'CONSENT_WITHDRAWN',

  // Scanare imagini
  IMAGE_SCAN_STARTED = 'IMAGE_SCAN_STARTED',
  IMAGE_SCAN_COMPLETED = 'IMAGE_SCAN_COMPLETED',
  IMAGE_DELETED = 'IMAGE_DELETED',

  // Cont
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_DELETION_REQUESTED = 'ACCOUNT_DELETION_REQUESTED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  DATA_EXPORT_REQUESTED = 'DATA_EXPORT_REQUESTED',

  // Securitate
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

/** Severitate eveniment */
export type AuditSeverity = 'info' | 'warning' | 'critical';

/** Parametri pentru înregistrarea unui eveniment */
export interface AuditEventInput {
  type: AuditEventType;
  userId?: string;
  severity: AuditSeverity;
  details: Record<string, unknown>;
  ipHash?: string;
  requestId?: string;
}

/** Opțiuni de filtrare pentru interogarea logurilor */
export interface AuditLogQueryOptions {
  type?: AuditEventType;
  from?: Date;
  to?: Date;
  limit?: number;
}

/**
 * Lista de chei care NU trebuie NICIODATĂ stocate în audit log
 * Include parole, token-uri, valori medicale, chei de criptare
 */
const FORBIDDEN_DETAIL_KEYS = [
  'password', 'token', 'accessToken', 'refreshToken', 'secret',
  'encryptionKey', 'masterKey', 'privateKey',
  'allergies', 'medicalConditions', 'medications', 'pregnancyStatus',
  'weight', 'height', 'medicalData', 'healthData',
];

/**
 * Curăță detaliile evenimentului — elimină orice valori sensibile
 * Înregistrează doar NUMELE câmpurilor modificate, nu valorile
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    const keyLower = key.toLowerCase();

    // Verifică dacă cheia este interzisă
    if (FORBIDDEN_DETAIL_KEYS.some(forbidden => keyLower.includes(forbidden.toLowerCase()))) {
      sanitized[key] = '[REDACTAT]';
      continue;
    }

    // Dacă e un obiect, sanitizează recursiv (un singur nivel)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Hash-uiește o adresă IP cu SHA-256
 * Nu stocăm niciodată IP-ul în clar
 */
export function hashIP(ip: string): string {
  if (!ip) return '';
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Înregistrează un eveniment de audit în baza de date
 */
export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    const sanitizedDetails = sanitizeDetails(event.details);

    await prisma.auditLog.create({
      data: {
        type: event.type,
        userId: event.userId || null,
        severity: event.severity,
        details: JSON.stringify(sanitizedDetails),
        ipHash: event.ipHash || null,
        requestId: event.requestId || null,
      },
    });
  } catch (error) {
    // Audit logging nu trebuie să blocheze niciodată fluxul principal
    console.error('[AuditService] Eroare la salvarea evenimentului de audit:', error);
  }
}

/**
 * Interogă logurile de audit pentru un utilizator
 * Folosit pentru administrare și export GDPR
 */
export async function getAuditLogs(
  userId: string,
  options: AuditLogQueryOptions = {}
): Promise<Array<{
  id: string;
  type: string;
  severity: string;
  details: string;
  createdAt: Date;
  requestId: string | null;
}>> {
  const { type, from, to, limit = 100 } = options;

  const where: Record<string, unknown> = { userId };

  if (type) {
    where.type = type;
  }

  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = from;
    if (to) createdAt.lte = to;
    where.createdAt = createdAt;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 1000), // Limită maximă de siguranță
    select: {
      id: true,
      type: true,
      severity: true,
      details: true,
      createdAt: true,
      requestId: true,
    },
  });

  return logs;
}
