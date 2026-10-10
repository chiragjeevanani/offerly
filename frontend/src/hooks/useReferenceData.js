import { useQuery } from '@tanstack/react-query';
import { cityAPI } from '../api/city.api';
import { categoryAPI } from '../api/category.api';

// Cities and categories are admin-managed reference data that almost never
// change mid-session. Every screen that needs them goes through these hooks so
// they share one cached request, instead of each page refetching on every visit.
const REFERENCE_STALE_MS = 30 * 60 * 1000;

const pickCities = (res) => res?.cities || [];
const pickCategories = (res) => res?.categories || [];

export const useCities = () =>
  useQuery({
    queryKey: ['cities'],
    queryFn: () => cityAPI.getAll(),
    select: pickCities,
    staleTime: REFERENCE_STALE_MS,
  });

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryAPI.getAll(),
    select: pickCategories,
    staleTime: REFERENCE_STALE_MS,
  });
