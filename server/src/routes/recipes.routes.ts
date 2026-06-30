import { Router } from 'express';
import type { ServerConfig } from '../config/env.config.js';
import {
  analyzeRecipesHandler,
  generateRecipesHandler,
  getUserStatusHandler,
  translateRecipesHandler,
} from '../controllers/recipes.controller.js';
import { createTelegramAuthMiddleware } from '../middleware/telegramAuth.middleware.js';
import { photoUploadMiddleware } from '../services/image.service.js';

export function createRecipesRouter(config: ServerConfig): Router {
  const router = Router();
  const telegramAuth = createTelegramAuthMiddleware(config.telegram.botToken);

  /** Поточний ліміт і преміум-статус (без списання, для перевірки при старті) */
  router.get('/status', telegramAuth, getUserStatusHandler);

  /** Аналіз фото продуктів → генерація рецептів (Gemini Vision) */
  router.post(
    '/analyze',
    telegramAuth,
    photoUploadMiddleware,
    analyzeRecipesHandler,
  );

  /** Генерація рецептів з текстового списку інгредієнтів (без фото) */
  router.post(
    '/generate',
    telegramAuth,
    generateRecipesHandler,
  );

  /** Переклад готових рецептів на іншу мову (Gemini text-only, без фото) */
  router.post(
    '/translate',
    telegramAuth,
    translateRecipesHandler,
  );

  return router;
}
