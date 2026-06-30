import type { Translation } from '../types';

export const es: Translation = {
  appTitle: 'Recetas desde Fotos',
  appSubtitle: 'Sube fotos de productos — te sugeriremos platos y recetas',

  initializing: 'Iniciando Telegram Mini App…',
  noTelegramWarning:
    'Estás fuera de Telegram — abre la app desde el bot para analizar fotos.',
  analyzing: 'Detectando ingredientes en tus fotos…',
  translating: 'Traduciendo recetas…',
  generating: 'Generando recetas…',
  addIngredientPlaceholder: 'Añadir ingrediente…',
  confirmIngredientsBtn: 'Buscar recetas para esta lista',
  editIngredientsBtn: 'Editar ingredientes',

  greeting: '¡Bienvenido, {name}!',

  pickPhotosBtn: 'Elegir fotos de productos',
  photoHint: 'Hasta {max} fotos en JPEG, PNG o WebP',
  submitBtn: 'Buscar recetas',
  photoAlt: 'Foto seleccionada {n}',
  removePhotoLabel: 'Eliminar foto {n}',

  errorTooManyPhotos: 'Puedes seleccionar hasta {max} fotos',
  errorInvalidFormat: 'Solo se permiten imágenes JPEG, PNG o WebP',
  errorNoPhotos: 'Selecciona al menos una foto',
  errorNoInitData:
    'Autorización de Telegram no disponible. Abre la app desde el bot.',
  errorAnalysisFailed: 'No se pudo analizar las fotos. Inténtalo de nuevo.',
  errorPaymentFailed: 'No se pudo completar el pago. Inténtalo de nuevo.',
  errorPaymentUnavailable: 'Los pagos solo están disponibles dentro de Telegram.',

  ingredientsHeading: 'Ingredientes detectados',
  recipesHeading: 'Recetas ({count})',
  caloriesLabel: '{value} kcal',
  proteinLabel: 'P {value}g',
  fatLabel: 'G {value}g',
  carbsLabel: 'C {value}g',
  tapForRecipe: 'Toca para ver la receta completa →',

  cookingTimeLabel: 'Tiempo de cocción',
  recipeIngredients: 'Ingredientes',
  recipeSteps: 'Pasos de cocción',
  nutritionCalories: 'Calorías',
  nutritionProtein: 'Proteínas',
  nutritionFat: 'Grasas',
  nutritionCarbs: 'Carbohidratos',
  nutritionUnitKcal: 'kcal',
  nutritionUnitG: 'g',
  nutritionPerServing: 'por ración',
  closeBtn: 'Cerrar',

  attemptsLeft: 'Te quedan {remaining} de {total} generaciones gratuitas hoy',
  noAttemptsLeft: 'Límite de hoy alcanzado',
  paywallTitle: 'Límite diario alcanzado',
  paywallBody:
    'Has usado todas las {total} generaciones de recetas gratuitas de hoy. ¡Actualiza a Premium y disfruta de inspiración culinaria ilimitada!',
  paywallUpgradeBtn: 'Actualizar a Premium — 50 ⭐',
  paywallProcessing: 'Abriendo el pago…',
  paywallCloseBtn: 'Cerrar',
  premiumSuccessTitle: '¡Eres Premium! 🎉',
  premiumSuccessBody: 'Disfruta de generaciones de recetas ilimitadas para siempre. ¡Buen provecho!',
  premiumSuccessBtn: 'Empezar a cocinar',
  premiumUnlimited: 'Premium · Generaciones ilimitadas',
  generateRecipesBtn: 'Buscar mis recetas',
  uploadBlockedTitle: 'Límite de hoy alcanzado',
  uploadBlockedBody: 'Ya recibiste tus recetas gratuitas por hoy. Vuelve mañana — o actualiza a Premium para acceso ilimitado.',

  resetBtn: 'Subir nuevas fotos',

  langSelectTitle: 'Elige tu idioma',
  langSelectSubtitle: 'Puedes cambiarlo en cualquier momento',

  switchLanguage: 'Idioma',
};
