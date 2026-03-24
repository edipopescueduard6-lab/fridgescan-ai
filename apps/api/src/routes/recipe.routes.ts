import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateRecipes } from '../services/recipe.service';
import { calculateDailyCalories, calculateBMR, calculateTDEE, calculateMacros,
  calculateBMI, calculateWaterNeed, mealCalorieDistribution } from '../services/nutrition.service';
import { MEDICAL_DISCLAIMER } from '../services/medical.service';
import { validate, GenerateRecipesSchema, SaveRecipeSchema } from '../validators';
import { recipeLimiter } from '../middleware/rate-limiter';

var router = Router();
router.use(authMiddleware);

// POST /api/recipes/generate — generează rețete din ingrediente
router.post('/generate', recipeLimiter, validate(GenerateRecipesSchema), async (req: AuthRequest, res: Response) => {
  try {
    var profile = await req.prisma.userProfile.findUnique({
      where: { userId: req.userId }
    });

    var parsedProfile = profile ? {
      ...profile,
      allergies: JSON.parse(profile.allergies || '[]'),
      medicalConditions: JSON.parse(profile.medicalConditions || '[]'),
      dietaryPrefs: JSON.parse(profile.dietaryPrefs || '[]'),
      medications: JSON.parse(profile.medications || '[]'),
    } : {};

    // Get ingredients from request body or from pantry
    var ingredients = req.body.ingredients;
    if (!ingredients || ingredients.length === 0) {
      var pantryItems = await req.prisma.pantryItem.findMany({
        where: { userId: req.userId, isFinished: false }
      });
      ingredients = pantryItems.map((item: any) => ({
        name_ro: item.name,
        name_en: item.nameEn,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        freshness: item.freshness
      }));
    }

    if (!ingredients || ingredients.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Nu ai ingrediente! Scanează frigiderul sau adaugă manual.'
      });
      return;
    }

    var result = await generateRecipes(ingredients, parsedProfile);

    res.json({
      success: true,
      data: result,
      disclaimer: MEDICAL_DISCLAIMER
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/recipes/save — salvează rețetă
router.post('/save', validate(SaveRecipeSchema), async (req: AuthRequest, res: Response) => {
  try {
    var saved = await req.prisma.savedRecipe.create({
      data: {
        userId: req.userId!,
        recipeData: JSON.stringify(req.body.recipe)
      }
    });
    res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/recipes/saved — rețete salvate
router.get('/saved', async (req: AuthRequest, res: Response) => {
  try {
    var recipes = await req.prisma.savedRecipe.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    var parsed = recipes.map((r: any) => {
      var data = null;
      try {
        data = JSON.parse(r.recipeData);
      } catch {
        data = { error: 'Date corupte' };
      }
      return { ...r, recipeData: data };
    });

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/recipes/saved/:id
router.delete('/saved/:id', async (req: AuthRequest, res: Response) => {
  try {
    var recipe = await req.prisma.savedRecipe.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!recipe) {
      res.status(404).json({ success: false, error: 'Rețetă negăsită' });
      return;
    }
    await req.prisma.savedRecipe.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/recipes/nutrition-calc — calculator nutrițional
router.get('/nutrition-calc', async (req: AuthRequest, res: Response) => {
  try {
    var profile = await req.prisma.userProfile.findUnique({
      where: { userId: req.userId }
    });

    if (!profile || !profile.weight || !profile.height || !profile.age) {
      res.status(400).json({
        success: false,
        error: 'Completează profilul (greutate, înălțime, vârstă) pentru calcul nutrițional'
      });
      return;
    }

    var bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.sex || 'M');
    var tdee = calculateTDEE(bmr, profile.activityLevel || 'sedentary');
    var bmi = calculateBMI(profile.weight, profile.height);
    var water = calculateWaterNeed(profile.weight, profile.activityLevel || 'sedentary');
    var dailyCalories = calculateDailyCalories({
      weight: profile.weight, height: profile.height,
      age: profile.age, sex: profile.sex || 'M',
      activityLevel: profile.activityLevel || 'sedentary',
      pregnancyStatus: profile.pregnancyStatus || 'none'
    });

    var dietPrefs = JSON.parse(profile.dietaryPrefs || '[]');
    var diet = dietPrefs[0] || 'balanced';
    var macros = calculateMacros(dailyCalories, diet);
    var mealDistribution = mealCalorieDistribution(dailyCalories);

    res.json({
      success: true,
      data: {
        bmr: Math.round(bmr),
        tdee,
        bmi,
        dailyCalories,
        macros,
        waterNeed_ml: water,
        mealDistribution,
        diet
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
