/**
 * Публічна конфігурація додатку з бекенду (без авторизації).
 * Потрібна для реферальних посилань, якщо VITE_TELEGRAM_BOT_USERNAME не потрапив у build.
 */

import { buildApiEndpoint } from '@/config/app.config';

export interface PublicAppConfig {
  botUsername: string;
  miniAppShortName?: string;
}

let cachedConfig: PublicAppConfig | null = null;

export async function fetchPublicAppConfig(): Promise<PublicAppConfig> {
  if (cachedConfig) return cachedConfig;

  const response = await fetch(buildApiEndpoint('/public/config'));
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити конфіг (${response.status})`);
  }

  cachedConfig = (await response.json()) as PublicAppConfig;
  return cachedConfig;
}
