/**
 * rateLimit.service.ts
 *
 * Сервіс обмеження щоденних безкоштовних генерацій рецептів.
 *
 * Зберігає ліміти в пам'яті (Map). Ліміт кожного користувача скидається
 * через 24 години після ПЕРШОГО його запиту за поточну добу.
 *
 * ВАЖЛИВО: при перезапуску сервера ліміти скидаються для всіх користувачів.
 * Для продакшн-середовища з кількома інстансами рекомендується замінити
 * сховище на Redis або PostgreSQL.
 */

/** Запис ліміту для одного користувача */
interface UserLimitEntry {
  /** Кількість генерацій, що залишились за поточну добу */
  remaining: number;
  /** Unix-таймстемп (мс), коли ліміт скидається (через 24 год після першого запиту) */
  resetAt: number;
}

/** Тривалість одного вікна — 24 години */
const TTL_MS = 24 * 60 * 60 * 1000;

/** Денний ліміт безкоштовних генерацій (зчитується з env або дефолт 3) */
function getDailyLimit(): number {
  const raw = process.env.DAILY_FREE_LIMIT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

/** Центральне сховище лімітів: userId → UserLimitEntry */
const limitsStore = new Map<number, UserLimitEntry>();

// ─── Публічний API ─────────────────────────────────────────────────────────────

/**
 * Повертає поточний стан ліміту для користувача БЕЗ зміни лічильника.
 * Використовується для інформаційного відображення у відповідях безкоштовних запитів.
 */
export function getLimitStatus(userId: number): { remaining: number; total: number } {
  const total = getDailyLimit();
  const now = Date.now();
  const entry = limitsStore.get(userId);

  // Якщо запису немає або вікно вже закрилось — повний ліміт
  if (!entry || now >= entry.resetAt) {
    return { remaining: total, total };
  }

  return { remaining: entry.remaining, total };
}

/**
 * Перевіряє, чи є доступна спроба, і якщо так — списує одну.
 *
 * @returns allowed  — чи дозволено виконати генерацію
 * @returns remaining — скільки спроб залишилось ПІСЛЯ цього виклику
 * @returns total     — максимум спроб на добу
 */
export function consumeToken(userId: number): {
  allowed: boolean;
  remaining: number;
  total: number;
} {
  const total = getDailyLimit();
  const now = Date.now();
  let entry = limitsStore.get(userId);

  // Ініціалізація або скидання після закінчення вікна
  if (!entry || now >= entry.resetAt) {
    entry = { remaining: total, resetAt: now + TTL_MS };
    limitsStore.set(userId, entry);
  }

  if (entry.remaining <= 0) {
    return { allowed: false, remaining: 0, total };
  }

  // Списуємо одну спробу
  entry.remaining -= 1;

  return { allowed: true, remaining: entry.remaining, total };
}
