import type { ApiErrorResponse } from '../types/index.js';
import { HttpError } from '../utils/HttpError.js';

function isMulterError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'MulterError'
  );
}

export function errorHandler(
  error: unknown,
  _req: import('express').Request,
  res: import('express').Response,
  _next: import('express').NextFunction,
): void {
  if (error instanceof HttpError) {
    const response: ApiErrorResponse = { message: error.message };
    res.status(error.statusCode).json(response);
    return;
  }

  if (isMulterError(error)) {
    const response: ApiErrorResponse = {
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Розмір файлу перевищує ліміт 10 МБ'
          : error.code === 'LIMIT_FILE_COUNT'
            ? 'Занадто багато файлів у запиті'
            : 'Помилка завантаження файлу',
    };
    res.status(400).json(response);
    return;
  }

  console.error('[Помилка сервера]', error);

  const response: ApiErrorResponse = {
    message: 'Внутрішня помилка сервера',
  };

  res.status(500).json(response);
}
