import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as firebase from '@/services/firebase';
import { api, configureAuth, type UserResponse } from '@/services/api';

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
  otpEmail: string | null;
  otpExpiresAt: number | null;

  signInWithGoogle: () => Promise<boolean>;
  sendOTP: (email: string) => Promise<boolean>;
  verifyOTP: (email: string, code: string) => Promise<{ success: boolean; isNewUser: boolean; ubcVerified: boolean }>;
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
  otpEmail: null,
  otpExpiresAt: null,

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

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await firebase.signInWithGoogle();
      const user = firebase.getCurrentUser();
      const email = user?.email || '';

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

  sendOTP: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await api.sendOTP(email);
      set({
        isLoading: false,
        otpEmail: email,
        otpExpiresAt: Date.now() + resp.expires_in_seconds * 1000,
      });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  verifyOTP: async (email: string, code: string) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await api.verifyOTP(email, code);
      const tokens = await firebase.signInWithCustomToken(resp.firebase_custom_token);

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
        otpEmail: null,
        otpExpiresAt: null,
      });

      if (!resp.is_new_user) {
        try {
          await get().fetchUser();
        } catch {
          // user profile fetch failed — navigation guard handles it
        }
      }

      return { success: true, isNewUser: resp.is_new_user, ubcVerified: resp.ubc_verified };
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return { success: false, isNewUser: false, ubcVerified: false };
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
      otpEmail: null,
      otpExpiresAt: null,
    });
  },

  fetchUser: async () => {
    const user = await api.getMe();
    set({ user });
  },

  clearError: () => set({ error: null }),
}));

configureAuth({
  getToken: () => useAuthStore.getState().accessToken,
  refresh: () => useAuthStore.getState().refresh(),
  logout: () => useAuthStore.getState().logout(),
});
