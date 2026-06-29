import { en } from './locales/en';
import { es } from './locales/es';
import { ru } from './locales/ru';
import { uk } from './locales/uk';
import type { Locale, Translation } from './types';

/** Повна карта локалей → словник */
export const LOCALE_MAP: Record<Locale, Translation> = { en, uk, es, ru };

/** Впорядкований список підтримуваних мов для UI */
export const SUPPORTED_LOCALES: Locale[] = ['en', 'uk', 'es', 'ru'];

const STORAGE_KEY = 'pic2recipe_locale';

/** Читає збережену мову з localStorage. Повертає null, якщо не знайдено. */
export function getStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value && (SUPPORTED_LOCALES as string[]).includes(value)) {
      return value as Locale;
    }
  } catch {
    // localStorage може бути недоступний у деяких браузерах/контекстах
  }
  return null;
}

/** Зберігає обрану мову в localStorage */
export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ігноруємо помилки запису
  }
}

/**
 * Замінює плейсхолдери {key} у рядку шаблону на відповідні значення.
 * Наприклад: interpolate('Привіт, {name}!', { name: 'Іван' }) → 'Привіт, Іван!'
 */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export type { Locale, Translation };
