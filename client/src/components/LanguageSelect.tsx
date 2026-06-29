import { FlagIcon } from '@/components/FlagIcon';
import { useI18n } from '@/i18n/I18nContext';
import { LANGUAGE_OPTIONS } from '@/i18n/languageOptions';
import '@/styles/LanguageSelect.css';

/**
 * Повноекранний екран вибору мови.
 * Відображається один раз — доки мова не збережена в localStorage.
 */
export function LanguageSelect() {
  const { setLocale } = useI18n();

  return (
    <div className="lang-select">
      <div className="lang-select__content">
        <div className="lang-select__icon" aria-hidden="true">
          🍽️
        </div>

        {/* Заголовок англійською — мова ще не обрана */}
        <h1 className="lang-select__title">Choose your language</h1>
        <p className="lang-select__subtitle">You can change this any time</p>

        <ul className="lang-select__list" role="listbox" aria-label="Language selection">
          {LANGUAGE_OPTIONS.map((option) => (
            <li key={option.locale} className="lang-select__item">
              <button
                type="button"
                className="lang-select__option"
                role="option"
                aria-selected={false}
                aria-label={`${option.flag} ${option.nativeName}`}
                onClick={() => setLocale(option.locale)}
              >
                {/* Прапор (PNG) + назва — один рядок */}
                <span className="lang-select__label">
                  <FlagIcon option={option} className="lang-select__flag" size="md" />
                  <span className="lang-select__name">{option.nativeName}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
