// ===== USER =====
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  age: number | null;
  sex: 'M' | 'F' | 'other' | null;
  weight: number | null;
  height: number | null;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  allergies: string[];
  medicalConditions: string[];
  dietaryPrefs: string[];
  dailyCalorieGoal: number | null;
  pregnancyStatus: 'none' | 'pregnant' | 'breastfeeding' | null;
  medications: string[];
}

// ===== PANTRY =====
export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  nameEn: string;
  category: string;
  quantity: number;
  unit: string;
  purchaseDate: string | null;
  expiryDate: string | null;
  freshness: 'proaspat' | 'ok' | 'aproape_expirat' | 'expirat';
  location: 'fridge' | 'freezer' | 'pantry';
  usdaFoodId: string | null;
  nutritionPer100g: NutritionInfo | null;
  isFinished: boolean;
  createdAt: string;
}

// ===== NUTRITION =====
export interface NutritionInfo {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  carbs_fiber_g: number;
  carbs_sugar_g: number;
  fat_g: number;
  fat_saturated_g: number;
  sodium_mg: number;
  potassium_mg: number;
  cholesterol_mg: number;
  calcium_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  zinc_mg: number;
  phosphorus_mg: number;
  vitamin_a_mcg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  vitamin_b12_mcg: number;
  folate_mcg: number;
  glycemic_index: number;
  glycemic_load: number;
}

// ===== SCAN =====
export interface ScanResult {
  ingredients: ScannedIngredient[];
  fridge_condition: 'organizat' | 'dezorganizat' | 'gol' | 'plin';
  general_notes: string;
}

export interface ScannedIngredient {
  name_ro: string;
  name_en: string;
  category: string;
  estimated_quantity: number;
  unit: string;
  freshness: string;
  confidence: number;
  brand: string | null;
  storage_tip: string;
  usda_food_id: string | null;
}

// ===== RECIPE =====
export interface Recipe {
  id: string;
  name: string;
  description: string;
  difficulty: 'usor' | 'mediu' | 'avansat';
  prep_time_min: number;
  cook_time_min: number;
  total_time_min: number;
  servings: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition_per_serving: NutritionInfo;
  medical_compliance: MedicalCompliance;
  storage_info: { fridge_days: number; freezer_months: number; reheating_instructions: string };
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  is_available: boolean;
  is_assumed: boolean;
  alternatives: string[];
  allergen_warning: string | null;
  medical_warning: string | null;
}

export interface RecipeStep {
  step_number: number;
  instruction: string;
  duration_min: number;
  temperature_celsius: number | null;
  tips: string | null;
  critical_safety: string | null;
}

export interface MedicalCompliance {
  safe_for_conditions: string[];
  warnings: MedicalWarning[];
  medication_interactions: string[];
  pregnancy_safe: boolean;
  detailed_notes: string;
}

// ===== MEDICAL =====
export interface MedicalWarning {
  severity: 'critical' | 'warning' | 'info';
  condition: string;
  ingredient: string;
  message: string;
  action: 'block' | 'warn' | 'inform';
}

// ===== API =====
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
