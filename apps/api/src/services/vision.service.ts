/**
 * Vision service — scanare alimente din imagini
 * Provider: Ollama (local, gratuit) sau Gemini (cloud, API key)
 */

import fs from 'fs';
import { ollamaVision, ollamaGenerate, parseJsonResponse } from './ollama.service';

// AI_PROVIDER: 'ollama' (default, gratuit) sau 'gemini' (necesită API key)
const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';

const VISION_PROMPT = `Ești un expert în identificarea alimentelor din imagini.
Analizează imaginea și returnează un JSON strict cu alimentele identificate.

REGULI:
1. Identifică FIECARE aliment vizibil separat
2. Estimează cantitatea aproximativă (g, ml, bucăți)
3. Evaluează prospețimea vizuală (proaspat/ok/aproape_expirat/expirat)
4. Oferă confidence score (0.0 - 1.0) pentru fiecare identificare
5. Categorizează: proteine, lactate, legume, fructe, cereale, condimente, bauturi, altele
6. Identifică marca/producătorul dacă e vizibil pe ambalaj

FORMAT RĂSPUNS (JSON STRICT, fără markdown, fără backticks, fără alt text):
{
  "ingredients": [
    {
      "name_ro": "Piept de pui",
      "name_en": "Chicken breast",
      "category": "proteine",
      "estimated_quantity": 500,
      "unit": "g",
      "freshness": "proaspat",
      "confidence": 0.92,
      "brand": null,
      "storage_tip": "Se păstrează 2-3 zile la frigider",
      "usda_food_id": null
    }
  ],
  "fridge_condition": "organizat",
  "general_notes": "Observații despre conținut"
}

IMPORTANT:
- Nu inventa alimente care nu sunt clar vizibile
- Dacă nu ești sigur, folosește confidence < 0.5
- Diferențiază între alimente similare
- Răspunde DOAR cu JSON valid, fără alt text`;

/**
 * Scan image from file path
 */
export async function scanImage(imagePath: string): Promise<any> {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  return scanBase64(base64, imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg');
}

/**
 * Scan image from base64 data
 */
export async function scanBase64(base64Data: string, mimeType: string = 'image/jpeg'): Promise<any> {
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  if (AI_PROVIDER === 'ollama') {
    return scanWithOllama(cleanBase64);
  } else {
    return scanWithGemini(cleanBase64, mimeType);
  }
}

/**
 * Ollama vision scan (local, gratuit)
 */
async function scanWithOllama(base64: string): Promise<any> {
  console.log('[Vision] Scanning with Ollama (local)...');

  try {
    const response = await ollamaVision(VISION_PROMPT, base64);
    return parseJsonResponse(response);
  } catch (firstError: any) {
    console.warn('[Vision] First Ollama attempt failed, retrying with fix prompt...');

    // Retry: ask to fix the JSON
    try {
      const response = await ollamaVision(
        VISION_PROMPT + '\n\nIMPORTANT: Răspunde DOAR cu JSON valid. Niciun alt text.',
        base64
      );
      return parseJsonResponse(response);
    } catch (retryError: any) {
      // Final fallback: generate a text-based description and parse
      console.warn('[Vision] Vision retry failed, using text fallback');
      const textResponse = await ollamaVision(
        'Listează toate alimentele vizibile în această imagine. Pentru fiecare aliment, spune: numele în română, categoria (proteine/lactate/legume/fructe/cereale/condimente/bauturi/altele), cantitatea estimată și unitatea de măsură. Format simplu, câte un aliment pe linie.',
        base64
      );

      // Parse text response into structured JSON
      return parseTextToScanResult(textResponse);
    }
  }
}

/**
 * Parse free-text food list into structured scan result
 */
function parseTextToScanResult(text: string): any {
  const lines = text.split('\n').filter(l => l.trim().length > 3);
  const ingredients: any[] = [];

  for (const line of lines) {
    const cleanLine = line.replace(/^[\d\.\-\*\•]+\s*/, '').trim();
    if (!cleanLine || cleanLine.length < 3) continue;

    // Try to extract food name and category
    const categoryMatch = cleanLine.match(/\b(proteine|lactate|legume|fructe|cereale|condimente|bauturi|altele)\b/i);
    const quantityMatch = cleanLine.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|buc|bucăți|bucati)/i);

    const name = cleanLine
      .replace(/\b(proteine|lactate|legume|fructe|cereale|condimente|bauturi|altele)\b/gi, '')
      .replace(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|buc|bucăți|bucati)/gi, '')
      .replace(/[:\-–,]+/g, '')
      .trim();

    if (name.length < 2) continue;

    ingredients.push({
      name_ro: name.charAt(0).toUpperCase() + name.slice(1),
      name_en: name,
      category: categoryMatch ? categoryMatch[1].toLowerCase() : 'altele',
      estimated_quantity: quantityMatch ? parseFloat(quantityMatch[1]) : 1,
      unit: quantityMatch ? quantityMatch[2].toLowerCase() : 'buc',
      freshness: 'ok',
      confidence: 0.6,
      brand: null,
      storage_tip: '',
      usda_food_id: null,
    });
  }

  return {
    ingredients: ingredients.length > 0 ? ingredients : [{
      name_ro: 'Aliment neidentificat',
      name_en: 'Unidentified food',
      category: 'altele',
      estimated_quantity: 1,
      unit: 'buc',
      freshness: 'ok',
      confidence: 0.3,
      brand: null,
      storage_tip: '',
      usda_food_id: null,
    }],
    fridge_condition: 'necunoscut',
    general_notes: 'Identificare bazată pe descriere text (model vision limitat)',
  };
}

/**
 * Gemini vision scan (cloud, necesită API key)
 */
async function scanWithGemini(base64: string, mimeType: string): Promise<any> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY lipsă! Setează AI_PROVIDER=ollama pentru scanare locală gratuită.');
  }

  console.log('[Vision] Scanning with Gemini (cloud)...');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    VISION_PROMPT,
    { inlineData: { data: base64, mimeType } }
  ]);

  const text = result.response.text();
  return parseJsonResponse(text);
}
