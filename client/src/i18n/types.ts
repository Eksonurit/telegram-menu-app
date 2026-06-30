/** Підтримувані мови */
export type Locale = 'en' | 'uk' | 'es' | 'ru';

/**
 * Повний словник перекладів для одної мови.
 * Рядки з плейсхолдерами {key} інтерполюються утилітою interpolate().
 */
export interface Translation {
  // --- Шапка ---
  appTitle: string;
  appSubtitle: string;

  // --- Стани завантаження ---
  initializing: string;
  noTelegramWarning: string;
  analyzing: string;
  /** Показується під час перекладу вже отриманих рецептів на нову мову */
  translating: string;
  /** Показується під час генерації рецептів з текстового списку */
  generating: string;

  // --- Редактор інгредієнтів ---
  /** Placeholder поля введення нового інгредієнта */
  addIngredientPlaceholder: string;
  /** Кнопка підтвердження списку та перегенерації рецептів */
  confirmIngredientsBtn: string;
  /** Кнопка входу в режим редагування інгредієнтів */
  editIngredientsBtn: string;

  // --- Привітання ---
  /** Плейсхолдер: {name} */
  greeting: string;

  // --- Компонент PhotoUpload ---
  pickPhotosBtn: string;
  /** Плейсхолдер: {max} */
  photoHint: string;
  submitBtn: string;
  /** Плейсхолдер: {n} */
  photoAlt: string;
  /** Плейсхолдер: {n} */
  removePhotoLabel: string;

  // --- Помилки валідації та сервісу ---
  /** Плейсхолдер: {max} */
  errorTooManyPhotos: string;
  errorInvalidFormat: string;
  errorNoPhotos: string;
  errorNoInitData: string;
  errorAnalysisFailed: string;

  // --- Результати рецептів (список карток) ---
  ingredientsHeading: string;
  /** Плейсхолдер: {count} */
  recipesHeading: string;
  /** Компактний формат для чіпа на картці. Плейсхолдер: {value} */
  caloriesLabel: string;
  /** Компактний формат для чіпа на картці. Плейсхолдер: {value} */
  proteinLabel: string;
  /** Компактний формат для чіпа на картці. Плейсхолдер: {value} */
  fatLabel: string;
  /** Компактний формат для чіпа на картці. Плейсхолдер: {value} */
  carbsLabel: string;
  /** Підказка "натисніть для перегляду" на картці рецепта */
  tapForRecipe: string;

  // --- Детальний екран рецепта (bottom sheet) ---
  cookingTimeLabel: string;
  recipeIngredients: string;
  recipeSteps: string;
  /** Повна назва нутрієнту — для 2×2 сітки макросів */
  nutritionCalories: string;
  nutritionProtein: string;
  nutritionFat: string;
  nutritionCarbs: string;
  /** Одиниця для калорій: "ккал" / "kcal" */
  nutritionUnitKcal: string;
  /** Одиниця для макросів: "г" / "g" */
  nutritionUnitG: string;
  /** Підпис під сіткою: "на 1 порцію" / "per serving" */
  nutritionPerServing: string;
  closeBtn: string;

  // --- Freemium / Paywall ---
  /** Плейсхолдери: {remaining}, {total} */
  attemptsLeft: string;
  /** Текст коли ліміт вичерпано (0 спроб) */
  noAttemptsLeft: string;
  /** Заголовок popup-у paywall */
  paywallTitle: string;
  /** Основний текст paywall. Плейсхолдер: {total} */
  paywallBody: string;
  /** Кнопка "Апгрейд до Premium" */
  paywallUpgradeBtn: string;
  /** Кнопка закриття paywall */
  paywallCloseBtn: string;
  /** Основна CTA-кнопка підбору рецептів */
  generateRecipesBtn: string;
  /** Повідомлення у зоні завантаження коли денний ліміт вичерпано */
  uploadBlockedTitle: string;
  uploadBlockedBody: string;

  // --- Дії ---
  resetBtn: string;

  // --- Екран вибору мови ---
  langSelectTitle: string;
  langSelectSubtitle: string;

  // --- Перемикач мови ---
  switchLanguage: string;
}
