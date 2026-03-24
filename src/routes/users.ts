import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/UserService';

export const router: Router = Router();

const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /users — list all users (paginated)
router.get('/', async (req: Request, res: Response) => {
  const query = PaginationQuerySchema.safeParse(req.query);
  if (!query.success)
    return res.status(400).json({ error: query.error.flatten() });
  
  const { page, limit } = query.data;
  const users = await UserService.findAll({ page, limit });
  res.json({ data: users, page, limit });
});

// POST /users — create a user
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const user = await UserService.create(parsed.data);
  res.status(201).json(user);
});

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = await UserService.findById(req.params.id as string);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// DELETE /users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await UserService.delete(req.params.id as string);
  res.status(204).send();
});
