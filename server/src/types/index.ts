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

// ─── Типи Telegram Webhook (платіжний флоу) ───────────────────────────────────

/** Мінімальне представлення відправника оновлення */
export interface TelegramUpdateFrom {
  id: number;
  first_name?: string;
  username?: string;
}

/**
 * pre_checkout_query — приходить ПЕРЕД списанням коштів.
 * Бот має відповісти answerPreCheckoutQuery протягом 10 секунд.
 */
export interface TelegramPreCheckoutQuery {
  id: string;
  from: TelegramUpdateFrom;
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

/** successful_payment — підтвердження успішної оплати, приходить у message */
export interface TelegramSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
}

/** Повідомлення, що може містити successful_payment */
export interface TelegramMessage {
  from?: TelegramUpdateFrom;
  successful_payment?: TelegramSuccessfulPayment;
}

/** Кореневий об'єкт оновлення вебхука (лише потрібні для платежів поля) */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  pre_checkout_query?: TelegramPreCheckoutQuery;
}
