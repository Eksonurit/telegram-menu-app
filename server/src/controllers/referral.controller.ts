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
import { sendMessage } from '../services/telegram.service.js';
import { HttpError } from '../utils/HttpError.js';

/** Префікс реферального коду в start_param */
const REFERRAL_PREFIX = 'ref_';

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
