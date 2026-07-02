/**
 * referral.service.ts (client)
 *
 * Клієнтський сервіс для реферальної системи.
 * Викликається при старті Mini App, якщо в initDataUnsafe.start_param є "ref_<userId>".
 */

import { buildApiEndpoint } from '@/config/app.config';
import { ApiError } from '@/services/api.service';
import { getTelegramInitData } from '@/utils/telegram.utils';

export interface ClaimReferralResult {
  credited: boolean;
  bonus: number;
}

export interface ReferralLinkResult {
  link: string;
  botUsername: string;
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
 * Надсилає реферальний код на сервер для зарахування бонусу.
 * Безпечно викликати повторно — сервер ідемпотентний (ON CONFLICT DO NOTHING).
 *
 * @param referralCode — наприклад "ref_12345" з initDataUnsafe.start_param
 */
export async function claimReferral(
  referralCode: string,
): Promise<ClaimReferralResult> {
  const initData = getTelegramInitData();
  if (!initData) throw new ApiError('errorNoInitData', 401);

  let response: Response;
  try {
    response = await fetch(buildApiEndpoint('/referral/claim'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
      body: JSON.stringify({ referralCode }),
    });
  } catch {
    throw new ApiError('errorAnalysisFailed', 0);
  }

  if (!response.ok) {
    const message = await parseServerError(response);
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as ClaimReferralResult;
}

/**
 * Отримує реферальне посилання з сервера.
 * Username бота береться з Telegram getMe — завжди коректний для t.me.
 */
export async function fetchReferralLink(): Promise<ReferralLinkResult> {
  const initData = getTelegramInitData();
  if (!initData) throw new ApiError('errorNoInitData', 401);

  let response: Response;
  try {
    response = await fetch(buildApiEndpoint('/referral/link'), {
      method: 'GET',
      headers: {
        'X-Telegram-Init-Data': initData,
      },
    });
  } catch {
    throw new ApiError('errorAnalysisFailed', 0);
  }

  if (!response.ok) {
    const message = await parseServerError(response);
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as ReferralLinkResult;
}
