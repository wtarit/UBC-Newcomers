import { create } from 'zustand';
import * as Location from 'expo-location';
import { api, type NearbyUserResponse, type MatchedUserResponse, type ConnectionResponse } from '@/services/api';
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
  ubcVerified: boolean;
  connectionsCount: number;
  matchReason?: string;
}

export interface PendingConnection {
  id: string;
  requester: {
    id: string;
    fullName: string;
    major: string;
    origin: string;
    interests: string[];
  };
  createdAt: string;
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
  pendingConnections: PendingConnection[];
  isScanning: boolean;
  isLoading: boolean;
  locationPermissionDenied: boolean;
  error: string | null;
  pollingInterval: ReturnType<typeof setInterval> | null;

  selectUser: (user: NearbyUser | null) => void;
  updateMyLocation: () => Promise<boolean>;
  fetchNearbyUsers: (radiusKm?: number) => Promise<void>;
  fetchMatchedUsers: (limit?: number) => Promise<void>;
  fetchPendingConnections: () => Promise<void>;
  sendConnectionRequest: (userId: string) => Promise<boolean>;
  acceptConnectionRequest: (connectionId: string) => Promise<boolean>;
  declineConnectionRequest: (connectionId: string) => Promise<boolean>;
  getIntroForUser: (userId: string) => Introduction | undefined;
  startPolling: () => void;
  stopPolling: () => void;
  refreshAll: () => Promise<void>;
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
    ubcVerified: item.user.ubc_verified,
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
    ubcVerified: item.user.ubc_verified,
    connectionsCount: item.user.connections_count,
    matchReason: item.match_reason,
  };
}

function connectionToPending(conn: ConnectionResponse): PendingConnection {
  return {
    id: conn.id,
    requester: {
      id: conn.requester.id,
      fullName: conn.requester.full_name,
      major: conn.requester.major || 'Undeclared',
      origin: conn.requester.origin || '',
      interests: conn.requester.interests || [],
    },
    createdAt: conn.created_at,
  };
}

const POLL_INTERVAL_MS = 15000;

export const useNearbyStore = create<NearbyState>((set, get) => ({
  nearbyUsers: [],
  matchedUsers: [],
  selectedUser: null,
  introductions: [],
  pendingConnections: [],
  isScanning: false,
  isLoading: false,
  locationPermissionDenied: false,
  error: null,
  pollingInterval: null,

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

  fetchPendingConnections: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    try {
      const data = await api.listPendingConnections();
      set({ pendingConnections: data.connections.map(connectionToPending) });
    } catch {
      // silent fail for polling
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

  acceptConnectionRequest: async (connectionId) => {
    try {
      await api.acceptConnection(connectionId);
      set({
        pendingConnections: get().pendingConnections.filter(c => c.id !== connectionId),
      });
      return true;
    } catch {
      return false;
    }
  },

  declineConnectionRequest: async (connectionId) => {
    try {
      await api.declineConnection(connectionId);
      set({
        pendingConnections: get().pendingConnections.filter(c => c.id !== connectionId),
      });
      return true;
    } catch {
      return false;
    }
  },

  getIntroForUser: (userId) => {
    return get().introductions.find((i) => i.targetUserId === userId);
  },

  startPolling: () => {
    const existing = get().pollingInterval;
    if (existing) return;

    const interval = setInterval(() => {
      const token = useAuthStore.getState().accessToken;
      if (!token) return;
      get().fetchPendingConnections();
      get().fetchNearbyUsers();
    }, POLL_INTERVAL_MS);

    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const interval = get().pollingInterval;
    if (interval) {
      clearInterval(interval);
      set({ pollingInterval: null });
    }
  },

  refreshAll: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    await Promise.all([
      get().fetchNearbyUsers(),
      get().fetchMatchedUsers(),
      get().fetchPendingConnections(),
    ]);
  },
}));
