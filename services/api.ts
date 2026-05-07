// mobile/services/api.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.wheels.com.pk/api/v1';

// ── Create axios instance ────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-App-Version': Constants.expoConfig?.version || '1.0.0',
    'X-Platform': 'mobile',
  },
});

// ── Request interceptor: attach JWT ──────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: refresh token on 401 ──────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });

        await SecureStore.setItemAsync('access_token', data.access_token);
        api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;

        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear tokens and redirect to login
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // useAuthStore.getState().logout() — called from store
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed API methods ────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string) =>
    api.post('/auth/send-otp', { phone }),

  verifyOtp: (phone: string, otp: string, name?: string) =>
    api.post('/auth/verify-otp', { phone, otp, name }),

  googleLogin: (idToken: string) =>
    api.post('/auth/google', { id_token: idToken }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),

  getMe: () =>
    api.get('/auth/me'),
};

export const vehiclesApi = {
  search: (params: Record<string, any>) =>
    api.get('/vehicles', { params }),

  getFeatured: (limit = 10) =>
    api.get('/vehicles/featured', { params: { limit } }),

  getOne: (id: string) =>
    api.get(`/vehicles/${id}`),

  getMyListings: (status?: string) =>
    api.get('/vehicles/my-listings', { params: { status } }),

  create: (data: any) =>
    api.post('/vehicles', data),

  update: (id: string, data: any) =>
    api.put(`/vehicles/${id}`, data),

  uploadImages: (id: string, formData: FormData) =>
    api.post(`/vehicles/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),

  markSold: (id: string) =>
    api.post(`/vehicles/${id}/mark-sold`),

  delete: (id: string) =>
    api.delete(`/vehicles/${id}`),

  autocomplete: (q: string) =>
    api.get('/vehicles/autocomplete', { params: { q } }),
};

export const aiApi = {
  estimatePrice: (data: any) =>
    api.post('/ai/price-estimate', data),

  generateTitle: (data: any) =>
    api.post('/ai/generate-title', data),

  generateDescription: (data: any) =>
    api.post('/ai/generate-description', data),

  chatbot: (message: string, history: any[] = []) =>
    api.post('/ai/chatbot', { message, session_history: history }),

  ocrRegistration: (imageBase64: string) =>
    api.post('/ai/ocr-registration', { image_base64: imageBase64 }),

  getFraudScore: (vehicleId: string) =>
    api.post('/ai/fraud-score', { vehicle_id: vehicleId }),
};

export const chatApi = {
  getChats: (page = 1) =>
    api.get('/chats', { params: { page } }),

  startChat: (vehicleId: string, sellerId: string) =>
    api.post('/chats/start', { vehicle_id: vehicleId, seller_id: sellerId }),

  getMessages: (chatId: string, before?: string) =>
    api.get(`/chats/${chatId}/messages`, { params: { before, limit: 50 } }),

  respondToOffer: (offerId: string, response: string, counterPrice?: number) =>
    api.post(`/chats/offers/${offerId}/respond`, { response, counter_price: counterPrice }),

  archiveChat: (chatId: string) =>
    api.post(`/chats/${chatId}/archive`),
};

export const usersApi = {
  getMyProfile: () =>
    api.get('/users/me/profile'),

  updateProfile: (data: any) =>
    api.put('/users/me/profile', data),

  getProfile: (userId: string) =>
    api.get(`/users/${userId}`),

  followUser: (userId: string) =>
    api.post(`/users/${userId}/follow`),

  leaveReview: (userId: string, data: any) =>
    api.post(`/users/${userId}/review`, data),

  getSavedSearches: () =>
    api.get('/users/me/saved-searches'),

  createSavedSearch: (data: any) =>
    api.post('/users/me/saved-searches', data),

  deleteSavedSearch: (id: string) =>
    api.delete(`/users/me/saved-searches/${id}`),

  submitCnic: (data: any) =>
    api.post('/users/me/cnic', data),

  getReferralStats: () =>
    api.get('/users/me/referrals'),
};

export const dealersApi = {
  getDealerBySlug: (slug: string) =>
    api.get(`/dealers/${slug}`),

  getPackages: () =>
    api.get('/dealers/packages'),

  submitFinancingLead: (data: any) =>
    api.post('/dealers/leads/financing', data),

  submitInsuranceLead: (data: any) =>
    api.post('/dealers/leads/insurance', data),

  bookMechanic: (data: any) =>
    api.post('/dealers/mechanic-booking', data),
};

export const auctionsApi = {
  getAuctions: (status = 'live') =>
    api.get('/auctions', { params: { status } }),

  getAuction: (id: string) =>
    api.get(`/auctions/${id}`),
};

export const paymentsApi = {
  boostWithJazzCash: (vehicleId: string, pkg: string) =>
    api.post('/payments/boost/jazzcash', {
      vehicle_id: vehicleId,
      package: pkg,
      return_url: 'wheels://payment/result',
    }),

  boostWithEasyPaisa: (vehicleId: string, pkg: string, phone: string) =>
    api.post('/payments/boost/easypaisa', {
      vehicle_id: vehicleId,
      package: pkg,
      phone,
      return_url: 'wheels://payment/result',
    }),

  getPaymentHistory: () =>
    api.get('/payments/history'),
};

export default api;
