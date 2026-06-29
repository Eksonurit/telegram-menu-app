import type { LanguageOption } from '@/i18n/languageOptions';

interface FlagIconProps {
  /** Дані мови з LANGUAGE_OPTIONS */
  option: Pick<LanguageOption, 'flag' | 'countryCode'>;
  className?: string;
  /** sm — перемикач у шапці; md — екран вибору мови */
  size?: 'sm' | 'md';
}

/**
 * Відображає прапор країни.
 *
 * Емодзі-прапори (🇬🇧, 🇺🇦…) часто НЕ рендеряться у WebView Telegram
 * на Windows/Android через системні шрифти без підтримки regional indicators.
 * Тому використовуємо PNG з flagcdn.com, а emoji лишаємо в alt/title.
 */
export function FlagIcon({ option, className, size = 'md' }: FlagIconProps) {
  const code = option.countryCode.toLowerCase();
  const width = size === 'sm' ? 22 : 28;
  const height = size === 'sm' ? 16 : 21;

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 1x, https://flagcdn.com/w80/${code}.png 2x`}
      width={width}
      height={height}
      alt={option.flag}
      title={option.flag}
      className={className}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
