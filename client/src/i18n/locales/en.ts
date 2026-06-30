import type { Translation } from '../types';

export const en: Translation = {
  appTitle: 'Recipes from Photos',
  appSubtitle: "Upload product photos — we'll find dishes and recipes for you",

  initializing: 'Initialising Telegram Mini App…',
  noTelegramWarning:
    'You are outside Telegram — open the app through the bot to analyse photos.',
  analyzing: 'Detecting ingredients in your photos…',
  translating: 'Translating recipes…',
  generating: 'Generating recipes…',
  addIngredientPlaceholder: 'Add ingredient…',
  confirmIngredientsBtn: 'Find recipes for this list',
  editIngredientsBtn: 'Edit ingredients',

  greeting: 'Welcome, {name}!',

  pickPhotosBtn: 'Choose product photos',
  photoHint: 'Up to {max} photos in JPEG, PNG or WebP',
  submitBtn: 'Find recipes',
  photoAlt: 'Selected photo {n}',
  removePhotoLabel: 'Remove photo {n}',

  errorTooManyPhotos: 'You can select up to {max} photos',
  errorInvalidFormat: 'Only JPEG, PNG or WebP images are allowed',
  errorNoPhotos: 'Please select at least one photo',
  errorNoInitData:
    'Telegram authorisation unavailable. Open the app through the bot.',
  errorAnalysisFailed: 'Failed to analyse photos. Please try again.',
  errorPaymentFailed: 'Payment could not be completed. Please try again.',
  errorPaymentUnavailable: 'Payments are available only inside Telegram.',

  ingredientsHeading: 'Detected ingredients',
  recipesHeading: 'Recipes ({count})',
  caloriesLabel: '{value} kcal',
  proteinLabel: 'P {value}g',
  fatLabel: 'F {value}g',
  carbsLabel: 'C {value}g',
  tapForRecipe: 'Tap to see full recipe →',

  cookingTimeLabel: 'Cooking time',
  recipeIngredients: 'Ingredients',
  recipeSteps: 'Cooking steps',
  nutritionCalories: 'Calories',
  nutritionProtein: 'Protein',
  nutritionFat: 'Fat',
  nutritionCarbs: 'Carbs',
  nutritionUnitKcal: 'kcal',
  nutritionUnitG: 'g',
  nutritionPerServing: 'per serving',
  closeBtn: 'Close',

  attemptsLeft: '{remaining} of {total} free generations left today',
  noAttemptsLeft: "Today's limit reached",
  paywallTitle: "Daily limit reached",
  paywallBody:
    "You've used all {total} free recipe generations for today. Upgrade to Premium and enjoy unlimited culinary inspiration!",
  paywallUpgradeBtn: 'Upgrade to Premium — 50 ⭐',
  paywallProcessing: 'Opening payment…',
  paywallCloseBtn: 'Close',
  premiumSuccessTitle: "You're Premium! 🎉",
  premiumSuccessBody: 'Enjoy unlimited recipe generations forever. Bon appétit!',
  premiumSuccessBtn: 'Start cooking',
  premiumUnlimited: 'Premium · Unlimited generations',
  generateRecipesBtn: 'Find My Recipes',
  uploadBlockedTitle: "You've reached today's limit",
  uploadBlockedBody: "You've already received your free recipes for today. Come back tomorrow — or upgrade to Premium for unlimited access.",

  resetBtn: 'Upload new photos',

  langSelectTitle: 'Choose your language',
  langSelectSubtitle: 'You can change this any time',

  switchLanguage: 'Language',
};
