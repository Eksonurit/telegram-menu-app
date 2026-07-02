/**
 * Утиліти реферальної системи на клієнті.
 */

const REFERRAL_PREFIX = 'ref_';

/**
 * Повертає start_param з усіх джерел, які надає Telegram WebApp.
 * tgWebAppStartParam у query потрібен, якщо initDataUnsafe ще порожній.
 */
export function getTelegramStartParam(): string | undefined {
  const webApp = window.Telegram?.WebApp;

  const fromUnsafe = webApp?.initDataUnsafe?.start_param?.trim();
  if (fromUnsafe) return fromUnsafe;

  const fromQuery = new URLSearchParams(window.location.search)
    .get('tgWebAppStartParam')
    ?.trim();
  if (fromQuery) return fromQuery;

  const initData = webApp?.initData;
  if (initData) {
    const fromInitData = new URLSearchParams(initData).get('start_param')?.trim();
    if (fromInitData) return fromInitData;
  }

  return undefined;
}

/** Чи є start_param реферальним кодом (ref_<telegramUserId>) */
export function getReferralCodeFromStartParam(): string | undefined {
  const startParam = getTelegramStartParam();
  return startParam?.startsWith(REFERRAL_PREFIX) ? startParam : undefined;
}

/**
 * Збирає t.me-посилання для запрошення друга.
 *
 * Якщо в BotFather створено Direct Link (/newapp) — передай shortName.
 * Інакше використовуємо головний Mini App: t.me/bot?startapp=ref_<id>.
 */
export function buildReferralLink(
  userId: number,
  botUsername: string,
  miniAppShortName?: string,
): string {
  const username = botUsername.replace(/^@/, '').trim();
  const startapp = `${REFERRAL_PREFIX}${userId}`;

  if (miniAppShortName?.trim()) {
    return `https://t.me/${username}/${miniAppShortName.trim()}?startapp=${startapp}`;
  }

  return `https://t.me/${username}?startapp=${startapp}`;
}
