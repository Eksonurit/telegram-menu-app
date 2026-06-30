import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '@/services/api.service';
import {
  analyzeProductPhotos,
  generateFromIngredientList,
  LIMIT_REACHED_KEY,
  translateRecipes as translateRecipesApi,
} from '@/services/recipe.service';
import type { Locale } from '@/i18n/types';
import type {
  AnalyzeRecipesResponse,
  DetectIngredientsResponse,
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
}

const initialState: RecipeState = {
  status: 'idle',
  ingredients: [],
  recipes: [],
  error: null,
  remaining: null,
  total: 3,
  limitReached: false,
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
      })
      .addCase(translateRecipes.rejected, (state, action) => {
        // При помилці перекладу повертаємо 'success' — старі рецепти залишаються
        state.status = 'success';
        state.error = action.payload ?? 'errorAnalysisFailed';
      });
  },
});

export const { resetAnalysis, dismissLimitReached } = recipeSlice.actions;
export const recipeReducer = recipeSlice.reducer;
