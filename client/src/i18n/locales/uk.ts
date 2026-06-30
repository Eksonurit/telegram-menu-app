import type { Translation } from '../types';

export const uk: Translation = {
  appTitle: 'Рецепти з фото',
  appSubtitle: 'Завантажте фото продуктів — ми підберемо страви та рецепти',

  initializing: 'Ініціалізація Telegram Mini App…',
  noTelegramWarning:
    'Ви поза Telegram — для аналізу фото відкрийте додаток через бота.',
  analyzing: 'Розпізнаємо інгредієнти на фото…',
  translating: 'Перекладаємо рецепти…',
  generating: 'Генеруємо рецепти…',
  addIngredientPlaceholder: 'Додати інгредієнт…',
  confirmIngredientsBtn: 'Підібрати рецепти за цим списком',
  editIngredientsBtn: 'Змінити інгредієнти',

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
  errorPaymentFailed: 'Не вдалося завершити оплату. Спробуйте ще раз.',
  errorPaymentUnavailable: 'Оплата доступна лише всередині Telegram.',

  ingredientsHeading: 'Знайдені інгредієнти',
  recipesHeading: 'Рецепти ({count})',
  caloriesLabel: '{value} ккал',
  proteinLabel: 'Б {value}г',
  fatLabel: 'Ж {value}г',
  carbsLabel: 'В {value}г',
  tapForRecipe: 'Натисніть для повного рецепта →',

  cookingTimeLabel: 'Час приготування',
  recipeIngredients: 'Інгредієнти',
  recipeSteps: 'Кроки приготування',
  nutritionCalories: 'Калорії',
  nutritionProtein: 'Білки',
  nutritionFat: 'Жири',
  nutritionCarbs: 'Вуглеводи',
  nutritionUnitKcal: 'ккал',
  nutritionUnitG: 'г',
  nutritionPerServing: 'на 1 порцію',
  closeBtn: 'Закрити',

  attemptsLeft: 'Залишилось {remaining} з {total} безкоштовних генерацій',
  noAttemptsLeft: 'Ліміт на сьогодні вичерпано',
  paywallTitle: 'Ліміт вичерпано',
  paywallBody:
    'Ви використали всі {total} безкоштовні генерації рецептів за сьогодні. Оновіть до Преміум та насолоджуйтесь необмеженою кулінарною натхненністю!',
  paywallUpgradeBtn: 'Оновити до Преміум — 50 ⭐',
  paywallProcessing: 'Відкриваємо оплату…',
  paywallCloseBtn: 'Закрити',
  premiumSuccessTitle: 'Ви Преміум! 🎉',
  premiumSuccessBody: 'Насолоджуйтесь безлімітною генерацією рецептів назавжди. Смачного!',
  premiumSuccessBtn: 'Почати готувати',
  premiumUnlimited: 'Преміум · Безліміт генерацій',
  generateRecipesBtn: 'Підібрати рецепти',
  uploadBlockedTitle: 'На сьогодні рецепти вичерпано',
  uploadBlockedBody: 'Ви вже отримали свої безкоштовні рецепти на сьогодні. Повертайтесь завтра — або оновіться до Преміум для необмеженого доступу.',

  resetBtn: 'Завантажити нові фото',

  langSelectTitle: 'Оберіть мову',
  langSelectSubtitle: 'Ви зможете змінити це будь-коли',

  switchLanguage: 'Мова',
};
