export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  message: string;
}

export interface TelegramUserPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
