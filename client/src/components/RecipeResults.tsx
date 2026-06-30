/**
 * RecipeResults.tsx
 *
 * Контейнер результатів аналізу.
 * Містить:
 *  1. Список знайдених інгредієнтів (read-only або редаговані)
 *  2. Кнопку генерації рецептів з лічильником залишку спроб
 *  3. Картки рецептів (RecipeCard) з підтримкою деталей (RecipeDetailSheet)
 *  4. Paywall модал при вичерпаному ліміті
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { generateFromIngredients } from '@/app/slices/recipeSlice';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeDetailSheet } from '@/components/RecipeDetailSheet';
import { useI18n } from '@/i18n/I18nContext';
import type { RecipeItem } from '@/types/recipe.types';
import '@/styles/RecipeResults.css';

interface RecipeResultsProps {
  ingredients: string[];
  recipes: RecipeItem[];
}

export function RecipeResults({ ingredients, recipes }: RecipeResultsProps) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { status, remaining, total, isPremium } = useAppSelector((state) => state.recipe);

  /** Рецепт у деталях (null = sheet закрито) */
  const [openedRecipe, setOpenedRecipe] = useState<RecipeItem | null>(null);

  /**
   * Режим редагування інгредієнтів.
   * false — read-only теги + кнопка «Змінити інгредієнти»
   * true  — редаговані теги з ×, поле вводу, кнопка «Підтвердити»
   */
  const [isEditing, setIsEditing] = useState(false);

  /**
   * Редагований список інгредієнтів — локальний стан.
   * Ініціалізується з пропсів; синхронізується useEffect коли приходять нові ingredients.
   */
  const [editableIngredients, setEditableIngredients] = useState<string[]>(() => [...ingredients]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Коли ingredients оновлюються з Redux — виходимо з режиму редагування
  useEffect(() => {
    setEditableIngredients([...ingredients]);
    setIsEditing(false);
    setInputValue('');
  }, [ingredients]);

  const isGenerating = status === 'generating';
  const hasRecipes   = recipes.length > 0;

  // ── Стан ліміту ──────────────────────────────────────────────────────────────

  /** Ліміт вичерпано (remaining === 0). Преміум ніколи не вичерпується. */
  const isLimitReached = !isPremium && remaining !== null && remaining <= 0;

  /** Текстова підказка під кнопкою генерації */
  const attemptsHint = isPremium
    ? t('premiumUnlimited')
    : remaining === null
      ? null
      : remaining <= 0
        ? t('noAttemptsLeft')
        : t('attemptsLeft', { remaining: String(remaining), total: String(total) });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRemove = (index: number) => {
    setEditableIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const isDuplicate = editableIngredients.some(
      (i) => i.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setInputValue('');
      return;
    }
    setEditableIngredients((prev) => [...prev, trimmed]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  /**
   * Миттєвий ref-захист від подвійного кліку.
   * Доповнює перевірку isGenerating: ref оновлюється синхронно і блокує
   * повторний виклик ще до того, як Redux встигне переключити статус.
   */
  const isGeneratingRef = useRef(false);

  // Синхронізуємо ref зі станом Redux: коли генерація завершилась (успіх/помилка) —
  // знімаємо блокування, щоб дозволити наступну генерацію.
  useEffect(() => {
    if (!isGenerating) {
      isGeneratingRef.current = false;
    }
  }, [isGenerating]);

  /**
   * Запускає генерацію рецептів.
   * Якщо ліміт вичерпано — Redux автоматично встановить limitReached=true,
   * і PaywallModal відкриється. Тут додаткових дій не потрібно.
   */
  const handleGenerate = (ingredientList: string[]) => {
    // Подвійний бар'єр: ref (миттєвий) + isGenerating (стан Redux)
    if (ingredientList.length === 0 || isGenerating || isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    void dispatch(generateFromIngredients(ingredientList));
  };

  return (
    <>
      <section className="recipe-results">

        {/* ── Знайдені інгредієнти ── */}
        <div className="recipe-results__section">
          <h2 className="recipe-results__heading">{t('ingredientsHeading')}</h2>

          {isEditing ? (
            /* ── Режим редагування: теги з × + поле вводу ── */
            <>
              <ul className="recipe-results__ingredients">
                {editableIngredients.map((ingredient, index) => (
                  <li key={`${ingredient}-${index}`} className="recipe-results__ingredient">
                    <span className="recipe-results__ingredient-text">{ingredient}</span>
                    <button
                      type="button"
                      className="recipe-results__ingredient-remove"
                      onClick={() => handleRemove(index)}
                      aria-label={`Видалити ${ingredient}`}
                      disabled={isGenerating}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <div className="recipe-results__add-row">
                <input
                  ref={inputRef}
                  type="text"
                  className="recipe-results__add-input"
                  placeholder={t('addIngredientPlaceholder')}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  disabled={isGenerating}
                  maxLength={60}
                />
                <button
                  type="button"
                  className="recipe-results__add-btn"
                  onClick={handleAdd}
                  disabled={isGenerating || !inputValue.trim()}
                  aria-label="Додати інгредієнт"
                >
                  +
                </button>
              </div>

              {/* В режимі редагування — кнопка «Знайти рецепти» */}
              <GenerateButton
                label={t('confirmIngredientsBtn')}
                hint={attemptsHint}
                disabled={isGenerating || editableIngredients.length === 0 || isLimitReached}
                isLimitReached={isLimitReached}
                isGenerating={isGenerating}
                onClick={() => handleGenerate(editableIngredients)}
              />
            </>
          ) : (
            /* ── Режим перегляду: read-only теги ── */
            <>
              <ul className="recipe-results__ingredients">
                {ingredients.map((ingredient, index) => (
                  <li
                    key={`${ingredient}-${index}`}
                    className="recipe-results__ingredient recipe-results__ingredient--readonly"
                  >
                    <span className="recipe-results__ingredient-text">{ingredient}</span>
                  </li>
                ))}
              </ul>

              {/* Якщо рецептів ще немає (status=detected) — показуємо PRIMARY кнопку генерації */}
              {!hasRecipes && (
                <GenerateButton
                  label={t('generateRecipesBtn')}
                  hint={attemptsHint}
                  disabled={isGenerating || ingredients.length === 0 || isLimitReached}
                  isLimitReached={isLimitReached}
                  isGenerating={isGenerating}
                  onClick={() => handleGenerate(ingredients)}
                />
              )}

              {/* Кнопка переходу в режим редагування */}
              <button
                type="button"
                className="recipe-results__edit-btn"
                onClick={() => setIsEditing(true)}
                disabled={isGenerating}
              >
                {t('editIngredientsBtn')}
              </button>
            </>
          )}
        </div>

        {/* ── Картки рецептів (лише коли є) ── */}
        {hasRecipes && (
          <div className="recipe-results__section">
            <h2 className="recipe-results__heading">
              {t('recipesHeading', { count: recipes.length })}
            </h2>

            <ul className="recipe-results__list">
              {recipes.map((recipe, index) => (
                <RecipeCard
                  key={recipe.title}
                  recipe={recipe}
                  index={index}
                  onOpen={() => setOpenedRecipe(recipe)}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Деталі рецепта ── */}
      <RecipeDetailSheet
        recipe={openedRecipe}
        isOpen={openedRecipe !== null}
        onClose={() => setOpenedRecipe(null)}
      />

    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface GenerateButtonProps {
  label: string;
  hint: string | null;
  disabled: boolean;
  isLimitReached: boolean;
  /** true = генерація триває → показуємо спінер і блокуємо кнопку */
  isGenerating: boolean;
  onClick: () => void;
}

/**
 * Кнопка генерації рецептів з лічильником залишку спроб.
 * При вичерпаному ліміті стає disabled і показує попередження.
 * Під час генерації показує спінер і блокується (захист від спаму запитами).
 */
function GenerateButton({ label, hint, disabled, isLimitReached, isGenerating, onClick }: GenerateButtonProps) {
  return (
    <div className="recipe-results__generate-wrap">
      <button
        type="button"
        className={[
          'recipe-results__confirm-btn',
          isLimitReached ? 'recipe-results__confirm-btn--limit' : '',
        ].filter(Boolean).join(' ')}
        onClick={onClick}
        disabled={disabled}
        aria-busy={isGenerating}
      >
        {isGenerating ? <Spinner /> : <SparkleIcon />}
        <span>{label}</span>
      </button>

      {hint && (
        <p
          className={[
            'recipe-results__attempts-hint',
            isLimitReached ? 'recipe-results__attempts-hint--exhausted' : '',
          ].filter(Boolean).join(' ')}
        >
          {isLimitReached && <WarningIcon />}
          {hint}
        </p>
      )}
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg
      width="16" height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
    </svg>
  );
}

/* ── Інлайн-спінер під час генерації ── */
function Spinner() {
  return (
    <svg
      className="recipe-results__spinner"
      width="16" height="16"
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

function WarningIcon() {
  return (
    <svg
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
