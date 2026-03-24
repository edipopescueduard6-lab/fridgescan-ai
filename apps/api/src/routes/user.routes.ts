import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

var router = Router();
router.use(authMiddleware);

// GET /api/user/profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    var profile = await req.prisma.userProfile.findUnique({
      where: { userId: req.userId },
      include: { user: { select: { id: true, email: true, name: true } } }
    });

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profil negăsit' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...profile,
        allergies: JSON.parse(profile.allergies || '[]'),
        medicalConditions: JSON.parse(profile.medicalConditions || '[]'),
        dietaryPrefs: JSON.parse(profile.dietaryPrefs || '[]'),
        medications: JSON.parse(profile.medications || '[]'),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/user/profile
router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    var { age, sex, weight, height, activityLevel, allergies, medicalConditions,
      dietaryPrefs, dailyCalorieGoal, pregnancyStatus, medications } = req.body;

    var profile = await req.prisma.userProfile.upsert({
      where: { userId: req.userId },
      update: {
        age, sex, weight, height, activityLevel,
        allergies: JSON.stringify(allergies || []),
        medicalConditions: JSON.stringify(medicalConditions || []),
        dietaryPrefs: JSON.stringify(dietaryPrefs || []),
        dailyCalorieGoal, pregnancyStatus,
        medications: JSON.stringify(medications || []),
      },
      create: {
        userId: req.userId!,
        age, sex, weight, height, activityLevel,
        allergies: JSON.stringify(allergies || []),
        medicalConditions: JSON.stringify(medicalConditions || []),
        dietaryPrefs: JSON.stringify(dietaryPrefs || []),
        dailyCalorieGoal, pregnancyStatus,
        medications: JSON.stringify(medications || []),
      }
    });

    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
