/**
 * RecipeCard.tsx
 *
 * Картка рецепта з фотографією, чіпами КБЖВ та часом приготування.
 * При натисканні відкриває повний детальний екран (RecipeDetailSheet).
 *
 * Особливості:
 *  - Shimmer skeleton поки фото завантажується
 *  - Graceful fallback якщо imageUrl відсутній (emoji-заглушка)
 *  - Staggered анімація через CSS custom property --card-delay
 *  - Accessible: role="button" + onKeyDown для Enter
 */

import { useState, type CSSProperties } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import type { RecipeItem } from '@/types/recipe.types';
import '@/styles/RecipeCard.css';

interface RecipeCardProps {
  recipe: RecipeItem;
  /** Індекс для staggered анімації */
  index: number;
  /** Callback при натисканні — відкрити детальний екран */
  onOpen: () => void;
}

/** Стан завантаження фотографії */
type ImageState = 'loading' | 'loaded' | 'error';

export function RecipeCard({ recipe, index, onOpen }: RecipeCardProps) {
  const { t } = useI18n();
  const [imageState, setImageState] = useState<ImageState>('loading');

  const cardStyle = {
    '--card-delay': `${index * 0.07}s`,
  } as CSSProperties;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <li
      className="recipe-card"
      style={cardStyle}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={recipe.title}
    >
      {/* ── Блок зображення ── */}
      <div className="recipe-card__image-wrap">

        {/* Shimmer skeleton — видимий доки фото не завантажилось */}
        {imageState === 'loading' && (
          <div className="recipe-card__skeleton" aria-hidden="true" />
        )}

        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className={`recipe-card__img${imageState === 'loaded' ? ' recipe-card__img--visible' : ''}`}
            onLoad={() => setImageState('loaded')}
            onError={() => setImageState('error')}
            loading="lazy"
          />
        ) : (
          /* Заглушка коли imageUrl не надано */
          <div className="recipe-card__no-image" aria-hidden="true">🍽️</div>
        )}

        {/* Бейдж часу приготування поверх зображення */}
        <div className="recipe-card__time-badge">
          <ClockIcon />
          <span>{recipe.cookingTime}</span>
        </div>
      </div>

      {/* ── Тіло картки ── */}
      <div className="recipe-card__body">
        <h3 className="recipe-card__title">{recipe.title}</h3>
        <p className="recipe-card__desc">{recipe.description}</p>

        {/* КБЖВ — компактні кольорові чіпи */}
        <div className="recipe-card__nutrition" aria-label="Нутрієнти">
          <span className="recipe-card__nut recipe-card__nut--cal">
            {t('caloriesLabel', { value: recipe.nutrition.calories })}
          </span>
          <span className="recipe-card__nut recipe-card__nut--pro">
            {t('proteinLabel', { value: recipe.nutrition.protein })}
          </span>
          <span className="recipe-card__nut recipe-card__nut--fat">
            {t('fatLabel', { value: recipe.nutrition.fat })}
          </span>
          <span className="recipe-card__nut recipe-card__nut--carb">
            {t('carbsLabel', { value: recipe.nutrition.carbs })}
          </span>
        </div>

        {/* Підказка — заклик до дії */}
        <p className="recipe-card__tap-hint">{t('tapForRecipe')}</p>
      </div>
    </li>
  );
}

function ClockIcon() {
  return (
    <svg
      width="12" height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
