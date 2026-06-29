import type { AppConfig } from '@/types';

/**
 * Базовий URL API.
 * У dev через ngrok використовуйте відносний шлях `/api` —
 * запити йдуть через Vite proxy на localhost:3000.
 */
const rawApiUrl = import.meta.env.VITE_API_URL ?? '/api';

export const appConfig: AppConfig = {
  apiUrl: rawApiUrl.replace(/\/$/, ''),
  botUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? '',
};

/** Збирає повний endpoint без подвійних слешів */
export function buildApiEndpoint(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${appConfig.apiUrl}${normalizedPath}`;
}
