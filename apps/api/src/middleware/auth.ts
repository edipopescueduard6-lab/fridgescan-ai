import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  prisma?: any;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  var token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, error: 'Token lipsă' });
    return;
  }

  try {
    var decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token invalid' });
  }
}
