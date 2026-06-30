import type { Translation } from '../types';

export const ru: Translation = {
  appTitle: 'Рецепты из фото',
  appSubtitle: 'Загрузите фото продуктов — мы подберём блюда и рецепты',

  initializing: 'Инициализация Telegram Mini App…',
  noTelegramWarning:
    'Вы вне Telegram — откройте приложение через бота для анализа фото.',
  analyzing: 'Распознаём ингредиенты на фото…',
  translating: 'Переводим рецепты…',
  generating: 'Генерируем рецепты…',
  addIngredientPlaceholder: 'Добавить ингредиент…',
  confirmIngredientsBtn: 'Подобрать рецепты по этому списку',
  editIngredientsBtn: 'Изменить ингредиенты',

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
  errorPaymentFailed: 'Не удалось завершить оплату. Попробуйте снова.',
  errorPaymentUnavailable: 'Оплата доступна только внутри Telegram.',

  ingredientsHeading: 'Найденные ингредиенты',
  recipesHeading: 'Рецепты ({count})',
  caloriesLabel: '{value} ккал',
  proteinLabel: 'Б {value}г',
  fatLabel: 'Ж {value}г',
  carbsLabel: 'У {value}г',
  tapForRecipe: 'Нажмите для полного рецепта →',

  cookingTimeLabel: 'Время приготовления',
  recipeIngredients: 'Ингредиенты',
  recipeSteps: 'Шаги приготовления',
  nutritionCalories: 'Калории',
  nutritionProtein: 'Белки',
  nutritionFat: 'Жиры',
  nutritionCarbs: 'Углеводы',
  nutritionUnitKcal: 'ккал',
  nutritionUnitG: 'г',
  nutritionPerServing: 'на 1 порцию',
  closeBtn: 'Закрыть',

  attemptsLeft: 'Осталось {remaining} из {total} бесплатных генераций',
  noAttemptsLeft: 'Дневной лимит исчерпан',
  paywallTitle: 'Лимит исчерпан',
  paywallBody:
    'Вы использовали все {total} бесплатные генерации рецептов за сегодня. Перейдите на Премиум и наслаждайтесь неограниченным кулинарным вдохновением!',
  paywallUpgradeBtn: 'Перейти на Премиум — 50 ⭐',
  paywallProcessing: 'Открываем оплату…',
  paywallCloseBtn: 'Закрыть',
  premiumSuccessTitle: 'Вы Премиум! 🎉',
  premiumSuccessBody: 'Наслаждайтесь безлимитной генерацией рецептов навсегда. Приятного аппетита!',
  premiumSuccessBtn: 'Начать готовить',
  premiumUnlimited: 'Премиум · Безлимит генераций',
  generateRecipesBtn: 'Подобрать рецепты',
  uploadBlockedTitle: 'Лимит на сегодня исчерпан',
  uploadBlockedBody: 'Вы уже получили свои бесплатные рецепты на сегодня. Возвращайтесь завтра — или обновитесь до Премиум для неограниченного доступа.',

  resetBtn: 'Загрузить новые фото',

  langSelectTitle: 'Выберите язык',
  langSelectSubtitle: 'Вы сможете изменить это в любое время',

  switchLanguage: 'Язык',
};
