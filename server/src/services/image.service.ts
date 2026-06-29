import type { RequestHandler } from 'express';
import multer from 'multer';
import type { UploadedImage } from '../types/recipe.types.js';
import { HttpError } from '../utils/HttpError.js';

/** Дозволені MIME-типи зображень */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Максимальний розмір одного файлу — 10 МБ */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Максимальна кількість фото за один запит */
export const MAX_PHOTOS_PER_REQUEST = 3;

const storage = multer.memoryStorage();

export const photoUploadMiddleware: RequestHandler = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_PHOTOS_PER_REQUEST,
  },
  fileFilter: (_req, file, callback) => {
    const isAllowedMime = ALLOWED_MIME_TYPES.has(file.mimetype);
    const isAllowedByExt = /\.(jpe?g|png|webp)$/i.test(file.originalname);

    if (!isAllowedMime && !isAllowedByExt) {
      callback(
        new HttpError(
          'Дозволені лише зображення у форматах JPEG, PNG або WebP',
          400,
        ),
      );
      return;
    }

    callback(null, true);
  },
}).array('photos', MAX_PHOTOS_PER_REQUEST);

/** Файл у пам'яті після обробки multer */
interface MulterMemoryFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export function mapUploadedFiles(
  files: MulterMemoryFile[] | undefined,
): UploadedImage[] {
  if (!files || files.length === 0) {
    throw new HttpError('Завантажте щонайменше одне фото продуктів', 400);
  }

  return files.map((file) => {
    if (file.buffer.length === 0) {
      throw new HttpError(`Файл "${file.originalname}" порожній`, 400);
    }

    return {
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      sizeBytes: file.size,
    };
  });
}

export function validateImages(images: UploadedImage[]): UploadedImage[] {
  if (images.length > MAX_PHOTOS_PER_REQUEST) {
    throw new HttpError(
      `Максимум ${MAX_PHOTOS_PER_REQUEST} фото за один запит`,
      400,
    );
  }

  for (const image of images) {
    const isAllowedMime = ALLOWED_MIME_TYPES.has(image.mimeType);
    const isAllowedByExt = /\.(jpe?g|png|webp)$/i.test(image.originalName);

    if (!isAllowedMime && !isAllowedByExt) {
      throw new HttpError(
        `Непідтримуваний формат файлу: ${image.originalName}`,
        400,
      );
    }

    if (image.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new HttpError(
        `Файл "${image.originalName}" перевищує ліміт 10 МБ`,
        400,
      );
    }
  }

  return images;
}
