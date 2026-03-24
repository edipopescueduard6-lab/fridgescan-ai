import rateLimit from 'express-rate-limit';

// Global: 300 requests / 15min per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Prea multe cereri. Așteaptă câteva minute.' },
});

// Login: 5 attempts / 15min
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Prea multe încercări de autentificare. Reîncearcă peste 15 minute.' },
});

// Register: 3 / hour
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Prea multe încercări de înregistrare. Reîncearcă peste o oră.' },
});

// Scan: 20 / hour
export const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limita de scanări atinsă (20/oră). Reîncearcă mai târziu.' },
});

// Recipe: 30 / hour
export const recipeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limita de generări rețete atinsă (30/oră).' },
});

// Export: 3 / day
export const exportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limita de exporturi atinsă (3/zi).' },
});

export const authLimiter = { login: loginLimiter, register: registerLimiter };
