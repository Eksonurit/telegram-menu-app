import type { Translation } from '../types';

export const ru: Translation = {
  appTitle: 'Рецепты из фото',
  appSubtitle: 'Загрузите фото продуктов — мы подберём блюда и рецепты',

  initializing: 'Инициализация Telegram Mini App…',
  noTelegramWarning:
    'Вы вне Telegram — откройте приложение через бота для анализа фото.',
  analyzing: 'Анализируем фото и подбираем рецепты…',

  greeting: 'Добро пожаловать, {name}!',

  pickPhotosBtn: 'Выбрать фото продуктов',
  photoHint: 'До {max} фото в форматах JPEG, PNG или WebP',
  submitBtn: 'Подобрать рецепты',
  photoAlt: 'Выбранное фото {n}',
  removePhotoLabel: 'Удалить фото {n}',

  errorTooManyPhotos: 'Можно выбрать не более {max} фото',
  errorInvalidFormat: 'Разрешены только изображения JPEG, PNG или WebP',
  errorNoPhotos: 'Выберите хотя бы одно фото продуктов',
  errorNoInitData:
    'Данные авторизации Telegram недоступны. Откройте приложение через бота.',
  errorAnalysisFailed: 'Не удалось проанализировать фото. Попробуйте снова.',

  ingredientsHeading: 'Найденные ингредиенты',
  recipesHeading: 'Рецепты ({count})',
  caloriesLabel: '{value} ккал',
  proteinLabel: 'Б: {value} г',
  fatLabel: 'Ж: {value} г',
  carbsLabel: 'У: {value} г',

  resetBtn: 'Загрузить новые фото',

  langSelectTitle: 'Выберите язык',
  langSelectSubtitle: 'Вы сможете изменить это в любое время',

  switchLanguage: 'Язык',
};
