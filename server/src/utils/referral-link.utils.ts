/**
 * Побудова t.me-посилань для реферальної системи.
 */

const REFERRAL_PREFIX = 'ref_';

/** Нормалізує username бота для URL (без @, lowercase) */
export function normalizeBotUsername(username: string): string {
  return username.replace(/^@/, '').trim().toLowerCase();
}

/**
 * Збирає реферальне посилання.
 *
 * За замовчуванням — головний Mini App: t.me/bot?startapp=ref_<id>.
 * Якщо задано shortName (Direct Link з BotFather /newapp):
 * t.me/bot/shortname?startapp=ref_<id>
 */
export function buildReferralLink(
  referrerUserId: number,
  botUsername: string,
  miniAppShortName?: string,
): string {
  const username = normalizeBotUsername(botUsername);
  if (!username) {
    throw new Error('Username бота не налаштовано');
  }

  const startapp = `${REFERRAL_PREFIX}${referrerUserId}`;
  const shortName = miniAppShortName?.trim();

  if (shortName) {
    return `https://t.me/${username}/${shortName}?startapp=${startapp}`;
  }

  return `https://t.me/${username}?startapp=${startapp}`;
}
