import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { readUsers, writeUsers } from '../utils/fileStorage.js';
import { hashPassword, verifyPassword, generateToken, sanitizeUser } from '../utils/auth.js';
import { User, LoginCredentials, RegisterCredentials, AuthResponse, AuthRequest } from '../types/index.js';
import { authenticateToken, requireSession } from '../middleware/auth.js';
import { createApiKey, listApiKeys, revokeApiKey } from '../utils/apiKeys.js';
import { logger, logAuth } from '../utils/logger.js';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password }: RegisterCredentials = req.body;

    // Validation
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }

    // Check if user already exists
    const users = await readUsers();
    const existingUser = users.find(
      (u: User) => u.username === username || u.email === email
    );

    if (existingUser) {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }

    // Create new user
    const passwordHash = await hashPassword(password);
    const newUser: User = {
      id: nanoid(),
      username,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await writeUsers(users);

    // Generate token
    const token = generateToken(newUser.id, newUser.username);
    const response: AuthResponse = {
      token,
      user: sanitizeUser(newUser),
    };

    logAuth('register', username, true);
    res.status(201).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Registration error');
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginCredentials = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Find user
    const users = await readUsers();
    const user = users.find((u: User) => u.username === username);

    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Generate token
    const token = generateToken(user.id, user.username);
    const response: AuthResponse = {
      token,
      user: sanitizeUser(user),
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Verify token (for client to check if token is still valid)
router.get('/verify', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const { verifyToken } = await import('../utils/auth.js');
    const decoded = verifyToken(token);
    
    // Get user data
    const users = await readUsers();
    const user = users.find((u: User) => u.id === decoded.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

// Personal API keys (for the iOS share shortcut and similar). Managing them needs a sign-in.
router.get('/keys', authenticateToken, requireSession, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ keys: await listApiKeys(req.user!.userId) });
});

router.post('/keys', authenticateToken, requireSession, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name : '';
    const { key, info } = await createApiKey(req.user!.userId, name);
    logger.info({ userId: req.user!.userId, keyId: info.id }, 'API key created');
    res.status(201).json({ key, info });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create API key');
    res.status(500).json({ error: 'Failed to create the key' });
  }
});

router.delete('/keys/:keyId', authenticateToken, requireSession, async (req: AuthRequest, res: Response): Promise<void> => {
  const revoked = await revokeApiKey(req.user!.userId, String(req.params.keyId));
  if (!revoked) {
    res.status(404).json({ error: 'Key not found' });
    return;
  }
  logger.info({ userId: req.user!.userId, keyId: req.params.keyId }, 'API key revoked');
  res.json({ message: 'Key revoked' });
});

export default router;

