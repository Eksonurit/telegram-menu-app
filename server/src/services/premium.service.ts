/**
 * premium.service.ts
 *
 * Управління платними кредитами користувачів (таблиця user_credits).
 *
 * БІЗНЕС-МОДЕЛЬ:
 *  Після оплати 50 Telegram Stars → user отримує +30 спроб терміном 30 днів.
 *  Якщо оплатити повторно до закінчення терміну — спроби та час ДОДАЮТЬСЯ
 *  до наявних (стекуються).
 *
 * "Преміум" у контексті цього сервісу означає: є paid_remaining > 0
 * і paid_expires_at > NOW().
 */

import { query } from '../db/pool.js';

/** Кількість платних спроб за одну покупку */
const PAID_CREDITS_PER_PURCHASE = 30;

/** Термін дії платного пакету в днях */
const PAID_CREDITS_TTL_DAYS = 30;

/**
 * Перевіряє, чи є у користувача активні платні спроби.
 *
 * @param userId — Telegram ID користувача
 */
export async function isPremiumUser(userId: number): Promise<boolean> {
  const result = await query<{ active: boolean }>(
    `SELECT (paid_remaining > 0 AND paid_expires_at > NOW()) AS active
     FROM user_credits
     WHERE user_id = $1`,
    [userId],
  );
  if ((result.rowCount ?? 0) === 0) return false;
  const row = result.rows[0];
  if (!row) return false;
  return row.active;
}

/**
 * Нараховує +30 платних спроб на 30 днів після підтвердженої оплати.
 *
 * Логіка стекування (якщо користувач купує повторно до закінчення терміну):
 *  - paid_remaining += 30
 *  - paid_expires_at += 30 днів (від поточного закінчення, а не від сьогодні)
 *
 * Якщо попередній пакет уже протух:
 *  - paid_remaining = 30 (з нуля, не додаємо до нуля-протуху)
 *  - paid_expires_at = NOW() + 30 днів
 *
 * @param userId — Telegram ID користувача, який оплатив
 */
export async function grantPremium(userId: number): Promise<void> {
  await query(
    `INSERT INTO user_credits (user_id, paid_remaining, paid_expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' days')::INTERVAL)
     ON CONFLICT (user_id) DO UPDATE
       SET paid_remaining  = CASE
             -- Попередній пакет ще активний → додаємо зверху
             WHEN user_credits.paid_expires_at IS NOT NULL
               AND user_credits.paid_expires_at > NOW()
             THEN user_credits.paid_remaining + $2
             -- Протух або ніколи не купував → починаємо з нуля
             ELSE $2
           END,
           paid_expires_at = CASE
             -- Продовжуємо від поточного закінчення (стекування часу)
             WHEN user_credits.paid_expires_at IS NOT NULL
               AND user_credits.paid_expires_at > NOW()
             THEN user_credits.paid_expires_at + ($3 || ' days')::INTERVAL
             -- Новий пакет від сьогодні
             ELSE NOW() + ($3 || ' days')::INTERVAL
           END`,
    [userId, PAID_CREDITS_PER_PURCHASE, PAID_CREDITS_TTL_DAYS],
  );

  console.log(
    `[premium] Користувачу ${userId} нараховано ` +
    `+${PAID_CREDITS_PER_PURCHASE} платних спроб на ${PAID_CREDITS_TTL_DAYS} днів`,
  );
}

/**
 * Відкликає платний статус (адмін / тести).
 * У штатному флоу не використовується.
 */
export async function revokePremium(userId: number): Promise<void> {
  await query(
    `UPDATE user_credits
     SET paid_remaining = 0, paid_expires_at = NULL
     WHERE user_id = $1`,
    [userId],
  );
}
