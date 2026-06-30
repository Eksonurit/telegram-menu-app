/**
 * payment.service.ts
 *
 * Клієнтський сервіс оплати преміуму через Telegram Stars.
 *
 * Флоу:
 *  1. createPremiumInvoice() — просить бекенд створити інвойс-посилання.
 *  2. openInvoice()          — відкриває нативне вікно оплати Telegram і
 *                              резолвиться фінальним статусом ('paid' тощо).
 */

import { buildApiEndpoint } from '@/config/app.config';
import { ApiError } from '@/services/api.service';
import { getTelegramInitData } from '@/utils/telegram.utils';

interface CreateInvoiceResponse {
  invoiceLink: string;
}

interface ApiErrorBody {
  message?: string;
}

async function parseServerError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.message ?? `Помилка сервера (${response.status})`;
  } catch {
    return `Помилка сервера (${response.status})`;
  }
}

/**
 * Запитує у бекенду інвойс-посилання для оплати преміуму.
 * userId на сервері береться з підписаного initData — підробити його не можна.
 *
 * @returns invoiceLink — посилання для Telegram.WebApp.openInvoice()
 */
export async function createPremiumInvoice(): Promise<string> {
  const initData = getTelegramInitData();
  if (!initData) {
    throw new ApiError('errorNoInitData', 401);
  }

  let response: Response;
  try {
    response = await fetch(buildApiEndpoint('/payments/create-invoice'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
    });
  } catch {
    throw new ApiError('errorPaymentFailed', 0);
  }

  if (!response.ok) {
    const message = await parseServerError(response);
    throw new ApiError(message, response.status);
  }

  let data: CreateInvoiceResponse;
  try {
    data = (await response.json()) as CreateInvoiceResponse;
  } catch {
    throw new ApiError('errorPaymentFailed', 500);
  }

  if (!data.invoiceLink) {
    throw new ApiError('errorPaymentFailed', 500);
  }

  return data.invoiceLink;
}

/**
 * Відкриває нативне платіжне вікно Telegram і чекає на результат.
 * Обгортає callback-API openInvoice у Promise для зручного async/await.
 *
 * @param invoiceLink — посилання, отримане з createPremiumInvoice()
 * @returns статус оплати ('paid' | 'cancelled' | 'failed' | 'pending')
 */
export function openInvoice(invoiceLink: string): Promise<TelegramInvoiceStatus> {
  return new Promise((resolve, reject) => {
    const webApp = window.Telegram?.WebApp;

    // Поза Telegram (наприклад, у браузері) openInvoice недоступний
    if (!webApp?.openInvoice) {
      reject(new ApiError('errorPaymentUnavailable', 0));
      return;
    }

    try {
      webApp.openInvoice(invoiceLink, (status) => resolve(status));
    } catch {
      reject(new ApiError('errorPaymentFailed', 0));
    }
  });
}
