/**
 * rateLimit.service.ts
 *
 * Сервіс обліку спроб генерацій рецептів (таблиця user_credits у PostgreSQL).
 *
 * БІЗНЕС-МОДЕЛЬ:
 *  - Кожен новий користувач отримує 3 БЕЗКОШТОВНІ спроби (free_remaining).
 *    Вони не поновлюються — витрачені назавжди.
 *  - Коли безкоштовні та платні спроби закінчились → показуємо Paywall.
 *  - Після оплати 50 Stars → нараховуємо +30 ПЛАТНИХ спроб (paid_remaining)
 *    терміном дії 30 днів (paid_expires_at).
 *
 * ПОРЯДОК СПИСАННЯ: спочатку платні (якщо активні), потім безкоштовні.
 *
 * АТОМАРНІСТЬ: consumeToken виконується в транзакції з SELECT ... FOR UPDATE,
 * тому паралельні запити одного користувача не «прослизнуть» повз ліміт.
 */

import { getPool, query } from '../db/pool.js';

/** Рядок таблиці user_credits */
interface UserCreditsRow {
  free_remaining:  number;
  paid_remaining:  number;
  paid_expires_at: Date | null;
}

/** Кількість безкоштовних спроб для нового користувача (env або дефолт 3) */
function getFreeLimit(): number {
  const raw = process.env.DAILY_FREE_LIMIT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

/** Чи є у рядка активні платні спроби (не протухлі і більше нуля) */
function isPaidActive(row: UserCreditsRow): boolean {
  return (
    row.paid_remaining > 0 &&
    row.paid_expires_at !== null &&
    row.paid_expires_at > new Date()
  );
}

// ─── Публічний API ─────────────────────────────────────────────────────────────

/**
 * Повертає поточний стан кредитів БЕЗ зміни лічильника.
 * Використовується для відображення у відповідях безкоштовних запитів
 * та при старті Mini App (GET /api/recipes/status).
 */
export async function getLimitStatus(userId: number): Promise<{
  remaining:  number;
  total:      number;
  isPremium:  boolean;
}> {
  const freeLimit = getFreeLimit();

  const result = await query<UserCreditsRow>(
    `SELECT free_remaining, paid_remaining, paid_expires_at
     FROM user_credits
     WHERE user_id = $1`,
    [userId],
  );

  const row = result.rows[0];

  // Новий користувач — запису ще немає, повертаємо дефолт
  if (!row) {
    return { remaining: freeLimit, total: freeLimit, isPremium: false };
  }

  const paidActive = isPaidActive(row);
  const remaining  = row.free_remaining + (paidActive ? row.paid_remaining : 0);

  return { remaining, total: freeLimit, isPremium: paidActive };
}

/**
 * Атомарно перевіряє наявність спроби і списує одну, якщо вона є.
 *
 * Порядок:
 *  1. Якщо є активні платні → списуємо paid_remaining.
 *  2. Інакше, якщо є безкоштовні → списуємо free_remaining.
 *  3. Якщо нічого немає → повертаємо allowed: false.
 *
 * @returns allowed   — чи дозволено генерацію
 * @returns remaining — скільки спроб залишилось ПІСЛЯ цього виклику
 * @returns total     — базовий ліміт безкоштовних спроб
 * @returns isPremium — чи є активні платні спроби після списання
 */
export async function consumeToken(userId: number): Promise<{
  allowed:   boolean;
  remaining: number;
  total:     number;
  isPremium: boolean;
}> {
  const freeLimit = getFreeLimit();
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Гарантуємо існування рядка для нового користувача
    await client.query(
      `INSERT INTO user_credits (user_id, free_remaining)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, freeLimit],
    );

    // Блокуємо рядок на час транзакції (захист від паралельних запитів)
    const selectResult = await client.query<UserCreditsRow>(
      `SELECT free_remaining, paid_remaining, paid_expires_at
       FROM user_credits
       WHERE user_id = $1
       FOR UPDATE`,
      [userId],
    );
    const row = selectResult.rows[0];

    // Перевіряємо активність платних спроб
    const paidActive = isPaidActive(row);

    // Якщо платні протухли — обнуляємо їх (housekeeping)
    if (!paidActive && row.paid_remaining > 0) {
      await client.query(
        `UPDATE user_credits
         SET paid_remaining = 0, paid_expires_at = NULL
         WHERE user_id = $1`,
        [userId],
      );
      row.paid_remaining = 0;
      row.paid_expires_at = null;
    }

    // ── Кейс 1: є активні платні — списуємо paid першим ──────────────────
    if (paidActive) {
      const newPaid = row.paid_remaining - 1;
      await client.query(
        `UPDATE user_credits SET paid_remaining = $2 WHERE user_id = $1`,
        [userId, newPaid],
      );
      await client.query('COMMIT');

      const remaining  = row.free_remaining + newPaid;
      const isPremium  = newPaid > 0; // преміум активний поки є платні
      return { allowed: true, remaining, total: freeLimit, isPremium };
    }

    // ── Кейс 2: платних немає, є безкоштовні — списуємо free ─────────────
    if (row.free_remaining > 0) {
      const newFree = row.free_remaining - 1;
      await client.query(
        `UPDATE user_credits SET free_remaining = $2 WHERE user_id = $1`,
        [userId, newFree],
      );
      await client.query('COMMIT');
      return { allowed: true, remaining: newFree, total: freeLimit, isPremium: false };
    }

    // ── Кейс 3: нічого немає — генерація заблокована ─────────────────────
    await client.query('COMMIT');
    return { allowed: false, remaining: 0, total: freeLimit, isPremium: false };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
