import type { AppConfig } from '@/types';

export const appConfig: AppConfig = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  botUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? '',
};
