import { Request } from 'express';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

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
  uploadedAt: string;
  updatedAt: string;
}

export interface VideoMetadataUpdate {
  title?: string;
  description?: string;
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

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface UrlVideoMetadata {
  title: string;
  description: string;
  uploader: string;
  duration: number;
  width: number;
  height: number;
  format: string;
  originalUrl: string;
  thumbnailUrl?: string;
  uploadDate?: string;
}

export interface UrlPreviewResponse {
  metadata: UrlVideoMetadata;
  previewId: string;
  streamUrl?: string;
}

export interface UrlUploadRequest {
  previewId: string;
  title: string;
  description: string;
}

