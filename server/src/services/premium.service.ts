/**
 * premium.service.ts
 *
 * Сервіс зберігання преміум-статусу користувачів у PostgreSQL.
 *
 * Преміум знімає денний ліміт генерацій НАЗАВЖДИ (одноразова покупка за Telegram Stars).
 * Статус зберігається в таблиці premium_users і ПЕРЕЖИВАЄ перезапуск сервера.
 *
 * Наявність рядка з user_id = активний преміум. Так простіше й надійніше,
 * ніж зберігати булевий прапорець.
 */

import { query } from '../db/pool.js';

/**
 * Перевіряє, чи є користувач преміум-підписником.
 *
 * @param userId — Telegram ID користувача
 */
export async function isPremiumUser(userId: number): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM premium_users WHERE user_id = $1 LIMIT 1',
    [userId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Надає користувачу преміум назавжди.
 * Викликається ВИКЛЮЧНО після підтвердженого успішного платежу (successful_payment).
 * Ідемпотентна: повторний виклик для того самого користувача безпечний
 * завдяки ON CONFLICT DO NOTHING.
 *
 * @param userId — Telegram ID користувача, який оплатив
 */
export async function grantPremium(userId: number): Promise<void> {
  await query(
    `INSERT INTO premium_users (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  console.log(`[premium] Користувачу ${userId} надано преміум-доступ (збережено в БД)`);
}

/**
 * Знімає преміум (адмін-утиліта / для тестів). У звичайному флоу не використовується.
 *
 * @param userId — Telegram ID користувача
 */
export async function revokePremium(userId: number): Promise<void> {
  await query('DELETE FROM premium_users WHERE user_id = $1', [userId]);
}
