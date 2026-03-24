import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import pantryRoutes from './routes/pantry.routes';
import scanRoutes from './routes/scan.routes';
import recipeRoutes from './routes/recipe.routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Attach prisma to request
app.use((req: any, _res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/recipes', recipeRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start
app.listen(PORT, () => {
  console.log(`[FridgeScan API] Running on http://localhost:${PORT}`);
});

// Cleanup
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
