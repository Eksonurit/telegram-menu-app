import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '@/services/api.service';
import {
  analyzeProductPhotos,
  generateFromIngredientList,
  getUserStatus,
  LIMIT_REACHED_KEY,
  translateRecipes as translateRecipesApi,
} from '@/services/recipe.service';
import type { Locale } from '@/i18n/types';
import type {
  AnalyzeRecipesResponse,
  DetectIngredientsResponse,
  RateLimitInfo,
  RecipeItem,
  RecipeStatus,
} from '@/types/recipe.types';

interface RecipeState {
  status: RecipeStatus;
  ingredients: string[];
  recipes: RecipeItem[];
  /** Рядок помилки або i18n-ключ */
  error: string | null;
  /** Залишок безкоштовних генерацій на сьогодні (null = ще не відомо) */
  remaining: number | null;
  /** Максимум генерацій на добу (від сервера) */
  total: number;
  /** true = ліміт вичерпано → показуємо Paywall */
  limitReached: boolean;
  /** true = преміум активний → ліміт не діє, генерації безлімітні */
  isPremium: boolean;
}

const initialState: RecipeState = {
  status: 'idle',
  ingredients: [],
  recipes: [],
  error: null,
  remaining: null,
  total: 3,
  limitReached: false,
  isPremium: false,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/** Крок 1: завантаження фото → виявлення інгредієнтів (БЕЗКОШТОВНО) */
export const analyzePhotos = createAsyncThunk<
  DetectIngredientsResponse,
  File[],
  { rejectValue: string }
>('recipe/analyzePhotos', async (photos, { rejectWithValue }) => {
  try {
    return await analyzeProductPhotos(photos);
  } catch (error) {
    if (error instanceof ApiError) {
      return rejectWithValue(error.message);
    }
    return rejectWithValue('errorAnalysisFailed');
  }
});

/**
 * Крок 2: генерація рецептів з підтвердженого списку інгредієнтів (КОШТУЄ 1 ТОКЕН).
 * При вичерпаному ліміті rejectWithValue повертає LIMIT_REACHED_KEY.
 */
export const generateFromIngredients = createAsyncThunk<
  AnalyzeRecipesResponse,
  string[],
  { rejectValue: string }
>('recipe/generateFromIngredients', async (ingredients, { rejectWithValue }) => {
  try {
    return await generateFromIngredientList(ingredients);
  } catch (error) {
    if (error instanceof ApiError) {
      return rejectWithValue(error.message);
    }
    return rejectWithValue('errorAnalysisFailed');
  }
});

/**
 * Перевірка стану лімітів при старті Mini App (БЕЗКОШТОВНО).
 * Якщо ліміт вичерпано і преміуму немає — автоматично відкриває paywall.
 */
export const fetchUserStatus = createAsyncThunk<
  RateLimitInfo,
  void,
  { rejectValue: string }
>('recipe/fetchUserStatus', async (_, { rejectWithValue }) => {
  try {
    return await getUserStatus();
  } catch (error) {
    if (error instanceof ApiError) return rejectWithValue(error.message);
    return rejectWithValue('errorAnalysisFailed');
  }
});

/**
 * Переклад існуючих рецептів на нову мову (БЕЗКОШТОВНО).
 */
export const translateRecipes = createAsyncThunk<
  AnalyzeRecipesResponse,
  { data: AnalyzeRecipesResponse; locale: Locale },
  { rejectValue: string }
>('recipe/translateRecipes', async ({ data, locale }, { rejectWithValue }) => {
  try {
    return await translateRecipesApi(data, locale);
  } catch (error) {
    if (error instanceof ApiError) {
      return rejectWithValue(error.message);
    }
    return rejectWithValue('errorAnalysisFailed');
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────

export const recipeSlice = createSlice({
  name: 'recipe',
  initialState,
  reducers: {
    resetAnalysis: (state) => {
      state.status = 'idle';
      state.ingredients = [];
      state.recipes = [];
      state.error = null;
      state.limitReached = false;
      // remaining/total зберігаємо — вони відображають серверний стан
    },
    /** Закриває paywall-попап без скидання стану */
    dismissLimitReached: (state) => {
      state.limitReached = false;
    },
    /** Відкриває paywall-попап вручну (наприклад, кнопка «Upgrade» на заблокованому екрані) */
    openPaywall: (state) => {
      state.limitReached = true;
    },
    /**
     * Активує преміум на клієнті ОДРАЗУ після успішної оплати,
     * не чекаючи на повторний запит до сервера. Прибирає всі обмеження UI.
     */
    activatePremium: (state) => {
      state.isPremium = true;
      state.limitReached = false;
      state.remaining = state.total;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── analyzePhotos (БЕЗКОШТОВНО) ───────────────────────────────────────
      .addCase(analyzePhotos.pending, (state) => {
        state.status = 'analyzing';
        state.error = null;
        state.limitReached = false;
      })
      .addCase(analyzePhotos.fulfilled, (state, action) => {
        state.status = 'detected';
        state.ingredients = action.payload.ingredients;
        state.recipes = [];              // рецепти ще не згенеровано
        state.error = null;
        state.remaining = action.payload.rateLimit.remaining;
        state.total = action.payload.rateLimit.total;
        state.isPremium = action.payload.rateLimit.isPremium ?? state.isPremium;
      })
      .addCase(analyzePhotos.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'errorAnalysisFailed';
      })

      // ── generateFromIngredients (КОШТУЄ 1 ТОКЕН) ──────────────────────────
      .addCase(generateFromIngredients.pending, (state) => {
        state.status = 'generating';
        state.error = null;
        state.limitReached = false;
      })
      .addCase(generateFromIngredients.fulfilled, (state, action) => {
        state.status = 'success';
        state.ingredients = action.payload.ingredients;
        state.recipes = action.payload.recipes;
        state.error = null;
        state.remaining = action.payload.rateLimit.remaining;
        state.total = action.payload.rateLimit.total;
        state.isPremium = action.payload.rateLimit.isPremium ?? state.isPremium;
      })
      .addCase(generateFromIngredients.rejected, (state, action) => {
        if (action.payload === LIMIT_REACHED_KEY) {
          // Ліміт вичерпано — зберігаємо поточний стан і показуємо paywall
          state.remaining = 0;
          state.limitReached = true;
          // Якщо вже були рецепти — залишаємо їх видимими
          if (state.status !== 'success') {
            state.status = 'detected';
          }
        } else {
          state.status = state.status === 'success' ? 'success' : 'error';
          state.error = action.payload ?? 'errorAnalysisFailed';
        }
      })

      // ── fetchUserStatus (перевірка на старті, БЕЗКОШТОВНО) ────────────────
      .addCase(fetchUserStatus.fulfilled, (state, action) => {
        state.remaining = action.payload.remaining;
        state.total = action.payload.total;
        state.isPremium = action.payload.isPremium ?? state.isPremium;
        // Якщо ліміт вичерпано і немає преміуму — відразу показуємо paywall
        if (!state.isPremium && action.payload.remaining <= 0) {
          state.limitReached = true;
        }
      })
      // rejected — помилка ігнорується, не заважаємо користувачу

      // ── translateRecipes (БЕЗКОШТОВНО) ────────────────────────────────────
      .addCase(translateRecipes.pending, (state) => {
        state.status = 'translating';
        state.error = null;
      })
      .addCase(translateRecipes.fulfilled, (state, action) => {
        state.status = 'success';
        state.ingredients = action.payload.ingredients;
        state.recipes = action.payload.recipes;
        state.error = null;
        // Оновлюємо ліміт (переклад не списує, але сервер повертає актуальний стан)
        state.remaining = action.payload.rateLimit.remaining;
        state.total = action.payload.rateLimit.total;
        state.isPremium = action.payload.rateLimit.isPremium ?? state.isPremium;
      })
      .addCase(translateRecipes.rejected, (state, action) => {
        // При помилці перекладу повертаємо 'success' — старі рецепти залишаються
        state.status = 'success';
        state.error = action.payload ?? 'errorAnalysisFailed';
      });
  },
});

export const { resetAnalysis, dismissLimitReached, openPaywall, activatePremium } = recipeSlice.actions;
export const recipeReducer = recipeSlice.reducer;
