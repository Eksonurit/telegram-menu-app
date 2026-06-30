import type { NextFunction, Request, Response } from 'express';
import { detectIngredientsFromPhotos, generateRecipesFromText } from '../services/ai.service.js';
import {
  mapUploadedFiles,
  validateImages,
} from '../services/image.service.js';
import { consumeToken, getLimitStatus } from '../services/rateLimit.service.js';
import { translateRecipeData } from '../services/translation.service.js';
import type {
  AnalyzeRecipesResponse,
  LimitReachedResponse,
  RecipesPayload,
} from '../types/recipe.types.js';
import { HttpError } from '../utils/HttpError.js';

/** Підтримувані коди мов для обох ендпоінтів */
const SUPPORTED_LOCALES = new Set(['en', 'uk', 'es', 'ru']);

/**
 * GET /api/recipes/status — поточний ліміт і преміум-статус користувача.
 *
 * Викликається при старті Mini App (до будь-яких дій) щоб одразу показати
 * paywall, якщо денні ліміти вичерпані і преміуму немає.
 * Лічильник НЕ списується.
 */
export async function getUserStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.telegramUser?.id ?? 0;
    const rateLimit = await getLimitStatus(userId);
    res.status(200).json(rateLimit);
  } catch (error) {
    next(error);
  }
}

/** За замовчуванням — українська */
const DEFAULT_LOCALE = 'uk';

/**
 * Витягує бажану мову з заголовка X-Language.
 * Якщо заголовок відсутній або містить непідтримуваний locale — повертає DEFAULT_LOCALE.
 */
function extractLocale(req: Request): string {
  const header = req.headers['x-language'];
  const locale = typeof header === 'string' ? header.toLowerCase().trim() : '';
  return SUPPORTED_LOCALES.has(locale) ? locale : DEFAULT_LOCALE;
}

/**
 * Отримує userId з прикріпленого Telegram-юзера.
 * Якщо middleware telegramAuth не спрацював — кидає 401.
 */
function requireUserId(req: Request): number {
  const userId = req.telegramUser?.id;
  if (!userId) {
    throw new HttpError("Авторизація через Telegram обов'язкова.", 401);
  }
  return userId;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/recipes/analyze — БЕЗКОШТОВНИЙ КРОК
 *
 * Приймає фотографії (multipart/form-data, поле "photos"),
 * розпізнає харчові інгредієнти за допомогою Gemini Vision.
 * Рецепти НЕ генеруються — лише повертає список виявлених продуктів.
 * Денний ліміт НЕ списується.
 */
export async function analyzeRecipesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uploadedFiles = req.files;

    if (!Array.isArray(uploadedFiles)) {
      throw new HttpError('Невалідний формат завантажених файлів', 400);
    }

    const images = validateImages(mapUploadedFiles(uploadedFiles));
    const locale = extractLocale(req);

    // Безкоштовне розпізнавання — не торкаємось ліміту
    const { ingredients } = await detectIngredientsFromPhotos(images, locale);

    // Інформаційно повертаємо поточний стан ліміту (без списання)
    const userId = req.telegramUser?.id ?? 0;
    const rateLimit = await getLimitStatus(userId);

    res.status(200).json({ ingredients, rateLimit });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/recipes/generate — КОШТУЄ 1 ТОКЕН
 *
 * Генерує рецепти з підтвердженого текстового списку інгредієнтів.
 * Перевіряє та списує 1 токен з денного ліміту ПЕРЕД викликом Gemini.
 * Якщо ліміт вичерпано — повертає HTTP 429 з { limitReached: true }.
 *
 * Body: { ingredients: string[] }
 * Header: X-Language — мова відповіді
 */
export async function generateRecipesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ingredients } = req.body as { ingredients: unknown };

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpError('Надайте непорожній масив інгредієнтів.', 400);
    }

    const sanitized = ingredients
      .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
      .map((i) => i.trim().slice(0, 100));

    if (sanitized.length === 0) {
      throw new HttpError('Список інгредієнтів порожній після валідації.', 400);
    }

    const userId = requireUserId(req);

    // ── Перевірка та списання ліміту ───────────────────────────────────────────
    const limitResult = await consumeToken(userId);

    if (!limitResult.allowed) {
      // Ліміт вичерпано — повертаємо структуровану відповідь 429
      const limitReachedResponse: LimitReachedResponse = {
        limitReached: true,
        remaining: 0,
        total: limitResult.total,
      };
      res.status(429).json(limitReachedResponse);
      return;
    }

    // ── Генерація рецептів (токен вже списано) ─────────────────────────────────
    const locale = extractLocale(req);
    const result: RecipesPayload = await generateRecipesFromText(sanitized, locale);

    // Додаємо ОНОВЛЕНИЙ стан ліміту до відповіді
    const response: AnalyzeRecipesResponse = {
      ...result,
      rateLimit: {
        remaining: limitResult.remaining,
        total: limitResult.total,
        isPremium: limitResult.isPremium,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/recipes/translate — БЕЗКОШТОВНО
 *
 * Приймає вже готові рецепти (JSON) і цільову мову,
 * перекладає текстовий контент без повторного аналізу фото.
 * Числові значення КБЖВ та imageUrl зберігаються без змін.
 * Денний ліміт НЕ списується.
 *
 * Body: { data: RecipesPayload, language: string }
 */
export async function translateRecipesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { data, language } = req.body as {
      data: RecipesPayload;
      language: string;
    };

    if (!data || !data.ingredients || !Array.isArray(data.recipes)) {
      throw new HttpError('Невалідні дані рецептів для перекладу.', 400);
    }

    const targetLocale = SUPPORTED_LOCALES.has(language) ? language : DEFAULT_LOCALE;
    const translated: RecipesPayload = await translateRecipeData(data, targetLocale);

    // Повертаємо поточний стан ліміту (без зміни)
    const userId = req.telegramUser?.id ?? 0;
    const rateLimit = await getLimitStatus(userId);

    const response: AnalyzeRecipesResponse = { ...translated, rateLimit };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}
