export interface NutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface RecipeItem {
  title: string;
  description: string;
  /** Загальний час приготування, наприклад "25 хвилин" */
  cookingTime: string;
  /** Список інгредієнтів з кількостями для цього рецепта */
  ingredients: string[];
  steps: string[];
  nutrition: NutritionInfo;
  imageUrl?: string;
}

/** Інформація про стан денного ліміту генерацій */
export interface RateLimitInfo {
  /** Скільки спроб залишилось на сьогодні */
  remaining: number;
  /** Максимум спроб на добу */
  total: number;
}

/**
 * Відповідь при перевищенні ліміту (HTTP 429).
 * Клієнт розпізнає по полю limitReached === true.
 */
export interface LimitReachedResponse {
  limitReached: true;
  remaining: 0;
  total: number;
}

/**
 * Внутрішній тип сервісів — дані рецептів без метаданих API.
 * Використовується в ai.service та translation.service.
 */
export interface RecipesPayload {
  ingredients: string[];
  recipes: RecipeItem[];
}

/**
 * API відповідь /api/recipes/analyze — тільки список інгредієнтів (безкоштовно).
 * Рецепти НЕ генеруються на цьому кроці.
 */
export interface DetectIngredientsResponse {
  ingredients: string[];
  /** Поточний стан ліміту (інформаційно, без списання) */
  rateLimit: RateLimitInfo;
}

/**
 * API відповідь /api/recipes/generate та /api/recipes/translate.
 * Повний набір рецептів + поточний стан ліміту.
 */
export interface AnalyzeRecipesResponse {
  ingredients: string[];
  recipes: RecipeItem[];
  /** Стан ліміту після цього запиту */
  rateLimit: RateLimitInfo;
}

export interface UploadedImage {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}
