import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  AuthRequest, authMiddleware, generateToken, generateRefreshToken,
  blacklistToken, checkLoginAttempt, recordLoginFailure,
  recordLoginSuccess, validatePassword
} from '../middleware/auth';
import { validate, RegisterSchema, LoginSchema } from '../validators';
import { loginLimiter, registerLimiter } from '../middleware/rate-limiter';

const router = Router();

// POST /api/auth/register
router.post('/register', registerLimiter, validate(RegisterSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: 'Email, parolă și nume sunt obligatorii' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, error: 'Format email invalid' });
      return;
    }

    // Validate password policy
    const pwCheck = validatePassword(password, email, name);
    if (!pwCheck.valid) {
      res.status(400).json({ success: false, error: pwCheck.errors.join('. ') });
      return;
    }

    // Validate name
    if (name.length < 2 || name.length > 100) {
      res.status(400).json({ success: false, error: 'Numele trebuie să aibă între 2 și 100 caractere' });
      return;
    }

    // Strip HTML from name
    const cleanName = name.replace(/<[^>]*>/g, '').trim();

    const existing = await req.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email deja înregistrat' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await req.prisma.user.create({
      data: { email: email.toLowerCase().trim(), password: hash, name: cleanName }
    });

    // Create empty profile
    await req.prisma.userProfile.create({
      data: { userId: user.id }
    });

    const deviceId = (req.headers['x-device-id'] as string) || 'unknown';
    const token = generateToken(user.id, deviceId);
    const refreshToken = generateRefreshToken(user.id, deviceId);

    // Audit log
    try {
      await req.prisma.auditLog.create({
        data: {
          type: 'ACCOUNT_CREATED',
          userId: user.id,
          severity: 'info',
          details: JSON.stringify({ method: 'email_password' }),
        }
      });
    } catch { /* audit log table may not exist yet */ }

    res.status(201).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Eroare internă la înregistrare' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, validate(LoginSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email și parolă sunt obligatorii' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check brute force protection
    const loginCheck = checkLoginAttempt(normalizedEmail);
    if (!loginCheck.allowed) {
      res.status(429).json({
        success: false,
        error: `Cont temporar blocat. Reîncercați în ${loginCheck.retryAfterSeconds} secunde.`,
        retryAfterSeconds: loginCheck.retryAfterSeconds,
      });
      return;
    }

    const user = await req.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      recordLoginFailure(normalizedEmail);
      // Generic error — don't reveal if email exists
      res.status(401).json({ success: false, error: 'Email sau parolă greșită' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordLoginFailure(normalizedEmail);

      // Audit log
      try {
        await req.prisma.auditLog.create({
          data: {
            type: 'LOGIN_FAILED',
            userId: user.id,
            severity: 'warning',
            details: JSON.stringify({ attemptsRemaining: loginCheck.attemptsRemaining - 1 }),
          }
        });
      } catch { /* ignore */ }

      res.status(401).json({
        success: false,
        error: 'Email sau parolă greșită',
        attemptsRemaining: loginCheck.attemptsRemaining - 1,
      });
      return;
    }

    // Success — clear attempts
    recordLoginSuccess(normalizedEmail);

    const deviceId = (req.headers['x-device-id'] as string) || 'unknown';
    const token = generateToken(user.id, deviceId);
    const refreshToken = generateRefreshToken(user.id, deviceId);

    // Audit log
    try {
      await req.prisma.auditLog.create({
        data: {
          type: 'LOGIN_SUCCESS',
          userId: user.id,
          severity: 'info',
          details: JSON.stringify({ deviceId }),
        }
      });
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Eroare internă la autentificare' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Blacklist current token
    if (req.jti) {
      blacklistToken(req.jti, 24 * 60 * 60 * 1000); // 24h
    }

    // Audit log
    try {
      await req.prisma.auditLog.create({
        data: {
          type: 'LOGOUT',
          userId: req.userId,
          severity: 'info',
          details: '{}',
        }
      });
    } catch { /* ignore */ }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Parola curentă și cea nouă sunt obligatorii' });
      return;
    }

    const user = await req.prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ success: false, error: 'Utilizator negăsit' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Parola curentă este greșită' });
      return;
    }

    const pwCheck = validatePassword(newPassword, user.email, user.name);
    if (!pwCheck.valid) {
      res.status(400).json({ success: false, error: pwCheck.errors.join('. ') });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await req.prisma.user.update({
      where: { id: req.userId },
      data: { password: hash }
    });

    // Audit log
    try {
      await req.prisma.auditLog.create({
        data: {
          type: 'PASSWORD_CHANGED',
          userId: req.userId,
          severity: 'info',
          details: '{}',
        }
      });
    } catch { /* ignore */ }

    res.json({ success: true, message: 'Parola a fost schimbată cu succes' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Eroare la schimbarea parolei' });
  }
});

export default router;
