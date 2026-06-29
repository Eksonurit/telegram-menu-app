import type { Translation } from '../types';

export const uk: Translation = {
  appTitle: 'Рецепти з фото',
  appSubtitle: 'Завантажте фото продуктів — ми підберемо страви та рецепти',

  initializing: 'Ініціалізація Telegram Mini App…',
  noTelegramWarning:
    'Ви поза Telegram — для аналізу фото відкрийте додаток через бота.',
  analyzing: 'Аналізуємо фото та підбираємо рецепти…',

  greeting: 'Вітаємо, {name}!',

  pickPhotosBtn: 'Обрати фото продуктів',
  photoHint: 'До {max} фото у форматах JPEG, PNG або WebP',
  submitBtn: 'Підібрати рецепти',
  photoAlt: 'Обране фото {n}',
  removePhotoLabel: 'Видалити фото {n}',

  errorTooManyPhotos: 'Можна обрати не більше {max} фото',
  errorInvalidFormat: 'Дозволені лише зображення JPEG, PNG або WebP',
  errorNoPhotos: 'Оберіть щонайменше одне фото продуктів',
  errorNoInitData:
    'Дані авторизації Telegram недоступні. Відкрийте додаток через бота.',
  errorAnalysisFailed: 'Не вдалося проаналізувати фото. Спробуйте ще раз.',

  ingredientsHeading: 'Знайдені інгредієнти',
  recipesHeading: 'Рецепти ({count})',
  caloriesLabel: '{value} ккал',
  proteinLabel: 'Б: {value} г',
  fatLabel: 'Ж: {value} г',
  carbsLabel: 'В: {value} г',

  resetBtn: 'Завантажити нові фото',

  langSelectTitle: 'Оберіть мову',
  langSelectSubtitle: 'Ви зможете змінити це будь-коли',

  switchLanguage: 'Мова',
};
