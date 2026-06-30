import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig, validateProductionConfig } from './config/env.config.js';
import { initDatabase } from './db/schema.js';

/**
 * Точка входу: спершу ініціалізуємо БД (створюємо таблиці + перевіряємо з'єднання),
 * і лише потім запускаємо HTTP-сервер. Якщо БД недоступна — падаємо з чіткою
 * помилкою, бо ліміти та преміум залежать від сховища.
 */
async function bootstrap(): Promise<void> {
  const config = loadConfig();
  validateProductionConfig(config);

  await initDatabase();

  const app = createApp(config);

  app.listen(config.port, () => {
    console.log(
      `[Сервер] Запущено на http://localhost:${config.port} (${config.nodeEnv})`,
    );
  });
}

bootstrap().catch((error) => {
  console.error('[Сервер] Не вдалося запуститись:', error);
  process.exit(1);
});
