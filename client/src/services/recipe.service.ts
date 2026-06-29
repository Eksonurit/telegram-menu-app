import { buildApiEndpoint } from '@/config/app.config';
import { ApiError } from '@/services/api.service';
import type { AnalyzeRecipesResponse } from '@/types/recipe.types';
import { getTelegramInitData } from '@/utils/telegram.utils';

interface ApiErrorBody {
  message?: string;
}

const MAX_PHOTOS = 3;

async function parseServerError(response: Response): Promise<string> {
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
    throw new ApiError('errorNoPhotos', 400);
  }

  if (photos.length > MAX_PHOTOS) {
    throw new ApiError('errorTooManyPhotos', 400);
  }

  const initData = getTelegramInitData();

  if (!initData) {
    throw new ApiError('errorNoInitData', 401);
  }

  const formData = new FormData();
  for (const photo of photos) {
    formData.append('photos', photo, photo.name);
  }

  let response: Response;

  try {
    response = await fetch(buildApiEndpoint('/recipes/analyze'), {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': initData },
      body: formData,
    });
  } catch {
    // Мережева помилка (наприклад, localhost:3000 з телефону через ngrok)
    throw new ApiError('errorAnalysisFailed', 0);
  }

  if (!response.ok) {
    const message = await parseServerError(response);
    throw new ApiError(message, response.status);
  }

  try {
    return (await response.json()) as AnalyzeRecipesResponse;
  } catch {
    throw new ApiError('errorAnalysisFailed', 500);
  }
}
