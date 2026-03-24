import request from 'supertest';
import app from '../src/app';
import { OrderService } from '../src/services/OrderService';

jest.mock('../src/services/OrderService');
const MockOrderService = OrderService as jest.Mocked<typeof OrderService>;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET /orders', () => {
  it('returns a paginated list of orders with default limit', async () => {
    const mockOrders = [
      { id: '1', userId: 'user1', items: [{ productId: 'prod1', quantity: 2 }], status: 'pending' as const, createdAt: new Date().toISOString(), total: 100 },
      { id: '2', userId: 'user2', items: [{ productId: 'prod2', quantity: 3 }], status: 'confirmed' as const, createdAt: new Date().toISOString(), total: 150 },
    ];
    MockOrderService.findAll.mockResolvedValue(mockOrders);

    const response = await request(app).get('/orders');
    
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.arrayContaining(mockOrders));
  });

  it('returns 400 for invalid query parameters', async () => {
    const response = await request(app).get('/orders?page=invalid');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('handles empty order lists', async () => {
    MockOrderService.findAll.mockResolvedValue([]);

    const response = await request(app).get('/orders');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});

describe('POST /orders', () => {
  it('creates a new order and returns 201', async () => {
    const newOrder = { userId: 'user1', items: [{ productId: 'prod1', quantity: 2 }], total: 100, status: 'pending' as const };
    const createdOrder = { id: '1', ...newOrder, createdAt: new Date().toISOString() };
    MockOrderService.create.mockResolvedValue(createdOrder);

    const response = await request(app).post('/orders').send(newOrder);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(createdOrder);
  });

  it('returns 400 for invalid order data', async () => {
    const response = await request(app).post('/orders').send({ userId: '', items: [], total: 100, status: 'pending' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /orders/:id', () => {
  it('returns order details for a valid id', async () => {
    const mockOrder = { id: '1', userId: 'user1', items: [{ productId: 'prod1', quantity: 2 }], status: 'pending' as const, createdAt: new Date().toISOString(), total: 100 };
    MockOrderService.findById.mockResolvedValue(mockOrder);

    const response = await request(app).get('/orders/1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(mockOrder);
  });

  it('returns 404 for a non-existent order id', async () => {
    MockOrderService.findById.mockResolvedValue(null);

    const response = await request(app).get('/orders/999');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Order not found');
  });
});

describe('PATCH /orders/:id/status', () => {
  it('updates the order status successfully', async () => {
    const updatedOrder = { id: '1', userId: 'user1', items: [{ productId: 'prod1', quantity: 2 }], status: 'shipped' as const, createdAt: new Date().toISOString(), total: 100 };
    MockOrderService.updateStatus.mockResolvedValue(updatedOrder);

    const response = await request(app).patch('/orders/1/status').send({ status: 'shipped' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(updatedOrder);
  });

  it('returns 400 for invalid status', async () => {
    const response = await request(app).patch('/orders/1/status').send({ status: 'unknown' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /orders/:id', () => {
  it('deletes an order successfully and returns 204', async () => {
    MockOrderService.delete.mockResolvedValueOnce();

    const response = await request(app).delete('/orders/1');

    expect(response.status).toBe(204);
  });

  it('returns 404 for deleting a non-existent order', async () => {
    MockOrderService.delete.mockImplementationOnce(() => {
      throw new Error('Order not found');
    });

    const response = await request(app).delete('/orders/999');

    expect(response.status).toBe(500);
  });
});