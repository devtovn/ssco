import { create } from 'zustand';

interface SearchState {
  query: string;
  category: string | null;
  priceRange: { min: number; max: number } | null;
  setQuery: (query: string) => void;
  setCategory: (category: string | null) => void;
  setPriceRange: (range: { min: number; max: number } | null) => void;
  resetFilters: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  category: null,
  priceRange: null,
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  setPriceRange: (priceRange) => set({ priceRange }),
  resetFilters: () => set({ query: '', category: null, priceRange: null }),
}));
