import { buildApiEndpoint } from '@/config/app.config';
import { getStoredLocale } from '@/i18n';
import { ApiError } from '@/services/api.service';
import type {
  AnalyzeRecipesResponse,
  DetectIngredientsResponse,
  LimitReachedApiResponse,
} from '@/types/recipe.types';
import { getTelegramInitData } from '@/utils/telegram.utils';

interface ApiErrorBody {
  message?: string;
}

/** Сентинельний рядок — сигналізує слайсу про вичерпаний ліміт */
export const LIMIT_REACHED_KEY = '__LIMIT_REACHED__';

const MAX_PHOTOS = 3;

async function parseServerError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.message ?? `Помилка сервера (${response.status})`;
  } catch {
    return `Помилка сервера (${response.status})`;
  }
}

/**
 * Крок 1 — БЕЗКОШТОВНИЙ: завантажує фото та отримує список виявлених інгредієнтів.
 * Рецепти НЕ генеруються. Денний ліміт НЕ списується.
 */
export async function analyzeProductPhotos(
  photos: File[],
): Promise<DetectIngredientsResponse> {
  if (photos.length === 0) {
    throw new ApiError('errorNoPhotos', 400);
  }

  if (photos.length > MAX_PHOTOS) {
    throw new ApiError('errorTooManyPhotos', 400);
  }

  const initData = getTelegramInitData();

  if (!initData) {
    throw new ApiError('errorNoInitData', 401);
  }

  const formData = new FormData();
  for (const photo of photos) {
    formData.append('photos', photo, photo.name);
  }

  let response: Response;

  try {
    const locale = getStoredLocale() ?? 'en';

    response = await fetch(buildApiEndpoint('/recipes/analyze'), {
      method: 'POST',
      headers: {
        'X-Telegram-Init-Data': initData,
        'X-Language': locale,
      },
      body: formData,
    });
  } catch {
    throw new ApiError('errorAnalysisFailed', 0);
  }

  if (!response.ok) {
    const message = await parseServerError(response);
    throw new ApiError(message, response.status);
  }

  try {
    return (await response.json()) as DetectIngredientsResponse;
  } catch {
    throw new ApiError('errorAnalysisFailed', 500);
  }
}

/**
 * Крок 2 — КОШТУЄ 1 ТОКЕН: генерує рецепти з підтвердженого списку інгредієнтів.
 * При вичерпаному ліміті кидає ApiError з кодом LIMIT_REACHED_KEY.
 *
 * @param ingredients — фінальний список після редагування
 */
export async function generateFromIngredientList(
  ingredients: string[],
): Promise<AnalyzeRecipesResponse> {
  const initData = getTelegramInitData();
  if (!initData) throw new ApiError('errorNoInitData', 401);

  const locale = getStoredLocale() ?? 'en';

  let response: Response;
  try {
    response = await fetch(buildApiEndpoint('/recipes/generate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
        'X-Language': locale,
      },
      body: JSON.stringify({ ingredients }),
    });
  } catch {
    throw new ApiError('errorAnalysisFailed', 0);
  }

  // Ліміт вичерпано — сервер повертає 429 зі спеціальним тілом
  if (response.status === 429) {
    try {
      const body = (await response.json()) as LimitReachedApiResponse;
      if (body.limitReached) {
        throw new ApiError(LIMIT_REACHED_KEY, 429);
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
    }
    throw new ApiError('errorAnalysisFailed', 429);
  }

  if (!response.ok) {
    const message = await parseServerError(response);
    throw new ApiError(message, response.status);
  }

  try {
    return (await response.json()) as AnalyzeRecipesResponse;
  } catch {
    throw new ApiError('errorAnalysisFailed', 500);
  }
}

/**
 * БЕЗКОШТОВНО: перекладає вже готові рецепти на іншу мову.
 * Відправляє JSON-дані (без фото!) на POST /api/recipes/translate.
 *
 * @param data   — поточний AnalyzeRecipesResponse зі стору
 * @param locale — цільова мова ('en' | 'uk' | 'es' | 'ru')
 */
export async function translateRecipes(
  data: AnalyzeRecipesResponse,
  locale: string,
): Promise<AnalyzeRecipesResponse> {
  const initData = getTelegramInitData();

  if (!initData) {
    throw new ApiError('errorNoInitData', 401);
  }

  // Передаємо тільки текстові дані (без rateLimit — сервер додасть самостійно)
  const { rateLimit: _stripped, ...recipesPayload } = data;

  let response: Response;

  try {
    response = await fetch(buildApiEndpoint('/recipes/translate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
      body: JSON.stringify({ data: recipesPayload, language: locale }),
    });
  } catch {
    throw new ApiError('errorAnalysisFailed', 0);
  }

  if (!response.ok) {
    const message = await parseServerError(response);
    throw new ApiError(message, response.status);
  }

  try {
    return (await response.json()) as AnalyzeRecipesResponse;
  } catch {
    throw new ApiError('errorAnalysisFailed', 500);
  }
}
