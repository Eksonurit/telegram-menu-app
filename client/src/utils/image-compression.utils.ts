/**
 * image-compression.utils.ts
 *
 * Клієнтське стиснення зображень ПЕРЕД відправкою на сервер.
 *
 * НАВІЩО ЦЕ КРИТИЧНО:
 *  - Сучасні смартфони роблять фото на 5–12 МБ (4000×3000 px і більше).
 *  - Gemini рахує токени пропорційно до розміру зображення → велике фото
 *    миттєво з'їдає ліміт TPM (Tokens Per Minute) і провокує помилки 429.
 *  - Стиснувши фото до 1024px / ~75% JPEG, ми отримуємо файл ~200–300 КБ,
 *    що пришвидшує і завантаження, і обробку, і прибирає блокування по TPM.
 *
 * РЕАЛІЗАЦІЯ:
 *  Використовуємо нативний HTML5 Canvas — без зовнішніх залежностей.
 *  Це робить рішення легким, передбачуваним і незалежним від npm-пакетів.
 */

/** Максимальна сторона (ширина АБО висота) після стиснення, у пікселях */
const MAX_DIMENSION = 1024;

/** Якість JPEG (0–1). 0.75 — оптимальний баланс «розмір ↔ якість» для аналізу їжі */
const JPEG_QUALITY = 0.75;

/**
 * Поріг, нижче якого стискати немає сенсу.
 * Маленькі файли (вже стиснуті) пропускаємо без змін, щоб не псувати якість зайвим перекодуванням.
 */
const SKIP_THRESHOLD_BYTES = 300 * 1024; // 300 КБ

/**
 * Обчислює нові розміри зі збереженням пропорцій так,
 * щоб найбільша сторона не перевищувала MAX_DIMENSION.
 * Якщо зображення вже менше за ліміт — повертає вихідні розміри (без апскейлу).
 */
function calcTargetSize(
  width: number,
  height: number,
): { width: number; height: number } {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }

  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Завантажує File у HTMLImageElement через object URL.
 * Гарантовано звільняє URL у будь-якому випадку (resolve/reject), щоб не текла пам'ять.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не вдалося прочитати зображення для стиснення'));
    };

    img.src = objectUrl;
  });
}

/**
 * Стискає ОДНЕ зображення через Canvas.
 *
 * Безпечна за замовчуванням: якщо щось піде не так (Canvas недоступний,
 * toBlob повернув null тощо) — повертає ВИХІДНИЙ файл, щоб не зламати завантаження.
 *
 * @param file — оригінальний файл зображення з input[type=file]
 * @returns    — новий стиснутий File (JPEG) або оригінал як fallback
 */
export async function compressImage(file: File): Promise<File> {
  // GIF не чіпаємо — Canvas «з'їсть» анімацію; та й це рідкісний кейс для фото їжі
  if (file.type === 'image/gif') {
    return file;
  }

  // Уже легкий файл — перекодування лише погіршить якість без виграшу
  if (file.size <= SKIP_THRESHOLD_BYTES) {
    return file;
  }

  try {
    const img = await loadImage(file);
    const { width, height } = calcTargetSize(img.naturalWidth, img.naturalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Canvas API недоступний — повертаємо оригінал
      return file;
    }

    // Малюємо зменшену копію. Якісне згладжування для чіткого результату.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Перетворюємо canvas → Blob (JPEG). toBlob асинхронний, тому загортаємо в Promise.
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', JPEG_QUALITY);
    });

    if (!blob) {
      return file;
    }

    // Якщо стиснутий файл раптом БІЛЬШИЙ за оригінал — лишаємо оригінал
    if (blob.size >= file.size) {
      return file;
    }

    // Формуємо нове ім'я з розширенням .jpg, зберігаючи базову назву
    const baseName = file.name.replace(/\.[^./\\]+$/, '');
    const compressedName = `${baseName}.jpg`;

    return new File([blob], compressedName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (error) {
    // Будь-яка помилка стиснення НЕ повинна блокувати користувача —
    // тихо повертаємо оригінал і дозволяємо серверу обробити його.
    console.warn('[image-compression] Стиснення не вдалося, надсилаємо оригінал:', error);
    return file;
  }
}

/**
 * Стискає масив зображень паралельно.
 * Promise.all безпечний, бо compressImage ніколи не кидає виняток (має внутрішній fallback).
 *
 * @param files — масив оригінальних файлів
 * @returns     — масив стиснутих файлів у тому самому порядку
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file)));
}
