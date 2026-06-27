import { Router } from 'express';
import type { HealthResponse } from '../types/index.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const response: HealthResponse = {
    status: 'ok',
    service: 'recipe-mini-app-server',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});
