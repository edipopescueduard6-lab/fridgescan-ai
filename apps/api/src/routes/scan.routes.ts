import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { scanImage, scanBase64 } from '../services/vision.service';
import { validate, ScanBase64Schema } from '../validators';
import { scanLimiter } from '../middleware/rate-limiter';

var router = Router();
router.use(authMiddleware);

// Setup multer for image uploads
var uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

var storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    var ext = path.extname(file.originalname) || '.jpg';
    cb(null, `scan_${Date.now()}${ext}`);
  }
});

var upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    var allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Doar imagini JPEG, PNG sau WebP'));
    }
  }
});

// POST /api/scan/image — upload + scan image file
router.post('/image', scanLimiter, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Nicio imagine trimisă' });
      return;
    }

    var result = await scanImage(req.file.path);

    // Save scan history
    var scan = await req.prisma.scanHistory.create({
      data: {
        userId: req.userId!,
        imageUrl: `/uploads/${req.file.filename}`,
        rawResult: JSON.stringify(result),
        itemsFound: result.ingredients?.length || 0
      }
    });

    res.json({
      success: true,
      data: {
        scanId: scan.id,
        ...result
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/scan/base64 — scan from base64 image data
router.post('/base64', scanLimiter, validate(ScanBase64Schema), async (req: AuthRequest, res: Response) => {
  try {
    var { image, mimeType } = req.body;
    if (!image) {
      res.status(400).json({ success: false, error: 'Câmpul "image" (base64) este obligatoriu' });
      return;
    }

    var result = await scanBase64(image, mimeType || 'image/jpeg');

    // Save to file for history
    var filename = `scan_${Date.now()}.jpg`;
    var filePath = path.join(uploadsDir, filename);
    var cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

    var scan = await req.prisma.scanHistory.create({
      data: {
        userId: req.userId!,
        imageUrl: `/uploads/${filename}`,
        rawResult: JSON.stringify(result),
        itemsFound: result.ingredients?.length || 0
      }
    });

    res.json({
      success: true,
      data: { scanId: scan.id, ...result }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/scan/history — scan history
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    var scans = await req.prisma.scanHistory.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    var parsed = scans.map((s: any) => {
      var result = null;
      try {
        result = JSON.parse(s.rawResult);
      } catch {
        result = { error: 'Date corupte' };
      }
      return { ...s, rawResult: result };
    });

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
