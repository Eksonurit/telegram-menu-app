/**
 * ReferralBlock.tsx
 *
 * Блок із реферальним посиланням — показується на екрані вичерпаних лімітів.
 * Дозволяє скопіювати унікальне посилання одним дотиком.
 *
 * Посилання: https://t.me/<BOT>?startapp=ref_<userId>
 * (або t.me/bot/shortname?startapp=..., якщо задано TELEGRAM_MINI_APP_SHORT_NAME)
 */

import { useEffect, useState } from 'react';
import { appConfig } from '@/config/app.config';
import { useI18n } from '@/i18n/I18nContext';
import { fetchPublicAppConfig } from '@/services/public-config.service';
import { buildReferralLink } from '@/utils/referral.utils';
import '@/styles/ReferralBlock.css';

interface ReferralBlockProps {
  /** Telegram ID поточного користувача */
  userId: number;
}

/** Кількість секунд показу стану "Скопійовано" */
const COPIED_FEEDBACK_MS = 2000;

/** Кількість бонусних спроб (має збігатись з REFERRAL_BONUS на сервері) */
const REFERRAL_BONUS = 2;

export function ReferralBlock({ userId }: ReferralBlockProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [botUsername, setBotUsername] = useState(appConfig.botUsername);
  const [miniAppShortName, setMiniAppShortName] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    void fetchPublicAppConfig()
      .then((config) => {
        if (cancelled) return;
        if (config.botUsername) setBotUsername(config.botUsername);
        if (config.miniAppShortName) setMiniAppShortName(config.miniAppShortName);
      })
      .catch(() => {
        // Якщо API недоступний — лишаємо значення з Vite env (якщо були)
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const referralLink = botUsername
    ? buildReferralLink(userId, botUsername, miniAppShortName)
    : null;

  const handleCopy = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // Fallback для старих WebView — через input
      const input = document.createElement('input');
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  if (!referralLink) return null;

  return (
    <div className="referral-block">
      <div className="referral-block__divider">
        <span>{t('referralOrDivider')}</span>
      </div>

      <div className="referral-block__icon" aria-hidden="true">
        <FriendsIcon />
      </div>

      <h3 className="referral-block__title">{t('referralTitle')}</h3>
      <p
        className="referral-block__description"
        dangerouslySetInnerHTML={{
          __html: t('referralDescription', { bonus: String(REFERRAL_BONUS) }),
        }}
      />

      <div className="referral-block__link-row">
        <span className="referral-block__link-text" title={referralLink}>
          {referralLink}
        </span>
        <button
          type="button"
          className={`referral-block__copy-btn${copied ? ' referral-block__copy-btn--copied' : ''}`}
          onClick={() => void handleCopy()}
          aria-label={copied ? t('referralCopied') : t('referralCopyBtn')}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? t('referralCopied') : t('referralCopyBtn')}</span>
        </button>
      </div>

      <p className="referral-block__hint">
        {t('referralBonusHint', { bonus: String(REFERRAL_BONUS) })}
      </p>
    </div>
  );
}

function FriendsIcon() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
