process.env.NEXT_PUBLIC_API_URL = '/api/auth';
process.env.NEXT_PUBLIC_USER_URL = '/api/users';
process.env.NEXT_PUBLIC_BOOKING_URL = '/api/bookings';

import { registerUser, loginUser, getMe, getBookings } from '../utils/api';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

describe('registerUser', () => {
  it('should call register endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ message: 'Usuario registrado correctamente' })
    });

    const result = await registerUser({
      name: 'Test',
      email: 'test@test.com',
      password: 'pass123'
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', email: 'test@test.com', password: 'pass123' })
      })
    );
    expect(result.message).toBe('Usuario registrado correctamente');
  });
});

describe('loginUser', () => {
  it('should call login endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ token: 'fake_token' })
    });

    const result = await loginUser({
      email: 'test@test.com',
      password: 'pass123'
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.token).toBe('fake_token');
  });
});

describe('getMe', () => {
  it('should call me endpoint with token', async () => {
    mockFetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ nombre: 'Test', email: 'test@test.com' })
    });

    const result = await getMe('my_token');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/users/me',
      expect.objectContaining({
        headers: { Authorization: 'Bearer my_token' }
      })
    );
    expect(result.nombre).toBe('Test');
  });
});

describe('getBookings', () => {
  it('should call bookings endpoint with token', async () => {
    mockFetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue([{ id: '1', servicio: 'Habitación' }])
    });

    const result = await getBookings('my_token');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/bookings/bookings',
      expect.objectContaining({
        headers: { Authorization: 'Bearer my_token' }
      })
    );
    expect(result.length).toBe(1);
  });
});
