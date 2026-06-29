import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from '@/App';
import { store } from '@/app/store';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { I18nProvider } from '@/i18n/I18nContext';
import '@/styles/global.css';

/** Внутрішній root: підключає Telegram WebApp та рендерить App */
function Root() {
  useTelegramWebApp();
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Redux store — глобальний стан */}
    <Provider store={store}>
      {/* I18nProvider — контекст перекладів, охоплює весь додаток */}
      <I18nProvider>
        <Root />
      </I18nProvider>
    </Provider>
  </StrictMode>,
);
