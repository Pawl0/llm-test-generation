import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { OrderService } from '../services/OrderService';

export const router: Router = Router();

const CreateOrderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
  total: z.number().positive(),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
});

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().optional(),
});

// GET /orders — list all orders (paginated, filterable by userId)
router.get('/', async (req: Request, res: Response) => {
  const query = PaginationQuerySchema.safeParse(req.query);
  if (!query.success)
    return res.status(400).json({ error: query.error.flatten() });

  const { page, limit, userId } = query.data;
  const orders = await OrderService.findAll({ page, limit, userId });
  res.json({ data: orders, page, limit });
});

// POST /orders — create an order
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const order = await OrderService.create(parsed.data);
  res.status(201).json(order);
});

// GET /orders/:id
router.get('/:id', async (req: Request, res: Response) => {
  const order = await OrderService.findById(req.params.id as string);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// PATCH /orders/:id/status — update order status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const parsed = UpdateStatusSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const order = await OrderService.updateStatus(req.params.id as string, parsed.data.status);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// DELETE /orders/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await OrderService.delete(req.params.id as string);
  res.status(204).send();
});
