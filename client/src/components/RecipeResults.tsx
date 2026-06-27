import type { RecipeItem } from '@/types/recipe.types';
import '@/styles/RecipeResults.css';

interface RecipeResultsProps {
  ingredients: string[];
  recipes: RecipeItem[];
}

export function RecipeResults({ ingredients, recipes }: RecipeResultsProps) {
  return (
    <section className="recipe-results">
      <div className="recipe-results__section">
        <h2 className="recipe-results__heading">Знайдені інгредієнти</h2>
        <ul className="recipe-results__ingredients">
          {ingredients.map((ingredient) => (
            <li key={ingredient} className="recipe-results__ingredient">
              {ingredient}
            </li>
          ))}
        </ul>
      </div>

      <div className="recipe-results__section">
        <h2 className="recipe-results__heading">
          Рецепти ({recipes.length})
        </h2>

        <ul className="recipe-results__list">
          {recipes.map((recipe) => (
            <li key={recipe.title} className="recipe-results__card">
              <h3 className="recipe-results__title">{recipe.title}</h3>
              <p className="recipe-results__description">{recipe.description}</p>

              <div className="recipe-results__nutrition">
                <span className="recipe-results__nutrition-item">
                  {recipe.nutrition.calories} ккал
                </span>
                <span className="recipe-results__nutrition-item">
                  Б: {recipe.nutrition.protein} г
                </span>
                <span className="recipe-results__nutrition-item">
                  Ж: {recipe.nutrition.fat} г
                </span>
                <span className="recipe-results__nutrition-item">
                  В: {recipe.nutrition.carbs} г
                </span>
              </div>

              <ol className="recipe-results__steps">
                {recipe.steps.map((step, index) => (
                  <li key={`${recipe.title}-step-${index}`} className="recipe-results__step">
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
