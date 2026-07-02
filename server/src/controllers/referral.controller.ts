/**
 * referral.controller.ts
 *
 * POST /api/referral/claim
 *
 * Викликається фронтендом при старті Mini App, якщо в initDataUnsafe.start_param
 * є реферальний код виду "ref_<userId>".
 *
 * Захищений telegramAuth: referee визначається з валідованого initData,
 * а не з тіла запиту — підробка неможлива.
 */

import type { NextFunction, Request, Response } from 'express';
import type { ServerConfig } from '../config/env.config.js';
import { claimReferral } from '../services/referral.service.js';
import { getBotUsernameFromApi, sendMessage } from '../services/telegram.service.js';
import { buildReferralLink } from '../utils/referral-link.utils.js';
import { HttpError } from '../utils/HttpError.js';

/** Префікс реферального коду в start_param */
const REFERRAL_PREFIX = 'ref_';

function resolveBotUsername(config: ServerConfig): string {
  const fromApi = getBotUsernameFromApi();
  if (fromApi) return fromApi;

  const fromEnv = config.telegram.botUsername.replace(/^@/, '').trim();
  if (!fromEnv) {
    throw new HttpError('Username Telegram-бота не налаштовано', 500);
  }

  return fromEnv;
}

/**
 * GET /api/referral/link
 * Повертає реферальне посилання для поточного користувача.
 * Username береться з getMe — не залежить від помилок у env.
 */
export function getReferralLinkHandler(config: ServerConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const referrerId = req.telegramUser?.id;
      if (!referrerId) {
        throw new HttpError("Авторизація через Telegram обов'язкова.", 401);
      }

      const botUsername = resolveBotUsername(config);
      // Завжди головний Mini App (?startapp=) — найстабільніший формат.
      // Direct Link (/shortname) ламається, якщо short name не створено в BotFather.
      const link = buildReferralLink(referrerId, botUsername);

      res.status(200).json({ link, botUsername });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * POST /api/referral/claim
 * Body: { referralCode: string }  — наприклад "ref_12345"
 *
 * Відповідь: { credited: boolean; bonus: number }
 */
export function claimReferralHandler(config: ServerConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refereeId = req.telegramUser?.id;
      if (!refereeId) {
        throw new HttpError("Авторизація через Telegram обов'язкова.", 401);
      }

      const { referralCode } = req.body as { referralCode?: string };

      // Якщо код відсутній або невалідний — тихо повертаємо false (не помилка)
      if (!referralCode?.startsWith(REFERRAL_PREFIX)) {
        res.status(200).json({ credited: false, bonus: 0 });
        return;
      }

      const referrerId = Number(referralCode.slice(REFERRAL_PREFIX.length));
      if (!Number.isFinite(referrerId) || referrerId <= 0) {
        res.status(200).json({ credited: false, bonus: 0 });
        return;
      }

      const result = await claimReferral(referrerId, refereeId);

      // Надсилаємо сповіщення рефереру (non-blocking — помилка не зупиняє відповідь)
      if (result.credited) {
        void sendMessage(
          config.telegram.botToken,
          referrerId,
          `🎉 <b>Твій друг приєднався до Pic2Recipe!</b>\n\n` +
          `Тобі нараховано <b>+${result.bonus} спроби</b>.\n` +
          `Готуйте разом — знаходьте нові рецепти!`,
        );
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
