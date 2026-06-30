/**
 * translation.service.ts
 *
 * Сервіс перекладу вже готових рецептів на іншу мову за допомогою Gemini.
 *
 * Ключова відмінність від ai.service.ts:
 *  - НЕ потрібні фотографії — лише текст (значно швидше: ~2-4 сек замість 15+)
 *  - Зберігає всі числові значення (КБЖВ) без змін
 *  - Зберігає imageUrl без змін (вирізає перед перекладом, повертає після)
 *  - Використовує той самий JSON Schema для структурованого виводу
 */

import {
  GoogleGenerativeAI,
  GoogleGenerativeAIError,
  GoogleGenerativeAIFetchError,
  SchemaType,
  type Part,
  type Schema,
} from '@google/generative-ai';
import type { RecipesPayload } from '../types/recipe.types.js';
import { HttpError } from '../utils/HttpError.js';

// ─── Константи ────────────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

/** Відповідність locale → повна назва мови для промпту */
const LOCALE_TO_LANGUAGE: Record<string, string> = {
  en: 'English',
  uk: 'Ukrainian',
  es: 'Spanish',
  ru: 'Russian',
};

// ─── JSON Schema для відповіді перекладача ────────────────────────────────────

/**
 * Схема нутрієнтів — числові поля, Gemini зобов'язаний скопіювати без змін.
 */
const NUTRITION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ['calories', 'protein', 'fat', 'carbs'],
  properties: {
    calories: { type: SchemaType.NUMBER },
    protein:  { type: SchemaType.NUMBER },
    fat:      { type: SchemaType.NUMBER },
    carbs:    { type: SchemaType.NUMBER },
  },
};

/**
 * Схема перекладеного рецепта.
 * imageUrl тут відсутній — ми вирізаємо його до відправки в Gemini
 * і повертаємо після отримання перекладу.
 */
const TRANSLATED_RECIPE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ['title', 'description', 'cookingTime', 'ingredients', 'steps', 'nutrition'],
  properties: {
    title:       { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    cookingTime: { type: SchemaType.STRING },
    ingredients: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    steps:       { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    nutrition:   NUTRITION_SCHEMA,
  },
};

const TRANSLATION_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ['ingredients', 'recipes'],
  properties: {
    ingredients: {
      type: SchemaType.ARRAY,
      description: 'Translated list of detected ingredients',
      items: { type: SchemaType.STRING },
    },
    recipes: {
      type: SchemaType.ARRAY,
      items: TRANSLATED_RECIPE_SCHEMA,
    },
  },
};

// ─── Внутрішній тип (без imageUrl, щоб не передавати Gemini зайвого) ──────────

interface RecipeForTranslation {
  title:       string;
  description: string;
  cookingTime: string;
  ingredients: string[];
  steps:       string[];
  nutrition:   { calories: number; protein: number; fat: number; carbs: number };
}

interface TranslationPayload {
  ingredients: string[];
  recipes:     RecipeForTranslation[];
}

// ─── Gemini client (singleton) ────────────────────────────────────────────────

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('[translation.service] GEMINI_API_KEY не налаштовано');
    }
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

// ─── Промпт ───────────────────────────────────────────────────────────────────

function buildTranslationPrompt(language: string): string {
  const langName = LOCALE_TO_LANGUAGE[language] ?? 'English';

  return `You are a professional culinary translator with deep knowledge of food culture and gastronomy.

Your task: translate the provided recipe data to ${langName}.

STRICT TRANSLATION RULES:
1. Translate ALL text fields: ingredient names in the top-level list, recipe titles, descriptions, cooking times, ingredient quantities with units, step-by-step instructions.
2. NEVER modify numeric values — copy calories, protein, fat, carbs exactly as-is.
3. Translate cooking time strings naturally (e.g. "25 minutes" → "25 хвилин" / "25 минут").
4. Use authentic culinary terminology and natural phrasing in ${langName}.
5. Return ONLY the translated JSON. No markdown, no commentary — pure JSON only.`;
}

// ─── Публічна функція ─────────────────────────────────────────────────────────

/**
 * Перекладає існуючі рецепти на нову мову за допомогою Gemini (текстовий режим).
 *
 * Алгоритм:
 *  1. Витягуємо imageUrl з кожного рецепта (не відправляємо в Gemini)
 *  2. Відправляємо текстовий запит з JSON даними
 *  3. Отримуємо перекладений JSON
 *  4. Повертаємо imageUrl назад у відповідь
 *
 * @param data     — поточний AnalyzeRecipesResponse (вже отримані рецепти)
 * @param language — цільова мова ('en' | 'uk' | 'es' | 'ru')
 */
export async function translateRecipeData(
  data: RecipesPayload,
  language: string,
): Promise<RecipesPayload> {
  // Зберігаємо imageUrls окремо — Gemini їх не бачить і не може змінити
  const imageUrls = data.recipes.map((r) => r.imageUrl);

  // Формуємо payload без imageUrl
  const payload: TranslationPayload = {
    ingredients: data.ingredients,
    recipes: data.recipes.map(({ imageUrl: _stripped, ...rest }) => ({
      title:       rest.title,
      description: rest.description,
      cookingTime: rest.cookingTime,
      ingredients: rest.ingredients,
      steps:       rest.steps,
      nutrition:   rest.nutrition,
    })),
  };

  const model = getClient().getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema:   TRANSLATION_RESPONSE_SCHEMA,
      temperature:      0.2, // Низька температура — переклад має бути точним, не творчим
      maxOutputTokens:  8192,
    },
  });

  const parts: Part[] = [
    { text: buildTranslationPrompt(language) },
    { text: JSON.stringify(payload) },
  ];

  try {
    const result   = await model.generateContent(parts);
    const response = result.response;

    // Перевірка safety filters
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      throw new HttpError('Контент заблоковано системою безпеки ШІ.', 422);
    }

    const rawText     = response.text().trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    let translated: TranslationPayload;

    try {
      translated = JSON.parse(rawText) as TranslationPayload;
    } catch {
      console.error('[translation.service] Невалідний JSON від Gemini:', rawText.slice(0, 300));
      throw new HttpError('Щось пішло не так. Спробуйте ще раз.', 500);
    }

    // Повертаємо imageUrl назад — Gemini їх не трогав
    return {
      ingredients: translated.ingredients,
      recipes: translated.recipes.map((recipe, index) => ({
        ...recipe,
        imageUrl: imageUrls[index],
      })),
    };

  } catch (error) {
    if (error instanceof HttpError) throw error;

    if (error instanceof GoogleGenerativeAIFetchError) {
      if (error.status === 429) {
        throw new HttpError('Забагато запитів. Зачекайте хвилинку та спробуйте ще раз.', 429);
      }
    }

    if (error instanceof GoogleGenerativeAIError) {
      const msg = (error as Error).message?.toLowerCase() ?? '';
      if (msg.includes('safety') || msg.includes('blocked')) {
        throw new HttpError('Не вдалося обробити запит. Спробуйте ще раз.', 422);
      }
    }

    console.error('[translation.service] Помилка перекладу:', error);
    throw new HttpError('Щось пішло не так. Спробуйте ще раз.', 500);
  }
}
