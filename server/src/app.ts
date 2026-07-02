import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { ServerConfig } from './config/env.config.js';
import { createApiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';

export function createApp(config: ServerConfig): express.Application {
  const app = express();

  // ── Helmet + CSP для Telegram Mini App ────────────────────────────────────
  //
  // Дефолтний helmet() блокує:
  //  • https://telegram.org/js/telegram-web-app.js  → немає initData, «поза Telegram»
  //  • blob: URL прев’ю фото                          → зламані прев’ю
  //  • https://flagcdn.com                          → зламані прапори мов
  //  • https://images.pexels.com                  → фото страв з Pexels
  //
  // На Vite dev (5173) CSP немає — тому локально через ngrok:5173 все працювало,
  // а через Express/Railway (порт 3000) — ні.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://telegram.org'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://flagcdn.com',
            'https://images.pexels.com',
            'https://images.unsplash.com',
          ],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'self'", 'https://telegram.org', 'https://*.telegram.org'],
          upgradeInsecureRequests: [],
        },
      },
      // Telegram WebView інколи конфліктує з COEP
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));

  // ── API маршрути (/api/*) ─────────────────────────────────────────────────
  app.use('/api', createApiRouter(config));

  // ── Роздача фронтенду ─────────────────────────────────────────────────────
  //
  // Продакшн: якщо збудований клієнт (client/dist/index.html) існує —
  // роздаємо його статику, а для всіх нефронтендних шляхів повертаємо
  // index.html (SPA-режим, React Router сам розрулить маршрути).
  //
  // Development: збірки немає; замість сирого JSON 404 відправляємо
  // редирект на Vite dev-сервер, щоб розробник не заплутався.
  const clientDist = path.resolve(process.cwd(), '../client/dist');

  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    // Продакшн — роздаємо статичні файли
    app.use(express.static(clientDist));

    // SPA catch-all: будь-який нероутований шлях повертає index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    // Development — перенаправляємо на Vite dev-сервер (порт 5173)
    // Це усуває заплутаний JSON «Маршрут не знайдено» при відкритті localhost:3000
    const devFrontendUrl = config.telegram.miniAppUrl || 'http://localhost:5173';

    app.get('/', (_req, res) => {
      res.redirect(302, devFrontendUrl);
    });
  }

  // ── Обробники помилок (лише для /api/*) ──────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
