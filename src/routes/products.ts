import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ProductService } from '../services/ProductService';

export const router: Router = Router();

const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.string().min(1),
  inStock: z.boolean(),
});

const UpdateProductSchema = CreateProductSchema.partial();

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
});

// GET /products — list all products (paginated, filterable by category)
router.get('/', async (req: Request, res: Response) => {
  const query = PaginationQuerySchema.safeParse(req.query);
  if (!query.success)
    return res.status(400).json({ error: query.error.flatten() });

  const { page, limit, category } = query.data;
  const products = await ProductService.findAll({ page, limit, category });
  res.json({ data: products, page, limit });
});

// POST /products — create a product
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateProductSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const product = await ProductService.create(parsed.data);
  res.status(201).json(product);
});

// GET /products/:id
router.get('/:id', async (req: Request, res: Response) => {
  const product = await ProductService.findById(req.params.id as string);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// PATCH /products/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateProductSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const product = await ProductService.update(req.params.id as string, parsed.data);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// DELETE /products/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await ProductService.delete(req.params.id as string);
  res.status(204).send();
});
