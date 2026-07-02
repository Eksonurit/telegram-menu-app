import { Router } from 'express';
import type { ServerConfig } from '../config/env.config.js';
import { healthRouter } from './health.routes.js';
import { createPaymentsRouter } from './payments.routes.js';
import { createRecipesRouter } from './recipes.routes.js';
import { createPublicRouter } from './public.routes.js';
import { createReferralRouter } from './referral.routes.js';

export function createApiRouter(config: ServerConfig): Router {
  const router = Router();

  router.use(healthRouter);
  router.use('/public', createPublicRouter(config));
  router.use('/recipes', createRecipesRouter(config));
  router.use('/payments', createPaymentsRouter(config));
  router.use('/referral', createReferralRouter(config));

  return router;
}
