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

/** Інформація про денний ліміт генерацій, що повертається з сервера */
export interface RateLimitInfo {
  remaining: number;
  total: number;
  /** true = преміум-користувач (ліміт не діє). Може бути відсутнім у старих відповідях. */
  isPremium?: boolean;
}

/**
 * Відповідь /api/recipes/analyze (безкоштовно, лише інгредієнти).
 * Рецепти ще не генеруються — користувач спочатку може редагувати список.
 */
export interface DetectIngredientsResponse {
  ingredients: string[];
  rateLimit: RateLimitInfo;
}

/**
 * Відповідь /api/recipes/generate та /api/recipes/translate.
 * Повний набір рецептів + поточний стан ліміту.
 */
export interface AnalyzeRecipesResponse {
  ingredients: string[];
  recipes: RecipeItem[];
  rateLimit: RateLimitInfo;
}

/**
 * Відповідь сервера при вичерпаному ліміті (HTTP 429).
 * Клієнт розпізнає по полю limitReached === true.
 */
export interface LimitReachedApiResponse {
  limitReached: true;
  remaining: 0;
  total: number;
}

export type RecipeStatus =
  | 'idle'
  | 'analyzing'    // фото завантажуються, Gemini розпізнає інгредієнти
  | 'detected'     // інгредієнти виявлено, рецепти ще не згенеровано
  | 'generating'   // Gemini генерує рецепти (списується токен)
  | 'translating'  // Gemini перекладає вже готові рецепти
  | 'success'      // рецепти отримано і відображаються
  | 'error';
