/**
 * Calculator nutrițional — formule validate clinic
 * Surse: Mifflin-St Jeor (2005), USDA, NIH, ADA, AHA
 */

// ===== BMR (Basal Metabolic Rate) — Mifflin-St Jeor =====
export function calculateBMR(weight_kg: number, height_cm: number, age: number, sex: string): number {
  if (sex === 'M') {
    return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
  } else {
    return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
  }
}

// ===== TDEE (Total Daily Energy Expenditure) =====
// Valorile trebuie să fie identice cu enum-ul din validators/index.ts
var ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
  // Valori legacy (pentru compatibilitate cu date deja salvate în DB)
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export function calculateTDEE(bmr: number, activityLevel: string): number {
  return Math.round(bmr * (ACTIVITY_FACTORS[activityLevel] || 1.2));
}

// ===== Macro distribution =====
var MACRO_RATIOS: Record<string, { protein: number; carbs: number; fat: number }> = {
  balanced: { protein: 0.25, carbs: 0.50, fat: 0.25 },
  low_carb: { protein: 0.30, carbs: 0.25, fat: 0.45 },
  keto: { protein: 0.20, carbs: 0.05, fat: 0.75 },
  high_protein: { protein: 0.40, carbs: 0.35, fat: 0.25 },
  mediterranean: { protein: 0.20, carbs: 0.50, fat: 0.30 },
};

export function calculateMacros(tdee: number, diet: string = 'balanced') {
  var ratios = MACRO_RATIOS[diet] || MACRO_RATIOS.balanced;
  return {
    protein_g: Math.round((tdee * ratios.protein) / 4),
    carbs_g: Math.round((tdee * ratios.carbs) / 4),
    fat_g: Math.round((tdee * ratios.fat) / 9),
  };
}

// ===== Glycemic Index compozit =====
export function calculateMealGI(items: Array<{ glycemicIndex: number; carbsGrams: number }>): number {
  var totalCarbs = items.reduce((sum, i) => sum + i.carbsGrams, 0);
  if (totalCarbs === 0) return 0;
  var weightedGI = items.reduce((sum, i) => sum + (i.glycemicIndex * i.carbsGrams), 0);
  return Math.round(weightedGI / totalCarbs);
}

// ===== Glycemic Load =====
export function calculateGL(gi: number, carbsPerServing: number): number {
  return Math.round((gi * carbsPerServing) / 100 * 10) / 10;
}

// ===== Water need =====
export function calculateWaterNeed(weight_kg: number, activityLevel: string): number {
  var base = weight_kg * 33;
  var isActive = activityLevel === 'active' || activityLevel === 'very_active';
  var isVeryActive = activityLevel === 'very_active' || activityLevel === 'extra_active';
  var multiplier = isVeryActive ? 1.5 : isActive ? 1.3 : 1.0;
  return Math.round(base * multiplier);
}

// ===== Pregnancy extra calories =====
var PREGNANCY_EXTRA: Record<string, number> = {
  trimester_1: 0,
  trimester_2: 340,
  trimester_3: 452,
  breastfeeding: 500
};

export function getPregnancyExtra(status: string): number {
  return PREGNANCY_EXTRA[status] || 0;
}

// ===== BMI =====
export function calculateBMI(weight_kg: number, height_cm: number): number {
  var h = height_cm / 100;
  return Math.round((weight_kg / (h * h)) * 10) / 10;
}

// ===== Daily calorie goal =====
export function calculateDailyCalories(profile: {
  weight: number; height: number; age: number; sex: string;
  activityLevel: string; pregnancyStatus?: string;
}): number {
  var bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.sex);
  var tdee = calculateTDEE(bmr, profile.activityLevel);
  var extra = getPregnancyExtra(profile.pregnancyStatus || 'none');
  return tdee + extra;
}

// ===== Meal calorie distribution =====
export function mealCalorieDistribution(dailyGoal: number) {
  return {
    breakfast: Math.round(dailyGoal * 0.25),
    lunch: Math.round(dailyGoal * 0.35),
    dinner: Math.round(dailyGoal * 0.30),
    snacks: Math.round(dailyGoal * 0.10),
  };
}
