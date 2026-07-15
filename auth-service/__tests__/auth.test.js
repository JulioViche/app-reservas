const request = require('supertest');
const express = require('express');

const app = express();
app.use(express.json());

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('node-fetch', () => jest.fn(() => Promise.resolve({ ok: true })));
jest.mock('../src/models/user.model', () => ({
  findOne: jest.fn(),
  findById: jest.fn().mockReturnValue({ select: jest.fn() }),
  create: jest.fn()
}));

const User = require('../src/models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const authRoutes = require('../src/routes/auth.routes');
app.use('/api', authRoutes);

beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockResolvedValue({ ok: true });
});

describe('POST /api/register', () => {
  it('should register a new user', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed_password_123');
    User.create.mockResolvedValue({
      _id: 'user123',
      name: 'Test User',
      email: 'test@example.com'
    });

    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Usuario registrado correctamente');
  });

  it('should reject duplicate email', async () => {
    User.findOne.mockResolvedValue({ email: 'test@example.com' });

    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Correo ya registrado');
  });

  it('should handle server error on register', async () => {
    User.findOne.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error en el servidor');
  });
});

describe('POST /api/login', () => {
  it('should login successfully', async () => {
    const mockUser = {
      _id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed_password'
    };
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('fake_token_123');

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('fake_token_123');
  });

  it('should reject invalid email', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'notfound@example.com', password: 'password123' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Usuario no encontrado');
  });

  it('should reject wrong password', async () => {
    User.findOne.mockResolvedValue({ password: 'hashed_password' });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'test@example.com', password: 'wrong_password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Contraseña incorrecta');
  });

  it('should handle server error on login', async () => {
    User.findOne.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error en el servidor');
  });
});

describe('GET /api/me', () => {
  it('should return user profile with valid token', async () => {
    const mockUser = { _id: 'user123', name: 'Test User', email: 'test@example.com' };
    jwt.verify.mockReturnValue({ userId: 'user123' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer valid_token');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test User');
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/me');

    expect(res.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer invalid_token');

    expect(res.status).toBe(401);
  });
});
