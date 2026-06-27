import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { analyzePhotos } from '@/app/slices/recipeSlice';
import '@/styles/PhotoUpload.css';

const MAX_PHOTOS = 3;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface PhotoUploadProps {
  disabled?: boolean;
}

export function PhotoUpload({ disabled = false }: PhotoUploadProps) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const revokePreviewUrls = useCallback((urls: string[]) => {
    for (const url of urls) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      revokePreviewUrls(previewUrlsRef.current);
    };
  }, [revokePreviewUrls]);

  const updateFiles = (files: File[]) => {
    revokePreviewUrls(previewUrls);
    setSelectedFiles(files);
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);

    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    if (files.length > MAX_PHOTOS) {
      setValidationError(`Можна обрати не більше ${MAX_PHOTOS} фото`);
      event.target.value = '';
      return;
    }

    const invalidFile = files.find((file) => !ALLOWED_TYPES.has(file.type));

    if (invalidFile) {
      setValidationError('Дозволені лише зображення JPEG, PNG або WebP');
      event.target.value = '';
      return;
    }

    updateFiles(files);
  };

  const handleRemovePhoto = (index: number) => {
    const nextFiles = selectedFiles.filter((_, fileIndex) => fileIndex !== index);
    updateFiles(nextFiles);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      setValidationError('Оберіть щонайменше одне фото продуктів');
      return;
    }

    setValidationError(null);
    void dispatch(analyzePhotos(selectedFiles));
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  return (
    <section className="photo-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="photo-upload__input"
        onChange={handleFileChange}
        disabled={disabled}
      />

      <button
        type="button"
        className="photo-upload__pick-btn"
        onClick={openFilePicker}
        disabled={disabled}
      >
        Обрати фото продуктів
      </button>

      <p className="photo-upload__hint">
        До {MAX_PHOTOS} фото у форматах JPEG, PNG або WebP
      </p>

      {previewUrls.length > 0 && (
        <ul className="photo-upload__previews">
          {previewUrls.map((url, index) => (
            <li key={url} className="photo-upload__preview-item">
              <img
                src={url}
                alt={`Обране фото ${index + 1}`}
                className="photo-upload__preview-image"
              />
              <button
                type="button"
                className="photo-upload__remove-btn"
                onClick={() => handleRemovePhoto(index)}
                disabled={disabled}
                aria-label={`Видалити фото ${index + 1}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {validationError && (
        <p className="photo-upload__error" role="alert">
          {validationError}
        </p>
      )}

      <button
        type="button"
        className="photo-upload__submit-btn"
        onClick={handleSubmit}
        disabled={disabled || selectedFiles.length === 0}
      >
        Підібрати рецепти
      </button>
    </section>
  );
}
