import { appConfig } from '@/config/app.config';
import { ApiError } from '@/services/api.service';
import type { AnalyzeRecipesResponse } from '@/types/recipe.types';
import { getTelegramInitData } from '@/utils/telegram.utils';

interface ApiErrorBody {
  message?: string;
}

const MAX_PHOTOS = 3;

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.message ?? `Помилка сервера (${response.status})`;
  } catch {
    return `Помилка сервера (${response.status})`;
  }
}

export async function analyzeProductPhotos(
  photos: File[],
): Promise<AnalyzeRecipesResponse> {
  if (photos.length === 0) {
    throw new ApiError('Оберіть щонайменше одне фото', 400);
  }

  if (photos.length > MAX_PHOTOS) {
    throw new ApiError(`Максимум ${MAX_PHOTOS} фото за один запит`, 400);
  }

  const initData = getTelegramInitData();

  if (!initData) {
    throw new ApiError(
      'Дані авторизації Telegram недоступні. Відкрийте додаток через Telegram.',
      401,
    );
  }

  const formData = new FormData();

  for (const photo of photos) {
    formData.append('photos', photo);
  }

  const response = await fetch(`${appConfig.apiUrl}/recipes/analyze`, {
    method: 'POST',
    headers: {
      'X-Telegram-Init-Data': initData,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<AnalyzeRecipesResponse>;
}
