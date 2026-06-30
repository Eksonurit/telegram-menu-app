/**
 * PaywallModal.tsx
 *
 * Красивий bottom-sheet модал для показу при вичерпаному ліміті генерацій.
 * Запрошує користувача оновити до Преміум за 50 Telegram Stars.
 *
 * Відображається через Portal безпосередньо в <body>,
 * тому не залежить від z-index батьківського контейнера.
 */

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { dismissLimitReached } from '@/app/slices/recipeSlice';
import { useI18n } from '@/i18n/I18nContext';
import '@/styles/PaywallModal.css';

export function PaywallModal() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { limitReached, total } = useAppSelector((state) => state.recipe);

  const handleClose = useCallback(() => {
    dispatch(dismissLimitReached());
  }, [dispatch]);

  // Закриття по Escape
  useEffect(() => {
    if (!limitReached) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [limitReached, handleClose]);

  // Блокуємо скрол фону коли модал відкрито
  useEffect(() => {
    if (limitReached) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [limitReached]);

  if (!limitReached) return null;

  return createPortal(
    <div
      className="paywall-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onClick={(e) => {
        // Закриття при кліку на затемнений фон
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="paywall-sheet">
        {/* Drag handle */}
        <div className="paywall-sheet__handle" aria-hidden="true" />

        {/* Іконка зірки */}
        <div className="paywall-sheet__icon" aria-hidden="true">
          <StarsBurst />
        </div>

        {/* Заголовок */}
        <h2 id="paywall-title" className="paywall-sheet__title">
          {t('paywallTitle')}
        </h2>

        {/* Текст */}
        <p className="paywall-sheet__body">
          {t('paywallBody', { total: String(total) })}
        </p>

        {/* Лічильник — наочно показуємо ліміт */}
        <div className="paywall-sheet__dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className="paywall-sheet__dot paywall-sheet__dot--used" />
          ))}
        </div>

        {/* CTA — Upgrade */}
        <button
          type="button"
          className="paywall-sheet__upgrade-btn"
          onClick={() => {
            // TODO: інтегрувати Telegram Stars payment flow (invoice_link)
            handleClose();
          }}
        >
          <span className="paywall-sheet__upgrade-btn-text">
            {t('paywallUpgradeBtn')}
          </span>
        </button>

        {/* Закрити */}
        <button
          type="button"
          className="paywall-sheet__close-btn"
          onClick={handleClose}
          aria-label={t('paywallCloseBtn')}
        >
          {t('paywallCloseBtn')}
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ─── SVG іконка ──────────────────────────────────────────────────────────────

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
