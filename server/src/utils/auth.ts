import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { User, UserPublic } from '../types/index.js';

const SALT_ROUNDS = 12;
const JWT_SECRET: string = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, username: string): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign({ userId, username }, JWT_SECRET, options);
}

export function verifyToken(token: string): { userId: string; username: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
}

export function sanitizeUser(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  };
}

