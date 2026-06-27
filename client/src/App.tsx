import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { resetAnalysis } from '@/app/slices/recipeSlice';
import { PhotoUpload } from '@/components/PhotoUpload';
import { RecipeResults } from '@/components/RecipeResults';
import '@/styles/App.css';

export function App() {
  const dispatch = useAppDispatch();
  const { isReady, user } = useAppSelector((state) => state.app);
  const { status, ingredients, recipes, error } = useAppSelector(
    (state) => state.recipe,
  );

  const isAnalyzing = status === 'analyzing';
  const showResults = status === 'success';

  const handleReset = () => {
    dispatch(resetAnalysis());
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Рецепти з фото</h1>
        <p className="app__subtitle">
          Завантажте фото продуктів — ми підберемо страви та рецепти
        </p>
      </header>

      <main className="app__main">
        {isReady && user && (
          <p className="app__greeting">Вітаємо, {user.firstName}!</p>
        )}

        {!isReady && (
          <div className="app__status">Ініціалізація Telegram Mini App...</div>
        )}

        {isReady && !showResults && (
          <>
            {!user && (
              <div className="app__status app__status--warning">
                Ви поза Telegram — для аналізу фото потрібно відкрити додаток
                через бота.
              </div>
            )}

            <PhotoUpload disabled={!isReady || isAnalyzing} />

            {isAnalyzing && (
              <div className="app__status app__status--loading">
                Аналізуємо фото та підбираємо рецепти...
              </div>
            )}

            {error && (
              <div className="app__status app__status--error" role="alert">
                {error}
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
              onClick={handleReset}
            >
              Завантажити нові фото
            </button>
          </>
        )}
      </main>
    </div>
  );
}
