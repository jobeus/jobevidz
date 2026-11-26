import axios from 'axios';
import type { AxiosProgressEvent } from 'axios';
import type {
  AuthResponse,
  User,
  LoginCredentials,
  RegisterCredentials,
  VideoMetadata,
  VideoUploadResponse,
  UrlUploadRequest,
} from '../types/index';

/** The API's `{ error }` message from a failed request, or `fallback`. */
export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<{ error?: string }>(err) && err.response?.data?.error) {
    return err.response.data.error;
  }
  return fallback;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', credentials);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', credentials);
    return response.data;
  },

  verify: async (): Promise<{ user: User }> => {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },
};

export interface ApiKeyInfo {
  id: string;
  name: string;
  /** first and last characters, to tell keys apart */
  hint: string;
  createdAt: string;
  lastUsedAt?: string;
}

// Personal API keys (need a signed-in session)
export const keysApi = {
  list: async (): Promise<ApiKeyInfo[]> => (await api.get<{ keys: ApiKeyInfo[] }>('/api/auth/keys')).data.keys,
  /** The full key is only ever returned here, once. */
  create: async (name: string): Promise<{ key: string; info: ApiKeyInfo }> =>
    (await api.post('/api/auth/keys', { name })).data,
  revoke: async (id: string): Promise<void> => {
    await api.delete(`/api/auth/keys/${id}`);
  },
};

/** The endpoint the share shortcut posts to. */
export const SHARE_ENDPOINT = `${API_BASE_URL}/api/share`;

// Video API
export const videoApi = {
  upload: async (
    file: File,
    title: string,
    description: string,
    onProgress?: (progress: number) => void
  ): Promise<VideoUploadResponse> => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);

    const response = await api.post<VideoUploadResponse>('/api/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  },

  getMyVideos: async (): Promise<{ videos: VideoMetadata[] }> => {
    const response = await api.get('/api/videos/my-videos');
    return response.data;
  },

  getUserVideos: async (username: string): Promise<{ videos: VideoMetadata[] }> => {
    const response = await api.get(`/api/videos/user/${username}`);
    return response.data;
  },

  getVideo: async (videoId: string): Promise<{ video: VideoMetadata }> => {
    const response = await api.get(`/api/videos/${videoId}`);
    return response.data;
  },

  getVideoByShortId: async (shortId: string): Promise<{ video: VideoMetadata }> => {
    // Request JSON format explicitly since /v/:shortId now returns HTML by default
    const response = await api.get(`/v/${shortId}?format=json`);
    return response.data;
  },

  updateVideo: async (
    videoId: string,
    updates: { title?: string; description?: string }
  ): Promise<{ video: VideoMetadata }> => {
    const response = await api.patch(`/api/videos/${videoId}`, updates);
    return response.data;
  },

  deleteVideo: async (videoId: string): Promise<void> => {
    await api.delete(`/api/videos/${videoId}`);
  },

  /** Starts importing a video from a link; the reply comes back at once with status 'processing'. */
  importFromUrl: async (request: UrlUploadRequest): Promise<VideoUploadResponse> => {
    const response = await api.post<VideoUploadResponse>('/api/videos/url-upload', request);
    return response.data;
  },

};

export const getVideoUrl = (filename: string): string => {
  return `${API_BASE_URL}/uploads/videos/${filename}`;
};

/** True once the server has finished converting the video (older videos have no status). */
export const isReady = (video: VideoMetadata): boolean => !video.status || video.status === 'ready';

/** The public short link for a video, e.g. https://vidz.jobe.wtf/v/2r8Fy */
export const shareUrlFor = (shortId: string): string => `${window.location.origin}/v/${shortId}`;

export const getThumbnailUrl = (filename: string): string => {
  return `${API_BASE_URL}/uploads/thumbnails/${filename}`;
};

