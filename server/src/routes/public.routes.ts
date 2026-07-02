import { Router } from 'express';
import type { ServerConfig } from '../config/env.config.js';
import { getBotUsernameFromApi } from '../services/telegram.service.js';
import { normalizeBotUsername } from '../utils/referral-link.utils.js';

export interface PublicAppConfigResponse {
  botUsername: string;
  miniAppShortName?: string;
}

function resolvePublicBotUsername(config: ServerConfig): string {
  const fromApi = getBotUsernameFromApi();
  if (fromApi) return fromApi;
  return normalizeBotUsername(config.telegram.botUsername);
}

export function createPublicRouter(config: ServerConfig): Router {
  const router = Router();

  /** Публічні налаштування для клієнта (username бота, short name Mini App) */
  router.get('/config', (_req, res) => {
    const response: PublicAppConfigResponse = {
      botUsername: resolvePublicBotUsername(config),
    };

    if (config.telegram.miniAppShortName) {
      response.miniAppShortName = config.telegram.miniAppShortName;
    }

    res.json(response);
  });

  return router;
}
