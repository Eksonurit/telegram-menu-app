import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '@/services/api.service';
import { analyzeProductPhotos } from '@/services/recipe.service';
import type {
  AnalyzeRecipesResponse,
  RecipeItem,
  RecipeStatus,
} from '@/types/recipe.types';

interface RecipeState {
  status: RecipeStatus;
  ingredients: string[];
  recipes: RecipeItem[];
  /** Рядок помилки або i18n-ключ (App.tsx розрізняє та перекладає) */
  error: string | null;
}

const initialState: RecipeState = {
  status: 'idle',
  ingredients: [],
  recipes: [],
  error: null,
};

export const analyzePhotos = createAsyncThunk<
  AnalyzeRecipesResponse,
  File[],
  { rejectValue: string }
>('recipe/analyzePhotos', async (photos, { rejectWithValue }) => {
  try {
    return await analyzeProductPhotos(photos);
  } catch (error) {
    if (error instanceof ApiError) {
      return rejectWithValue(error.message);
    }
    // Загальна мережева помилка — i18n-ключ, App.tsx переведе
    return rejectWithValue('errorAnalysisFailed');
  }
});

export const recipeSlice = createSlice({
  name: 'recipe',
  initialState,
  reducers: {
    resetAnalysis: (state) => {
      state.status = 'idle';
      state.ingredients = [];
      state.recipes = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzePhotos.pending, (state) => {
        state.status = 'analyzing';
        state.error = null;
      })
      .addCase(analyzePhotos.fulfilled, (state, action) => {
        state.status = 'success';
        state.ingredients = action.payload.ingredients;
        state.recipes = action.payload.recipes;
        state.error = null;
      })
      .addCase(analyzePhotos.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'errorAnalysisFailed';
      });
  },
});

export const { resetAnalysis } = recipeSlice.actions;
export const recipeReducer = recipeSlice.reducer;
