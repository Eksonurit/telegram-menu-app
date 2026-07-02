import { Router } from 'express';
import type { ServerConfig } from '../config/env.config.js';

export interface PublicAppConfigResponse {
  botUsername: string;
  miniAppShortName?: string;
}

export function createPublicRouter(config: ServerConfig): Router {
  const router = Router();

  /** Публічні налаштування для клієнта (username бота, short name Mini App) */
  router.get('/config', (_req, res) => {
    const response: PublicAppConfigResponse = {
      botUsername: config.telegram.botUsername,
    };

    if (config.telegram.miniAppShortName) {
      response.miniAppShortName = config.telegram.miniAppShortName;
    }

    res.json(response);
  });

  return router;
}
