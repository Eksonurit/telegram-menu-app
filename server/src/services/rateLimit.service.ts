/**
 * rateLimit.service.ts
 *
 * Сервіс обмеження щоденних безкоштовних генерацій рецептів (зберігання — PostgreSQL).
 *
 * Ліміт кожного користувача скидається через 24 години після ПЕРШОГО його запиту
 * за поточне вікно. Дані зберігаються в таблиці rate_limits і ПЕРЕЖИВАЮТЬ
 * перезапуск сервера.
 *
 * ПРЕМІУМ: користувачі з активним преміумом (isPremiumUser) обходять ліміт
 * повністю — для них кожна генерація завжди дозволена, лічильник не чіпається.
 *
 * АТОМАРНІСТЬ: списання токена виконується в транзакції з SELECT ... FOR UPDATE,
 * тож паралельні запити того самого користувача не «прослизнуть» повз ліміт.
 */

import { getPool, query } from '../db/pool.js';
import { isPremiumUser } from './premium.service.js';

/** Тривалість одного вікна — 24 години (у мілісекундах) */
const TTL_MS = 24 * 60 * 60 * 1000;

/** Рядок таблиці rate_limits (reset_at парситься в number у pool.ts) */
interface RateLimitRow {
  remaining: number;
  reset_at: number;
}

/** Денний ліміт безкоштовних генерацій (зчитується з env або дефолт 3) */
function getDailyLimit(): number {
  const raw = process.env.DAILY_FREE_LIMIT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

// ─── Публічний API ─────────────────────────────────────────────────────────────

/**
 * Повертає поточний стан ліміту для користувача БЕЗ зміни лічильника.
 * Використовується для інформаційного відображення у відповідях безкоштовних запитів.
 *
 * Для преміум-користувачів повертає isPremium=true, а remaining дорівнює total
 * (UI трактує це як «безліміт»).
 */
export async function getLimitStatus(userId: number): Promise<{
  remaining: number;
  total: number;
  isPremium: boolean;
}> {
  const total = getDailyLimit();

  // Преміум — ліміт не діє
  if (await isPremiumUser(userId)) {
    return { remaining: total, total, isPremium: true };
  }

  const now = Date.now();
  const result = await query<RateLimitRow>(
    'SELECT remaining, reset_at FROM rate_limits WHERE user_id = $1',
    [userId],
  );

  const entry = result.rows[0];

  // Якщо запису немає або вікно вже закрилось — повний ліміт
  if (!entry || now >= entry.reset_at) {
    return { remaining: total, total, isPremium: false };
  }

  return { remaining: entry.remaining, total, isPremium: false };
}

/**
 * Перевіряє, чи є доступна спроба, і якщо так — атомарно списує одну.
 *
 * @returns allowed   — чи дозволено виконати генерацію
 * @returns remaining — скільки спроб залишилось ПІСЛЯ цього виклику
 * @returns total     — максимум спроб на добу
 * @returns isPremium — чи користувач преміум (тоді ліміт не діє)
 */
export async function consumeToken(userId: number): Promise<{
  allowed: boolean;
  remaining: number;
  total: number;
  isPremium: boolean;
}> {
  const total = getDailyLimit();

  // Преміум — генерація завжди дозволена, лічильник не чіпаємо
  if (await isPremiumUser(userId)) {
    return { allowed: true, remaining: total, total, isPremium: true };
  }

  const now = Date.now();
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Блокуємо рядок користувача на час транзакції (захист від гонок)
    const selectResult = await client.query<RateLimitRow>(
      'SELECT remaining, reset_at FROM rate_limits WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const entry = selectResult.rows[0];

    // Випадок 1: запису немає або вікно скинулось → нове вікно, одразу списуємо 1
    if (!entry || now >= entry.reset_at) {
      const remaining = total - 1;
      const resetAt = now + TTL_MS;

      await client.query(
        `INSERT INTO rate_limits (user_id, remaining, reset_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id)
         DO UPDATE SET remaining = EXCLUDED.remaining, reset_at = EXCLUDED.reset_at`,
        [userId, remaining, resetAt],
      );

      await client.query('COMMIT');
      return { allowed: true, remaining, total, isPremium: false };
    }

    // Випадок 2: вікно активне, але спроби вичерпано
    if (entry.remaining <= 0) {
      await client.query('COMMIT');
      return { allowed: false, remaining: 0, total, isPremium: false };
    }

    // Випадок 3: вікно активне, є спроби → списуємо одну
    const remaining = entry.remaining - 1;
    await client.query(
      'UPDATE rate_limits SET remaining = $2 WHERE user_id = $1',
      [userId, remaining],
    );

    await client.query('COMMIT');
    return { allowed: true, remaining, total, isPremium: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // ОБОВ'ЯЗКОВО повертаємо з'єднання в пул
    client.release();
  }
}
