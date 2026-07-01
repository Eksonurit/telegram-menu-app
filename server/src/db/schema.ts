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
  -- Єдина таблиця кредитів: безкоштовні + платні спроби.
  --
  -- free_remaining  — 3 безкоштовні спроби при реєстрації, лише зменшуються.
  -- paid_remaining  — нараховуються після оплати (+30 за 50 Stars).
  -- paid_expires_at — дата закінчення дії платних спроб (30 днів з дня оплати).
  --
  -- Логіка споживання: спочатку списуємо paid (якщо активні), потім free.
  -- При вичерпанні обох — генерація заблокована, пропонуємо купити пакет.
  CREATE TABLE IF NOT EXISTS user_credits (
    user_id          BIGINT      PRIMARY KEY,
    free_remaining   INT         NOT NULL DEFAULT 3,
    paid_remaining   INT         NOT NULL DEFAULT 0,
    paid_expires_at  TIMESTAMPTZ
  );

  -- Реферальні події: хто кого запросив.
  -- UNIQUE(referee_id) гарантує, що новий користувач може зарахувати бонус
  -- рефереру лише ОДИН РАЗ — навіть при повторних відкриттях посилання.
  CREATE TABLE IF NOT EXISTS referral_events (
    id          SERIAL      PRIMARY KEY,
    referrer_id BIGINT      NOT NULL,
    referee_id  BIGINT      NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  console.log('[db] Схему бази даних ініціалізовано (user_credits, referral_events)');
}
