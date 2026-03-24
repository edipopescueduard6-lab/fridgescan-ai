import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

// --- Helmet middleware with strict security headers ---
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  hsts: {
    maxAge: 31536000,       // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,            // X-Content-Type-Options: nosniff
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// --- Recursive input sanitizer ---
// Strips HTML tags and null bytes from all string fields in req.body

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove null bytes
    let cleaned = value.replace(/\0/g, '');
    // Strip HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    return cleaned;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[key] = sanitizeValue(obj[key]);
  }
  return result;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body as Record<string, unknown>);
  }
  next();
}

// --- Request ID middleware ---
// Adds a unique X-Request-Id header to every request and response

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
