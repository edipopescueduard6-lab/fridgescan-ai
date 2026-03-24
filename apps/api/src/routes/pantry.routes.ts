import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate, AddPantryItemSchema, BatchPantrySchema } from '../validators';

var router = Router();
router.use(authMiddleware);

// IMPORTANT: rutele statice (fără parametri) trebuie înregistrate ÎNAINTEA rutelor cu :id
// altfel Express va interpreta "batch" și "stats" ca valori pentru :id

// GET /api/pantry/stats — statistici
// TREBUIE să fie ÎNAINTE de GET /:id
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    var total = await req.prisma.pantryItem.count({
      where: { userId: req.userId, isFinished: false }
    });

    var now = new Date();
    var threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    var expiringSoon = await req.prisma.pantryItem.count({
      where: {
        userId: req.userId,
        isFinished: false,
        expiryDate: { lte: threeDaysLater, gte: now }
      }
    });

    var expired = await req.prisma.pantryItem.count({
      where: {
        userId: req.userId,
        isFinished: false,
        expiryDate: { lt: now }
      }
    });

    var byCategory = await req.prisma.pantryItem.groupBy({
      by: ['category'],
      where: { userId: req.userId, isFinished: false },
      _count: true
    });

    res.json({
      success: true,
      data: { total, expiringSoon, expired, byCategory }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pantry/batch — adaugă mai multe (din scan)
// TREBUIE să fie ÎNAINTE de PUT /:id și DELETE /:id
router.post('/batch', validate(BatchPantrySchema), async (req: AuthRequest, res: Response) => {
  try {
    var { items, scanId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Lista de alimente este obligatorie' });
      return;
    }

    var created = [];
    for (var item of items) {
      var pantryItem = await req.prisma.pantryItem.create({
        data: {
          userId: req.userId!,
          name: item.name_ro || item.name,
          nameEn: item.name_en || item.name,
          category: item.category || 'altele',
          quantity: item.estimated_quantity || item.quantity || 1,
          unit: item.unit || 'buc',
          freshness: item.freshness || 'ok',
          location: item.location || 'fridge',
          usdaFoodId: item.usda_food_id || null,
          scanId: scanId || null,
        }
      });
      created.push(pantryItem);
    }

    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pantry — lista alimente
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    var { location, category, includeFinished } = req.query;

    var where: any = { userId: req.userId };
    if (location) where.location = location;
    if (category) where.category = category;
    if (!includeFinished) where.isFinished = false;

    var items = await req.prisma.pantryItem.findMany({
      where,
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }]
    });

    // Parse nutrition JSON — cu try/catch per item pentru a evita crash pe date corupte
    var parsed = items.map((item: any) => {
      var nutrition = null;
      if (item.nutritionPer100g) {
        try {
          nutrition = JSON.parse(item.nutritionPer100g);
        } catch {
          nutrition = null;
        }
      }
      return { ...item, nutritionPer100g: nutrition };
    });

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pantry — adaugă aliment
router.post('/', validate(AddPantryItemSchema), async (req: AuthRequest, res: Response) => {
  try {
    var { name, nameEn, category, quantity, unit, purchaseDate, expiryDate,
      freshness, location, usdaFoodId, nutritionPer100g, scanId } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Numele alimentului este obligatoriu' });
      return;
    }

    var item = await req.prisma.pantryItem.create({
      data: {
        userId: req.userId!,
        name, nameEn: nameEn || name, category: category || 'altele',
        quantity: quantity || 1, unit: unit || 'buc',
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        freshness: freshness || 'ok',
        location: location || 'fridge',
        usdaFoodId,
        nutritionPer100g: nutritionPer100g ? JSON.stringify(nutritionPer100g) : null,
        scanId,
      }
    });

    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/pantry/:id — actualizare
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    var item = await req.prisma.pantryItem.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!item) {
      res.status(404).json({ success: false, error: 'Aliment negăsit' });
      return;
    }

    var data: any = { ...req.body };
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.nutritionPer100g) data.nutritionPer100g = JSON.stringify(data.nutritionPer100g);

    var updated = await req.prisma.pantryItem.update({
      where: { id: req.params.id },
      data
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/pantry/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    var item = await req.prisma.pantryItem.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!item) {
      res.status(404).json({ success: false, error: 'Aliment negăsit' });
      return;
    }

    await req.prisma.pantryItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
