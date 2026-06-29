import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { analyzePhotos } from '@/app/slices/recipeSlice';
import { useI18n } from '@/i18n/I18nContext';
import '@/styles/PhotoUpload.css';

const MAX_PHOTOS = 3;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

/** Перевірка формату — Telegram WebView інколи не задає file.type */
function isAllowedImageFile(file: File): boolean {
  if (file.type && ALLOWED_TYPES.has(file.type)) {
    return true;
  }
  return ALLOWED_EXTENSIONS.test(file.name);
}

interface PhotoUploadProps {
  disabled?: boolean;
}

/* ── Іконка камери для кнопки вибору фото ── */
function CameraIcon() {
  return (
    <svg
      width="18" height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

/* ── Іконка іскорки AI для кнопки аналізу ── */
function SparkleIcon() {
  return (
    <svg
      width="18" height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
    </svg>
  );
}

export function PhotoUpload({ disabled = false }: PhotoUploadProps) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

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

  // Синхронізуємо ref для cleanup при розмонтуванні
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

    if (files.length === 0) return;

    if (files.length > MAX_PHOTOS) {
      setValidationError(t('errorTooManyPhotos', { max: MAX_PHOTOS }));
      event.target.value = '';
      return;
    }

    const invalidFile = files.find((file) => !isAllowedImageFile(file));
    if (invalidFile) {
      setValidationError(t('errorInvalidFormat'));
      event.target.value = '';
      return;
    }

    updateFiles(files);
  };

  const handleRemovePhoto = (index: number) => {
    const nextFiles = selectedFiles.filter((_, i) => i !== index);
    updateFiles(nextFiles);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      setValidationError(t('errorNoPhotos'));
      return;
    }
    setValidationError(null);
    void dispatch(analyzePhotos(selectedFiles));
  };

  return (
    <section className="photo-upload">
      {/* Прихований файловий input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="photo-upload__input"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Вторинна кнопка — відкрити файловий вибір */}
      <button
        type="button"
        className="photo-upload__pick-btn"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <CameraIcon />
        <span>{t('pickPhotosBtn')}</span>
      </button>

      <p className="photo-upload__hint">
        {t('photoHint', { max: MAX_PHOTOS })}
      </p>

      {/* Прев'ю обраних фото */}
      {previewUrls.length > 0 && (
        <ul className="photo-upload__previews">
          {previewUrls.map((url, index) => (
            <li key={url} className="photo-upload__preview-item">
              <img
                src={url}
                alt={t('photoAlt', { n: index + 1 })}
                className="photo-upload__preview-image"
              />
              <button
                type="button"
                className="photo-upload__remove-btn"
                onClick={() => handleRemovePhoto(index)}
                disabled={disabled}
                aria-label={t('removePhotoLabel', { n: index + 1 })}
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

      {/* Основна CTA кнопка — аналіз фото */}
      <button
        type="button"
        className="photo-upload__submit-btn"
        onClick={handleSubmit}
        disabled={disabled || selectedFiles.length === 0}
      >
        <SparkleIcon />
        <span>{t('submitBtn')}</span>
      </button>
    </section>
  );
}
