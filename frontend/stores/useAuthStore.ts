import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as firebase from '@/services/firebase';
import { api, type UserResponse } from '@/services/api';

const TOKEN_KEYS = {
  idToken: 'auth_id_token',
  refreshToken: 'auth_refresh_token',
  email: 'auth_email',
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
  email: string | null;
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
  email: null,
  user: null,
  isLoading: false,
  isRestoring: true,
  error: null,

  restoreSession: async () => {
    set({ isRestoring: true });
    try {
      const [idToken, refreshToken, email] = await Promise.all([
        getToken(TOKEN_KEYS.idToken),
        getToken(TOKEN_KEYS.refreshToken),
        getToken(TOKEN_KEYS.email),
      ]);

      if (!refreshToken || !email) {
        set({ isRestoring: false });
        return;
      }

      set({ accessToken: idToken, idToken, refreshToken, email });

      try {
        await get().fetchUser();
      } catch {
        const refreshed = await get().refresh();
        if (refreshed) {
          try {
            await get().fetchUser();
          } catch {
            // User might not have onboarded yet
          }
        } else {
          await get().logout();
        }
      }
    } catch {
      set({ accessToken: null, refreshToken: null, idToken: null, email: null });
    } finally {
      set({ isRestoring: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await firebase.login(email, password);

      await Promise.all([
        saveToken(TOKEN_KEYS.idToken, tokens.idToken),
        saveToken(TOKEN_KEYS.refreshToken, tokens.refreshToken),
        saveToken(TOKEN_KEYS.email, email),
      ]);

      set({
        accessToken: tokens.idToken,
        idToken: tokens.idToken,
        refreshToken: tokens.refreshToken,
        email,
        isLoading: false,
      });

      try {
        await get().fetchUser();
      } catch {
        // 404 means user hasn't onboarded — handled by navigation
      }
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  signup: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await firebase.signUp(email, password, fullName);

      await Promise.all([
        saveToken(TOKEN_KEYS.idToken, tokens.idToken),
        saveToken(TOKEN_KEYS.refreshToken, tokens.refreshToken),
        saveToken(TOKEN_KEYS.email, email),
      ]);

      set({
        accessToken: tokens.idToken,
        idToken: tokens.idToken,
        refreshToken: tokens.refreshToken,
        email,
        isLoading: false,
      });

      return { success: true, message: 'Verification email sent' };
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return { success: false, message: e.message };
    }
  },

  verifyEmail: async () => {
    set({ isLoading: true, error: null });
    try {
      await firebase.resendVerificationEmail();
      set({ isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  refresh: async () => {
    try {
      const newToken = await firebase.refreshIdToken();
      if (!newToken) return false;

      await saveToken(TOKEN_KEYS.idToken, newToken);
      set({ accessToken: newToken, idToken: newToken });
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    await firebase.logout();
    await Promise.all([
      saveToken(TOKEN_KEYS.idToken, null),
      saveToken(TOKEN_KEYS.refreshToken, null),
      saveToken(TOKEN_KEYS.email, null),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      idToken: null,
      email: null,
      user: null,
      error: null,
    });
  },

  fetchUser: async () => {
    const user = await api.getMe();
    set({ user });
  },

  clearError: () => set({ error: null }),
}));
