/**
 * RecipeDetailSheet.tsx
 *
 * Bottom sheet з повним детальним переглядом рецепта.
 *
 * Структура:
 *  1. Backdrop (blur overlay) — натискання закриває
 *  2. Sheet (slide-up панель) — contains:
 *     - Drag handle
 *     - Hero зображення
 *     - Заголовок + опис
 *     - Час приготування (badge)
 *     - КБЖВ — сітка 2×2 з повними назвами
 *     - Інгредієнти (список з крапками)
 *     - Кроки приготування (нумеровані кружки)
 *     - Кнопка «Закрити»
 */

import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import type { RecipeItem } from '@/types/recipe.types';
import '@/styles/RecipeDetailSheet.css';

interface RecipeDetailSheetProps {
  recipe: RecipeItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RecipeDetailSheet({ recipe, isOpen, onClose }: RecipeDetailSheetProps) {
  const { t } = useI18n();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Блокуємо прокрутку body поки sheet відкрито
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Скидаємо прокрутку sheet до верху при відкритті нового рецепта
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.scrollTop = 0;
    }
  }, [isOpen, recipe?.title]);

  // Закриття на Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !recipe) return null;

  return (
    <>
      {/* Backdrop — клік закриває sheet */}
      <div
        className="recipe-sheet__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="recipe-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={recipe.title}
      >
        {/* Drag handle (декоративний) */}
        <div className="recipe-sheet__handle" aria-hidden="true" />

        {/* Hero зображення */}
        {recipe.imageUrl && (
          <div className="recipe-sheet__hero">
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="recipe-sheet__hero-img"
            />
          </div>
        )}

        {/* Основний контент */}
        <div className="recipe-sheet__content">

          {/* Заголовок + опис */}
          <header className="recipe-sheet__header">
            <h2 className="recipe-sheet__title">{recipe.title}</h2>
            <p className="recipe-sheet__desc">{recipe.description}</p>
          </header>

          {/* Час приготування */}
          <div className="recipe-sheet__time">
            <ClockIcon />
            <span className="recipe-sheet__time-label">{t('cookingTimeLabel')}:</span>
            <strong className="recipe-sheet__time-value">{recipe.cookingTime}</strong>
          </div>

          {/* КБЖВ — сітка 2×2 з повними підписами */}
          <div className="recipe-sheet__macros" role="list" aria-label="Макронутрієнти">
            <MacroCell
              value={recipe.nutrition.calories}
              unit={t('nutritionUnitKcal')}
              label={t('nutritionCalories')}
              variant="cal"
            />
            <MacroCell
              value={recipe.nutrition.protein}
              unit={t('nutritionUnitG')}
              label={t('nutritionProtein')}
              variant="pro"
            />
            <MacroCell
              value={recipe.nutrition.fat}
              unit={t('nutritionUnitG')}
              label={t('nutritionFat')}
              variant="fat"
            />
            <MacroCell
              value={recipe.nutrition.carbs}
              unit={t('nutritionUnitG')}
              label={t('nutritionCarbs')}
              variant="carb"
            />
          </div>
          <p className="recipe-sheet__per-serving">{t('nutritionPerServing')}</p>

          {/* Інгредієнти */}
          <section className="recipe-sheet__section" aria-labelledby="sheet-ingredients-heading">
            <h3 id="sheet-ingredients-heading" className="recipe-sheet__section-title">
              {t('recipeIngredients')}
            </h3>
            <ul className="recipe-sheet__ingredients">
              {recipe.ingredients.map((ingredient, i) => (
                <li key={`ingredient-${i}`} className="recipe-sheet__ingredient">
                  <span className="recipe-sheet__ingredient-dot" aria-hidden="true" />
                  {ingredient}
                </li>
              ))}
            </ul>
          </section>

          {/* Покрокові інструкції */}
          <section className="recipe-sheet__section" aria-labelledby="sheet-steps-heading">
            <h3 id="sheet-steps-heading" className="recipe-sheet__section-title">
              {t('recipeSteps')}
            </h3>
            <ol className="recipe-sheet__steps">
              {recipe.steps.map((step, i) => (
                <li key={`step-${i}`} className="recipe-sheet__step">
                  <span className="recipe-sheet__step-num" aria-hidden="true">{i + 1}</span>
                  <span className="recipe-sheet__step-text">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Кнопка закрити */}
          <button
            type="button"
            className="recipe-sheet__close-btn"
            onClick={onClose}
          >
            {t('closeBtn')}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Допоміжні компоненти ─────────────────────────────────────────────────────

interface MacroCellProps {
  value: number;
  unit: string;
  label: string;
  variant: 'cal' | 'pro' | 'fat' | 'carb';
}

/** Одна клітинка 2×2 сітки макросів */
function MacroCell({ value, unit, label, variant }: MacroCellProps) {
  return (
    <div
      className={`recipe-sheet__macro-cell recipe-sheet__macro-cell--${variant}`}
      role="listitem"
    >
      <span className="recipe-sheet__macro-value">{value}</span>
      <span className="recipe-sheet__macro-unit">{unit}</span>
      <span className="recipe-sheet__macro-label">{label}</span>
    </div>
  );
}

function ClockIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
