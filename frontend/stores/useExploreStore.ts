import { create } from 'zustand';
import { EXPLORE_ZONES, type ExploreZone } from '@/constants/Zones';
import { api, type LandmarkResponse, type EventResponse } from '@/services/api';

interface ZoneUnlock {
  zoneId: string;
  unlockedAt: string;
}

interface ExploreState {
  zones: ExploreZone[];
  landmarks: LandmarkResponse[];
  events: EventResponse[];
  unlockedZones: ZoneUnlock[];
  selectedZone: ExploreZone | null;
  selectedEvent: EventResponse | null;
  totalPoints: number;
  isLoading: boolean;

  selectZone: (zone: ExploreZone | null) => void;
  selectEvent: (event: EventResponse | null) => void;
  unlockZone: (zoneId: string) => void;
  isZoneUnlocked: (zoneId: string) => boolean;
  getProgress: () => { unlocked: number; total: number; percentage: number };
  getPointsForZone: (zoneId: string) => number;
  fetchLandmarks: () => Promise<void>;
  fetchEvents: () => Promise<void>;
}

export const useExploreStore = create<ExploreState>((set, get) => ({
  zones: EXPLORE_ZONES,
  landmarks: [],
  events: [],
  unlockedZones: [],
  selectedZone: null,
  selectedEvent: null,
  totalPoints: 0,
  isLoading: false,

  selectZone: (zone) => set({ selectedZone: zone, selectedEvent: null }),
  selectEvent: (event) => set({ selectedEvent: event, selectedZone: null }),

  unlockZone: (zoneId) => {
    const state = get();
    if (state.isZoneUnlocked(zoneId)) return;

    const zone = state.zones.find((z) => z.id === zoneId);
    if (!zone) return;

    set({
      unlockedZones: [
        ...state.unlockedZones,
        { zoneId, unlockedAt: new Date().toISOString() },
      ],
      totalPoints: state.totalPoints + zone.points,
    });
  },

  isZoneUnlocked: (zoneId) => {
    return get().unlockedZones.some((u) => u.zoneId === zoneId);
  },

  getProgress: () => {
    const state = get();
    const unlocked = state.unlockedZones.length;
    const total = state.zones.length;
    return {
      unlocked,
      total,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
    };
  },

  getPointsForZone: (zoneId) => {
    const zone = get().zones.find((z) => z.id === zoneId);
    return zone?.points ?? 0;
  },

  fetchLandmarks: async () => {
    set({ isLoading: true });
    try {
      const data = await api.listLandmarks();
      set({ landmarks: data.landmarks, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchEvents: async () => {
    set({ isLoading: true });
    try {
      const data = await api.listEvents(0, 50);
      set({ events: data.events, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
