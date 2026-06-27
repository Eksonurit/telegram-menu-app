import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TelegramUser } from '@/types';

interface AppState {
  isReady: boolean;
  user: TelegramUser | null;
}

const initialState: AppState = {
  isReady: false,
  user: null,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setReady: (state, action: PayloadAction<boolean>) => {
      state.isReady = action.payload;
    },
    setUser: (state, action: PayloadAction<TelegramUser | null>) => {
      state.user = action.payload;
    },
  },
});

export const { setReady, setUser } = appSlice.actions;
export const appReducer = appSlice.reducer;
