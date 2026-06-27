export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export interface AppConfig {
  apiUrl: string;
  botUsername: string;
}
