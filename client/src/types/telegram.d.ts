/**
 * telegram.d.ts
 *
 * Глобальні типи Telegram Web Apps SDK (window.Telegram.WebApp).
 * Описуємо лише ту частину API, яку реально використовуємо в додатку.
 *
 * Тримаємо опис у ЄДИНОМУ місці, щоб уникнути конфліктів декларацій
 * `Window.Telegram` у різних файлах.
 */

/** Користувач Telegram з initDataUnsafe */
interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Статус оплати, який повертає callback openInvoice.
 *  - paid      — оплату успішно завершено
 *  - cancelled — користувач закрив вікно оплати
 *  - failed    — оплата не вдалася
 *  - pending   — оплату ще обробляють
 */
type TelegramInvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
  };
  themeParams: Record<string, string | undefined>;
  colorScheme: 'light' | 'dark';

  /**
   * Відкриває нативне вікно оплати Telegram за інвойс-посиланням.
   *
   * @param url      — invoice link з createInvoiceLink (Bot API)
   * @param callback — викликається з фінальним статусом оплати
   */
  openInvoice: (
    url: string,
    callback?: (status: TelegramInvoiceStatus) => void,
  ) => void;

  /** Тактильний відгук (вібрація) — необов'язково присутній */
  HapticFeedback?: {
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
  };
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
