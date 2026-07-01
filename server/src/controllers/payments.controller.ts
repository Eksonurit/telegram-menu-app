/**
 * payments.controller.ts
 *
 * Платіжний флоу через Telegram Stars (валюта XTR).
 *
 * Складається з двох частин:
 *  1. createInvoiceHandler — захищений ендпоінт для Mini App: створює інвойс-посилання.
 *  2. telegramWebhookHandler — приймач оновлень від серверів Telegram:
 *       • pre_checkout_query  → миттєво підтверджуємо (answerPreCheckoutQuery);
 *       • successful_payment  → видаємо преміум назавжди (grantPremium).
 */

import type { NextFunction, Request, Response } from 'express';
import type { ServerConfig } from '../config/env.config.js';
import { grantPremium } from '../services/premium.service.js';
import {
  answerPreCheckoutQuery,
  createStarsInvoiceLink,
} from '../services/telegram.service.js';
import type { TelegramUpdate } from '../types/index.js';
import { HttpError } from '../utils/HttpError.js';

/** Префікс payload для ідентифікації покупки преміуму */
const PREMIUM_PAYLOAD_PREFIX = 'premium_upgrade_';

/** Метадані товару «Преміум» */
const PREMIUM_TITLE = 'Pic2Recipe Premium';
const PREMIUM_DESCRIPTION =
  'Get +30 recipe generations valid for 30 days. Stack multiple purchases!';
const PREMIUM_LABEL = '+30 recipe generations (30 days)';

/**
 * Витягує Telegram ID з payload виду "premium_upgrade_<userId>".
 * Повертає null, якщо payload не відповідає формату.
 */
function parseUserIdFromPayload(payload: string): number | null {
  if (!payload.startsWith(PREMIUM_PAYLOAD_PREFIX)) {
    return null;
  }
  const idPart = payload.slice(PREMIUM_PAYLOAD_PREFIX.length);
  const userId = Number(idPart);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/create-invoice
 *
 * Захищений telegramAuth middleware: користувача беремо з валідованого initData,
 * а не з тіла запиту — це унеможливлює підробку чужого userId.
 *
 * Повертає: { invoiceLink: string } — посилання для Telegram.WebApp.openInvoice().
 */
export function createInvoiceHandler(config: ServerConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.telegramUser?.id;
      if (!userId) {
        throw new HttpError("Авторизація через Telegram обов'язкова.", 401);
      }

      // Унікальний payload прив'язує транзакцію до конкретного користувача
      const payload = `${PREMIUM_PAYLOAD_PREFIX}${userId}`;

      const invoiceLink = await createStarsInvoiceLink({
        botToken: config.telegram.botToken,
        title: PREMIUM_TITLE,
        description: PREMIUM_DESCRIPTION,
        payload,
        label: PREMIUM_LABEL,
        amountStars: config.payments.premiumPriceStars,
      });

      res.status(200).json({ invoiceLink });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * POST /api/payments/webhook
 *
 * Приймач оновлень від Telegram (НЕ захищений telegramAuth — викликається
 * серверами Telegram, а не Mini App). За наявності webhookSecret перевіряємо
 * заголовок X-Telegram-Bot-Api-Secret-Token.
 *
 * ВАЖЛИВО: завжди відповідаємо 200 OK, навіть на невідомі оновлення —
 * інакше Telegram повторюватиме доставку. Помилки логуємо, але не «вибухаємо».
 */
export function telegramWebhookHandler(config: ServerConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    // 1. Перевірка секрету (якщо налаштований)
    const expectedSecret = config.telegram.webhookSecret;
    if (expectedSecret) {
      const receivedSecret = req.header('x-telegram-bot-api-secret-token');
      if (receivedSecret !== expectedSecret) {
        console.warn('[payments.webhook] Відхилено: невірний secret token');
        res.sendStatus(401);
        return;
      }
    }

    const update = req.body as TelegramUpdate;

    try {
      // 2. pre_checkout_query — мусимо відповісти протягом 10 секунд
      if (update.pre_checkout_query) {
        const query = update.pre_checkout_query;
        const userId = parseUserIdFromPayload(query.invoice_payload);

        // Валідуємо: payload коректний і платіж у зірках
        const isValid = userId !== null && query.currency === 'XTR';

        await answerPreCheckoutQuery(
          config.telegram.botToken,
          query.id,
          isValid,
          isValid ? undefined : 'Некоректний платіж. Спробуйте ще раз.',
        );

        res.sendStatus(200);
        return;
      }

      // 3. successful_payment — оплата підтверджена, видаємо преміум
      const payment = update.message?.successful_payment;
      if (payment) {
        // Пріоритетно беремо userId з payload; як резерв — відправник повідомлення
        const userId =
          parseUserIdFromPayload(payment.invoice_payload) ??
          update.message?.from?.id ??
          null;

        if (userId !== null) {
          await grantPremium(userId);
          console.log(
            `[payments.webhook] Успішна оплата ${payment.total_amount} ${payment.currency} ` +
              `(charge ${payment.telegram_payment_charge_id}) → преміум для ${userId}`,
          );
        } else {
          console.error(
            '[payments.webhook] successful_payment без розпізнаного userId:',
            payment.invoice_payload,
          );
        }

        res.sendStatus(200);
        return;
      }

      // 4. Інші оновлення нас не цікавлять — просто підтверджуємо отримання
      res.sendStatus(200);
    } catch (error) {
      // Логуємо, але повертаємо 200, щоб Telegram не зациклив повторні доставки
      console.error('[payments.webhook] Помилка обробки оновлення:', error);
      res.sendStatus(200);
    }
  };
}
