import axios from 'axios';
import type { AxiosProgressEvent } from 'axios';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  VideoMetadata,
  VideoUploadResponse,
  UrlPreviewResponse,
  UrlUploadRequest,
} from '../types/index';

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

  verify: async (): Promise<{ user: any }> => {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },
};

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
    const response = await api.get(`/v/${shortId}`);
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

  // URL-based upload methods
  previewFromUrl: async (url: string): Promise<UrlPreviewResponse> => {
    const response = await api.post<UrlPreviewResponse>('/api/videos/url-preview', { url });
    return response.data;
  },

  uploadFromUrl: async (request: UrlUploadRequest): Promise<VideoUploadResponse> => {
    const response = await api.post<VideoUploadResponse>('/api/videos/url-upload', request);
    return response.data;
  },
};

export const getVideoUrl = (filename: string): string => {
  return `${API_BASE_URL}/uploads/videos/${filename}`;
};

export const getThumbnailUrl = (filename: string): string => {
  return `${API_BASE_URL}/uploads/thumbnails/${filename}`;
};

