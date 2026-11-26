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

export interface AuthRequest<P = Record<string, string>> extends Request<P> {
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
  /** absent on videos from before background processing: treat as 'ready' */
  status?: VideoStatus;
  /** why processing failed (user-facing, credentials redacted) */
  error?: string;
  /** link the video was imported from */
  sourceUrl?: string;
  /** uploaded file waiting to be converted (deleted once processed) */
  sourceFile?: string;
  uploadedAt: string;
  updatedAt: string;
}

export type VideoStatus = 'processing' | 'ready' | 'failed';

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

export interface UrlUploadRequest {
  url: string;
  title?: string;
  description?: string;
}

