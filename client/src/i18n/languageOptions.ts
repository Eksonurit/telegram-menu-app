import type { Locale } from './types';

/** ISO 3166-1 alpha-2 код країни для PNG-прапора */
export type CountryCode = 'gb' | 'ua' | 'es' | 'ru';

/** Спільний опис мови для UI (екран вибору + перемикач) */
export interface LanguageOption {
  locale: Locale;
  /** Назва мови рідною мовою */
  nativeName: string;
  /** Емодзі-прапор (alt/title; у WebView Telegram може не відображатись як текст) */
  flag: string;
  /** ISO-код для компонента FlagIcon */
  countryCode: CountryCode;
}

/** Усі підтримувані мови з прапорами — єдине джерело правди для UI */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { locale: 'en', nativeName: 'English',    flag: '🇬🇧', countryCode: 'gb' },
  { locale: 'uk', nativeName: 'Українська', flag: '🇺🇦', countryCode: 'ua' },
  { locale: 'es', nativeName: 'Español',    flag: '🇪🇸', countryCode: 'es' },
  { locale: 'ru', nativeName: 'Русский',    flag: '🇷🇺', countryCode: 'ru' },
];

const DEFAULT_OPTION: LanguageOption = LANGUAGE_OPTIONS[0]!;

export function getLanguageOption(locale: Locale): LanguageOption {
  return LANGUAGE_OPTIONS.find((item) => item.locale === locale) ?? DEFAULT_OPTION;
}
