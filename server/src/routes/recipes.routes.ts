import { Router } from 'express';
import type { ServerConfig } from '../config/env.config.js';
import { analyzeRecipesHandler } from '../controllers/recipes.controller.js';
import { createTelegramAuthMiddleware } from '../middleware/telegramAuth.middleware.js';
import { photoUploadMiddleware } from '../services/image.service.js';

export function createRecipesRouter(config: ServerConfig): Router {
  const router = Router();
  const telegramAuth = createTelegramAuthMiddleware(config.telegram.botToken);

  router.post(
    '/analyze',
    telegramAuth,
    photoUploadMiddleware,
    analyzeRecipesHandler,
  );

  return router;
}
