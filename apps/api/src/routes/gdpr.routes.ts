import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
router.use(authMiddleware);

// ===== CONSENT MANAGEMENT =====

const CONSENT_TYPES = [
  'terms_of_service',
  'privacy_policy',
  'health_data_processing',
  'ai_image_processing',
  'push_notifications',
  'anonymous_analytics',
] as const;

// GET /api/gdpr/consent — starea curentă a consimțămintelor
router.get('/consent', async (req: AuthRequest, res: Response) => {
  try {
    const records = await req.prisma.consentRecord.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest per type
    const latest: Record<string, any> = {};
    for (const record of records) {
      if (!latest[record.consentType]) {
        latest[record.consentType] = record;
      }
    }

    const dashboard = CONSENT_TYPES.map(type => ({
      type,
      granted: latest[type]?.granted ?? false,
      lastUpdated: latest[type]?.createdAt ?? null,
      required: ['terms_of_service', 'privacy_policy'].includes(type),
      description: CONSENT_DESCRIPTIONS[type],
    }));

    res.json({ success: true, data: { consents: dashboard, policyVersion: '1.0' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/gdpr/consent — acordare/retragere consimțământ
router.post('/consent', async (req: AuthRequest, res: Response) => {
  try {
    const { consentType, granted } = req.body;

    if (!CONSENT_TYPES.includes(consentType)) {
      res.status(400).json({ success: false, error: 'Tip de consimțământ invalid' });
      return;
    }

    if (typeof granted !== 'boolean') {
      res.status(400).json({ success: false, error: 'Câmpul "granted" trebuie să fie true/false' });
      return;
    }

    const ipHash = crypto.createHash('sha256')
      .update((req.ip || 'unknown') + process.env.JWT_SECRET)
      .digest('hex')
      .substring(0, 16);

    await req.prisma.consentRecord.create({
      data: {
        userId: req.userId!,
        consentType,
        granted,
        policyVersion: '1.0',
        method: 'toggle',
        ipHash,
        userAgent: (req.headers['user-agent'] || '').substring(0, 200),
      }
    });

    // Audit log
    try {
      await req.prisma.auditLog.create({
        data: {
          type: granted ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
          userId: req.userId,
          severity: 'info',
          details: JSON.stringify({ consentType }),
        }
      });
    } catch { /* ignore */ }

    res.json({ success: true, message: granted ? 'Consimțământ acordat' : 'Consimțământ retras' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== DATA EXPORT (Art. 20 — Portabilitate) =====

// GET /api/gdpr/export — exportă toate datele utilizatorului
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Gather ALL user data
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    const profile = await req.prisma.userProfile.findUnique({
      where: { userId },
    });

    const pantryItems = await req.prisma.pantryItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const savedRecipes = await req.prisma.savedRecipe.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const scanHistory = await req.prisma.scanHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, itemsFound: true, rawResult: true, createdAt: true },
      // Exclude imageUrl — images are temporary
    });

    const consentRecords = await req.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const parsedProfile = profile ? {
      ...profile,
      allergies: JSON.parse(profile.allergies || '[]'),
      medicalConditions: JSON.parse(profile.medicalConditions || '[]'),
      dietaryPrefs: JSON.parse(profile.dietaryPrefs || '[]'),
      medications: JSON.parse(profile.medications || '[]'),
    } : null;

    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user,
      profile: parsedProfile,
      pantryItems: pantryItems.map((item: any) => ({
        ...item,
        nutritionPer100g: item.nutritionPer100g ? JSON.parse(item.nutritionPer100g) : null,
      })),
      savedRecipes: savedRecipes.map((r: any) => ({
        ...r,
        recipeData: JSON.parse(r.recipeData),
      })),
      scanHistory: scanHistory.map((s: any) => ({
        ...s,
        rawResult: JSON.parse(s.rawResult),
      })),
      consentRecords,
      _disclaimer: 'Aceste date sunt proprietatea dumneavoastră conform GDPR Art. 20.',
    };

    // Audit log
    try {
      await req.prisma.auditLog.create({
        data: {
          type: 'DATA_EXPORT_REQUESTED',
          userId,
          severity: 'info',
          details: JSON.stringify({
            itemCounts: {
              pantryItems: pantryItems.length,
              savedRecipes: savedRecipes.length,
              scans: scanHistory.length,
            }
          }),
        }
      });
    } catch { /* ignore */ }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="fridgescan-export-${userId.substring(0, 8)}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Eroare la exportul datelor' });
  }
});

// ===== ACCOUNT DELETION (Art. 17 — Dreptul de a fi uitat) =====

// POST /api/gdpr/delete-account — solicită ștergerea contului (14 zile grație)
router.post('/delete-account', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Check if already requested
    const existing = await req.prisma.accountDeletionRequest.findUnique({
      where: { userId },
    });

    if (existing && existing.status === 'pending') {
      res.json({
        success: true,
        message: 'Cererea de ștergere este deja activă',
        data: {
          requestedAt: existing.requestedAt,
          scheduledFor: existing.scheduledFor,
        }
      });
      return;
    }

    const scheduledFor = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await req.prisma.accountDeletionRequest.upsert({
      where: { userId },
      update: {
        requestedAt: new Date(),
        scheduledFor,
        status: 'pending',
        cancelledAt: null,
        completedAt: null,
      },
      create: {
        userId,
        scheduledFor,
        status: 'pending',
      }
    });

    // Audit log
    try {
      await req.prisma.auditLog.create({
        data: {
          type: 'ACCOUNT_DELETION_REQUESTED',
          userId,
          severity: 'warning',
          details: JSON.stringify({ scheduledFor: scheduledFor.toISOString() }),
        }
      });
    } catch { /* ignore */ }

    res.json({
      success: true,
      message: `Contul va fi șters definitiv pe ${scheduledFor.toLocaleDateString('ro-RO')}. Poți anula oricând până atunci.`,
      data: { scheduledFor },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Eroare la solicitarea ștergerii' });
  }
});

// POST /api/gdpr/cancel-deletion — anulează ștergerea
router.post('/cancel-deletion', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await req.prisma.accountDeletionRequest.findUnique({
      where: { userId: req.userId },
    });

    if (!existing || existing.status !== 'pending') {
      res.status(404).json({ success: false, error: 'Nu există cerere de ștergere activă' });
      return;
    }

    await req.prisma.accountDeletionRequest.update({
      where: { userId: req.userId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    res.json({ success: true, message: 'Cererea de ștergere a fost anulată.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/gdpr/deletion-status — verifică statusul
router.get('/deletion-status', async (req: AuthRequest, res: Response) => {
  try {
    const request = await req.prisma.accountDeletionRequest.findUnique({
      where: { userId: req.userId },
    });

    if (!request) {
      res.json({ success: true, data: { hasPendingDeletion: false } });
      return;
    }

    res.json({
      success: true,
      data: {
        hasPendingDeletion: request.status === 'pending',
        status: request.status,
        requestedAt: request.requestedAt,
        scheduledFor: request.scheduledFor,
        cancelledAt: request.cancelledAt,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== DATA DESCRIPTIONS =====

const CONSENT_DESCRIPTIONS: Record<string, string> = {
  terms_of_service: 'Termeni și condiții de utilizare (obligatoriu)',
  privacy_policy: 'Politica de confidențialitate (obligatoriu)',
  health_data_processing: 'Procesarea datelor de sănătate (alergii, condiții medicale, medicamente) pentru personalizarea rețetelor și avertismentelor',
  ai_image_processing: 'Procesarea imaginilor prin AI (Google Gemini) pentru identificarea alimentelor din frigider',
  push_notifications: 'Notificări push pentru alerte de expirare și recomandări',
  anonymous_analytics: 'Statistici anonime pentru îmbunătățirea aplicației',
};

export default router;
