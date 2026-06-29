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

  // --- Результати рецептів ---
  ingredientsHeading: string;
  /** Плейсхолдер: {count} */
  recipesHeading: string;
  /** Плейсхолдер: {value} */
  caloriesLabel: string;
  /** Плейсхолдер: {value} */
  proteinLabel: string;
  /** Плейсхолдер: {value} */
  fatLabel: string;
  /** Плейсхолдер: {value} */
  carbsLabel: string;

  // --- Дії ---
  resetBtn: string;

  // --- Екран вибору мови ---
  langSelectTitle: string;
  langSelectSubtitle: string;

  // --- Перемикач мови ---
  switchLanguage: string;
}
