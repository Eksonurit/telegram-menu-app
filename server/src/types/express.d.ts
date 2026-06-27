import type { TelegramUserPayload } from './index.js';

declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramUserPayload;
    }
  }
}

export {};
