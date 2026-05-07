import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api, type UserResponse } from '@/services/api';

const TOKEN_KEYS = {
  access: 'auth_access_token',
  refresh: 'auth_refresh_token',
  id: 'auth_id_token',
} as const;

async function saveToken(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } else {
    if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  }
}

async function getToken(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  user: UserResponse | null;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; message: string }>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  idToken: null,
  user: null,
  isLoading: false,
  isRestoring: true,
  error: null,

  restoreSession: async () => {
    set({ isRestoring: true });
    try {
      const [accessToken, refreshToken, idToken] = await Promise.all([
        getToken(TOKEN_KEYS.access),
        getToken(TOKEN_KEYS.refresh),
        getToken(TOKEN_KEYS.id),
      ]);

      if (!refreshToken) {
        set({ isRestoring: false });
        return;
      }

      set({ accessToken, refreshToken, idToken });

      const refreshed = await get().refresh();
      if (refreshed) {
        await get().fetchUser();
      } else {
        await get().logout();
      }
    } catch {
      set({ accessToken: null, refreshToken: null, idToken: null });
    } finally {
      set({ isRestoring: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await api.login(email, password);
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token;
      const idToken = tokens.id_token;

      await Promise.all([
        saveToken(TOKEN_KEYS.access, accessToken),
        saveToken(TOKEN_KEYS.refresh, refreshToken),
        saveToken(TOKEN_KEYS.id, idToken),
      ]);

      set({ accessToken, refreshToken, idToken, isLoading: false });
      await get().fetchUser();
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  signup: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.signup(email, password, fullName);
      set({ isLoading: false });
      return { success: true, message: result.message };
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return { success: false, message: e.message };
    }
  },

  verifyEmail: async (email, code) => {
    set({ isLoading: true, error: null });
    try {
      await api.verify(email, code);
      set({ isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  refresh: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return false;
    try {
      const tokens = await api.refreshToken(refreshToken);
      const accessToken = tokens.access_token;
      const idToken = tokens.id_token;

      await Promise.all([
        saveToken(TOKEN_KEYS.access, accessToken),
        saveToken(TOKEN_KEYS.id, idToken),
      ]);

      set({ accessToken, idToken });
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    await Promise.all([
      saveToken(TOKEN_KEYS.access, null),
      saveToken(TOKEN_KEYS.refresh, null),
      saveToken(TOKEN_KEYS.id, null),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      idToken: null,
      user: null,
      error: null,
    });
  },

  fetchUser: async () => {
    try {
      const user = await api.getMe();
      set({ user });
    } catch {
      // Token might be invalid
    }
  },

  clearError: () => set({ error: null }),
}));
