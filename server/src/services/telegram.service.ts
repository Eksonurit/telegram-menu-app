/**
 * telegram.service.ts
 *
 * Тонка обгортка над Telegram Bot API (HTTP) для платежів через Telegram Stars.
 *
 * КЛЮЧОВЕ ПРО STARS (XTR):
 *  - Зовнішній provider_token НЕ потрібен (Stripe / Smart Glocal не задіяні).
 *  - currency має бути рівно "XTR", provider_token — порожній рядок "".
 *  - Сума (amount) у prices вказується В ЗІРКАХ напряму (50 = 50 ⭐),
 *    без множення на 100, як це робиться для звичайних валют.
 *
 * Використовуємо нативний fetch (Node 18+) — без зайвих залежностей.
 */

import { HttpError } from '../utils/HttpError.js';

/** Базовий шаблон URL Bot API */
const TELEGRAM_API_BASE = 'https://api.telegram.org';

/** Кешовані дані бота з getMe (username завжди актуальний для t.me-посилань) */
interface CachedBotInfo {
  id: number;
  username: string;
  first_name: string;
}

let cachedBotInfo: CachedBotInfo | null = null;

/** Валюта Telegram Stars */
const STARS_CURRENCY = 'XTR';

/** Універсальна форма відповіді Telegram Bot API */
interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/** Параметри ціни для інвойсу */
interface LabeledPrice {
  label: string;
  /** Сума в найменших одиницях; для XTR — кількість зірок */
  amount: number;
}

/**
 * Виконує виклик довільного методу Bot API.
 * Централізує обробку мережевих помилок і помилок рівня Telegram.
 *
 * @param botToken — токен бота (TELEGRAM_BOT_TOKEN)
 * @param method   — назва методу Bot API (наприклад, "createInvoiceLink")
 * @param payload  — тіло запиту (буде серіалізоване в JSON)
 */
async function callBotApi<T>(
  botToken: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<T> {
  if (!botToken) {
    throw new HttpError('Токен Telegram-бота не налаштовано', 500);
  }

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/${method}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Мережева помилка (DNS / таймаут / немає з'єднання)
    console.error(`[telegram.service] Мережева помилка при виклику ${method}:`, error);
    throw new HttpError('Сервіс платежів тимчасово недоступний. Спробуйте ще раз.', 503);
  }

  let body: TelegramApiResponse<T>;
  try {
    body = (await response.json()) as TelegramApiResponse<T>;
  } catch {
    throw new HttpError('Некоректна відповідь від Telegram. Спробуйте ще раз.', 502);
  }

  if (!body.ok || body.result === undefined) {
    console.error(
      `[telegram.service] Telegram відхилив ${method}: ` +
        `${body.error_code ?? '—'} ${body.description ?? ''}`,
    );
    throw new HttpError('Не вдалося створити платіж. Спробуйте пізніше.', 502);
  }

  return body.result;
}

/**
 * Завантажує username бота через getMe і кешує результат.
 * Джерело правди для реферальних посилань — env може бути застарілим або з помилкою.
 */
export async function initBotInfo(botToken: string): Promise<void> {
  if (!botToken) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN не задано — username бота невідомий');
    return;
  }

  try {
    const me = await callBotApi<{ id: number; username?: string; first_name: string }>(
      botToken,
      'getMe',
      {},
    );

    if (!me.username) {
      console.warn('[telegram] getMe не повернув username');
      return;
    }

    cachedBotInfo = {
      id: me.id,
      username: me.username,
      first_name: me.first_name,
    };

    const envUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '').trim();
    if (envUsername && envUsername.toLowerCase() !== me.username.toLowerCase()) {
      console.warn(
        `[telegram] TELEGRAM_BOT_USERNAME="${envUsername}" не збігається з getMe ` +
          `"${me.username}". Для посилань використовується getMe.`,
      );
    }

    console.log(`[telegram] Бот: @${me.username} (${me.first_name})`);
  } catch (error) {
    console.warn('[telegram] getMe не вдався — fallback на TELEGRAM_BOT_USERNAME з env:', error);
  }
}

/** Username з getMe або порожній рядок, якщо initBotInfo ще не викликано */
export function getBotUsernameFromApi(): string {
  return cachedBotInfo?.username ?? '';
}

/**
 * Надсилає текстове повідомлення користувачу через бота.
 * Використовується для реферальних сповіщень.
 *
 * Помилки проковтуються (warn-рівень) — сповіщення некритичне,
 * його недоставлення не повинно ламати основний флоу.
 *
 * @param botToken — токен бота
 * @param chatId   — Telegram ID отримувача
 * @param text     — HTML-текст повідомлення
 */
export async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<void> {
  try {
    await callBotApi<unknown>(botToken, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.warn(
      `[telegram.service] Не вдалося надіслати сповіщення користувачу ${chatId}:`,
      error,
    );
  }
}

/** Параметри для створення інвойс-посилання на преміум */
export interface CreateInvoiceParams {
  botToken: string;
  title: string;
  description: string;
  /** Унікальний payload для ідентифікації транзакції, напр. "premium_upgrade_123456" */
  payload: string;
  /** Назва позиції в чеку */
  label: string;
  /** Ціна в зірках (наприклад, 50) */
  amountStars: number;
}

/**
 * Створює інвойс-посилання для оплати зірками через метод createInvoiceLink.
 *
 * Чому саме createInvoiceLink, а не sendInvoice:
 *  - createInvoiceLink повертає ГОТОВЕ посилання (рядок), яке фронтенд передає
 *    у Telegram.WebApp.openInvoice() для відкриття нативного платіжного вікна.
 *  - sendInvoice натомість надсилає повідомлення в чат — це не підходить для
 *    безшовного флоу всередині Mini App.
 *
 * @returns invoiceLink — посилання виду https://t.me/$... для openInvoice
 */
export async function createStarsInvoiceLink(
  params: CreateInvoiceParams,
): Promise<string> {
  const prices: LabeledPrice[] = [
    { label: params.label, amount: params.amountStars },
  ];

  const invoiceLink = await callBotApi<string>(params.botToken, 'createInvoiceLink', {
    title: params.title,
    description: params.description,
    payload: params.payload,
    // Для Stars provider_token завжди порожній, currency завжди XTR
    provider_token: '',
    currency: STARS_CURRENCY,
    prices,
  });

  return invoiceLink;
}

/**
 * Відповідає на pre_checkout_query — ОБОВ'ЯЗКОВО протягом 10 секунд,
 * інакше Telegram скасує платіж.
 *
 * @param botToken            — токен бота
 * @param preCheckoutQueryId  — id запиту з оновлення pre_checkout_query
 * @param ok                  — true = дозволити оплату, false = відхилити
 * @param errorMessage        — повідомлення користувачу при ok=false
 */
export async function answerPreCheckoutQuery(
  botToken: string,
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string,
): Promise<void> {
  await callBotApi<boolean>(botToken, 'answerPreCheckoutQuery', {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(ok ? {} : { error_message: errorMessage ?? 'Платіж відхилено. Спробуйте ще раз.' }),
  });
}
