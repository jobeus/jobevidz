import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { verifyToken } from '../utils/auth.js';
import { isApiKey, userForApiKey } from '../utils/apiKeys.js';

/** Errors as plain text for /api/share, whose callers (like the iOS shortcut) show replies as they are. */
function deny(req: AuthRequest, res: Response, status: number, message: string): void {
  if (req.baseUrl === '/api/share') res.status(status).type('text/plain').send(`${message}\n`);
  else res.status(status).json({ error: message });
}

/** Accepts a signed-in session token or a personal API key (vz_...), as `Authorization: Bearer ...`. */
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    deny(req, res, 401, 'Authentication token required');
    return;
  }

  if (isApiKey(token)) {
    const user = await userForApiKey(token).catch(() => null);
    if (!user) {
      deny(req, res, 401, 'That API key is not valid. It may have been revoked.');
      return;
    }
    req.user = user;
    req.viaApiKey = true;
    next();
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    deny(req, res, 403, 'Invalid or expired token');
  }
}

/** For actions that need a real sign-in, such as managing API keys. */
export function requireSession(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.viaApiKey) {
    res.status(403).json({ error: 'Sign in to do this; API keys cannot.' });
    return;
  }
  next();
}
