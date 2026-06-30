/**
 * image-search.service.ts
 *
 * Сервіс пошуку якісних фотографій їжі за English-запитом.
 * Підтримує два безкоштовні провайдери:
 *   1. Pexels   — PEXELS_API_KEY   (200 req/год, пріоритет)
 *   2. Unsplash — UNSPLASH_ACCESS_KEY (50 req/год, резерв)
 *
 * Якщо жоден ключ не налаштований — повертає null.
 * Помилки ніколи не кидаються назовні — фото вважається необов'язковим.
 */

/** Час очікування HTTP-запиту до image API (мс) */
const FETCH_TIMEOUT_MS = 5_000;

/** Базові URL провайдерів */
const PEXELS_URL   = 'https://api.pexels.com/v1/search';
const UNSPLASH_URL = 'https://api.unsplash.com/search/photos';

// ─── Типи відповідей API ──────────────────────────────────────────────────────

interface PexelsResponse {
  total_results: number;
  photos: Array<{
    src: {
      medium:  string;
      large:   string;
      large2x: string;
    };
  }>;
}

interface UnsplashResponse {
  total: number;
  results: Array<{
    urls: {
      small:   string;
      regular: string;
      full:    string;
    };
  }>;
}

// ─── Утиліти ─────────────────────────────────────────────────────────────────

/**
 * Обгортка навколо fetch з автоматичним скасуванням через AbortController.
 * Захищає від зависання запитів при повільній відповіді провайдера.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Pexels ───────────────────────────────────────────────────────────────────

/**
 * Шукає фото їжі у Pexels.
 * @returns URL великого фото (large) або null
 */
async function searchPexels(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    query:       `${query} food`,
    per_page:    '1',
    orientation: 'landscape',
  });

  const response = await fetchWithTimeout(
    `${PEXELS_URL}?${params.toString()}`,
    { headers: { Authorization: apiKey } },
  );

  if (!response.ok) {
    console.warn(`[image-search] Pexels повернув ${response.status} для: "${query}"`);
    return null;
  }

  const data = (await response.json()) as PexelsResponse;
  return data.photos[0]?.src.large ?? null;
}

// ─── Unsplash ─────────────────────────────────────────────────────────────────

/**
 * Шукає фото їжі у Unsplash.
 * @returns URL фото у regular-якості або null
 */
async function searchUnsplash(query: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const params = new URLSearchParams({
    query:       `${query} food`,
    per_page:    '1',
    orientation: 'landscape',
  });

  const response = await fetchWithTimeout(
    `${UNSPLASH_URL}?${params.toString()}`,
    { headers: { Authorization: `Client-ID ${accessKey}` } },
  );

  if (!response.ok) {
    console.warn(`[image-search] Unsplash повернув ${response.status} для: "${query}"`);
    return null;
  }

  const data = (await response.json()) as UnsplashResponse;
  return data.results[0]?.urls.regular ?? null;
}

// ─── Публічний API ────────────────────────────────────────────────────────────

/**
 * Шукає якісну фотографію страви за English search query.
 *
 * Порядок провайдерів: Pexels → Unsplash.
 * Якщо обидва недоступні або ключі не налаштовані — повертає null.
 * Ніколи не кидає винятків (non-critical операція).
 *
 * @param searchQuery — English пошуковий запит, наприклад "pasta carbonara"
 */
export async function fetchFoodImage(searchQuery: string): Promise<string | null> {
  if (!searchQuery.trim()) return null;

  try {
    const result = (await searchPexels(searchQuery)) ?? (await searchUnsplash(searchQuery));
    return result;
  } catch (error) {
    console.warn('[image-search] Не вдалося отримати фото для:', searchQuery, error);
    return null;
  }
}
