import request from 'supertest';
import app from '../src/app';
import { AuthService } from '../src/services/AuthService';

jest.mock('../src/services/AuthService');
const MockAuthService = AuthService as jest.Mocked<typeof AuthService>;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('POST /auth/login', () => {
  it('returns tokens with valid credentials', async () => {
    const mockTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    };

    MockAuthService.login.mockResolvedValue(mockTokens);

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining(mockTokens));
  });

  it('returns 400 for invalid email format', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'invalid-email', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 400 for short password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 404 for user not found', async () => {
    MockAuthService.login.mockResolvedValue(null);

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'notfound@example.com', password: 'password123' });

    expect(response.status).toBe(401);
  });
});

describe('POST /auth/register', () => {
  it('creates a user with valid input', async () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user' as const,
      status: 'active' as const,
    };

    MockAuthService.register.mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining(mockUser));
  });

  it('returns 400 for invalid email format', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: 'invalid-email', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 400 for missing name', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 400 for short password', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /auth/refresh', () => {
  it('returns tokens with valid refresh token', async () => {
    const mockTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    };

    MockAuthService.refreshToken.mockResolvedValue(mockTokens);

    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining(mockTokens));
  });

  it('returns 400 for missing refresh token', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 404 for invalid refresh token', async () => {
    MockAuthService.refreshToken.mockResolvedValue(null);

    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid-refresh-token' });

    expect(response.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('returns 204 for valid token', async () => {
    const response = await request(app)
      .post('/auth/logout')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(204);
  });

  it('returns 401 for missing token', async () => {
    const response = await request(app)
      .post('/auth/logout');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});