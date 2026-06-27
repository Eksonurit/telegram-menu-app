import type { NextFunction, Request, Response } from 'express';
import { analyzeProductPhotos } from '../services/ai.service.js';
import {
  mapUploadedFiles,
  validateImages,
} from '../services/image.service.js';
import type { AnalyzeRecipesResponse } from '../types/recipe.types.js';
import { HttpError } from '../utils/HttpError.js';

export async function analyzeRecipesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uploadedFiles = req.files;

    if (!Array.isArray(uploadedFiles)) {
      throw new HttpError('Невалідний формат завантажених файлів', 400);
    }

    const images = validateImages(mapUploadedFiles(uploadedFiles));

    const result: AnalyzeRecipesResponse = await analyzeProductPhotos(images);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
