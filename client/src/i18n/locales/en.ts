import type { Translation } from '../types';

export const en: Translation = {
  appTitle: 'Recipes from Photos',
  appSubtitle: "Upload product photos — we'll find dishes and recipes for you",

  initializing: 'Initialising Telegram Mini App…',
  noTelegramWarning:
    'You are outside Telegram — open the app through the bot to analyse photos.',
  analyzing: 'Analysing photos and finding recipes…',

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

  ingredientsHeading: 'Detected ingredients',
  recipesHeading: 'Recipes ({count})',
  caloriesLabel: '{value} kcal',
  proteinLabel: 'P: {value} g',
  fatLabel: 'F: {value} g',
  carbsLabel: 'C: {value} g',

  resetBtn: 'Upload new photos',

  langSelectTitle: 'Choose your language',
  langSelectSubtitle: 'You can change this any time',

  switchLanguage: 'Language',
};
