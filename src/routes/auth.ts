import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';

export const router: Router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const tokens = await AuthService.login(parsed.data.email, parsed.data.password);
  if (!tokens) return res.status(401).json({ error: 'Invalid credentials' });
  res.json(tokens);
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const user = await AuthService.register(parsed.data);
  res.status(201).json(user);
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const parsed = RefreshSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const tokens = await AuthService.refreshToken(parsed.data.refreshToken);
  if (!tokens) return res.status(401).json({ error: 'Invalid refresh token' });
  res.json(tokens);
});

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  await AuthService.logout(token);
  res.status(204).send();
});
