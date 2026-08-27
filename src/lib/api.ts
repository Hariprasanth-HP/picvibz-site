import { getAccessToken } from '@/lib/supabase';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ApiUser {
  id: string;
  supabaseUid: string | null;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: string;
  eventPasses: number;
  autoUpload: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
}

interface AuthResponse {
  user: ApiUser;
  session: AuthSession | null;
}

function getToken(): string | null {
  return getAccessToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }

  const body = await res.json();
  return body.data !== undefined ? body.data : body;
}

export interface CreateEventPayload {
  name: string;
  type?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export interface ApiEvent {
  id: string;
  name: string;
  type: string;
  date: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ApiMediaStatus =
  | 'UPLOADING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED';

export interface ApiMedia {
  id: string;
  eventId: string | null;
  type: 'PHOTO' | 'VIDEO';
  status: ApiMediaStatus;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  previewUrl: string | null;
  mediumUrl: string | null;
  originalUrl: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEventPhoto {
  id: string;
  type: 'PHOTO';
  eventId: string;
  status: ApiMediaStatus;
  mimetype: string;
  originalName: string | null;
  size: string | number;
  width: number | null;
  height: number | null;
  uploadedBy: string;
  uploader: {
    id: string;
    displayName: string;
    photoURL: string | null;
  };
  previewUrl: string | null;
  mediumUrl: string | null;
  originalUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitUploadResponse {
  uploadId: string;
  fileId: string;
  uploadUrl: string;
  storageKey: string;
  status: ApiMediaStatus;
}

export interface CompleteUploadResponse {
  id: string;
  status: ApiMediaStatus;
}

export interface InitUploadPayload {
  fileName: string;
  mimeType: string;
  size: number;
  eventId?: string;
}

export const api = {
  signup(email: string, password: string, displayName: string) {
    return request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  googleLogin(accessToken: string) {
    return request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    });
  },

  forgotPassword(email: string) {
    return request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, newPassword: string) {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  me() {
    return request<ApiUser>('/auth/me');
  },

  createEvent(data: CreateEventPayload) {
    return request<ApiEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getEvents() {
    return request<ApiEvent[]>('/events');
  },

  getEvent(id: string) {
    return request<ApiEvent>(`/events/${id}`);
  },

  updateEvent(id: string, data: Partial<CreateEventPayload>) {
    return request<ApiEvent>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteEvent(id: string) {
    return request<void>(`/events/${id}`, {
      method: 'DELETE',
    });
  },

  initUpload(data: InitUploadPayload) {
    return request<InitUploadResponse>('/uploads/init', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  completeUpload(uploadId: string) {
    return request<CompleteUploadResponse>(`/uploads/${uploadId}/complete`, {
      method: 'POST',
    });
  },

  getUploads() {
    return request<ApiMedia[]>('/uploads');
  },

  getUpload(id: string) {
    return request<ApiMedia>(`/uploads/${id}`);
  },

  getPhotos(eventId: string) {
    return request<ApiEventPhoto[]>(`/events/${eventId}/photos`);
  },

  deletePhoto(eventId: string, photoId: string) {
    return request<{ message: string }>(`/events/${eventId}/photos/${photoId}`, {
      method: 'DELETE',
    });
  },
};