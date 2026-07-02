import { Router } from 'express';
import type { ServerConfig } from '../config/env.config.js';
import { claimReferralHandler, getReferralLinkHandler } from '../controllers/referral.controller.js';
import { createTelegramAuthMiddleware } from '../middleware/telegramAuth.middleware.js';

export function createReferralRouter(config: ServerConfig): Router {
  const router = Router();

  const telegramAuth = createTelegramAuthMiddleware(config.telegram.botToken);

  /** Реферальне посилання поточного користувача (username з getMe) */
  router.get('/link', telegramAuth, getReferralLinkHandler(config));

  /** Зарахування реферального бонусу при першому відкритті посилання */
  router.post('/claim', telegramAuth, claimReferralHandler(config));

  return router;
}
