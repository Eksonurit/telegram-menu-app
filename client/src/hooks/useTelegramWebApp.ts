import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setReady, setUser } from '@/app/slices/appSlice';
import type { TelegramUser } from '@/types';

// Типи Telegram WebApp оголошені глобально в src/types/telegram.d.ts

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
