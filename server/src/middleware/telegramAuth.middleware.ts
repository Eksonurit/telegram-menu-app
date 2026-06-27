import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { TelegramUserPayload } from '../types/index.js';
import { HttpError } from '../utils/HttpError.js';

/** Максимальний вік initData у секундах (24 години) */
const MAX_AUTH_AGE_SECONDS = 86_400;

const INIT_DATA_HEADER = 'x-telegram-init-data';

interface TelegramInitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

function buildDataCheckString(initData: URLSearchParams): string {
  const entries = Array.from(initData.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return entries.map(([key, value]) => `${key}=${value}`).join('\n');
}

function computeInitDataHash(dataCheckString: string, botToken: string): string {
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  return crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
}

function parseTelegramUser(rawUser: string): TelegramUserPayload {
  const parsed = JSON.parse(rawUser) as TelegramInitDataUser;

  return {
    id: parsed.id,
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    username: parsed.username,
    language_code: parsed.language_code,
  };
}

function validateAuthDate(initData: URLSearchParams): void {
  const authDateRaw = initData.get('auth_date');

  if (!authDateRaw) {
    throw new HttpError('Відсутня дата авторизації Telegram', 401);
  }

  const authDate = Number(authDateRaw);

  if (Number.isNaN(authDate)) {
    throw new HttpError('Невалідна дата авторизації Telegram', 401);
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;

  if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
    throw new HttpError('Дані авторизації Telegram застаріли', 401);
  }
}

function validateInitData(initDataRaw: string, botToken: string): TelegramUserPayload {
  if (!botToken) {
    throw new HttpError('Токен Telegram-бота не налаштовано', 500);
  }

  const initData = new URLSearchParams(initDataRaw);
  const receivedHash = initData.get('hash');

  if (!receivedHash) {
    throw new HttpError('Відсутній hash у даних Telegram', 401);
  }

  validateAuthDate(initData);

  const dataCheckString = buildDataCheckString(initData);
  const calculatedHash = computeInitDataHash(dataCheckString, botToken);

  if (calculatedHash !== receivedHash) {
    throw new HttpError('Невалідний підпис Telegram initData', 401);
  }

  const userRaw = initData.get('user');

  if (!userRaw) {
    throw new HttpError('Дані користувача Telegram відсутні', 401);
  }

  return parseTelegramUser(userRaw);
}

export function createTelegramAuthMiddleware(botToken: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const initDataRaw = req.header(INIT_DATA_HEADER);

      if (!initDataRaw) {
        throw new HttpError(
          'Заголовок X-Telegram-Init-Data обов\'язковий для цього запиту',
          401,
        );
      }

      req.telegramUser = validateInitData(initDataRaw, botToken);
      next();
    } catch (error) {
      next(error);
    }
  };
}
