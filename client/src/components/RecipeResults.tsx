import { useI18n } from '@/i18n/I18nContext';
import type { RecipeItem } from '@/types/recipe.types';
import '@/styles/RecipeResults.css';

interface RecipeResultsProps {
  ingredients: string[];
  recipes: RecipeItem[];
}

export function RecipeResults({ ingredients, recipes }: RecipeResultsProps) {
  const { t } = useI18n();

  return (
    <section className="recipe-results">
      {/* ── Знайдені інгредієнти ── */}
      <div className="recipe-results__section">
        <h2 className="recipe-results__heading">{t('ingredientsHeading')}</h2>
        <ul className="recipe-results__ingredients">
          {ingredients.map((ingredient) => (
            <li key={ingredient} className="recipe-results__ingredient">
              {ingredient}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Список рецептів ── */}
      <div className="recipe-results__section">
        <h2 className="recipe-results__heading">
          {t('recipesHeading', { count: recipes.length })}
        </h2>

        <ul className="recipe-results__list">
          {recipes.map((recipe) => (
            <li key={recipe.title} className="recipe-results__card">
              <h3 className="recipe-results__title">{recipe.title}</h3>
              <p className="recipe-results__description">{recipe.description}</p>

              {/* КБЖВ — кожен нутрієнт має власний колір */}
              <div className="recipe-results__nutrition">
                <span className="recipe-results__nutrition-item recipe-results__nutrition-item--calories">
                  {t('caloriesLabel', { value: recipe.nutrition.calories })}
                </span>
                <span className="recipe-results__nutrition-item recipe-results__nutrition-item--protein">
                  {t('proteinLabel', { value: recipe.nutrition.protein })}
                </span>
                <span className="recipe-results__nutrition-item recipe-results__nutrition-item--fat">
                  {t('fatLabel', { value: recipe.nutrition.fat })}
                </span>
                <span className="recipe-results__nutrition-item recipe-results__nutrition-item--carbs">
                  {t('carbsLabel', { value: recipe.nutrition.carbs })}
                </span>
              </div>

              {/* Покрокові інструкції — нумерація через CSS counter */}
              <ol className="recipe-results__steps">
                {recipe.steps.map((step, index) => (
                  <li
                    key={`${recipe.title}-step-${index}`}
                    className="recipe-results__step"
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
