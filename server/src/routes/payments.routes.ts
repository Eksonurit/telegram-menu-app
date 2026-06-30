import { Router } from 'express';
import type { ServerConfig } from '../config/env.config.js';
import {
  createInvoiceHandler,
  telegramWebhookHandler,
} from '../controllers/payments.controller.js';
import { createTelegramAuthMiddleware } from '../middleware/telegramAuth.middleware.js';

/**
 * Роутер платежів через Telegram Stars.
 *
 *  POST /api/payments/create-invoice — створення інвойс-посилання (захищено initData)
 *  POST /api/payments/webhook        — приймач оновлень Telegram (БЕЗ initData-авторизації)
 */
export function createPaymentsRouter(config: ServerConfig): Router {
  const router = Router();
  const telegramAuth = createTelegramAuthMiddleware(config.telegram.botToken);

  // Створення інвойсу — лише для авторизованого користувача Mini App
  router.post('/create-invoice', telegramAuth, createInvoiceHandler(config));

  // Вебхук від Telegram — авторизація через secret token усередині хендлера
  router.post('/webhook', telegramWebhookHandler(config));

  return router;
}
