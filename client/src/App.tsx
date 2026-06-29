import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { resetAnalysis } from '@/app/slices/recipeSlice';
import { LanguageSelect } from '@/components/LanguageSelect';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { PhotoUpload } from '@/components/PhotoUpload';
import { RecipeResults } from '@/components/RecipeResults';
import { useI18n } from '@/i18n/I18nContext';
import type { Translation } from '@/i18n/types';
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
  const { t, localeConfirmed } = useI18n();
  const { isReady, user } = useAppSelector((state) => state.app);
  const { status, ingredients, recipes, error } = useAppSelector(
    (state) => state.recipe,
  );

  // Показуємо екран вибору мови, якщо мова ще не обрана
  if (!localeConfirmed) {
    return <LanguageSelect />;
  }

  const isAnalyzing = status === 'analyzing';
  const showResults = status === 'success';

  // Якщо помилка є локальним i18n-ключем — перекладаємо; інакше показуємо текст від сервера
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

        {isReady && !showResults && (
          <>
            {!user && (
              <div className="app__status app__status--warning">
                {t('noTelegramWarning')}
              </div>
            )}

            <PhotoUpload disabled={!isReady || isAnalyzing} />

            {isAnalyzing && (
              <div className="app__status app__status--loading">
                {t('analyzing')}
              </div>
            )}

            {displayError && (
              <div className="app__status app__status--error" role="alert">
                {displayError}
              </div>
            )}
          </>
        )}

        {showResults && (
          <>
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
    </div>
  );
}
