/**
 * ai.service.ts
 *
 * Сервіс аналізу фотографій продуктів і генерації рецептів
 * на базі Google Gemini Multimodal Vision зі структурованим виводом (JSON Schema).
 *
 * Архітектура:
 *  1. Зображення перетворюються на base64-рядки та передаються Gemini як inline-части.
 *  2. Модель отримує детальний промпт шеф-кухаря з вимогою суворої JSON-відповіді.
 *  3. Gemini повертає чистий JSON (без markdown), що відповідає оголошеній ResponseSchema.
 *  4. Відповідь валідується та маппується у публічний тип AnalyzeRecipesResponse.
 */

import {
  GoogleGenerativeAI,
  GoogleGenerativeAIError,
  GoogleGenerativeAIFetchError,
  SchemaType,
  type Part,
  type Schema,
} from '@google/generative-ai';
import type {
  RecipesPayload,
  UploadedImage,
} from '../types/recipe.types.js';
import { fetchFoodImage } from './image-search.service.js';
import { HttpError } from '../utils/HttpError.js';

// ─── Константи ────────────────────────────────────────────────────────────────

/**
 * Назва моделі Gemini.
 * Можна перевизначити через змінну середовища GEMINI_MODEL.
 * За замовчуванням — gemini-2.5-flash: найшвидша мультимодальна модель з vision-підтримкою.
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

/** Кількість рецептів, що генерується за один запит */
const RECIPES_COUNT = 3;

/** Максимум токенів виводу — достатньо для трьох детальних рецептів */
const MAX_OUTPUT_TOKENS = 8192;

/** Температура генерації: 0.7 — баланс між креативністю і точністю */
const TEMPERATURE = 0.7;

/**
 * Відповідність коду locale → повна назва мови для промпту.
 * Gemini краще розуміє повні назви мов, а не ISO-коди.
 */
const LOCALE_TO_LANGUAGE: Record<string, string> = {
  en: 'English',
  uk: 'Ukrainian',
  es: 'Spanish',
  ru: 'Russian',
};

/** Дозволені MIME-типи для inline-зображень у Gemini API */
type GeminiImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

// ─── JSON Schema для структурованого виводу ───────────────────────────────────

/**
 * Схема нутрієнтів (КБЖВ) на одну порцію.
 * Усі значення — цілі числа (грами / ккал).
 */
const NUTRITION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  description: 'Nutritional macros per single serving',
  required: ['calories', 'protein', 'fat', 'carbs'],
  properties: {
    calories: {
      type: SchemaType.NUMBER,
      description: 'Total kilocalories per serving',
    },
    protein: {
      type: SchemaType.NUMBER,
      description: 'Protein content in grams',
    },
    fat: {
      type: SchemaType.NUMBER,
      description: 'Fat content in grams',
    },
    carbs: {
      type: SchemaType.NUMBER,
      description: 'Carbohydrate content in grams',
    },
  },
};

/**
 * Схема одного рецепта.
 * Всі поля обов'язкові — Gemini не повинен пропускати жодне.
 * imageSearchQuery — завжди англійською для пошуку фото в Pexels/Unsplash.
 */
const RECIPE_ITEM_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ['title', 'description', 'cookingTime', 'ingredients', 'steps', 'nutrition', 'imageSearchQuery'],
  properties: {
    title: {
      type: SchemaType.STRING,
      description: 'Creative, evocative recipe name',
    },
    description: {
      type: SchemaType.STRING,
      description: 'Brief culinary description (2–3 sentences)',
    },
    cookingTime: {
      type: SchemaType.STRING,
      description: 'Total prep + cook time as a human-readable string, e.g. "25 minutes"',
    },
    ingredients: {
      type: SchemaType.ARRAY,
      description: 'Complete list of ingredients with exact quantities, one entry per item',
      items: { type: SchemaType.STRING },
    },
    steps: {
      type: SchemaType.ARRAY,
      description: 'Detailed step-by-step cooking instructions (minimum 5 steps)',
      items: { type: SchemaType.STRING },
    },
    nutrition: NUTRITION_SCHEMA,
    imageSearchQuery: {
      type: SchemaType.STRING,
      description:
        'A concise English-language search phrase (3–5 words) for finding a food photo, ' +
        'e.g. "scrambled eggs tomatoes herbs" or "pasta carbonara". ALWAYS in English regardless of response language.',
    },
  },
};

/**
 * Кореневий JSON Schema — те, що Gemini зобов'язаний повернути.
 * Використовується в generationConfig.responseSchema.
 */
const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ['detectedIngredients', 'recipes'],
  properties: {
    detectedIngredients: {
      type: SchemaType.ARRAY,
      description: 'All food ingredients and products clearly visible in the photos',
      items: { type: SchemaType.STRING },
    },
    recipes: {
      type: SchemaType.ARRAY,
      description: `Exactly ${RECIPES_COUNT} creative, restaurant-quality recipes`,
      items: RECIPE_ITEM_SCHEMA,
    },
  },
};

// ─── Внутрішній тип відповіді Gemini ──────────────────────────────────────────

/**
 * Типізація JSON, що повертає Gemini.
 * Відповідає RESPONSE_SCHEMA вище.
 */
interface GeminiRawResponse {
  detectedIngredients: string[];
  recipes: Array<{
    title: string;
    description: string;
    cookingTime: string;
    ingredients: string[];
    steps: string[];
    nutrition: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    };
    /** Завжди англійською — для пошуку фото в Pexels/Unsplash */
    imageSearchQuery: string;
  }>;
}

// ─── Ініціалізація SDK ────────────────────────────────────────────────────────

/**
 * Створює клієнт Gemini.
 * Зчитує ключ з GEMINI_API_KEY (або GOOGLE_AI_API_KEY для зворотної сумісності).
 * Кидає Error при запуску сервера, якщо ключ відсутній.
 */
function createGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      '[ai.service] Відсутній ключ Gemini API. ' +
        'Встановіть змінну середовища GEMINI_API_KEY у файлі server/.env',
    );
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Ледаче створення клієнта — ініціалізується при першому виклику analyzeProductPhotos.
 * Це дозволяє серверу запуститись навіть без ключа (показує попередження),
 * але падає з чітким повідомленням при першому реальному запиті.
 */
let _geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!_geminiClient) {
    _geminiClient = createGeminiClient();
  }
  return _geminiClient;
}

// ─── Спільні вимоги до рецептів ───────────────────────────────────────────────

/**
 * Базові правила приготування, спільні для обох промптів.
 * Акцент на ПРОСТОТІ та ШВИДКОСТІ — не ресторанна, а домашня кухня.
 */
const RECIPE_RULES = `
RECIPE REQUIREMENTS (strictly enforced):
  - Maximum 30 minutes total (prep + cook combined)
  - Basic home techniques only: fry, boil, bake, stir, blend — nothing professional
  - Standard kitchen tools only: pan, pot, oven, microwave — no special equipment
  - Everyday accessible ingredients — what normal people have at home
  - Delicious, satisfying comfort food — NOT fine-dining plating

FOR EACH RECIPE provide:
  - A simple, appetizing name (not fancy, just descriptive and mouth-watering)
  - A short description (1–2 sentences) about taste and why people will love it
  - Total cooking time as a string (e.g. "20 minutes")
  - Full ingredients list with exact quantities (e.g. "2 eggs", "1 tbsp oil")
  - Clear step-by-step instructions (minimum 5 steps, written for a beginner)
  - Realistic nutritional macros per serving: calories (kcal), protein (g), fat (g), carbs (g)
  - An English photo search phrase (3–5 words) for finding a food photo`;

// ─── Побудова промптів ────────────────────────────────────────────────────────

/**
 * Промпт для аналізу ФОТОГРАФІЙ.
 * Gemini спочатку розпізнає інгредієнти на фото, потім генерує рецепти.
 */
function buildVisionPrompt(language: string): string {
  const langName = LOCALE_TO_LANGUAGE[language] ?? 'English';

  return `You are a practical home cook who makes quick, simple, and genuinely delicious everyday meals.

YOUR TASK:
1. Examine ALL provided food/ingredient photos carefully.
2. Identify every visible food ingredient and product in the images.
3. Create exactly ${RECIPES_COUNT} quick, simple, tasty recipes using primarily those ingredients.
${RECIPE_RULES}

MANDATORY RULES:
  1. LANGUAGE: ALL text in your response MUST be written in ${langName}. Non-negotiable.
  2. FOOD DETECTION: If no food is visible (e.g. landscapes, documents), return empty arrays.
  3. imageSearchQuery: ALWAYS in English regardless of response language.
  4. FORMAT: Pure JSON only — no markdown, no code blocks, no commentary.`;
}

/**
 * Промпт для генерації рецептів з ТЕКСТОВОГО СПИСКУ інгредієнтів.
 * Використовується коли користувач вручну підтверджує/доповнює список.
 */
function buildTextPrompt(ingredients: string[], language: string): string {
  const langName = LOCALE_TO_LANGUAGE[language] ?? 'English';
  const ingredientList = ingredients.map((i) => `- ${i}`).join('\n');

  return `You are a practical home cook who makes quick, simple, and genuinely delicious everyday meals.

The user has these ingredients available:
${ingredientList}

YOUR TASK:
Create exactly ${RECIPES_COUNT} quick, simple, tasty recipes using primarily the ingredients listed above.
Include ALL provided ingredients in the "detectedIngredients" field of your response.
${RECIPE_RULES}

MANDATORY RULES:
  1. LANGUAGE: ALL text in your response MUST be written in ${langName}. Non-negotiable.
  2. detectedIngredients: Include all user-provided ingredients plus any common staples you use.
  3. imageSearchQuery: ALWAYS in English regardless of response language.
  4. FORMAT: Pure JSON only — no markdown, no code blocks, no commentary.`;
}

// ─── Конвертація зображень ────────────────────────────────────────────────────

/**
 * Перетворює масив UploadedImage на масив Gemini Part (base64 inline data).
 * Це єдиний підтримуваний Gemini API спосіб передачі зображень без хмарного Storage.
 */
function imagesToGeminiParts(images: UploadedImage[]): Part[] {
  return images.map((image) => ({
    inlineData: {
      mimeType: image.mimeType as GeminiImageMime,
      data: image.buffer.toString('base64'),
    },
  }));
}

// ─── Обробка помилок Gemini ───────────────────────────────────────────────────

/**
 * Перетворює будь-яку помилку Gemini SDK на зрозумілий HttpError.
 * Охоплює: ліміти квоти, фільтри безпеки, помилки мережі, невалідні зображення.
 */
function handleGeminiError(error: unknown): never {
  // Повторно кидаємо наші власні HttpError без змін
  if (error instanceof HttpError) {
    throw error;
  }

  // HTTP-рівень помилки (мережа / статус-коди)
  if (error instanceof GoogleGenerativeAIFetchError) {
    if (error.status === 429) {
      throw new HttpError(
        'Забагато запитів. Зачекайте хвилинку та спробуйте ще раз.',
        429,
      );
    }
    if (error.status === 400) {
      throw new HttpError(
        'Не вдалося розпізнати фото. Переконайтесь, що зображення чітке, і спробуйте ще раз.',
        400,
      );
    }
    if (error.status === 403) {
      throw new HttpError(
        'Щось пішло не так. Зверніться до підтримки або спробуйте пізніше.',
        500,
      );
    }
    if (error.status === 503) {
      throw new HttpError(
        'Сервіс тимчасово недоступний. Спробуйте ще раз через кілька хвилин.',
        503,
      );
    }
  }

  // Помилки на рівні SDK (content safety, model errors тощо)
  if (error instanceof GoogleGenerativeAIError) {
    const msg = (error as Error).message?.toLowerCase() ?? '';

    // Блокування системою безпеки (Safety filters)
    if (msg.includes('safety') || msg.includes('blocked') || msg.includes('harm')) {
      throw new HttpError(
        'Це фото не вдалося обробити. Спробуйте завантажити інше.',
        422,
      );
    }

    // Зображення нечітке / непридатне для аналізу
    if (msg.includes('image') || msg.includes('invalid')) {
      throw new HttpError(
        'Зображення нечітке або пошкоджене. Спробуйте фото з кращою якістю.',
        422,
      );
    }
  }

  // Невідома помилка
  console.error('[ai.service] Непередбачена помилка:', error);
  throw new HttpError(
    'Щось пішло не так. Спробуйте ще раз або завантажте інші фото.',
    500,
  );
}

// ─── Схема та промпт для розпізнавання інгредієнтів (безкоштовний крок) ──────

/**
 * Мінімальна схема для кроку розпізнавання — повертає ЛИШЕ список інгредієнтів.
 * Значно менше токенів порівняно з повним RESPONSE_SCHEMA → швидше і дешевше.
 */
const DETECT_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ['ingredients'],
  properties: {
    ingredients: {
      type: SchemaType.ARRAY,
      description: 'Every food product or ingredient visible in the photos',
      items: { type: SchemaType.STRING },
    },
  },
};

/**
 * Промпт для розпізнавання інгредієнтів без генерації рецептів.
 * Проста, коротка інструкція — менше часу на обробку.
 */
function buildDetectPrompt(language: string): string {
  const langName = LOCALE_TO_LANGUAGE[language] ?? 'English';

  return `You are a food product recognition expert. Examine the provided photos carefully.

YOUR TASK: List EVERY food ingredient or product you can identify in the images.

INCLUDE: raw ingredients (vegetables, fruits, meats, dairy, grains), packaged products, condiments, spices.
EXCLUDE: non-food items, packaging text, brand names.

Write each item as a simple, clear name (e.g. "eggs", "chicken breast", "olive oil", "tomatoes").
If no food is visible, return an empty ingredients array.

LANGUAGE: Write ingredient names in ${langName}.
FORMAT: Pure JSON only — no markdown, no commentary.`;
}

// ─── Публічний API ────────────────────────────────────────────────────────────

/**
 * БЕЗКОШТОВНИЙ КРОК: розпізнає харчові інгредієнти на фотографіях.
 * НЕ генерує рецепти — лише повертає список виявлених продуктів.
 * Використовує спрощену схему → швидше та дешевше по токенах.
 *
 * @param images   — масив зображень (підготовлені multer)
 * @param language — код мови для назв інгредієнтів
 * @returns        — масив рядків із назвами знайдених інгредієнтів
 */
export async function detectIngredientsFromPhotos(
  images: UploadedImage[],
  language = 'uk',
): Promise<{ ingredients: string[] }> {
  const client = getGeminiClient();

  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: DETECT_SCHEMA,
      temperature: 0.3,        // нижча температура = точніше розпізнавання
      maxOutputTokens: 1024,   // достатньо для списку з 30+ інгредієнтів
    },
  });

  const promptText = buildDetectPrompt(language);
  const imageParts = imagesToGeminiParts(images);
  const contentParts: Part[] = [{ text: promptText }, ...imageParts];

  try {
    const result = await model.generateContent(contentParts);
    const response = result.response;

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      throw new HttpError(
        'Зображення заблоковане системою безпеки ШІ. Будь ласка, завантажте інше фото.',
        422,
      );
    }

    const cleanedText = response.text()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let parsed: { ingredients: string[] };
    try {
      parsed = JSON.parse(cleanedText) as { ingredients: string[] };
    } catch {
      console.error('[ai.service] detectIngredients: невалідний JSON:', cleanedText.slice(0, 300));
      throw new HttpError('Щось пішло не так. Спробуйте ще раз.', 500);
    }

    if (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
      throw new HttpError(
        'На фотографіях не виявлено харчових продуктів. ' +
          'Будь ласка, завантажте фото з їжею або інгредієнтами.',
        422,
      );
    }

    return { ingredients: parsed.ingredients };
  } catch (error) {
    return handleGeminiError(error);
  }
}

/**
 * Аналізує фотографії продуктів і генерує рецепти за допомогою Gemini Vision.
 *
 * @param images  — масив зображень з буфером у пам'яті (підготовлені multer)
 * @param language — код мови відповіді ('en' | 'uk' | 'es' | 'ru'), за замовчуванням 'uk'
 * @returns       — AnalyzeRecipesResponse: список інгредієнтів + масив рецептів
 *
 * @throws HttpError(422) — якщо на фото немає харчових продуктів
 * @throws HttpError(429) — при перевищенні квоти Gemini API
 * @throws HttpError(500) — при будь-якій іншій непередбаченій помилці
 */
export async function analyzeProductPhotos(
  images: UploadedImage[],
  language = 'uk',
): Promise<RecipesPayload> {
  const client = getGeminiClient();

  // Ініціалізуємо модель з примусовим JSON-виводом і оголошеною схемою.
  // responseMimeType: 'application/json' вмикає режим структурованого виводу Gemini.
  // responseSchema описує точний JSON, який модель зобов'язана повернути.
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: TEMPERATURE,
      topP: 0.9,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  const promptText = buildVisionPrompt(language);
  const imageParts = imagesToGeminiParts(images);

  // Формуємо запит: текстовий промпт + усі зображення у вигляді inline-частин
  const contentParts: Part[] = [{ text: promptText }, ...imageParts];

  try {
    const result = await model.generateContent(contentParts);
    const response = result.response;

    // Перевіряємо, чи модель не заблокувала запит через safety filters
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      throw new HttpError(
        'Зображення заблоковане системою безпеки ШІ. Будь ласка, завантажте інше фото.',
        422,
      );
    }

    const rawText = response.text();

    // Gemini у JSON-режимі повертає чистий JSON (без ```json``` обгортки).
    // Якщо все ж таки markdown потрапив — намагаємось його вирізати.
    const cleanedText = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let parsed: GeminiRawResponse;
    try {
      parsed = JSON.parse(cleanedText) as GeminiRawResponse;
    } catch {
      console.error('[ai.service] Неможливо розпарсити відповідь:', rawText.slice(0, 500));
      throw new HttpError(
        'Щось пішло не так. Спробуйте ще раз.',
        500,
      );
    }

    // Перевіряємо наявність інгредієнтів — якщо порожньо, на фото не їжа
    if (!parsed.detectedIngredients || parsed.detectedIngredients.length === 0) {
      throw new HttpError(
        'На фотографіях не виявлено харчових продуктів. ' +
          'Будь ласка, завантажте фото з їжею або інгредієнтами.',
        422,
      );
    }

    // Паралельно завантажуємо фото для всіх рецептів.
    // Promise.allSettled гарантує, що помилка одного фото не зупинить інші.
    const imageResults = await Promise.allSettled(
      parsed.recipes.map((recipe) => fetchFoodImage(recipe.imageSearchQuery)),
    );

    // Маппінг внутрішнього типу Gemini → публічний AnalyzeRecipesResponse
    return {
      ingredients: parsed.detectedIngredients,
      recipes: parsed.recipes.map((recipe, index) => {
        const imageSettled = imageResults[index];
        const imageUrl =
          imageSettled?.status === 'fulfilled' && imageSettled.value
            ? imageSettled.value
            : undefined;

        return {
          title: recipe.title,
          description: recipe.description,
          cookingTime: recipe.cookingTime,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          nutrition: {
            // Округлюємо до цілих чисел — дробові ккал/грами виглядають непрофесійно
            calories: Math.round(recipe.nutrition.calories),
            protein:  Math.round(recipe.nutrition.protein),
            fat:      Math.round(recipe.nutrition.fat),
            carbs:    Math.round(recipe.nutrition.carbs),
          },
          imageUrl,
        };
      }),
    };
  } catch (error) {
    // Централізована обробка всіх помилок із повторним кидком як HttpError
    return handleGeminiError(error);
  }
}

/**
 * Генерує рецепти з ТЕКСТОВОГО СПИСКУ інгредієнтів (без фотографій).
 * Використовується коли користувач вручну підтверджує/доповнює список інгредієнтів.
 *
 * @param ingredients — список інгредієнтів, підтверджений користувачем
 * @param language    — код мови відповіді ('en' | 'uk' | 'es' | 'ru')
 */
export async function generateRecipesFromText(
  ingredients: string[],
  language = 'uk',
): Promise<RecipesPayload> {
  if (ingredients.length === 0) {
    throw new HttpError('Список інгредієнтів порожній.', 400);
  }

  const client = getGeminiClient();
  const model  = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema:   RESPONSE_SCHEMA,
      temperature:      TEMPERATURE,
      topP:             0.9,
      maxOutputTokens:  MAX_OUTPUT_TOKENS,
    },
  });

  const promptText = buildTextPrompt(ingredients, language);

  try {
    const result   = await model.generateContent([{ text: promptText }]);
    const response = result.response;

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      throw new HttpError('Контент заблоковано системою безпеки ШІ.', 422);
    }

    const cleanedText = response.text()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let parsed: GeminiRawResponse;
    try {
      parsed = JSON.parse(cleanedText) as GeminiRawResponse;
    } catch {
      throw new HttpError('Щось пішло не так. Спробуйте ще раз.', 500);
    }

    // Паралельне завантаження фото для всіх рецептів
    const imageResults = await Promise.allSettled(
      parsed.recipes.map((recipe) => fetchFoodImage(recipe.imageSearchQuery)),
    );

    return {
      ingredients: parsed.detectedIngredients,
      recipes: parsed.recipes.map((recipe, index) => {
        const settled = imageResults[index];
        const imageUrl =
          settled?.status === 'fulfilled' && settled.value ? settled.value : undefined;

        return {
          title:       recipe.title,
          description: recipe.description,
          cookingTime: recipe.cookingTime,
          ingredients: recipe.ingredients,
          steps:       recipe.steps,
          nutrition: {
            calories: Math.round(recipe.nutrition.calories),
            protein:  Math.round(recipe.nutrition.protein),
            fat:      Math.round(recipe.nutrition.fat),
            carbs:    Math.round(recipe.nutrition.carbs),
          },
          imageUrl,
        };
      }),
    };
  } catch (error) {
    return handleGeminiError(error);
  }
}
