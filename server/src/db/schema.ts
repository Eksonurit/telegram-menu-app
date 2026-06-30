/**
 * db/schema.ts
 *
 * Ініціалізація схеми бази даних.
 *
 * Викликається ОДИН раз під час старту сервера (index.ts). Створює таблиці,
 * якщо їх ще немає — тож додаток працює «з коробки» без окремих міграцій.
 * Для зрілого продакшну варто перейти на повноцінний інструмент міграцій
 * (node-pg-migrate / Prisma), але для поточного етапу idempotent-DDL достатньо.
 */

import { getPool } from './pool.js';

/** SQL створення таблиць (idempotent — безпечно виконувати повторно) */
const SCHEMA_SQL = `
  -- Преміум-користувачі: наявність рядка = активний довічний преміум
  CREATE TABLE IF NOT EXISTS premium_users (
    user_id    BIGINT PRIMARY KEY,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Денні ліміти безкоштовних генерацій
  CREATE TABLE IF NOT EXISTS rate_limits (
    user_id   BIGINT PRIMARY KEY,
    -- Скільки генерацій залишилось у поточному 24-год вікні
    remaining INTEGER NOT NULL,
    -- Момент скидання вікна (Unix epoch у мілісекундах)
    reset_at  BIGINT NOT NULL
  );
`;

/**
 * Створює необхідні таблиці, якщо вони відсутні, і перевіряє з'єднання з БД.
 * Кидає помилку, якщо підключитися не вдалося — сервер не повинен стартувати
 * без робочого сховища, від якого залежать ліміти та преміум.
 */
export async function initDatabase(): Promise<void> {
  const pool = getPool();

  // Явна перевірка з'єднання → зрозуміла помилка ще до запуску HTTP-сервера
  await pool.query('SELECT 1');

  await pool.query(SCHEMA_SQL);

  console.log('[db] Схему бази даних ініціалізовано (premium_users, rate_limits)');
}
