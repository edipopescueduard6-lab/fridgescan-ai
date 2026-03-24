import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================================
// Whitelists
// ============================================================

export const VALID_ALLERGIES = [
  'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts',
  'wheat', 'soy', 'sesame', 'mustard', 'celery', 'lupin',
  'mollusks', 'sulfites',
] as const;

export const VALID_CONDITIONS = [
  'diabetes_type1', 'diabetes_type2', 'hypertension', 'celiac_disease',
  'lactose_intolerance', 'gout', 'chronic_kidney_disease', 'ibs',
  'pku', 'heart_disease', 'high_cholesterol',
] as const;

export const VALID_MEDICATION_CATEGORIES = [
  'warfarin', 'maoi', 'statins', 'levothyroxine', 'ace_inhibitors',
  'lithium', 'metformin', 'beta_blockers', 'diuretics', 'nsaids',
] as const;

// ============================================================
// Auth schemas
// ============================================================

export const RegisterSchema = z.object({
  email: z.string({ error: 'Email-ul este obligatoriu' })
    .email('Adresa de email nu este valida'),
  password: z.string({ error: 'Parola este obligatorie' })
    .min(12, 'Parola trebuie sa aiba cel putin 12 caractere'),
  name: z.string({ error: 'Numele este obligatoriu' })
    .min(1, 'Numele este obligatoriu')
    .max(100, 'Numele nu poate depasi 100 de caractere'),
});

export const LoginSchema = z.object({
  email: z.string({ error: 'Email-ul este obligatoriu' })
    .email('Adresa de email nu este valida'),
  password: z.string({ error: 'Parola este obligatorie' })
    .min(1, 'Parola este obligatorie'),
});

// ============================================================
// Profile schema
// ============================================================

export const UpdateProfileSchema = z.object({
  age: z.number()
    .int('Varsta trebuie sa fie un numar intreg')
    .min(13, 'Varsta minima este 13 ani')
    .max(120, 'Varsta maxima este 120 ani')
    .optional(),
  sex: z.enum(['M', 'F', 'other'], {
    error: 'Sexul trebuie sa fie M, F sau other',
  }).optional(),
  weight: z.number()
    .min(20, 'Greutatea minima este 20 kg')
    .max(500, 'Greutatea maxima este 500 kg')
    .optional(),
  height: z.number()
    .min(50, 'Inaltimea minima este 50 cm')
    .max(300, 'Inaltimea maxima este 300 cm')
    .optional(),
  activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'], {
    error: 'Nivel de activitate invalid',
  }).optional(),
  allergies: z.array(z.enum(VALID_ALLERGIES, {
    error: 'Alergie invalida',
  })).optional(),
  medicalConditions: z.array(z.enum(VALID_CONDITIONS, {
    error: 'Conditie medicala invalida',
  })).optional(),
  medications: z.array(z.enum(VALID_MEDICATION_CATEGORIES, {
    error: 'Categorie de medicament invalida',
  })).optional(),
  pregnancyStatus: z.enum(['none', 'pregnant', 'breastfeeding'], {
    error: 'Status de sarcina invalid',
  }).optional(),
  dietaryPrefs: z.array(z.string().min(1).max(50)).optional(),
  dailyCalorieGoal: z.number()
    .int('Obiectivul caloric trebuie sa fie un numar intreg')
    .min(800, 'Obiectivul caloric minim este 800 kcal')
    .max(6000, 'Obiectivul caloric maxim este 6000 kcal')
    .optional(),
});

// ============================================================
// Pantry schemas
// ============================================================

const PANTRY_CATEGORIES = [
  'fructe', 'legume', 'lactate', 'carne', 'peste',
  'cereale', 'condimente', 'bauturi', 'conserve',
  'dulciuri', 'oua', 'altele',
] as const;

const PANTRY_UNITS = ['g', 'kg', 'ml', 'l', 'buc', 'lingura', 'cana'] as const;

const PANTRY_LOCATIONS = ['fridge', 'freezer', 'pantry'] as const;

const FRESHNESS_VALUES = ['fresh', 'ok', 'wilting', 'expired'] as const;

// Regex to reject HTML tags in name fields
const noHtmlRegex = /^[^<>]*$/;

export const AddPantryItemSchema = z.object({
  name: z.string({ error: 'Numele alimentului este obligatoriu' })
    .min(1, 'Numele alimentului este obligatoriu')
    .max(200, 'Numele nu poate depasi 200 de caractere')
    .regex(noHtmlRegex, 'Numele nu poate contine tag-uri HTML'),
  nameEn: z.string()
    .max(200, 'Numele in engleza nu poate depasi 200 de caractere')
    .regex(noHtmlRegex, 'Numele nu poate contine tag-uri HTML')
    .optional(),
  category: z.enum(PANTRY_CATEGORIES, {
    error: 'Categorie invalida',
  }).optional(),
  quantity: z.number()
    .positive('Cantitatea trebuie sa fie pozitiva')
    .max(100000, 'Cantitatea maxima este 100000')
    .optional(),
  unit: z.enum(PANTRY_UNITS, {
    error: 'Unitate de masura invalida (g, kg, ml, l, buc, lingura, cana)',
  }).optional(),
  expiryDate: z.string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().date().optional()),
  purchaseDate: z.string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().date().optional()),
  location: z.enum(PANTRY_LOCATIONS, {
    error: 'Locatie invalida (fridge, freezer, pantry)',
  }).optional(),
  freshness: z.enum(FRESHNESS_VALUES, {
    error: 'Valoare freshness invalida (fresh, ok, wilting, expired)',
  }).optional(),
  usdaFoodId: z.string().max(50).optional(),
  nutritionPer100g: z.record(z.unknown()).optional(),
  scanId: z.string().max(50).optional(),
});

// Batch pantry item schema (items from scan results)
const BatchPantryItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  name_ro: z.string().min(1).max(200).optional(),
  name_en: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  quantity: z.number().positive().max(100000).optional(),
  estimated_quantity: z.number().positive().max(100000).optional(),
  unit: z.string().max(20).optional(),
  freshness: z.string().max(20).optional(),
  location: z.string().max(20).optional(),
  usda_food_id: z.string().max(50).optional(),
});

export const BatchPantrySchema = z.object({
  items: z.array(BatchPantryItemSchema)
    .min(1, 'Trebuie sa trimiti cel putin un aliment')
    .max(50, 'Poti adauga maxim 50 de alimente odata'),
  scanId: z.string().max(50).optional(),
});

// ============================================================
// Scan schemas
// ============================================================

export const ScanBase64Schema = z.object({
  image: z.string({ error: 'Campul "image" (base64) este obligatoriu' })
    .min(1, 'Campul "image" nu poate fi gol')
    .refine(
      (val) => {
        // Allow raw base64 or data URI prefix
        const isDataUri = /^data:image\/(jpeg|png|webp|gif);base64,/.test(val);
        const isRawBase64 = /^[A-Za-z0-9+/=]+$/.test(val.slice(0, 100));
        return isDataUri || isRawBase64;
      },
      'Imaginea trebuie sa fie in format base64 valid'
    )
    .refine(
      (val) => {
        // Rough size check: base64 is ~4/3 of original size
        // 10MB original = ~13.3MB base64
        const maxBase64Length = Math.ceil((10 * 1024 * 1024 * 4) / 3);
        return val.length <= maxBase64Length;
      },
      'Imaginea depaseste dimensiunea maxima de 10MB'
    ),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    error: 'Tip MIME invalid (acceptate: image/jpeg, image/png, image/webp)',
  }).optional(),
});

// ============================================================
// Recipe schemas
// ============================================================

const RecipeIngredientSchema = z.object({
  name_ro: z.string().max(200).optional(),
  name_en: z.string().max(200).optional(),
  name: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  quantity: z.number().optional(),
  unit: z.string().max(20).optional(),
  freshness: z.string().max(20).optional(),
});

export const GenerateRecipesSchema = z.object({
  ingredients: z.array(RecipeIngredientSchema)
    .max(100, 'Poti trimite maxim 100 de ingrediente')
    .optional(),
});

export const SaveRecipeSchema = z.object({
  recipe: z.record(z.unknown(), {
    error: 'Datele retetei sunt obligatorii',
  }),
});

// ============================================================
// Validate middleware factory
// ============================================================

/**
 * Middleware factory that validates req.body against a Zod schema.
 * Returns 400 with Romanian error messages on validation failure.
 */
export function validate(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'body';
        return `${path}: ${issue.message}`;
      });

      res.status(400).json({
        success: false,
        error: 'Date invalide',
        details: errors,
      });
      return;
    }

    // Replace body with parsed (and coerced/stripped) data
    req.body = result.data;
    next();
  };
}
