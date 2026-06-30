/**
 * PaywallModal.tsx
 *
 * Красивий bottom-sheet модал для показу при вичерпаному ліміті генерацій.
 * Запрошує користувача оновити до Преміум за 50 Telegram Stars.
 *
 * Платіжний флоу (Telegram Stars):
 *  1. Натискання «Оновити» → бекенд створює інвойс (createPremiumInvoice).
 *  2. Telegram.WebApp.openInvoice() відкриває нативне вікно оплати.
 *  3. callback зі статусом 'paid' → миттєво активуємо преміум у Redux
 *     і показуємо екран успіху БЕЗ перезавантаження сторінки.
 *
 * Відображається через Portal безпосередньо в <body>,
 * тому не залежить від z-index батьківського контейнера.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { activatePremium, dismissLimitReached } from '@/app/slices/recipeSlice';
import { ApiError } from '@/services/api.service';
import { createPremiumInvoice, openInvoice } from '@/services/payment.service';
import { useI18n } from '@/i18n/I18nContext';
import type { Translation } from '@/i18n/types';
import '@/styles/PaywallModal.css';

/** Фази внутрішнього стану модалу */
type PaywallPhase = 'idle' | 'processing' | 'success';

/**
 * Ключі помилок оплати, які треба перекладати через t().
 * Решта (людино-читабельні повідомлення сервера) показуємо як generic-помилку.
 */
const PAYMENT_ERROR_KEYS = new Set<keyof Translation>([
  'errorPaymentFailed',
  'errorPaymentUnavailable',
  'errorNoInitData',
]);

export function PaywallModal() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { limitReached, total } = useAppSelector((state) => state.recipe);

  const [phase, setPhase] = useState<PaywallPhase>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);

  // Модал видимий, поки вичерпано ліміт АБО показуємо екран успіху
  const isOpen = limitReached || phase === 'success';
  const isProcessing = phase === 'processing';

  // Свіжий стан при кожному відкритті paywall (limitReached → true)
  useEffect(() => {
    if (limitReached) {
      setPhase('idle');
      setErrorText(null);
    }
  }, [limitReached]);

  const handleClose = useCallback(() => {
    // Під час відкритого вікна оплати закривати модал не можна
    if (isProcessing) return;
    setPhase('idle');
    setErrorText(null);
    dispatch(dismissLimitReached());
  }, [dispatch, isProcessing]);

  // Закриття по Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  // Блокуємо скрол фону коли модал відкрито
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /**
   * Запускає платіжний флоу: створює інвойс і відкриває вікно оплати Telegram.
   */
  const handleUpgrade = useCallback(async () => {
    if (isProcessing) return;

    setErrorText(null);
    setPhase('processing');

    try {
      const invoiceLink = await createPremiumInvoice();
      const status = await openInvoice(invoiceLink);

      if (status === 'paid') {
        // Успіх: активуємо преміум одразу, без перезавантаження
        dispatch(activatePremium());
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        setPhase('success');
        return;
      }

      // 'cancelled' | 'pending' — мовчки повертаємось до вибору
      if (status === 'failed') {
        setErrorText(t('errorPaymentFailed'));
      }
      setPhase('idle');
    } catch (error) {
      const key = error instanceof ApiError ? error.message : '';
      const message = PAYMENT_ERROR_KEYS.has(key as keyof Translation)
        ? t(key as keyof Translation)
        : t('errorPaymentFailed');
      setErrorText(message);
      setPhase('idle');
    }
  }, [dispatch, isProcessing, t]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="paywall-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="paywall-sheet">
        {/* Drag handle */}
        <div className="paywall-sheet__handle" aria-hidden="true" />

        {phase === 'success' ? (
          /* ── Екран успішної оплати ── */
          <>
            <div className="paywall-sheet__icon paywall-sheet__icon--success" aria-hidden="true">
              <CheckBurst />
            </div>

            <h2 id="paywall-title" className="paywall-sheet__title">
              {t('premiumSuccessTitle')}
            </h2>

            <p className="paywall-sheet__body">{t('premiumSuccessBody')}</p>

            <button
              type="button"
              className="paywall-sheet__upgrade-btn"
              onClick={handleClose}
            >
              <span className="paywall-sheet__upgrade-btn-text">
                {t('premiumSuccessBtn')}
              </span>
            </button>
          </>
        ) : (
          /* ── Екран пропозиції преміуму ── */
          <>
            <div className="paywall-sheet__icon" aria-hidden="true">
              <StarsBurst />
            </div>

            <h2 id="paywall-title" className="paywall-sheet__title">
              {t('paywallTitle')}
            </h2>

            <p className="paywall-sheet__body">
              {t('paywallBody', { total: String(total) })}
            </p>

            {/* Лічильник — наочно показуємо ліміт */}
            <div className="paywall-sheet__dots" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className="paywall-sheet__dot paywall-sheet__dot--used" />
              ))}
            </div>

            {/* Повідомлення про помилку оплати */}
            {errorText && (
              <p className="paywall-sheet__error" role="alert">
                {errorText}
              </p>
            )}

            {/* CTA — Upgrade */}
            <button
              type="button"
              className="paywall-sheet__upgrade-btn"
              onClick={() => void handleUpgrade()}
              disabled={isProcessing}
              aria-busy={isProcessing}
            >
              {isProcessing ? (
                <span className="paywall-sheet__upgrade-btn-text">
                  <Spinner />
                  {t('paywallProcessing')}
                </span>
              ) : (
                <span className="paywall-sheet__upgrade-btn-text">
                  {t('paywallUpgradeBtn')}
                </span>
              )}
            </button>

            {/* Закрити */}
            <button
              type="button"
              className="paywall-sheet__close-btn"
              onClick={handleClose}
              disabled={isProcessing}
              aria-label={t('paywallCloseBtn')}
            >
              {t('paywallCloseBtn')}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── SVG іконки ──────────────────────────────────────────────────────────────

function StarsBurst() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Центральна зірка */}
      <path
        d="M32 8l4.5 13.5H50l-11 8 4.5 13.5L32 35l-11.5 8 4.5-13.5-11-8h13.5L32 8z"
        fill="url(#starGold)"
      />
      {/* Маленькі акценти */}
      <circle cx="12" cy="16" r="3" fill="#FFD700" opacity="0.7" />
      <circle cx="52" cy="16" r="2" fill="#FFD700" opacity="0.5" />
      <circle cx="10" cy="46" r="2" fill="#FFA500" opacity="0.6" />
      <circle cx="54" cy="44" r="3" fill="#FFD700" opacity="0.7" />
      <defs>
        <linearGradient id="starGold" x1="32" y1="8" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE55C" />
          <stop offset="1" stopColor="#FF9500" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* Галочка успіху для екрана після оплати */
function CheckBurst() {
  return (
    <svg
      width="64" height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* Інлайн-спінер для стану "processing" */
function Spinner() {
  return (
    <svg
      className="paywall-sheet__spinner"
      width="18" height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
