export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

/** 'processing' until the server has converted it; absent on older videos, which are ready. */
export type VideoStatus = 'processing' | 'ready' | 'failed';

export interface VideoMetadata {
  id: string;
  shortId: string;
  userId: string;
  username: string;
  filename: string;
  originalFilename: string;
  title: string;
  description: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  format: string;
  codec: string;
  thumbnailFilename?: string;
  status?: VideoStatus;
  /** why processing failed */
  error?: string;
  /** link the video was imported from */
  sourceUrl?: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface VideoUploadResponse {
  message: string;
  video: VideoMetadata;
  url: string;
}

export interface UrlUploadRequest {
  url: string;
  title?: string;
  description?: string;
}
