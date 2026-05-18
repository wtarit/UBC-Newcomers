const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

type AuthProvider = {
  getToken: () => string | null;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
};

let auth: AuthProvider = {
  getToken: () => null,
  refresh: async () => false,
  logout: async () => {},
};

export function configureAuth(provider: AuthProvider) {
  auth = provider;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  params?: Record<string, string | number>;
};

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth: useAuth = true, params } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      searchParams.set(key, String(val));
    }
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (useAuth) {
    const token = auth.getToken();
    if (!token) throw new ApiError(401, 'Not authenticated');
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && useAuth) {
    const refreshed = await auth.refresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${auth.getToken()}`;
      const retry = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ detail: 'Request failed' }));
        throw new ApiError(retry.status, err.detail || 'Request failed');
      }
      return retry.json();
    }
    auth.logout();
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new ApiError(res.status, err.detail || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth - OTP
  sendOTP: (email: string) =>
    request<OTPSendResponse>('/auth/otp/send', { method: 'POST', body: { email }, auth: false }),

  verifyOTP: (email: string, code: string) =>
    request<OTPVerifyResponse>('/auth/otp/verify', { method: 'POST', body: { email, code }, auth: false }),

  sendUBCVerifyOTP: (email: string) =>
    request<OTPSendResponse>('/auth/ubc-verify/send', { method: 'POST', body: { email } }),

  confirmUBCVerify: (email: string, code: string) =>
    request<UserResponse>('/auth/ubc-verify/confirm', { method: 'POST', body: { email, code } }),

  // Users
  getMe: () => request<UserResponse>('/users/me'),

  onboarding: (data: OnboardingRequest) =>
    request<UserResponse>('/users/onboarding', { method: 'POST', body: data }),

  updateProfile: (data: UpdateProfileRequest) =>
    request<UserResponse>('/users/me', { method: 'PUT', body: data }),

  updateLocation: (latitude: number, longitude: number) =>
    request<UserResponse>('/users/me/location', { method: 'PUT', body: { latitude, longitude } }),

  setHomeLocation: (latitude: number, longitude: number) =>
    request<UserResponse>('/users/me/home-location', { method: 'PUT', body: { latitude, longitude } }),

  updateAvailability: (is_available_to_meet: boolean) =>
    request<UserResponse>('/users/me/availability', { method: 'PUT', body: { is_available_to_meet } }),

  getPresignedUpload: (content_type = 'image/jpeg') =>
    request<{ upload_url: string; file_key: string }>('/users/me/presigned-upload', {
      params: { content_type },
    }),

  uploadProfilePhoto: async (localUri: string, contentType = 'image/jpeg'): Promise<UserResponse> => {
    const { upload_url } = await api.getPresignedUpload(contentType);

    const blob = await fetch(localUri).then(r => r.blob());
    const putRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });

    if (!putRes.ok) {
      throw new ApiError(putRes.status, 'S3 upload failed');
    }

    return api.getMe();
  },

  getStats: () => request<UserStatsResponse>('/users/me/stats'),

  getNearbyUsers: (radius_km = 5.0) =>
    request<NearbyUserResponse[]>('/users/nearby', { params: { radius_km } }),

  getUser: (userId: string) =>
    request<UserPublicResponse>(`/users/${userId}`),

  // Events
  listEvents: (skip = 0, limit = 20) =>
    request<EventListResponse>('/events', { params: { skip, limit }, auth: false }),

  listNearbyEvents: (radius_km = 10.0, skip = 0, limit = 20) =>
    request<EventListResponse>('/events/nearby', { params: { radius_km, skip, limit } }),

  createEvent: (data: CreateEventRequest) =>
    request<EventResponse>('/events', { method: 'POST', body: data }),

  // Connections
  sendConnectionRequest: (userId: string) =>
    request<ConnectionResponse>(`/connections/request/${userId}`, { method: 'POST' }),

  acceptConnection: (connectionId: string) =>
    request<ConnectionResponse>(`/connections/${connectionId}/accept`, { method: 'PUT' }),

  declineConnection: (connectionId: string) =>
    request<ConnectionResponse>(`/connections/${connectionId}/decline`, { method: 'PUT' }),

  listConnections: () =>
    request<ConnectionListResponse>('/connections'),

  listConnectionLocations: () =>
    request<ConnectionLocationsListResponse>('/connections/locations'),

  listPendingConnections: () =>
    request<ConnectionListResponse>('/connections/pending'),
  getConnectionLocations: (connectionId: string) =>
    request<ConnectionLocationPairResponse>(`/connections/${connectionId}/location`),
  listConnectionMessages: (connectionId: string) =>
    request<ConnectionMessageListResponse>(`/connections/${connectionId}/messages`),
  sendConnectionMessage: (connectionId: string, body: string) =>
    request<ConnectionMessageResponse>(`/connections/${connectionId}/messages`, { method: 'POST', body: { body } }),
  markConnectionMet: (connectionId: string, landmark_name?: string) =>
    request<ConnectionResponse>(
      `/connections/${connectionId}/met${landmark_name ? `?landmark_name=${encodeURIComponent(landmark_name)}` : ''}`,
      { method: 'PUT' },
    ),

  // Matching
  getMatchedUsers: (limit = 10) =>
    request<UserMatchListResponse>('/matching/users', { params: { limit } }),

  getMatchedEvents: (limit = 10) =>
    request<EventMatchListResponse>('/matching/events', { params: { limit } }),

  // Landmarks
  listLandmarks: () =>
    request<LandmarkListResponse>('/landmarks', { auth: false }),

  getLandmark: (landmarkId: string) =>
    request<LandmarkResponse>(`/landmarks/${landmarkId}`, { auth: false }),

  // Meetups
  createMeetup: (landmark_id: string, scheduled_time: string) =>
    request<MeetupResponse>('/meetups', { method: 'POST', body: { landmark_id, scheduled_time } }),

  listMeetups: (radius_km = 5.0) =>
    request<MeetupListResponse>('/meetups', { params: { radius_km } }),

  joinMeetup: (meetupId: string) =>
    request<MeetupResponse>(`/meetups/${meetupId}/join`, { method: 'PUT' }),

  completeMeetup: (meetupId: string) =>
    request<MeetupResponse>(`/meetups/${meetupId}/complete`, { method: 'PUT' }),

  cancelMeetup: (meetupId: string) =>
    request<MeetupResponse>(`/meetups/${meetupId}/cancel`, { method: 'PUT' }),
};

// Types matching backend schemas

export interface OTPSendResponse {
  message: string;
  expires_in_seconds: number;
}

export interface OTPVerifyResponse {
  firebase_custom_token: string;
  is_new_user: boolean;
  ubc_verified: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  major: string | null;
  year_standing: number | null;
  origin: string | null;
  interests: string[] | null;
  transfer_from: string | null;
  faculty: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  home_latitude: number | null;
  home_longitude: number | null;
  is_available_to_meet: boolean;
  ubc_verified: boolean;
  connections_count: number;
  meetups_completed: number;
  events_attended: number;
  created_at: string;
}

export interface UserPublicResponse {
  id: string;
  full_name: string;
  major: string | null;
  year_standing: number | null;
  origin: string | null;
  interests: string[] | null;
  faculty: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  is_available_to_meet: boolean;
  ubc_verified: boolean;
  connections_count: number;
}

export interface NearbyUserResponse {
  user: UserPublicResponse;
  distance_km: number;
}

export interface UserStatsResponse {
  connections_count: number;
  meetups_completed: number;
  events_attended: number;
  member_since: string;
}

export interface OnboardingRequest {
  full_name: string;
  major?: string;
  year_standing?: number;
  origin?: string;
  interests?: string[];
  transfer_from?: string;
  faculty?: string;
  bio?: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  major?: string;
  year_standing?: number;
  origin?: string;
  interests?: string[];
  transfer_from?: string;
  faculty?: string;
  bio?: string;
}

export interface EventResponse {
  id: string;
  title: string;
  description: string | null;
  source: string;
  source_url: string | null;
  club_name: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  event_date: string | null;
  created_at: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  club_name?: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  event_date?: string;
}

export interface EventListResponse {
  events: EventResponse[];
  total: number;
}

export interface ConnectionResponse {
  id: string;
  requester: UserPublicResponse;
  receiver: UserPublicResponse;
  status: 'pending' | 'accepted' | 'declined';
  met_at_landmark: string | null;
  created_at: string;
}

export interface ConnectionListResponse {
  connections: ConnectionResponse[];
  total: number;
}

export interface ConnectionLocationResponse {
  id: string;
  full_name: string;
  major: string | null;
  origin: string | null;
  interests: string[] | null;
  profile_picture_url: string | null;
  is_available_to_meet: boolean;
  latitude: number | null;
  longitude: number | null;
  connected_at: string;
}

export interface ConnectionLocationsListResponse {
  connections: ConnectionLocationResponse[];
  total: number;
}

export interface ConnectionLocationBriefResponse {
  user_id: string;
  full_name: string;
  latitude: number | null;
  longitude: number | null;
  last_active_at: string | null;
}

export interface ConnectionLocationPairResponse {
  mine: ConnectionLocationBriefResponse;
  theirs: ConnectionLocationBriefResponse;
}

export interface ConnectionMessageResponse {
  id: string;
  connection_id: string;
  sender: UserPublicResponse;
  body: string;
  created_at: string;
}

export interface ConnectionMessageListResponse {
  messages: ConnectionMessageResponse[];
  total: number;
}

export interface MatchedUserResponse {
  user: UserPublicResponse;
  match_score: number;
  match_reason: string;
}

export interface MatchedEventResponse {
  event: EventResponse;
  match_score: number;
  match_reason: string;
}

export interface UserMatchListResponse {
  matches: MatchedUserResponse[];
}

export interface EventMatchListResponse {
  matches: MatchedEventResponse[];
}

export interface LandmarkResponse {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  image_url: string | null;
}

export interface LandmarkListResponse {
  landmarks: LandmarkResponse[];
}

export interface MeetupResponse {
  id: string;
  creator_id: string;
  joiner_id: string | null;
  landmark_id: string;
  scheduled_time: string;
  status: 'active' | 'accepted' | 'completed' | 'cancelled';
  created_at: string;
}

export interface MeetupListResponse {
  meetups: MeetupResponse[];
  total: number;
}

export { ApiError };
