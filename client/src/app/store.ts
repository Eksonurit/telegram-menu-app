import { configureStore } from '@reduxjs/toolkit';
import { appReducer } from '@/app/slices/appSlice';
import { recipeReducer } from '@/app/slices/recipeSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    recipe: recipeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
