import type { Translation } from '../types';

export const es: Translation = {
  appTitle: 'Recetas desde Fotos',
  appSubtitle: 'Sube fotos de productos — te sugeriremos platos y recetas',

  initializing: 'Iniciando Telegram Mini App…',
  noTelegramWarning:
    'Estás fuera de Telegram — abre la app desde el bot para analizar fotos.',
  analyzing: 'Analizando fotos y buscando recetas…',

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

  ingredientsHeading: 'Ingredientes detectados',
  recipesHeading: 'Recetas ({count})',
  caloriesLabel: '{value} kcal',
  proteinLabel: 'P: {value} g',
  fatLabel: 'G: {value} g',
  carbsLabel: 'C: {value} g',

  resetBtn: 'Subir nuevas fotos',

  langSelectTitle: 'Elige tu idioma',
  langSelectSubtitle: 'Puedes cambiarlo en cualquier momento',

  switchLanguage: 'Idioma',
};
