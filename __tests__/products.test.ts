import request from 'supertest';
import app from '../src/app';
import { ProductService } from '../src/services/ProductService';

jest.mock('../src/services/ProductService');
const MockProductService = ProductService as jest.Mocked<typeof ProductService>;

describe('Products API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /products/', () => {
    it('returns paginated list with default limit', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          price: 100,
          category: 'Category A',
          inStock: true,
          createdAt: new Date().toISOString(),
        },
      ];
      MockProductService.findAll.mockResolvedValue(mockProducts);

      const response = await request(app).get('/products/').query({ page: 1, limit: 10 });
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockProducts);
    });

    it('returns 400 for invalid query parameters', async () => {
      const response = await request(app).get('/products/').query({ page: 'invalid', limit: 'invalid' });
      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ error: expect.any(Object) }));
    });
  });

  describe('POST /products/', () => {
    it('creates a new product', async () => {
      const newProduct = {
        name: 'New Product',
        price: 50,
        category: 'Category B',
        inStock: true,
      };
      const createdProduct = { ...newProduct, id: '2', createdAt: new Date().toISOString() };

      MockProductService.create.mockResolvedValue(createdProduct);

      const response = await request(app).post('/products/').send(newProduct);
      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdProduct);
    });

    it('returns 400 for invalid product data', async () => {
      const invalidProduct = { name: '', price: -10 };

      const response = await request(app).post('/products/').send(invalidProduct);
      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ error: expect.any(Object) }));
    });
  });

  describe('GET /products/:id', () => {
    it('returns product by id', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        price: 100,
        category: 'Category A',
        inStock: true,
        createdAt: new Date().toISOString(),
      };
      MockProductService.findById.mockResolvedValue(mockProduct);

      const response = await request(app).get('/products/1');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProduct);
    });

    it('returns 404 if product not found', async () => {
      MockProductService.findById.mockResolvedValue(null);

      const response = await request(app).get('/products/unknown');
      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({ error: 'Product not found' }));
    });
  });

  describe('PATCH /products/:id', () => {
    it('updates a product', async () => {
      const updateData = { price: 150 };
      const updatedProduct = {
        id: '1',
        name: 'Product 1',
        price: 150,
        category: 'Category A',
        inStock: true,
        createdAt: new Date().toISOString(),
      };

      MockProductService.update.mockResolvedValue(updatedProduct);

      const response = await request(app).patch('/products/1').send(updateData);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedProduct);
    });

    it('returns 400 for invalid update data', async () => {
      const invalidUpdateData = { price: -50 };

      const response = await request(app).patch('/products/1').send(invalidUpdateData);
      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ error: expect.any(Object) }));
    });

    it('returns 404 if product not found for update', async () => {
      MockProductService.update.mockResolvedValue(null);

      const response = await request(app).patch('/products/unknown').send({ price: 150 });
      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({ error: 'Product not found' }));
    });
  });

  describe('DELETE /products/:id', () => {
    it('deletes a product', async () => {
      MockProductService.delete.mockResolvedValue();

      const response = await request(app).delete('/products/1');
      expect(response.status).toBe(204);
    });

    it('returns 404 if product not found for deletion', async () => {
      MockProductService.delete.mockImplementation(() => { throw new Error('Product not found'); });

      const response = await request(app).delete('/products/unknown');
      expect(response.status).toBe(500);
    });
  });
});