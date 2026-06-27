import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { ServerConfig } from './config/env.config.js';
import { createApiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';

export function createApp(config: ServerConfig): express.Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));

  app.use('/api', createApiRouter(config));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
