import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  fetchUserStatus,
  openPaywall,
  resetAnalysis,
  translateRecipes,
} from '@/app/slices/recipeSlice';
import { LanguageSelect } from '@/components/LanguageSelect';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LoadingProgress } from '@/components/LoadingProgress';
import { PaywallModal } from '@/components/PaywallModal';
import { PhotoUpload } from '@/components/PhotoUpload';
import { RecipeResults } from '@/components/RecipeResults';
import { useI18n } from '@/i18n/I18nContext';
import type { Locale, Translation } from '@/i18n/types';
import '@/styles/App.css';

/**
 * Ключі помилок, що генеруються локально (на клієнті).
 * Такі рядки треба перекладати через t(); помилки від сервера відображаємо as-is.
 */
const LOCAL_ERROR_KEYS = new Set<keyof Translation>([
  'errorNoInitData',
  'errorAnalysisFailed',
  'errorNoPhotos',
  'errorTooManyPhotos',
  'errorInvalidFormat',
]);

export function App() {
  const dispatch = useAppDispatch();
  const { t, locale, localeConfirmed } = useI18n();
  const { isReady, user } = useAppSelector((state) => state.app);
  const { status, ingredients, recipes, error, remaining, total, isPremium } = useAppSelector(
    (state) => state.recipe,
  );

  /**
   * Перевірка лімітів при першому відкритті Mini App.
   * Якщо ліміт вичерпано і немає преміуму — paywall відкриється автоматично.
   * Запускаємо тільки коли Telegram ініціалізація готова і користувач відомий
   * (без initData запит все одно отримає 401 і тихо ігнорується).
   */
  useEffect(() => {
    if (isReady && user) {
      void dispatch(fetchUserStatus());
    }
  }, [isReady, user, dispatch]);

  /**
   * Автоматичний переклад при зміні мови.
   * Запускаємо тільки якщо є рецепти (status === 'success').
   */
  const prevLocaleRef = useRef<Locale>(locale);
  const stateRef = useRef({ status, ingredients, recipes, remaining, total });
  stateRef.current = { status, ingredients, recipes, remaining, total };

  useEffect(() => {
    if (prevLocaleRef.current === locale) return;
    prevLocaleRef.current = locale;

    const { status: s, ingredients: ing, recipes: rec, remaining: rem, total: tot } = stateRef.current;

    if (s === 'success' && rec.length > 0) {
      void dispatch(
        translateRecipes({
          data: { ingredients: ing, recipes: rec, rateLimit: { remaining: rem ?? tot, total: tot } },
          locale,
        }),
      );
    }
  }, [locale, dispatch]);

  if (!localeConfirmed) {
    return <LanguageSelect />;
  }

  const isAnalyzing   = status === 'analyzing';
  const isTranslating = status === 'translating';
  const isGenerating  = status === 'generating';
  const showResults   = status === 'success' || status === 'detected';

  /** Чи вичерпано денний ліміт (преміум ніколи не вичерпується) */
  const isLimitExhausted = !isPremium && remaining !== null && remaining <= 0;

  const displayError = error
    ? LOCAL_ERROR_KEYS.has(error as keyof Translation)
      ? t(error as keyof Translation)
      : error
    : null;

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <div className="app__header-text">
            <h1 className="app__title">{t('appTitle')}</h1>
            <p className="app__subtitle">{t('appSubtitle')}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="app__main">
        {isReady && user && (
          <p className="app__greeting">{t('greeting', { name: user.firstName })}</p>
        )}

        {!isReady && (
          <div className="app__status">{t('initializing')}</div>
        )}

        {/* ── Екран завантаження фото (idle / error) ── */}
        {isReady && !showResults && !isTranslating && !isGenerating && !isAnalyzing && (
          <>
            {!user && (
              <div className="app__status app__status--warning">
                {t('noTelegramWarning')}
              </div>
            )}

            {/* Якщо ліміт вичерпано — заблокована зона завантаження */}
            {isLimitExhausted ? (
              <UploadBlockedCard
                title={t('uploadBlockedTitle')}
                body={t('uploadBlockedBody')}
                upgradeLabel={t('paywallUpgradeBtn')}
                onUpgrade={() => dispatch(openPaywall())}
              />
            ) : (
              <PhotoUpload disabled={!isReady} />
            )}

            {displayError && (
              <div className="app__status app__status--error" role="alert">
                {displayError}
              </div>
            )}
          </>
        )}

        {/* ── Лоадер розпізнавання інгредієнтів ── */}
        {isAnalyzing && <LoadingProgress phase="analyzing" />}

        {/* ── Лоадер перекладу ── */}
        {isTranslating && <LoadingProgress phase="translating" />}

        {/* ── Лоадер генерації рецептів ── */}
        {isGenerating && <LoadingProgress phase="generating" />}

        {/* ── Результати (detected = інгредієнти без рецептів, success = все) ── */}
        {showResults && (
          <>
            {displayError && (
              <div className="app__status app__status--error" role="alert">
                {displayError}
              </div>
            )}

            <RecipeResults ingredients={ingredients} recipes={recipes} />

            <button
              type="button"
              className="app__reset-btn"
              onClick={() => dispatch(resetAnalysis())}
            >
              {t('resetBtn')}
            </button>
          </>
        )}
      </main>
      {/* PaywallModal рендериться на рівні App — доступний з будь-якого екрану */}
      <PaywallModal />
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface UploadBlockedCardProps {
  title: string;
  body: string;
  upgradeLabel: string;
  onUpgrade: () => void;
}

/** Картка, що відображається замість зони завантаження при вичерпаному ліміті */
function UploadBlockedCard({ title, body, upgradeLabel, onUpgrade }: UploadBlockedCardProps) {
  return (
    <div className="app__upload-blocked">
      <div className="app__upload-blocked-icon" aria-hidden="true">
        <LockIcon />
      </div>

      <h2 className="app__upload-blocked-title">{title}</h2>
      <p className="app__upload-blocked-body">{body}</p>

      <button type="button" className="app__upload-blocked-btn" onClick={onUpgrade}>
        <StarIcon />
        <span>{upgradeLabel}</span>
      </button>
    </div>
  );
}

function LockIcon({ small = false }: { small?: boolean }) {
  const size = small ? 16 : 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"
      aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
