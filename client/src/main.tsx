import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from '@/App';
import { store } from '@/app/store';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import '@/styles/global.css';

function Root() {
  useTelegramWebApp();
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <Root />
    </Provider>
  </StrictMode>,
);
