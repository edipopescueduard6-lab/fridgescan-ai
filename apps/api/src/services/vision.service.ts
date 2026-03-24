import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

var genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY lipsă! Obține gratuit de la https://aistudio.google.com/apikey');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

var VISION_PROMPT = `Ești un expert în identificarea alimentelor din imagini.
Analizează imaginea și returnează un JSON strict cu alimentele identificate.

REGULI:
1. Identifică FIECARE aliment vizibil separat
2. Estimează cantitatea aproximativă (g, ml, bucăți)
3. Evaluează prospețimea vizuală (proaspat/ok/aproape_expirat/expirat)
4. Oferă confidence score (0.0 - 1.0) pentru fiecare identificare
5. Categorizează: proteine, lactate, legume, fructe, cereale, condimente, bauturi, altele
6. Identifică marca/producătorul dacă e vizibil pe ambalaj

FORMAT RĂSPUNS (JSON STRICT, fără markdown, fără backticks):
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
  "general_notes": "Observații"
}

IMPORTANT:
- Nu inventa alimente care nu sunt clar vizibile
- Dacă nu ești sigur, folosește confidence < 0.5
- Diferențiază între alimente similare (ex: mozzarella vs. brânză topită)
- Răspunde DOAR cu JSON valid, fără alt text`;

export async function scanImage(imagePath: string): Promise<any> {
  var ai = getGenAI();
  var model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  var imageData = fs.readFileSync(imagePath);
  var base64 = imageData.toString('base64');
  var mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  var result = await model.generateContent([
    VISION_PROMPT,
    { inlineData: { data: base64, mimeType } }
  ]);

  var text = result.response.text();

  // Strip markdown code fences if present
  var cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Retry: ask Gemini to fix the JSON
    var fixResult = await model.generateContent(
      `Repară acest JSON invalid și returnează DOAR JSON valid, fără alt text:\n${cleaned}`
    );
    var fixedText = fixResult.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(fixedText);
  }
}

export async function scanBase64(base64Data: string, mimeType: string = 'image/jpeg'): Promise<any> {
  var ai = getGenAI();
  var model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Remove data URL prefix if present
  var cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  var result = await model.generateContent([
    VISION_PROMPT,
    { inlineData: { data: cleanBase64, mimeType } }
  ]);

  var text = result.response.text();
  var cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    var fixResult = await model.generateContent(
      `Repară acest JSON invalid și returnează DOAR JSON valid:\n${cleaned}`
    );
    var fixedText = fixResult.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(fixedText);
  }
}
