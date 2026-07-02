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

/** Час очікування HTTP-запиту до image API (мс). На Railway/PaaS мережа повільніша — 15с. */
const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

function getFetchTimeoutMs(): number {
  const raw = process.env.IMAGE_SEARCH_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 3_000 ? parsed : DEFAULT_FETCH_TIMEOUT_MS;
}

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
  timeoutMs = getFetchTimeoutMs(),
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
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
 * Безпечний виклик провайдера: при таймауті/мережевій помилці повертає null,
 * не перериваючи fallback на наступний провайдер.
 */
async function tryProvider(
  provider: 'Pexels' | 'Unsplash',
  searchFn: (query: string) => Promise<string | null>,
  query: string,
): Promise<string | null> {
  try {
    return await searchFn(query);
  } catch (error) {
    if (isAbortError(error)) {
      console.warn(
        `[image-search] ${provider} таймаут (${getFetchTimeoutMs()}ms) для: "${query}"`,
      );
    } else {
      console.warn(`[image-search] ${provider} помилка для: "${query}"`, error);
    }
    return null;
  }
}

/**
 * Шукає якісну фотографію страви за English search query.
 *
 * Порядок провайдерів: Pexels → Unsplash.
 * Якщо Pexels таймаутить — автоматично пробуємо Unsplash (раніше fallback губився).
 * Ніколи не кидає винятків (non-critical операція).
 *
 * @param searchQuery — English пошуковий запит, наприклад "pasta carbonara"
 */
export async function fetchFoodImage(searchQuery: string): Promise<string | null> {
  if (!searchQuery.trim()) return null;

  const pexelsResult = await tryProvider('Pexels', searchPexels, searchQuery);
  if (pexelsResult) return pexelsResult;

  return tryProvider('Unsplash', searchUnsplash, searchQuery);
}
