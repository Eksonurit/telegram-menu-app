/**
 * LoadingProgress.tsx
 *
 * Анімований екран очікування з:
 *  - Плавним progress bar (shimmer-анімація)
 *  - Підказками з індивідуальним часом показу кожної
 *  - Остання підказка ("Майже готово…") залишається до кінця — не циклить
 *  - Іконкою та фазово-специфічним оформленням
 */

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import type { Locale } from '@/i18n/types';
import '@/styles/LoadingProgress.css';

export type LoadingPhase = 'analyzing' | 'generating' | 'translating';

interface LoadingProgressProps {
  phase: LoadingPhase;
}

/** Одна підказка: текст + скільки мілісекунд вона показується перед переходом до наступної */
interface Tip {
  text: string;
  /** Час показу в мс. Для ОСТАННЬОЇ підказки значення ігнорується — вона тримається до кінця */
  ms: number;
}

// ── Підказки з індивідуальними інтервалами ────────────────────────────────────

const TIPS: Record<Locale, Record<LoadingPhase, Tip[]>> = {
  uk: {
    analyzing: [
      { text: 'Розглядаємо фото…',          ms: 2000 },
      { text: 'Шукаємо продукти…',           ms: 3500 },
      { text: 'Розпізнаємо інгредієнти…',    ms: 4000 },
      { text: 'Майже готово…',               ms: 0    },  // залишається до відповіді
    ],
    generating: [
      { text: 'Складаємо меню…',             ms: 2500 },
      { text: 'Підбираємо страви…',          ms: 4000 },
      { text: 'Перевіряємо рецепти…',        ms: 3000 },
      { text: 'Розраховуємо калорії…',       ms: 4500 },
      { text: 'Майже готово…',               ms: 0    },
    ],
    translating: [
      { text: 'Перекладаємо назви…',         ms: 2000 },
      { text: 'Перекладаємо кроки…',         ms: 3000 },
      { text: 'Майже готово…',               ms: 0    },
    ],
  },
  en: {
    analyzing: [
      { text: 'Looking at your photos…',     ms: 2000 },
      { text: 'Spotting the products…',      ms: 3500 },
      { text: 'Identifying ingredients…',    ms: 4000 },
      { text: 'Almost there…',               ms: 0    },
    ],
    generating: [
      { text: 'Putting together the menu…',  ms: 2500 },
      { text: 'Picking the best dishes…',    ms: 4000 },
      { text: 'Checking the recipes…',       ms: 3000 },
      { text: 'Calculating nutrition…',      ms: 4500 },
      { text: 'Almost there…',               ms: 0    },
    ],
    translating: [
      { text: 'Translating titles…',         ms: 2000 },
      { text: 'Translating steps…',          ms: 3000 },
      { text: 'Almost there…',               ms: 0    },
    ],
  },
  es: {
    analyzing: [
      { text: 'Mirando tus fotos…',          ms: 2000 },
      { text: 'Detectando productos…',       ms: 3500 },
      { text: 'Identificando ingredientes…', ms: 4000 },
      { text: 'Casi listo…',                 ms: 0    },
    ],
    generating: [
      { text: 'Preparando el menú…',         ms: 2500 },
      { text: 'Eligiendo los mejores…',      ms: 4000 },
      { text: 'Revisando las recetas…',      ms: 3000 },
      { text: 'Calculando nutrición…',       ms: 4500 },
      { text: 'Casi listo…',                 ms: 0    },
    ],
    translating: [
      { text: 'Traduciendo títulos…',        ms: 2000 },
      { text: 'Traduciendo pasos…',          ms: 3000 },
      { text: 'Casi listo…',                 ms: 0    },
    ],
  },
  ru: {
    analyzing: [
      { text: 'Смотрим на ваши фото…',       ms: 2000 },
      { text: 'Ищем продукты…',              ms: 3500 },
      { text: 'Распознаём ингредиенты…',     ms: 4000 },
      { text: 'Почти готово…',               ms: 0    },
    ],
    generating: [
      { text: 'Составляем меню…',            ms: 2500 },
      { text: 'Подбираем блюда…',            ms: 4000 },
      { text: 'Проверяем рецепты…',          ms: 3000 },
      { text: 'Считаем калории…',            ms: 4500 },
      { text: 'Почти готово…',               ms: 0    },
    ],
    translating: [
      { text: 'Переводим названия…',         ms: 2000 },
      { text: 'Переводим шаги…',             ms: 3000 },
      { text: 'Почти готово…',               ms: 0    },
    ],
  },
};

// ── Phase icons (SVG inline) ──────────────────────────────────────────────────

function PhaseIcon({ phase }: { phase: LoadingPhase }) {
  if (phase === 'analyzing') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8v6M8 11h6" />
      </svg>
    );
  }
  if (phase === 'generating') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
      </svg>
    );
  }
  // translating
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" /><path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LoadingProgress({ phase }: LoadingProgressProps) {
  const { locale } = useI18n();
  const tips = TIPS[locale]?.[phase] ?? TIPS.uk[phase];

  const [tipIndex, setTipIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  // Ref для зберігання id таймера — щоб очистити при анмаунті або зміні фази
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Запускає ланцюжок setTimeout з індивідуальним часом для кожної підказки.
   * На останній підказці зупиняється — вона тримається до отримання відповіді.
   */
  useEffect(() => {
    setTipIndex(0);
    setFadeIn(true);

    if (tips.length <= 1) return;

    let currentIndex = 0;

    function scheduleNext() {
      const tip = tips[currentIndex];
      const isLast = currentIndex === tips.length - 1;

      // Остання підказка або tip не знайдено — зупиняємось
      if (isLast || !tip) return;

      timerRef.current = setTimeout(() => {
        // Fade out
        setFadeIn(false);

        // Через 300 мс (тривалість fade-out) — показуємо наступну
        timerRef.current = setTimeout(() => {
          currentIndex += 1;
          setTipIndex(currentIndex);
          setFadeIn(true);
          scheduleNext();
        }, 300);
      }, tip.ms);
    }

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // tips — стабільне посилання (const у модулі), тому deps тільки phase + locale
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, locale]);

  return (
    <div className="loading-progress" role="status" aria-live="polite">
      {/* Іконка фази */}
      <div className="loading-progress__icon">
        <PhaseIcon phase={phase} />
      </div>

      {/* Анімований progress bar */}
      <div className="loading-progress__bar-wrap" aria-hidden="true">
        <div className="loading-progress__bar" />
      </div>

      {/* Поточна підказка */}
      <p
        className={['loading-progress__tip', fadeIn ? 'loading-progress__tip--visible' : ''].join(' ')}
        aria-label={tips[tipIndex]?.text ?? ''}
      >
        {tips[tipIndex]?.text ?? ''}
      </p>

      {/* Три крапки */}
      <div className="loading-progress__dots" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  );
}
