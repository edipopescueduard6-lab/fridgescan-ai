import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import pantryRoutes from './routes/pantry.routes';
import scanRoutes from './routes/scan.routes';
import recipeRoutes from './routes/recipe.routes';
import gdprRoutes from './routes/gdpr.routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// ===== 1. HELMET — Security headers (FIRST) =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xContentTypeOptions: true,  // nosniff
  xFrameOptions: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ===== 2. CORS =====
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',  // Restrict in production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Device-Id', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400,
}));

// ===== 3. RATE LIMITING (before body parsing) =====
// Dynamic import to handle if middleware files don't exist yet
let globalLimiter: any;
try {
  const rateLimiter = require('./middleware/rate-limiter');
  globalLimiter = rateLimiter.globalLimiter;
} catch { /* rate limiter not yet created */ }
if (globalLimiter) app.use(globalLimiter);

// ===== 4. REQUEST ID =====
app.use((req, _res, next) => {
  const crypto = require('crypto');
  req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// ===== 5. BODY PARSER with limits =====
app.use(express.json({
  limit: '15mb',  // For base64 images
  strict: true,
}));

// ===== 6. INPUT SANITIZATION =====
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
});

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Strip HTML tags
      obj[key] = obj[key].replace(/<[^>]*>/g, '');
      // Strip null bytes
      obj[key] = obj[key].replace(/\0/g, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// ===== 7. LOGGING (without sensitive bodies) =====
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.path;
  const requestId = req.headers['x-request-id'];
  // Don't log body (may contain sensitive data)
  console.log(`[${timestamp}] ${method} ${url} [${requestId}]`);
  next();
});

// ===== 8. Serve uploaded files =====
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Attach prisma to request
app.use((req: any, _res, next) => {
  req.prisma = prisma;
  next();
});

// ===== 9. ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/gdpr', gdprRoutes);

// Health check (public, no auth)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    security: {
      helmet: true,
      cors: true,
      rateLimiting: !!globalLimiter,
      inputSanitization: true,
    }
  });
});

// ===== 10. GLOBAL ERROR HANDLER (LAST) =====
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[ERROR] ${err.message}`);

  // Never leak stack traces in production
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    success: false,
    error: isProduction ? 'Eroare internă a serverului' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`[FridgeScan API] Running on http://localhost:${PORT}`);
  console.log(`[Security] Helmet: ON | CORS: ON | Sanitization: ON`);
});

// Cleanup
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  // Cleanup pending image deletions
  try {
    const imgSec = require('./services/image-security.service');
    imgSec.default?.cleanupPendingDeletions?.();
  } catch { /* ignore */ }
  process.exit(0);
});
