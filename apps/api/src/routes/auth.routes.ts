import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';

var router = Router();

// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    var { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: 'Email, parolă și nume sunt obligatorii' });
      return;
    }

    var existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email deja înregistrat' });
      return;
    }

    var hash = await bcrypt.hash(password, 12);
    var user = await req.prisma.user.create({
      data: { email, password: hash, name }
    });

    // Create empty profile
    await req.prisma.userProfile.create({
      data: { userId: user.id }
    });

    var token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name } }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    var { email, password } = req.body;

    var user = await req.prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Email sau parolă greșită' });
      return;
    }

    var valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Email sau parolă greșită' });
      return;
    }

    var token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });

    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name } }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
