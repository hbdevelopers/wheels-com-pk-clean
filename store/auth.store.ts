// mobile/store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { authApi, usersApi } from '../services/api';

interface User {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  role: string;
  city?: string;
  phone_verified: boolean;
  cnic_verified: boolean;
  trust_score: number;
  referral_code?: string;
  preferred_language: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<{ isNewUser: boolean }>;
  googleLogin: (idToken: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Secure storage adapter for Zustand persist
const secureStorage = {
  getItem: async (name: string) => {
    const value = await SecureStore.getItemAsync(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      sendOtp: async (phone: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.sendOtp(phone);
          set({ isLoading: false });
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.message || 'Failed to send OTP',
          });
          throw err;
        }
      },

      verifyOtp: async (phone: string, otp: string, name?: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.verifyOtp(phone, otp, name);

          // Persist tokens securely
          await SecureStore.setItemAsync('access_token', data.access_token);
          await SecureStore.setItemAsync('refresh_token', data.refresh_token);

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });

          return { isNewUser: data.is_new_user };
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.message || 'Invalid OTP',
          });
          throw err;
        }
      },

      googleLogin: async (idToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.googleLogin(idToken);
          await SecureStore.setItemAsync('access_token', data.access_token);
          await SecureStore.setItemAsync('refresh_token', data.refresh_token);
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ isLoading: false, error: err.response?.data?.message || 'Google login failed' });
          throw err;
        }
      },

      refreshProfile: async () => {
        try {
          const { data } = await usersApi.getMyProfile();
          set({ user: data });
        } catch {
          // Silent fail
        }
      },

      updateProfile: async (updates: Partial<User>) => {
        set({ isLoading: true });
        try {
          const { data } = await usersApi.updateProfile(updates);
          set({ user: { ...get().user!, ...data }, isLoading: false });
        } catch (err: any) {
          set({ isLoading: false, error: err.response?.data?.message });
          throw err;
        }
      },

      logout: async () => {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'wheels-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);

// ─────────────────────────────────────────────────────────────
// mobile/store/listing.store.ts

import { vehiclesApi } from '../services/api';

interface ListingFilters {
  q?: string;
  vehicle_type?: string;
  make?: string;
  model?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
  min_year?: number;
  max_year?: number;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  assembly?: string;
  inspected_only?: boolean;
  sort?: string;
}

interface ListingState {
  results: any[];
  featured: any[];
  total: number;
  page: number;
  hasNext: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  filters: ListingFilters;
  savedIds: Set<string>;

  search: (filters?: ListingFilters, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: ListingFilters) => void;
  clearFilters: () => void;
  toggleSaved: (vehicleId: string) => void;
  loadFeatured: () => Promise<void>;
}

export const useListingStore = create<ListingState>((set, get) => ({
  results: [],
  featured: [],
  total: 0,
  page: 1,
  hasNext: false,
  isLoading: false,
  isLoadingMore: false,
  filters: {},
  savedIds: new Set(),

  search: async (filters?: ListingFilters, reset = true) => {
    const newFilters = filters || get().filters;
    set({ isLoading: reset, isLoadingMore: !reset, filters: newFilters });

    try {
      const page = reset ? 1 : get().page + 1;
      const { data } = await vehiclesApi.search({ ...newFilters, page, limit: 20 });

      set({
        results: reset ? data.data : [...get().results, ...data.data],
        total: data.meta.total,
        page: data.meta.page,
        hasNext: data.meta.has_next,
        isLoading: false,
        isLoadingMore: false,
      });
    } catch {
      set({ isLoading: false, isLoadingMore: false });
    }
  },

  loadMore: async () => {
    if (!get().hasNext || get().isLoadingMore) return;
    await get().search(undefined, false);
  },

  setFilters: (filters: ListingFilters) => {
    set({ filters });
    get().search(filters, true);
  },

  clearFilters: () => {
    set({ filters: {} });
    get().search({}, true);
  },

  toggleSaved: (vehicleId: string) => {
    const saved = new Set(get().savedIds);
    saved.has(vehicleId) ? saved.delete(vehicleId) : saved.add(vehicleId);
    set({ savedIds: saved });
    // TODO: persist to API
  },

  loadFeatured: async () => {
    try {
      const { data } = await vehiclesApi.getFeatured(10);
      set({ featured: data });
    } catch { /* silent */ }
  },
}));
