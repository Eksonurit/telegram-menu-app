import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  LOCALE_MAP,
  getStoredLocale,
  interpolate,
  persistLocale,
} from './index';
import type { Locale, Translation } from './types';

interface I18nContextValue {
  /** Поточна активна мова */
  locale: Locale;
  /**
   * true — користувач уже обрав мову (або вона збережена з попередньої сесії).
   * false — треба показати екран вибору мови.
   */
  localeConfirmed: boolean;
  /** Змінює мову та зберігає вибір у localStorage */
  setLocale: (locale: Locale) => void;
  /**
   * Функція перекладу.
   * @param key — ключ словника
   * @param vars — опціональні змінні для інтерполяції {key}
   */
  t: (key: keyof Translation, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Провайдер i18n — обгортає весь додаток */
export function I18nProvider({ children }: { children: ReactNode }) {
  const storedLocale = getStoredLocale();

  const [locale, setLocaleState] = useState<Locale>(storedLocale ?? 'en');
  const [localeConfirmed, setLocaleConfirmed] = useState(storedLocale !== null);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setLocaleConfirmed(true);
    persistLocale(next);
  }, []);

  const t = useCallback(
    (key: keyof Translation, vars?: Record<string, string | number>): string => {
      const template = LOCALE_MAP[locale][key];
      return vars ? interpolate(template, vars) : template;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, localeConfirmed, setLocale, t }),
    [locale, localeConfirmed, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Хук для доступу до перекладів і керування мовою.
 * Використовуй всередині компонентів-нащадків <I18nProvider>.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n мусить викликатись всередині <I18nProvider>');
  }
  return ctx;
}
