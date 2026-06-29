import { useEffect, useRef, useState } from 'react';
import { FlagIcon } from '@/components/FlagIcon';
import { useI18n } from '@/i18n/I18nContext';
import { LANGUAGE_OPTIONS, getLanguageOption } from '@/i18n/languageOptions';
import '@/styles/LanguageSwitcher.css';

/**
 * Компактний перемикач мови у шапці додатку.
 * Показує прапорець + код мови (наприклад 🇺🇦 UK); при кліку — випадний список.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const current = getLanguageOption(locale);

  // Закриваємо список при кліці поза компонентом
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div ref={wrapperRef} className="lang-switcher">
      <button
        type="button"
        className="lang-switcher__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('switchLanguage')}
        title={t('switchLanguage')}
      >
        <span className="lang-switcher__current">
          <FlagIcon option={current} className="lang-switcher__flag" size="sm" />
          <span className="lang-switcher__code">{locale.toUpperCase()}</span>
        </span>
      </button>

      {open && (
        <ul
          className="lang-switcher__dropdown"
          role="listbox"
          aria-label={t('switchLanguage')}
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = option.locale === locale;
            return (
              <li key={option.locale} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`lang-switcher__item${isActive ? ' lang-switcher__item--active' : ''}`}
                  aria-label={`${option.flag} ${option.nativeName}`}
                  onClick={() => {
                    setLocale(option.locale);
                    setOpen(false);
                  }}
                >
                  <span className="lang-switcher__item-label">
                    <FlagIcon
                      option={option}
                      className="lang-switcher__item-flag"
                      size="sm"
                    />
                    <span className="lang-switcher__item-name">{option.nativeName}</span>
                  </span>
                  {isActive && (
                    <span className="lang-switcher__item-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
