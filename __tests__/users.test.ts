import request from 'supertest';
import app from '../src/app';
import { UserService } from '../src/services/UserService';

jest.mock('../src/services/UserService');
const MockUserService = UserService as jest.Mocked<typeof UserService>;

describe('User API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /users', () => {
    it('returns paginated list with default limit', async () => {
      const mockUsers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'user' as const, createdAt: new Date().toISOString() },
      ];
      MockUserService.findAll.mockResolvedValue(mockUsers);

      const response = await request(app).get('/users').query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: '1', name: 'John Doe', email: 'john@example.com', role: 'user', createdAt: expect.any(String) }),
      ]));
    });

    it('returns 400 for invalid query params', async () => {
      const response = await request(app).get('/users').query({ page: 'invalid', limit: 10 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('returns an empty list', async () => {
      MockUserService.findAll.mockResolvedValue([]);

      const response = await request(app).get('/users').query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /users', () => {
    it('creates a user successfully', async () => {
      const newUser = { name: 'Jane Doe', email: 'jane@example.com', role: 'admin' as const };
      const createdUser = { ...newUser, id: '2', createdAt: new Date().toISOString() };
      MockUserService.create.mockResolvedValue(createdUser);

      const response = await request(app).post('/users').send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining(createdUser));
    });

    it('returns 400 for invalid user data', async () => {
      const invalidUser = { name: 'J', email: 'invalid-email', role: 'user' };

      const response = await request(app).post('/users').send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /users/:id', () => {
    it('returns a user by id', async () => {
      const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com', role: 'user' as const, createdAt: new Date().toISOString() };
      MockUserService.findById.mockResolvedValue(mockUser);

      const response = await request(app).get('/users/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining(mockUser));
    });

    it('returns 404 if user is not found', async () => {
      MockUserService.findById.mockResolvedValue(null);

      const response = await request(app).get('/users/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('DELETE /users/:id', () => {
    it('deletes a user successfully', async () => {
      MockUserService.delete.mockResolvedValue(undefined);

      const response = await request(app).delete('/users/1');

      expect(response.status).toBe(204);
    });

    it('handles deleting a non-existing user', async () => {
      MockUserService.delete.mockResolvedValue(undefined);

      const response = await request(app).delete('/users/999');

      expect(response.status).toBe(204);
    });
  });
});