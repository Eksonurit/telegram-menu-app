import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig, validateProductionConfig } from './config/env.config.js';

const config = loadConfig();
validateProductionConfig(config);

const app = createApp(config);

app.listen(config.port, () => {
  console.log(
    `[Сервер] Запущено на http://localhost:${config.port} (${config.nodeEnv})`,
  );
});
