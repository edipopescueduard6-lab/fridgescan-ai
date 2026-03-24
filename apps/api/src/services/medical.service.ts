/**
 * Motor de avertismente medicale
 * Verifică siguranța rețetelor bazat pe condiții medicale, alergii, medicamente
 */

export interface MedicalWarning {
  severity: 'critical' | 'warning' | 'info';
  condition: string;
  ingredient: string;
  message: string;
  action: 'block' | 'warn' | 'inform';
}

// ===== ALERGENI =====
var ALLERGEN_MAP: Record<string, string[]> = {
  gluten: ['grau', 'orz', 'secara', 'ovaz', 'seitan', 'bulgur', 'couscous',
    'semolina', 'sos de soia', 'bere', 'malt', 'wheat', 'barley', 'rye',
    'soy sauce', 'pasta', 'paine', 'bread', 'flour', 'faina'],
  lactose: ['lapte', 'smantana', 'iaurt', 'branza', 'unt', 'frisca', 'inghetata',
    'milk', 'cream', 'yogurt', 'cheese', 'butter', 'ice cream', 'whey', 'zer'],
  nuts: ['nuci', 'migdale', 'caju', 'fistic', 'macadamia', 'pecan',
    'walnuts', 'almonds', 'cashews', 'pistachios', 'hazelnuts', 'alune'],
  peanuts: ['arahide', 'unt de arahide', 'peanuts', 'peanut butter'],
  shellfish: ['creveti', 'homar', 'crab', 'scoici', 'midii', 'stridii',
    'shrimp', 'lobster', 'crab', 'mussels', 'oysters', 'clams'],
  fish: ['peste', 'somon', 'ton', 'sardine', 'hamsii', 'cod',
    'fish', 'salmon', 'tuna', 'sardines', 'anchovies'],
  eggs: ['ou', 'oua', 'galbenus', 'albus', 'egg', 'eggs', 'mayonnaise', 'maioneza'],
  soy: ['soia', 'tofu', 'tempeh', 'edamame', 'sos de soia', 'soy', 'soy sauce'],
  sesame: ['susan', 'tahini', 'sesame'],
};

// ===== INTERACȚIUNI MEDICAMENT-ALIMENT =====
var MEDICATION_FOOD_INTERACTIONS: Record<string, {
  foods: string[]; message: string; action: 'block' | 'warn';
}[]> = {
  warfarin: [{
    foods: ['spanac', 'kale', 'varza', 'broccoli', 'sparanghel', 'salata verde',
      'spinach', 'cabbage', 'broccoli', 'asparagus', 'lettuce'],
    message: 'Conține vitamina K ridicată. Cu Warfarin, menține aport CONSTANT de vit K — nu crește/scade brusc.',
    action: 'warn'
  }],
  maoi: [{
    foods: ['branza veche', 'branza maturata', 'salam', 'vin rosu', 'bere',
      'sos de soia', 'varza murata', 'miso', 'kimchi',
      'aged cheese', 'cured meats', 'red wine', 'sauerkraut'],
    message: 'PERICOL: Tiramină ridicată! Cu IMAO poate provoca criză hipertensivă (urgență medicală).',
    action: 'block'
  }],
  statins: [{
    foods: ['grapefruit', 'suc de grapefruit', 'grapefruit juice'],
    message: 'Grapefruitul INHIBĂ enzima CYP3A4, crescând nivelul statinei și riscul de rabdomioliză. Evitați complet!',
    action: 'block'
  }],
  metformin: [{
    foods: ['alcool', 'vin', 'bere', 'vodca', 'whisky', 'alcohol', 'wine', 'beer', 'spirits'],
    message: 'Alcoolul cu Metformin crește riscul de acidoză lactică. Evitați sau limitați sever.',
    action: 'warn'
  }],
  levothyroxine: [{
    foods: ['soia', 'tofu', 'soy', 'calciu', 'calcium'],
    message: 'Soia și calciul reduc absorbția Levotiroxinei. Nu consumați la aceeași masă.',
    action: 'warn'
  }],
  ace_inhibitors: [{
    foods: ['banane', 'portocale', 'cartofi', 'bananas', 'oranges', 'potatoes', 'avocado'],
    message: 'Aliment bogat în potasiu. Cu ACE inhibitori, potasiul crescut poate fi periculos.',
    action: 'warn'
  }],
  lithium: [{
    foods: [],
    message: 'Cu Litiu, mențineți aport CONSTANT de sodiu. Nu variați brusc.',
    action: 'warn'
  }]
};

// ===== HIGH PURINE FOODS (gută) =====
var HIGH_PURINE_FOODS = ['ficat', 'rinichi', 'creier', 'inima', 'sardine', 'hamsii',
  'midii', 'scoici', 'pastrav', 'ton', 'bere', 'liver', 'kidney', 'brain',
  'heart', 'sardines', 'anchovies', 'mussels', 'scallops', 'trout', 'tuna', 'beer'];

var MODERATE_PURINE_FOODS = ['vita', 'porc', 'miel', 'curcan', 'somon', 'crab', 'creveti',
  'beef', 'pork', 'lamb', 'turkey', 'salmon', 'crab', 'shrimp'];

// ===== PREGNANCY BANNED =====
var PREGNANCY_BANNED = ['peste crud', 'sushi', 'sashimi', 'carne cruda', 'tartare', 'carpaccio',
  'branza nepasteurizata', 'brie', 'camembert', 'pate', 'alcool', 'vin', 'bere',
  'raw fish', 'raw meat', 'unpasteurized cheese', 'alcohol', 'wine', 'beer',
  'rechin', 'peste spada', 'macrou regal', 'shark', 'swordfish', 'king mackerel'];

// ===== GLUTEN SOURCES =====
var GLUTEN_SOURCES = ALLERGEN_MAP.gluten;

/**
 * Verifică un ingredient individual contra profilului medical al utilizatorului
 */
export function checkIngredient(
  ingredientName: string,
  userAllergies: string[],
  userConditions: string[],
  userMedications: string[],
  pregnancyStatus: string,
  nutritionPerServing?: any
): MedicalWarning[] {
  var warnings: MedicalWarning[] = [];
  var nameLower = ingredientName.toLowerCase();

  // 1. CHECK ALLERGIES
  for (var allergy of userAllergies) {
    var allergenFoods = ALLERGEN_MAP[allergy.toLowerCase()] || [];
    for (var food of allergenFoods) {
      if (nameLower.includes(food.toLowerCase())) {
        warnings.push({
          severity: 'critical',
          condition: `alergie_${allergy}`,
          ingredient: ingredientName,
          message: `ALERGEN DETECTAT: ${allergy} în "${ingredientName}"! Risc de anafilaxie.`,
          action: 'block'
        });
        break;
      }
    }
  }

  // 2. CHECK MEDICAL CONDITIONS
  for (var condition of userConditions) {
    var condLower = condition.toLowerCase();

    // Celiac — gluten
    if (condLower.includes('celiac')) {
      for (var gs of GLUTEN_SOURCES) {
        if (nameLower.includes(gs.toLowerCase())) {
          warnings.push({
            severity: 'critical',
            condition: 'boala_celiaca',
            ingredient: ingredientName,
            message: `CONȚINE GLUTEN! "${ingredientName}" este interzis în boala celiacă.`,
            action: 'block'
          });
          break;
        }
      }
    }

    // Gout
    if (condLower.includes('gout') || condLower.includes('guta')) {
      for (var pf of HIGH_PURINE_FOODS) {
        if (nameLower.includes(pf.toLowerCase())) {
          warnings.push({
            severity: 'critical',
            condition: 'guta',
            ingredient: ingredientName,
            message: `"${ingredientName}" are purine ridicate. Evitați complet cu gută!`,
            action: 'block'
          });
          break;
        }
      }
      for (var mpf of MODERATE_PURINE_FOODS) {
        if (nameLower.includes(mpf.toLowerCase())) {
          warnings.push({
            severity: 'warning',
            condition: 'guta',
            ingredient: ingredientName,
            message: `"${ingredientName}" are purine moderate. Max 170g carne/zi cu gută.`,
            action: 'warn'
          });
          break;
        }
      }
    }

    // Diabetes — check nutrition thresholds
    if (condLower.includes('diabet') && nutritionPerServing) {
      if (nutritionPerServing.carbs_sugar_g > 5) {
        warnings.push({
          severity: 'critical',
          condition: 'diabet',
          ingredient: ingredientName,
          message: `Zahăr: ${nutritionPerServing.carbs_sugar_g}g/porție. Limita diabet: < 5g.`,
          action: 'warn'
        });
      }
      if (nutritionPerServing.carbs_g > 45) {
        warnings.push({
          severity: 'warning',
          condition: 'diabet',
          ingredient: ingredientName,
          message: `Carbohidrați: ${nutritionPerServing.carbs_g}g/porție. Recomandare: 45-60g/masă.`,
          action: 'warn'
        });
      }
    }

    // Hypertension — sodium
    if (condLower.includes('hipertensiune') || condLower.includes('hypertension')) {
      if (nutritionPerServing && nutritionPerServing.sodium_mg > 600) {
        warnings.push({
          severity: 'critical',
          condition: 'hipertensiune',
          ingredient: ingredientName,
          message: `Sodiu: ${nutritionPerServing.sodium_mg}mg/porție! Max DASH: 500mg/masă.`,
          action: 'warn'
        });
      }
    }

    // CKD — potassium, phosphorus
    if (condLower.includes('renal') || condLower.includes('kidney') || condLower.includes('ckd')) {
      if (nutritionPerServing) {
        if (nutritionPerServing.potassium_mg > 700) {
          warnings.push({
            severity: 'critical',
            condition: 'boala_renala',
            ingredient: ingredientName,
            message: `Potasiu ridicat: ${nutritionPerServing.potassium_mg}mg! Limita CKD: < 2000mg/zi.`,
            action: 'warn'
          });
        }
        if (nutritionPerServing.phosphorus_mg > 300) {
          warnings.push({
            severity: 'critical',
            condition: 'boala_renala',
            ingredient: ingredientName,
            message: `Fosfor ridicat: ${nutritionPerServing.phosphorus_mg}mg! Limita CKD: < 800mg/zi.`,
            action: 'warn'
          });
        }
      }
    }
  }

  // 3. CHECK MEDICATION INTERACTIONS
  for (var med of userMedications) {
    var medLower = med.toLowerCase();
    for (var [medKey, interactions] of Object.entries(MEDICATION_FOOD_INTERACTIONS)) {
      if (medLower.includes(medKey)) {
        for (var interaction of interactions) {
          for (var iFood of interaction.foods) {
            if (nameLower.includes(iFood.toLowerCase())) {
              warnings.push({
                severity: interaction.action === 'block' ? 'critical' : 'warning',
                condition: `medicament_${medKey}`,
                ingredient: ingredientName,
                message: `${interaction.message}`,
                action: interaction.action
              });
              break;
            }
          }
        }
      }
    }
  }

  // 4. CHECK PREGNANCY
  if (pregnancyStatus === 'pregnant') {
    for (var banned of PREGNANCY_BANNED) {
      if (nameLower.includes(banned.toLowerCase())) {
        warnings.push({
          severity: 'critical',
          condition: 'sarcina',
          ingredient: ingredientName,
          message: `"${ingredientName}" este INTERZIS în sarcină!`,
          action: 'block'
        });
        break;
      }
    }
  }

  return warnings;
}

/**
 * Verifică o rețetă completă
 */
export function checkRecipeSafety(
  ingredients: Array<{ name: string; nutrition?: any }>,
  userAllergies: string[],
  userConditions: string[],
  userMedications: string[],
  pregnancyStatus: string
): { safe: boolean; warnings: MedicalWarning[] } {
  var allWarnings: MedicalWarning[] = [];

  for (var ing of ingredients) {
    var ingWarnings = checkIngredient(
      ing.name, userAllergies, userConditions,
      userMedications, pregnancyStatus, ing.nutrition
    );
    allWarnings.push(...ingWarnings);
  }

  // Deduplicare: warning-urile bazate pe nutriție (diabet, hipertensiune, CKD)
  // se generează per ingredient dar se referă la valori la nivel de rețetă,
  // deci pot apărea duplicate. Păstrăm un singur warning per (condition, ingredient).
  var seen = new Set<string>();
  var deduped: MedicalWarning[] = [];
  for (var w of allWarnings) {
    // Cheia de deduplicare: alergie și medicament sunt per ingredient (ok să fie duplicate)
    // Nutriție (diabet/hipertensiune/CKD) — deduplicăm pe condition+message
    var isNutritionWarning = (
      w.condition === 'diabet' ||
      w.condition === 'hipertensiune' ||
      w.condition === 'boala_renala'
    );
    var key = isNutritionWarning
      ? `${w.condition}:${w.message}`
      : `${w.condition}:${w.ingredient}:${w.message}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(w);
    }
  }

  var hasBlock = deduped.some(w => w.action === 'block');

  return { safe: !hasBlock, warnings: deduped };
}

/**
 * Medical disclaimer — OBLIGATORIU
 */
export var MEDICAL_DISCLAIMER = `ATENȚIE: FridgeScan AI oferă informații nutriționale orientative și NU înlocuiește consultul medical. Valorile nutriționale sunt estimate și pot varia. Dacă aveți condiții medicale, alergii severe sau luați medicamente, consultați medicul. ÎN CAZ DE REACȚIE ALERGICĂ: Apelați 112 IMEDIAT.`;
