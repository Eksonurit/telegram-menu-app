export interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string[];
  telegram: {
    botToken: string;
    botUsername: string;
    miniAppUrl: string;
  };
  database: {
    url: string;
  };
  ai: {
    openaiApiKey: string;
    googleAiApiKey: string;
  };
}

function getEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Відсутня обов'язкова змінна середовища: ${key}`);
  }
  return value;
}

export function loadConfig(): ServerConfig {
  const nodeEnv = getEnv('NODE_ENV', 'development');

  const corsOrigin = getEnv('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const miniAppUrl = getEnv('TELEGRAM_MINI_APP_URL');

  // У dev автоматично додаємо origin Mini App (ngrok) до CORS
  if (nodeEnv === 'development' && miniAppUrl) {
    try {
      const ngrokOrigin = new URL(miniAppUrl).origin;
      if (!corsOrigin.includes(ngrokOrigin)) {
        corsOrigin.push(ngrokOrigin);
      }
    } catch {
      // Ігноруємо невалідний URL
    }
  }

  return {
    port: Number(getEnv('PORT', '3000')),
    nodeEnv,
    corsOrigin,
    telegram: {
      botToken: getEnv('TELEGRAM_BOT_TOKEN'),
      botUsername: getEnv('TELEGRAM_BOT_USERNAME'),
      miniAppUrl: getEnv('TELEGRAM_MINI_APP_URL'),
    },
    database: {
      url: getEnv('DATABASE_URL'),
    },
    ai: {
      openaiApiKey: getEnv('OPENAI_API_KEY'),
      googleAiApiKey: getEnv('GOOGLE_AI_API_KEY'),
    },
  };
}

export function validateProductionConfig(config: ServerConfig): void {
  if (config.nodeEnv !== 'production') {
    return;
  }

  getRequiredEnv('TELEGRAM_BOT_TOKEN');
  getRequiredEnv('TELEGRAM_MINI_APP_URL');
}
