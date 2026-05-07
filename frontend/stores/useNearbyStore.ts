import { create } from 'zustand';
import * as Location from 'expo-location';
import { api, type NearbyUserResponse, type MatchedUserResponse } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';

export interface NearbyUser {
  id: string;
  displayName: string;
  program: string;
  year: number;
  interests: string[];
  origin: string;
  bio: string;
  matchScore: number;
  distanceMeters: number;
  profilePictureUrl: string | null;
  isAvailableToMeet: boolean;
  connectionsCount: number;
  matchReason?: string;
}

interface Introduction {
  id: string;
  targetUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  sentAt: string;
}

interface NearbyState {
  nearbyUsers: NearbyUser[];
  matchedUsers: NearbyUser[];
  selectedUser: NearbyUser | null;
  introductions: Introduction[];
  isScanning: boolean;
  isLoading: boolean;
  locationPermissionDenied: boolean;
  error: string | null;

  selectUser: (user: NearbyUser | null) => void;
  updateMyLocation: () => Promise<boolean>;
  fetchNearbyUsers: (radiusKm?: number) => Promise<void>;
  fetchMatchedUsers: (limit?: number) => Promise<void>;
  sendConnectionRequest: (userId: string) => Promise<boolean>;
  getIntroForUser: (userId: string) => Introduction | undefined;
}

function apiUserToNearbyUser(item: NearbyUserResponse): NearbyUser {
  return {
    id: item.user.id,
    displayName: item.user.full_name,
    program: item.user.major || 'Undeclared',
    year: item.user.year_standing || 1,
    interests: item.user.interests || [],
    origin: item.user.origin || '',
    bio: item.user.bio || '',
    matchScore: 0,
    distanceMeters: Math.round(item.distance_km * 1000),
    profilePictureUrl: item.user.profile_picture_url,
    isAvailableToMeet: item.user.is_available_to_meet,
    connectionsCount: item.user.connections_count,
  };
}

function matchedUserToNearbyUser(item: MatchedUserResponse): NearbyUser {
  return {
    id: item.user.id,
    displayName: item.user.full_name,
    program: item.user.major || 'Undeclared',
    year: item.user.year_standing || 1,
    interests: item.user.interests || [],
    origin: item.user.origin || '',
    bio: item.user.bio || '',
    matchScore: Math.round(item.match_score * 100),
    distanceMeters: 0,
    profilePictureUrl: item.user.profile_picture_url,
    isAvailableToMeet: item.user.is_available_to_meet,
    connectionsCount: item.user.connections_count,
    matchReason: item.match_reason,
  };
}

export const useNearbyStore = create<NearbyState>((set, get) => ({
  nearbyUsers: [],
  matchedUsers: [],
  selectedUser: null,
  introductions: [],
  isScanning: false,
  isLoading: false,
  locationPermissionDenied: false,
  error: null,

  selectUser: (user) => set({ selectedUser: user }),

  updateMyLocation: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      set({ locationPermissionDenied: true });
      return false;
    }
    set({ locationPermissionDenied: false });
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await api.updateLocation(location.coords.latitude, location.coords.longitude);
    return true;
  },

  fetchNearbyUsers: async (radiusKm = 5.0) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    set({ isScanning: true, isLoading: true, error: null });
    try {
      const locationUpdated = await get().updateMyLocation();
      if (!locationUpdated) {
        set({ isScanning: false, isLoading: false, error: 'Location permission required' });
        return;
      }
      const data = await api.getNearbyUsers(radiusKm);
      set({
        nearbyUsers: data.map(apiUserToNearbyUser),
        isScanning: false,
        isLoading: false,
      });
    } catch (e: any) {
      set({ isScanning: false, isLoading: false, error: e.message });
    }
  },

  fetchMatchedUsers: async (limit = 10) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const data = await api.getMatchedUsers(limit);
      set({
        matchedUsers: data.matches.map(matchedUserToNearbyUser),
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  sendConnectionRequest: async (userId) => {
    try {
      const connection = await api.sendConnectionRequest(userId);
      set({
        introductions: [
          ...get().introductions,
          {
            id: connection.id,
            targetUserId: userId,
            status: 'pending',
            sentAt: connection.created_at,
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  },

  getIntroForUser: (userId) => {
    return get().introductions.find((i) => i.targetUserId === userId);
  },
}));
