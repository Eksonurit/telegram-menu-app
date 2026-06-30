/**
 * db/pool.ts
 *
 * Єдиний пул з'єднань PostgreSQL для всього застосунку.
 *
 * Пул створюється ЛІНИВО (при першому запиті) на основі DATABASE_URL.
 * Це дозволяє імпортувати сервіси без негайного підключення до БД
 * і дає чітку помилку, якщо змінна середовища не налаштована.
 *
 * Чому пул, а не одиночне з'єднання:
 *  - pg.Pool сам керує набором з'єднань, повторно використовує їх
 *    і коректно обробує паралельні запити та обриви мережі.
 */

import pg from 'pg';

const { Pool } = pg;

/**
 * pg за замовчуванням повертає BIGINT (OID 20) як рядок, щоб не втратити
 * точність для чисел > 2^53. Наші user_id (Telegram) і reset_at (epoch ms)
 * вкладаються в безпечний діапазон JS, тож парсимо їх одразу в number —
 * це спрощує решту коду.
 */
pg.types.setTypeParser(20, (value) => Number(value));

let _pool: pg.Pool | null = null;

/**
 * Повертає (та за потреби створює) глобальний пул з'єднань.
 * Кидає зрозумілу помилку, якщо DATABASE_URL відсутній.
 */
export function getPool(): pg.Pool {
  if (_pool) {
    return _pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      '[db] Відсутня змінна середовища DATABASE_URL. ' +
        'Вкажіть рядок підключення PostgreSQL у server/.env',
    );
  }

  _pool = new Pool({
    connectionString,
    // Деякі хмарні БД (Neon, Supabase, Heroku) вимагають SSL.
    // Вмикається через DATABASE_SSL=true; для локального Postgres не потрібно.
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
  });

  // Не валимо процес при фоновій помилці idle-з'єднання — лише логуємо.
  _pool.on('error', (error) => {
    console.error('[db] Неочікувана помилка idle-з\'єднання:', error);
  });

  return _pool;
}

/**
 * Тонка обгортка для одноразових запитів через пул.
 *
 * @param text   — SQL із плейсхолдерами $1, $2, …
 * @param params — значення параметрів
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>,
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[] | undefined);
}

/**
 * Коректно закриває пул (для graceful shutdown / тестів).
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
