// mobile/store/listing.store.ts
import { create } from 'zustand';
import { vehiclesApi } from '../services/api';

export interface VehicleListItem {
  id: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  price: number;
  mileage?: number;
  city: string;
  fuel_type?: string;
  transmission?: string;
  color?: string;
  inspection_badge: boolean;
  fraud_risk_score: number;
  is_featured: boolean;
  is_boosted: boolean;
  view_count: number;
  created_at: string;
  status: string;
  vehicle_type: string;
  primary_image?: { url: string; thumbnail_url: string };
  seller?: { id: string; full_name: string; avg_rating: number };
}

export interface SearchFilters {
  q?: string;
  vehicle_type?: string;
  make?: string;
  model?: string;
  city?: string;
  registered_city?: string;
  min_price?: number;
  max_price?: number;
  min_year?: number;
  max_year?: number;
  min_mileage?: number;
  max_mileage?: number;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  assembly?: string;
  condition?: string;
  inspected_only?: boolean;
  dealer_only?: boolean;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'mileage_asc' | 'popular';
}

interface ListingState {
  // Search results
  results: VehicleListItem[];
  total: number;
  page: number;
  hasNext: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  filters: SearchFilters;
  lastSearchTime: number;

  // Featured listings
  featured: VehicleListItem[];
  isFeaturedLoading: boolean;

  // Saved listings (local + synced)
  savedIds: Set<string>;

  // Recently viewed
  recentlyViewed: string[];

  // Actions
  search: (filters?: SearchFilters, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  loadFeatured: () => Promise<void>;
  toggleSaved: (vehicleId: string) => void;
  isSaved: (vehicleId: string) => boolean;
  addRecentlyViewed: (vehicleId: string) => void;
  clearResults: () => void;
}

export const useListingStore = create<ListingState>((set, get) => ({
  results: [],
  total: 0,
  page: 1,
  hasNext: false,
  isLoading: false,
  isLoadingMore: false,
  filters: { sort: 'newest', vehicle_type: 'car' },
  lastSearchTime: 0,

  featured: [],
  isFeaturedLoading: false,

  savedIds: new Set(),
  recentlyViewed: [],

  // ── Search ────────────────────────────────────────────────

  search: async (filters?: SearchFilters, reset = true) => {
    const activeFilters = filters ?? get().filters;

    // Debounce: skip if same search within 500ms
    const now = Date.now();
    if (reset && now - get().lastSearchTime < 500 && !filters) return;

    set({
      isLoading: reset,
      isLoadingMore: !reset,
      filters: activeFilters,
      lastSearchTime: now,
    });

    try {
      const currentPage = reset ? 1 : get().page + 1;
      const { data } = await vehiclesApi.search({
        ...activeFilters,
        page: currentPage,
        limit: 20,
      });

      set({
        results: reset ? data.data : [...get().results, ...data.data],
        total: data.meta.total,
        page: data.meta.page,
        hasNext: data.meta.has_next,
        isLoading: false,
        isLoadingMore: false,
      });
    } catch (err) {
      console.error('[ListingStore] Search error:', err);
      set({ isLoading: false, isLoadingMore: false });
    }
  },

  loadMore: async () => {
    if (!get().hasNext || get().isLoadingMore || get().isLoading) return;
    await get().search(undefined, false);
  },

  setFilters: (filters: SearchFilters) => {
    set({ filters, page: 1, results: [] });
    get().search(filters, true);
  },

  clearFilters: () => {
    const defaultFilters: SearchFilters = { sort: 'newest', vehicle_type: 'car' };
    set({ filters: defaultFilters, page: 1, results: [] });
    get().search(defaultFilters, true);
  },

  clearResults: () => set({ results: [], total: 0, page: 1, hasNext: false }),

  // ── Featured ──────────────────────────────────────────────

  loadFeatured: async () => {
    if (get().isFeaturedLoading || get().featured.length > 0) return;
    set({ isFeaturedLoading: true });
    try {
      const { data } = await vehiclesApi.getFeatured(10);
      set({ featured: data, isFeaturedLoading: false });
    } catch {
      set({ isFeaturedLoading: false });
    }
  },

  // ── Saved ─────────────────────────────────────────────────

  toggleSaved: (vehicleId: string) => {
    const saved = new Set(get().savedIds);
    if (saved.has(vehicleId)) {
      saved.delete(vehicleId);
    } else {
      saved.add(vehicleId);
    }
    set({ savedIds: saved });
    // Sync to backend
    import('../services/api').then(({ default: api }) => {
      api.post(`/users/me/saved/${vehicleId}`).catch(() => {});
    });
  },

  isSaved: (vehicleId: string) => get().savedIds.has(vehicleId),

  // ── Recently viewed ───────────────────────────────────────

  addRecentlyViewed: (vehicleId: string) => {
    const current = get().recentlyViewed.filter(id => id !== vehicleId);
    set({ recentlyViewed: [vehicleId, ...current].slice(0, 20) });
  },
}));
