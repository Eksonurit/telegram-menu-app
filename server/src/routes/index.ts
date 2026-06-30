import { Router } from 'express';
import type { ServerConfig } from '../config/env.config.js';
import { healthRouter } from './health.routes.js';
import { createPaymentsRouter } from './payments.routes.js';
import { createRecipesRouter } from './recipes.routes.js';

export function createApiRouter(config: ServerConfig): Router {
  const router = Router();

  router.use(healthRouter);
  router.use('/recipes', createRecipesRouter(config));
  router.use('/payments', createPaymentsRouter(config));

  return router;
}
