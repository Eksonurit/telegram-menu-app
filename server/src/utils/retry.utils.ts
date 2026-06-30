/**
 * retry.utils.ts
 *
 * Стійкий механізм повторних спроб (resilient retry) з експоненційним відступом
 * для запитів до зовнішніх API (передусім Gemini).
 *
 * ПРОБЛЕМА, ЯКУ ВИРІШУЄМО:
 *  Безкоштовний тариф Gemini нестабільний під навантаженням:
 *   - 429 Too Many Requests — перевищено ліміт запитів/токенів за хвилину;
 *   - 503 Service Unavailable — модель тимчасово перевантажена.
 *  Обидві помилки ТИМЧАСОВІ: повторна спроба за мить зазвичай успішна.
 *
 * РІШЕННЯ:
 *  Загортаємо виклик у цикл повторів. При тимчасовій помилці чекаємо
 *  base * 2^(спроба) мілісекунд (1.5с → 3с → 6с) + невеликий «джиттер»,
 *  і пробуємо знову. Усе відбувається ТИХО у фоні — користувач нічого не помічає.
 */

import {
  GoogleGenerativeAIError,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai';

/** Налаштування поведінки повторних спроб */
export interface RetryOptions {
  /** Максимальна кількість ПОВТОРНИХ спроб після першої невдачі (за замовчуванням 3) */
  retries?: number;
  /** Базова затримка в мс перед першим повтором (за замовчуванням 1500) */
  baseDelayMs?: number;
  /** Стеля затримки в мс, щоб експонента не зростала нескінченно (за замовчуванням 10000) */
  maxDelayMs?: number;
  /** Мітка для логів — допомагає зрозуміти, який саме виклик повторюється */
  label?: string;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1500;
const DEFAULT_MAX_DELAY_MS = 10_000;

/** Проста асинхронна пауза */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Визначає, чи варто повторювати запит для даної помилки.
 * Повторюємо ЛИШЕ тимчасові помилки перевантаження/лімітів (429, 503).
 * Постійні помилки (400 невалідне фото, 403 ключ, safety-блокування) НЕ повторюємо —
 * це лише марно витратить час і токени.
 */
function isRetryableError(error: unknown): boolean {
  // HTTP-рівень: маємо точний статус-код від Gemini
  if (error instanceof GoogleGenerativeAIFetchError) {
    return error.status === 429 || error.status === 503;
  }

  // SDK-рівень: статусу немає, але текст може вказувати на перевантаження
  if (error instanceof GoogleGenerativeAIError) {
    const msg = (error as Error).message?.toLowerCase() ?? '';
    return (
      msg.includes('overloaded') ||
      msg.includes('try again') ||
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('503')
    );
  }

  return false;
}

/**
 * Обчислює затримку для конкретної спроби за формулою експоненційного відступу
 * з невеликим випадковим «джиттером» (щоб паралельні запити не били в одну секунду).
 *
 * @param attempt — номер ПОВТОРУ, починаючи з 0 (0 → base, 1 → base*2, 2 → base*4)
 */
function computeBackoff(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** attempt;
  const capped = Math.min(exponential, maxDelayMs);
  // Джиттер ±20% від затримки розмазує навантаження в часі
  const jitter = capped * 0.2 * Math.random();
  return Math.round(capped + jitter);
}

/**
 * Виконує асинхронну операцію зі стійкими повторними спробами.
 *
 * @param operation — функція, що повертає Promise (наприклад, виклик Gemini)
 * @param options   — налаштування повторів
 * @returns         — результат успішної операції
 * @throws          — ОСТАННЮ помилку, якщо всі спроби вичерпано або помилка не тимчасова
 *
 * @example
 *   const result = await withRetry(
 *     () => model.generateContent(parts),
 *     { label: 'analyzeProductPhotos' },
 *   );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = DEFAULT_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    label = 'gemini',
  } = options;

  let lastError: unknown;

  // Усього спроб = 1 початкова + retries повторних
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const canRetry = isRetryableError(error) && attempt < retries;

      // Постійна помилка АБО спроби вичерпано — кидаємо одразу
      if (!canRetry) {
        throw error;
      }

      const delay = computeBackoff(attempt, baseDelayMs, maxDelayMs);
      const status =
        error instanceof GoogleGenerativeAIFetchError ? error.status : 'overload';

      console.warn(
        `[retry:${label}] Тимчасова помилка (${status}). ` +
          `Повтор ${attempt + 1}/${retries} через ${delay} мс…`,
      );

      await sleep(delay);
    }
  }

  // Технічно недосяжно (цикл або повертає, або кидає), але потрібно для типів
  throw lastError;
}
