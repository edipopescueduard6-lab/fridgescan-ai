/**
 * Ollama API service — local AI inference
 * Supports both text and vision models
 */

const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || 'qwen2.5:7b';
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'minicpm-v';

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  total_duration?: number;
}

/**
 * Text generation via Ollama
 */
export async function ollamaGenerate(prompt: string, model?: string): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || TEXT_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 4096,
      }
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error (${res.status}): ${text}`);
  }

  const data = await res.json() as OllamaGenerateResponse;
  return data.response;
}

/**
 * Vision analysis via Ollama (minicpm-v or similar)
 */
export async function ollamaVision(prompt: string, imageBase64: string, model?: string): Promise<string> {
  // Remove data URL prefix if present
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || VISION_MODEL,
      prompt,
      images: [cleanBase64],
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 4096,
      }
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama vision error (${res.status}): ${text}`);
  }

  const data = await res.json() as OllamaGenerateResponse;
  return data.response;
}

/**
 * Check if Ollama is running and model is available
 */
export async function ollamaHealthCheck(): Promise<{
  running: boolean;
  textModel: boolean;
  visionModel: boolean;
  models: string[];
}> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) return { running: false, textModel: false, visionModel: false, models: [] };

    const data = await res.json() as { models?: Array<{ name: string }> };
    const modelNames = (data.models || []).map((m: any) => m.name);

    return {
      running: true,
      textModel: modelNames.some((n: string) => n.startsWith(TEXT_MODEL.split(':')[0])),
      visionModel: modelNames.some((n: string) => n.startsWith(VISION_MODEL.split(':')[0])),
      models: modelNames,
    };
  } catch {
    return { running: false, textModel: false, visionModel: false, models: [] };
  }
}

/**
 * Parse JSON from Ollama response (handles markdown fences, extra text)
 */
export function parseJsonResponse(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text.trim());
  } catch {}

  // Strip markdown code fences
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  // Try to extract JSON object or array
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  }

  // Try removing trailing text after last } or ]
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (lastBrace > 0) {
    const firstBrace = cleaned.indexOf('{') !== -1 ? cleaned.indexOf('{') : cleaned.indexOf('[');
    if (firstBrace >= 0) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch {}
    }
  }

  throw new Error('Nu am putut parsa răspunsul JSON de la AI');
}
