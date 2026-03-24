/**
 * Recipe generation service
 * Provider: Ollama (local, gratuit) sau Gemini (cloud, API key)
 */

import { ollamaGenerate, parseJsonResponse } from './ollama.service';
import { checkRecipeSafety, MEDICAL_DISCLAIMER } from './medical.service';

const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';

function buildRecipePrompt(ingredients: any[], profile: any): string {
  return `Ești un chef profesionist și nutriționist certificat.
Generează 3 rețete bazate STRICT pe ingredientele disponibile ale utilizatorului.

INGREDIENTE DISPONIBILE:
${JSON.stringify(ingredients, null, 2)}

PROFIL UTILIZATOR:
- Alergii: ${(profile.allergies || []).join(', ') || 'niciuna'}
- Condiții medicale: ${(profile.medicalConditions || []).join(', ') || 'niciuna'}
- Preferințe dietare: ${(profile.dietaryPrefs || []).join(', ') || 'niciuna'}
- Medicamente: ${(profile.medications || []).join(', ') || 'niciuna'}

REGULI STRICTE:
1. Folosește DOAR ingredientele disponibile + max 5 ingrediente de bază presupuse (sare, piper, ulei, apă, zahăr)
2. NICIODATĂ nu sugera ingrediente cu alergenii: ${(profile.allergies || []).join(', ')}
3. Respectă TOATE restricțiile medicale
4. Calculează PRECIS valorile nutriționale per porție
5. Pașii trebuie să fie clari, numerotați, cu temperaturi și timpi exacti

FORMAT RĂSPUNS — DOAR JSON VALID, fără markdown, fără backticks:
{
  "recipes": [
    {
      "id": "1",
      "name": "Numele reteței",
      "description": "Descriere scurtă",
      "difficulty": "usor",
      "prep_time_min": 15,
      "cook_time_min": 30,
      "total_time_min": 45,
      "servings": 4,
      "tags": ["pranz", "rapid"],
      "ingredients": [
        {
          "name": "Ingredient",
          "quantity": 400,
          "unit": "g",
          "is_available": true,
          "is_assumed": false,
          "alternatives": [],
          "allergen_warning": null,
          "medical_warning": null
        }
      ],
      "steps": [
        {
          "step_number": 1,
          "instruction": "Pas detaliat",
          "duration_min": 5,
          "temperature_celsius": null,
          "tips": null,
          "critical_safety": null
        }
      ],
      "nutrition_per_serving": {
        "calories_kcal": 385,
        "protein_g": 42,
        "carbs_g": 18,
        "carbs_fiber_g": 3,
        "carbs_sugar_g": 4,
        "fat_g": 15,
        "fat_saturated_g": 3,
        "sodium_mg": 420,
        "potassium_mg": 580,
        "cholesterol_mg": 95,
        "calcium_mg": 45,
        "iron_mg": 2,
        "magnesium_mg": 38,
        "zinc_mg": 2,
        "phosphorus_mg": 280,
        "vitamin_a_mcg": 120,
        "vitamin_c_mg": 15,
        "vitamin_d_mcg": 0.5,
        "vitamin_b12_mcg": 0.8,
        "folate_mcg": 25,
        "glycemic_index": 42,
        "glycemic_load": 7.6
      },
      "medical_compliance": {
        "safe_for_conditions": [],
        "warnings": [],
        "medication_interactions": [],
        "pregnancy_safe": true,
        "detailed_notes": ""
      },
      "storage_info": {
        "fridge_days": 3,
        "freezer_months": 2,
        "reheating_instructions": ""
      }
    }
  ]
}

Răspunde DOAR cu JSON valid. Niciun alt text.`;
}

/**
 * Generate recipes using AI
 */
export async function generateRecipes(ingredients: any[], profile: any): Promise<any> {
  const prompt = buildRecipePrompt(ingredients, profile);

  let parsed: any;

  if (AI_PROVIDER === 'ollama') {
    parsed = await generateWithOllama(prompt);
  } else {
    parsed = await generateWithGemini(prompt);
  }

  // Post-process: run medical safety check on each recipe
  if (parsed.recipes) {
    for (const recipe of parsed.recipes) {
      const ingredientNames = (recipe.ingredients || []).map((i: any) => ({
        name: i.name,
        nutrition: recipe.nutrition_per_serving
      }));

      const safetyCheck = checkRecipeSafety(
        ingredientNames,
        profile.allergies || [],
        profile.medicalConditions || [],
        profile.medications || [],
        profile.pregnancyStatus || 'none'
      );

      recipe.medical_compliance = recipe.medical_compliance || {};
      recipe.medical_compliance.warnings = [
        ...(recipe.medical_compliance.warnings || []),
        ...safetyCheck.warnings
      ];
      recipe._safe = safetyCheck.safe;
      recipe._disclaimer = MEDICAL_DISCLAIMER;
    }

    // Sort: safe recipes first
    parsed.recipes.sort((a: any, b: any) => {
      if (a._safe && !b._safe) return -1;
      if (!a._safe && b._safe) return 1;
      return 0;
    });
  }

  return parsed;
}

/**
 * Generate with Ollama (local)
 */
async function generateWithOllama(prompt: string): Promise<any> {
  console.log('[Recipes] Generating with Ollama (local)...');

  const response = await ollamaGenerate(prompt);

  try {
    return parseJsonResponse(response);
  } catch {
    // Retry with stricter instruction
    console.warn('[Recipes] First attempt JSON parse failed, retrying...');
    const retryResponse = await ollamaGenerate(
      'Repară acest JSON invalid și returnează DOAR JSON valid, fără alt text:\n' + response
    );
    return parseJsonResponse(retryResponse);
  }
}

/**
 * Generate with Gemini (cloud)
 */
async function generateWithGemini(prompt: string): Promise<any> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY lipsă! Setează AI_PROVIDER=ollama pentru generare locală gratuită.');
  }

  console.log('[Recipes] Generating with Gemini (cloud)...');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseJsonResponse(text);
}
