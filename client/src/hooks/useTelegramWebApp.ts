import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setReady, setUser } from '@/app/slices/appSlice';
import type { TelegramUser } from '@/types';

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
  };
  themeParams: Record<string, string | undefined>;
  colorScheme: 'light' | 'dark';
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

function mapTelegramUser(user: TelegramWebAppUser): TelegramUser {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code,
  };
}

export function useTelegramWebApp(): void {
  const dispatch = useDispatch();

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (!webApp) {
      dispatch(setReady(true));
      return;
    }

    webApp.ready();
    webApp.expand();

    const user = webApp.initDataUnsafe.user;
    if (user) {
      dispatch(setUser(mapTelegramUser(user)));
    }

    dispatch(setReady(true));
  }, [dispatch]);
}
