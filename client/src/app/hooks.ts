import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/app/store';

export function useAppDispatch(): AppDispatch {
  return useDispatch<AppDispatch>();
}

export function useAppSelector<T>(selector: (state: RootState) => T): T {
  return useSelector(selector);
}
