/**
 * referral.service.ts
 *
 * Реферальна система: нарахування бонусних спроб за запрошення друзів.
 *
 * ЛОГІКА:
 *  - Кожен новий юзер (referee) може зарахувати реферальний бонус лише ОДИН РАЗ
 *    (UNIQUE(referee_id) у referral_events).
 *  - За один успішний реферал — рефереру нараховується REFERRAL_BONUS безкоштовних
 *    спроб (free_remaining += 2).
 *  - Самореферал заблокований на рівні сервісу.
 *
 * АТОМАРНІСТЬ:
 *  Вставка в referral_events та оновлення user_credits виконуються в одній
 *  транзакції, тому або обидві операції проходять, або жодна.
 */

import { getPool } from '../db/pool.js';

/** Кількість безкоштовних спроб за один успішний реферал */
const REFERRAL_BONUS = 2;

/** Ліміт безкоштовних спроб для нового користувача (дублюємо з rateLimit.service) */
function getFreeLimit(): number {
  const raw = process.env.DAILY_FREE_LIMIT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

/**
 * Обробляє реферальну подію: перевіряє унікальність та нараховує бонус рефереру.
 *
 * @param referrerId — Telegram ID користувача, що поділився посиланням
 * @param refereeId  — Telegram ID нового користувача, що перейшов за посиланням
 * @returns credited — чи було нараховано бонус (false = вже клеймлено або самореферал)
 * @returns bonus    — кількість нарахованих спроб
 */
export async function claimReferral(
  referrerId: number,
  refereeId: number,
): Promise<{ credited: boolean; bonus: number }> {
  // Самореферал заблокований
  if (referrerId === refereeId) {
    return { credited: false, bonus: 0 };
  }

  const freeLimit = getFreeLimit();
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Гарантуємо рядок для referee (якщо він зовсім новий)
    await client.query(
      `INSERT INTO user_credits (user_id, free_remaining)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [refereeId, freeLimit],
    );

    // Спробуємо вставити реферальну подію.
    // UNIQUE(referee_id) → ON CONFLICT DO NOTHING = вже клеймлено
    const insertResult = await client.query<{ id: number }>(
      `INSERT INTO referral_events (referrer_id, referee_id)
       VALUES ($1, $2)
       ON CONFLICT (referee_id) DO NOTHING
       RETURNING id`,
      [referrerId, refereeId],
    );

    if ((insertResult.rowCount ?? 0) === 0) {
      // Цей referee вже зараховував реферал раніше
      await client.query('COMMIT');
      return { credited: false, bonus: 0 };
    }

    // Нараховуємо бонус рефереру (гарантуємо існування його рядка)
    await client.query(
      `INSERT INTO user_credits (user_id, free_remaining)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
         SET free_remaining = user_credits.free_remaining + $3`,
      [referrerId, freeLimit + REFERRAL_BONUS, REFERRAL_BONUS],
    );

    await client.query('COMMIT');

    console.log(
      `[referral] Реферал: ${refereeId} → ${referrerId}, нараховано +${REFERRAL_BONUS} спроб`,
    );

    return { credited: true, bonus: REFERRAL_BONUS };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
