import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
  }
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: jest.fn()
  }
}));

const User = (await import('../models/User.js')).default;
const userRoutes = (await import('../routes/user.routes.js')).default;
const jwtMod = (await import('jsonwebtoken')).default;

const app = express();
app.use(express.json());
app.use('/users', userRoutes);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /users', () => {
  it('should create a new user', async () => {
    const mockUser = { _id: 'user123', nombre: 'Test User', email: 'test@example.com' };
    User.create.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/users')
      .send({ _id: 'user123', nombre: 'Test User', email: 'test@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Test User');
  });

  it('should reject incomplete data', async () => {
    const res = await request(app)
      .post('/users')
      .send({ _id: 'user123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Datos incompletos');
  });
});

describe('GET /users/me', () => {
  it('should return user profile with valid token', async () => {
    const mockUser = { _id: 'user123', nombre: 'Test User', email: 'test@example.com' };
    jwtMod.verify.mockReturnValue({ userId: 'user123' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });

    const res = await request(app)
      .get('/users/me')
      .set('Authorization', 'Bearer valid_token');

    expect(res.status).toBe(200);
  });

  it('should reject without auth', async () => {
    const res = await request(app).get('/users/me');
    expect(res.status).toBe(401);
  });
});

describe('PUT /users/me/update', () => {
  it('should update user profile', async () => {
    const updatedUser = { _id: 'user123', nombre: 'Updated Name', email: 'test@example.com' };
    jwtMod.verify.mockReturnValue({ userId: 'user123' });
    User.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue(updatedUser)
    });

    const res = await request(app)
      .put('/users/me/update')
      .set('Authorization', 'Bearer valid_token')
      .send({ nombre: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Updated Name');
  });
});
